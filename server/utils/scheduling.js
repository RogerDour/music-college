/**
 * Scheduling algorithms & helpers:
 *  - Greedy: earliest feasible start that satisfies availability + no-overlap (+buffer) + global hours + holidays
 *  - Backtracking: search forward in rolling windows when greedy in the initial window fails
 *
 * All time values are native JS Date in local time. Durations are in minutes.
 */

const mongoose = require("mongoose");
const GlobalSettings = require("../models/GlobalSettings");
let SchedulingLog = null;
try {
  SchedulingLog = require("../models/SchedulingLog");
} catch (_) {}

const Lesson = require("../models/Lesson");
const Availability = require("../models/Availability");
const Holiday = require("../models/Holiday");

// ---------------------------------------------
// Date helpers
// ---------------------------------------------
function startOfLocalDay(d) {
  const x = new Date(d);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate(), 0, 0, 0, 0);
}
function endOfLocalDay(d) {
  const x = new Date(d);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate(), 23, 59, 59, 999);
}
function hhmmToDate(baseDate, hhmm) {
  const [h, m] = String(hhmm || "00:00")
    .split(":")
    .map((n) => parseInt(n, 10) || 0);
  return new Date(
    baseDate.getFullYear(),
    baseDate.getMonth(),
    baseDate.getDate(),
    h,
    m,
    0,
    0
  );
}

// ---------------------------------------------
// Overlap query builders
// ---------------------------------------------
/**
 * A lesson overlaps the candidate [newStart, newEnd) if:
 *   existingStart < newEnd AND existingEnd > newStart
 */
function overlapExpr(partyField, partyId, newStart, newEnd) {
  return {
    [partyField]: partyId,
    status: { $ne: "cancelled" },
    $expr: {
      $and: [
        { $lt: ["$date", newEnd] },
        {
          $gt: [
            { $add: ["$date", { $multiply: ["$duration", 60000] }] },
            newStart,
          ],
        },
      ],
    },
  };
}

/**
 * Buffered overlap: expand both ends by bufferMinutes.
 * That is, we forbid suggestions within +/- buffer around existing lessons.
 */
function overlapExprBuffered(
  partyField,
  partyId,
  newStart,
  newEnd,
  bufferMinutes = 0
) {
  const bufMs = (bufferMinutes || 0) * 60000;
  const checkStart = new Date(newStart.getTime() - bufMs);
  const checkEnd = new Date(newEnd.getTime() + bufMs);
  return overlapExpr(partyField, partyId, checkStart, checkEnd);
}

// ---------------------------------------------
// Global constraints: hours & holidays
// ---------------------------------------------
function isWithinGlobalHours(gs, start, end) {
  if (!gs) return true;
  const day = start.getDay(); // 0=Sun..6=Sat
  if (Array.isArray(gs.daysOpen) && !gs.daysOpen.includes(day)) return false;
  const open = new Date(start);
  open.setHours(Number(gs.openHour ?? 0), 0, 0, 0);
  const close = new Date(start);
  close.setHours(Number(gs.closeHour ?? 24), 0, 0, 0);
  return start >= open && end <= close;
}

// ---------------------------------------------
// Build busy intervals and availability windows
// ---------------------------------------------
async function getBusyIntervals({ teacherId, studentId, from, to }) {
  const match = {
    status: { $ne: "cancelled" },
    date: { $lt: to },
    $expr: {
      $gt: [
        { $add: ["$date", { $multiply: ["$duration", 60000] }] },
        from,
      ],
    },
  };
  if (teacherId) match.teacherId = teacherId;
  if (studentId) match.studentId = studentId;

  const lessons = await Lesson.find(match).select("date duration -_id").lean();
  return lessons
    .map((l) => ({
      start: new Date(l.date),
      end: new Date(new Date(l.date).getTime() + l.duration * 60000),
    }))
    .sort((a, b) => a.start - b.start);
}

function mergeIntervals(intervals) {
  const arr = [...intervals].sort((a, b) => a.start - b.start);
  const out = [];
  for (const it of arr) {
    if (!out.length || out[out.length - 1].end < it.start) {
      out.push({ start: new Date(it.start), end: new Date(it.end) });
    } else {
      out[out.length - 1].end = new Date(
        Math.max(out[out.length - 1].end, it.end)
      );
    }
  }
  return out;
}

/** Expand intervals by +/- buffer minutes to enforce gaps before subtracting. */
function expandIntervalsWithBuffer(intervals, bufferMinutes = 0) {
  if (!bufferMinutes) return intervals;
  const ms = bufferMinutes * 60000;
  return intervals.map((b) => ({
    start: new Date(b.start.getTime() - ms),
    end: new Date(b.end.getTime() + ms),
  }));
}

function subtractBusy(windows, busies) {
  if (!windows.length) return [];
  if (!busies.length)
    return windows.map((w) => ({
      start: new Date(w.start),
      end: new Date(w.end),
    }));

  const busy = mergeIntervals(busies);
  const out = [];

  for (const w of windows) {
    let curStart = new Date(w.start);
    for (const b of busy) {
      if (b.end <= curStart) continue; // busy ends before current
      if (b.start >= w.end) break; // busy starts after window
      // overlap
      if (b.start > curStart)
        out.push({ start: new Date(curStart), end: new Date(b.start) });
      curStart = new Date(Math.max(curStart, b.end));
      if (curStart >= w.end) break;
    }
    if (curStart < w.end)
      out.push({ start: new Date(curStart), end: new Date(w.end) });
  }

  return out.filter((w) => w.end > w.start);
}

/**
 * Build availability windows for a user between rangeStart..rangeEnd (inclusive days),
 * honoring:
 *  - weeklyRules (day, start/end in HH:mm)
 *  - exceptions: per-date custom slots
 *  - holidays (skip)
 *  - global open hours (clip)
 */
async function getAvailabilityWindows(userId, rangeStart, rangeEnd) {
  const doc = await Availability.findOne({ userId }).lean();
  if (!doc) return [];

  const gs = await GlobalSettings.findOne().lean();

  // Load holidays into a Set of day-key
  const holidays = await Holiday.find({
    date: {
      $gte: startOfLocalDay(rangeStart),
      $lte: endOfLocalDay(rangeEnd),
    },
  })
    .select("date -_id")
    .lean();
  const holidayKeys = new Set(
    holidays.map((h) => startOfLocalDay(h.date).getTime())
  );

  // Exceptions map dayKey -> [{start,end}]
  const exMap = new Map();
  for (const ex of doc.exceptions || []) {
    const k = startOfLocalDay(ex.date).getTime();
    const list = exMap.get(k) || [];
    for (const s of ex.slots || []) {
      list.push({ start: new Date(s.start), end: new Date(s.end) });
    }
    exMap.set(k, list);
  }

  const rules = Array.isArray(doc.weeklyRules) ? doc.weeklyRules : [];
  const windows = [];
  let cur = startOfLocalDay(rangeStart);
  const end = startOfLocalDay(rangeEnd);

  while (cur <= end) {
    const key = cur.getTime();
    const dow = cur.getDay();

    if (holidayKeys.has(key)) {
      cur = new Date(cur.getTime() + 24 * 60 * 60000);
      continue;
    }

    if (exMap.has(key)) {
      windows.push(...exMap.get(key));
    } else {
      for (const r of rules) {
        if (Number(r.day) !== dow) continue;
        const s = hhmmToDate(cur, r.start);
        const e = hhmmToDate(cur, r.end);
        if (e > s) windows.push({ start: s, end: e });
      }
    }

    cur = new Date(cur.getTime() + 24 * 60 * 60000);
  }

  // Clip by global hours
  const clipped = windows
    .map((w) => {
      if (!gs) return w;
      const s = new Date(w.start);
      const e = new Date(w.end);
      const open = new Date(s);
      open.setHours(Number(gs.openHour ?? 0), 0, 0, 0);
      const close = new Date(s);
      close.setHours(Number(gs.closeHour ?? 24), 0, 0, 0);
      return {
        start: new Date(Math.max(s, open)),
        end: new Date(Math.min(e, close)),
      };
    })
    .filter((w) => w.end > w.start);

  // Merge any overlaps produced by rules/exceptions
  return mergeIntervals(clipped);
}

function windowsToStarts(windows, durationMin, stepMinutes, notBefore) {
  const out = [];
  const stepMs = Math.max(5, stepMinutes || 15) * 60000;
  const durMs = (durationMin || 60) * 60000;
  const nb = notBefore ? new Date(notBefore).getTime() : null;
  for (const w of windows) {
    // clamp start to "notBefore" if provided
    const wStart = nb ? Math.max(w.start.getTime(), nb) : w.start.getTime();
    for (let t = wStart; t + durMs <= w.end.getTime(); t += stepMs) {
      out.push(new Date(t));
    }
  }
  return out;
}

function intersectCandidates(teacherFree, studentFree) {
  const out = [];
  for (const t of teacherFree) {
    for (const s of studentFree) {
      const start = new Date(Math.max(t.start.getTime(), s.start.getTime()));
      const end = new Date(Math.min(t.end.getTime(), s.end.getTime()));
      if (end > start) out.push({ start, end });
    }
  }
  return mergeIntervals(out);
}

async function filterNonOverlappingCandidates(
  cands,
  teacherId,
  studentId,
  bufferMinutes = 0
) {
  const out = [];
  for (const c of cands) {
    const [tClash, sClash] = await Promise.all([
      Lesson.findOne(
        overlapExprBuffered("teacherId", teacherId, c.start, c.end, bufferMinutes)
      ).lean(),
      Lesson.findOne(
        overlapExprBuffered("studentId", studentId, c.start, c.end, bufferMinutes)
      ).lean(),
    ]);
    if (!tClash && !sClash) out.push(c);
  }
  return out.sort((a, b) => a.start - b.start);
}

// Greedy: search a [from .. from+days) window and return earliest N slots
async function suggestGreedy({
  teacherId,
  studentId,
  from,
  days = 7,
  durationMin = 60,
  stepMinutes = 15,
  bufferMinutes = 0,
  maxSuggestions = 5,
}) {
  if (!teacherId || !studentId)
    throw new Error("teacherId and studentId are required");

  const start = new Date(from || Date.now());
  const end = new Date(startOfLocalDay(start));
  end.setDate(end.getDate() + Math.max(1, days));
  end.setHours(23, 59, 59, 999);

  const gs = await GlobalSettings.findOne().lean();

  // availability windows
  const [tAvail, sAvail] = await Promise.all([
    getAvailabilityWindows(teacherId, start, end),
    getAvailabilityWindows(studentId, start, end),
  ]);

  // Busy intervals (lessons)
  const [tBusyRaw, sBusyRaw] = await Promise.all([
    getBusyIntervals({ teacherId, from: start, to: end }),
    getBusyIntervals({ studentId, from: start, to: end }),
  ]);

  // Apply buffer to busy intervals BEFORE subtracting, to reduce false "free" gaps
  const tBusy = expandIntervalsWithBuffer(tBusyRaw, bufferMinutes);
  const sBusy = expandIntervalsWithBuffer(sBusyRaw, bufferMinutes);

  // subtract busy from availability
  const tFree = subtractBusy(tAvail, tBusy);
  const sFree = subtractBusy(sAvail, sBusy);

  // intersect
  const candWindows = intersectCandidates(tFree, sFree);

  // discretize to starts and build candidate ranges (clamp to 'start')
  const starts = windowsToStarts(
    candWindows,
    durationMin,
    stepMinutes,
    start /* not before */
  );
  let cands = starts
    .map((st) => ({
      start: st,
      end: new Date(st.getTime() + durationMin * 60000),
    }))
    .filter((c) => isWithinGlobalHours(gs, c.start, c.end));

  // Performance guardrail: avoid DB hitting for thousands of candidates
  const MAX_CHECK = Math.max(200, maxSuggestions * 20);
  cands = cands.slice(0, MAX_CHECK);

  // final guard with DB (buffer-aware)
  const ok = await filterNonOverlappingCandidates(
    cands,
    teacherId,
    studentId,
    bufferMinutes
  );

  const suggestions = ok.slice(0, maxSuggestions).map((c) => ({
    start: c.start,
    end: c.end,
    duration: durationMin,
    score: 0,
    algorithm: "greedy",
  }));

  // optional logging
  if (SchedulingLog && suggestions.length) {
    try {
      await SchedulingLog.create({
        algorithm: "greedy",
        teacherId,
        studentId,
        from: start,
        until: end,
        suggestions: suggestions.map((s) => ({
          start: s.start,
          end: s.end,
          duration: s.duration,
        })),
      });
    } catch (_) {}
  }

  return suggestions;
}

// Backtracking: roll forward in chunks until we gather enough suggestions
async function suggestBacktracking(opts) {
  const {
    teacherId,
    studentId,
    from = new Date(),
    durationMin = 60,
    stepMinutes = 15,
    bufferMinutes = 0,
    chunkDays = 7,
    maxChunks = 4,
    maxSuggestions = 5,
  } = opts;

  let pool = [];
  let cursor = new Date(from);

  for (let i = 0; i < maxChunks && pool.length < maxSuggestions; i++) {
    const chunkEnd = new Date(startOfLocalDay(cursor));
    chunkEnd.setDate(chunkEnd.getDate() + Math.max(1, chunkDays));
    chunkEnd.setHours(23, 59, 59, 999);

    const chunk = await suggestGreedy({
      teacherId,
      studentId,
      from: cursor,
      days: chunkDays,
      durationMin,
      stepMinutes,
      bufferMinutes,
      maxSuggestions: Math.max(50, maxSuggestions),
    });

    pool.push(...chunk);
    cursor = new Date(chunkEnd.getTime() + 1);
  }

  // basic scoring: earlier start => better
  pool.sort((a, b) => a.start - b.start);
  const top = pool
    .slice(0, maxSuggestions)
    .map((s) => ({ ...s, algorithm: "backtracking" }));

  if (SchedulingLog && top.length) {
    try {
      await SchedulingLog.create({
        algorithm: "backtracking",
        teacherId,
        studentId,
        from: new Date(from),
        suggestions: top.map((s) => ({
          start: s.start,
          end: s.end,
          duration: s.duration,
        })),
      });
    } catch (_) {}
  }

  return top;
}

async function suggestSlots(opts) {
  const algo = String(opts?.algorithm || "greedy").toLowerCase();
  if (algo === "backtracking") return suggestBacktracking(opts);
  return suggestGreedy(opts);
}

module.exports = {
  // small helpers
  startOfLocalDay,
  endOfLocalDay,
  hhmmToDate,
  mergeIntervals,
  subtractBusy,
  windowsToStarts,
  intersectCandidates,
  getBusyIntervals,
  getAvailabilityWindows,
  isWithinGlobalHours,
  expandIntervalsWithBuffer,

  // public
  suggestGreedy,
  suggestBacktracking,
  suggestSlots,

  // query builders
  overlapExpr,
  overlapExprBuffered,
};
