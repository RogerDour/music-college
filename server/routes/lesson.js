const express = require("express");
const mongoose = require("mongoose");
const { authenticate, authorize } = require("../middleware/auth");

const Lesson = require("../models/Lesson");
const RecurringSeries = require("../models/RecurringSeries");
const User = require("../models/User");

const { suggestSlots, overlapExprBuffered } = require("../utils/scheduling");
const { pushNotification } = require("../services/notify");
const { sendMail, bookingTemplate } = require("../services/mail");

const router = express.Router();

function toId(x) {
  try {
    return new mongoose.Types.ObjectId(String(x));
  } catch {
    return null;
  }
}

// ------------------------------------------------------------------
// Recurring creation (weekly only for now)
// body: { title, teacherId, studentId?, startDate, duration=60, freq='weekly', interval=1, count=10, byDay? }
// ------------------------------------------------------------------
router.post(
  "/recurring",
  authenticate,
  authorize("teacher", "admin"),
  async (req, res) => {
    try {
      const {
        title,
        teacherId,
        studentId,
        startDate,
        duration = 60,
        freq = "weekly",
        interval = 1,
        count = 10,
        byDay = [],
      } = req.body || {};
      if (!title || !teacherId || !startDate) {
        return res
          .status(400)
          .json({ error: "title, teacherId, startDate are required" });
      }
      const series = await RecurringSeries.create({
        title,
        teacherId: toId(teacherId),
        studentId: studentId ? toId(studentId) : undefined,
        startDate: new Date(startDate),
        duration,
        freq,
        interval,
        count,
        byDay,
      });

      // Expand occurrences (weekly)
      const occurrences = [];
      const first = new Date(startDate);
      const weekDays =
        Array.isArray(byDay) && byDay.length ? byDay : [first.getDay()];
      let cursor = new Date(first);
      let created = 0;

      while (created < Math.min(100, Math.max(1, count))) {
        for (const d of weekDays) {
          const next = new Date(cursor);
          const diff = (d - next.getDay() + 7) % 7;
          next.setDate(next.getDate() + diff);

          occurrences.push({
            title,
            teacherId: toId(teacherId),
            studentId: studentId ? toId(studentId) : undefined,
            date: next,
            duration,
            status: "scheduled",
            recurringId: series._id,
          });
          created++;
          if (created >= count) break;
        }
        cursor.setDate(cursor.getDate() + 7 * Math.max(1, interval));
      }

      const inserted = await Lesson.insertMany(occurrences);
      res.json({ ok: true, seriesId: series._id, created: inserted.length });
    } catch (err) {
      console.error("POST /lessons/recurring error", err);
      res.status(500).json({ error: "Failed to create recurring lessons" });
    }
  }
);

// ------------------------------------------------------------------
// Create lesson — prevents overlapping with optional buffer
// body: { title, date, duration=60, studentId?, teacherId? }
// Teachers can only create for themselves unless admin.
// ------------------------------------------------------------------
router.post(
  "/",
  authenticate,
  authorize("admin", "teacher"),
  async (req, res) => {
    try {
      const { title, date, duration = 60, studentId, teacherId } =
        req.body || {};
      if (!title || !date)
        return res
          .status(400)
          .json({ error: "title and date are required" });

      const ownerTeacherId =
        req.user.role === "teacher" ? toId(req.user.id) : toId(teacherId);
      if (!ownerTeacherId)
        return res.status(400).json({ error: "teacherId is required" });

      const start = new Date(date);
      const end = new Date(start.getTime() + duration * 60000);
      const bufferMinutes = Number(process.env.SCHEDULING_BUFFER_MIN || 0);

      // Hard guard: avoid overlaps for teacher & student (if provided)
      const [tClash, sClash] = await Promise.all([
        Lesson.findOne(
          overlapExprBuffered(
            "teacherId",
            ownerTeacherId,
            start,
            end,
            bufferMinutes
          )
        ).lean(),
        studentId
          ? Lesson.findOne(
              overlapExprBuffered(
                "studentId",
                toId(studentId),
                start,
                end,
                bufferMinutes
              )
            ).lean()
          : Promise.resolve(null),
      ]);
      if (tClash)
        return res
          .status(409)
          .json({ error: "Teacher has another lesson near that time" });
      if (sClash)
        return res
          .status(409)
          .json({ error: "Student has another lesson near that time" });

      const saved = await Lesson.create({
        title,
        teacherId: ownerTeacherId,
        studentId: studentId ? toId(studentId) : undefined,
        date: start,
        duration,
        status: "scheduled",
      });

      // Notify student (best-effort)
      try {
        if (saved.studentId) {
          const io = req.app.get("io");
          const [teacher, student] = await Promise.all([
            User.findById(saved.teacherId).lean(),
            User.findById(saved.studentId).lean(),
          ]);
          await pushNotification(io, {
            userId: student._id,
            type: "lesson_booked",
            title: "Lesson booked",
            body: `With ${
              teacher?.name || "your teacher"
            } at ${new Date(saved.date).toLocaleString()}`,
            data: { lessonId: saved._id },
          });
          if (process.env.NODE_ENV !== "test" && student?.email) {
            await sendMail({
              to: student.email,
              subject: "Your lesson is booked 🎵",
              html: bookingTemplate({
                studentName: student.name || "Student",
                teacherName: teacher?.name || "Your teacher",
                date: saved.date,
                duration,
              }),
            });
          }
        }
      } catch (e) {
        console.warn("book notify failed", e.message);
      }

      res.status(201).json(saved);
    } catch (err) {
      console.error("POST /lessons error", err);
      res.status(500).json({ error: "Failed to create lesson" });
    }
  }
);

// ------------------------------------------------------------------
// Suggest endpoint — Greedy / Backtracking
// body: { teacherId, studentId, from?, days?, durationMin?, stepMinutes?, bufferMinutes?, maxSuggestions?, algorithm? }
// ------------------------------------------------------------------
router.post("/suggest", authenticate, async (req, res) => {
  try {
    const {
      teacherId,
      studentId,
      from,
      days = 7,
      durationMin = 60,
      stepMinutes = 15,
      bufferMinutes = Number(process.env.SCHEDULING_BUFFER_MIN || 0),
      maxSuggestions = 5,
      algorithm = "greedy",
    } = req.body || {};

    if (!teacherId || !studentId)
      return res
        .status(400)
        .json({ error: "teacherId and studentId are required" });

    const suggestions = await suggestSlots({
      teacherId: toId(teacherId),
      studentId: toId(studentId),
      from: from ? new Date(from) : new Date(),
      days,
      durationMin,
      stepMinutes,
      bufferMinutes,
      maxSuggestions,
      algorithm,
    });

    res.json({ ok: true, suggestions });
  } catch (err) {
    console.error("POST /lessons/suggest error", err);
    res.status(500).json({ error: "Failed to suggest slots" });
  }
});

/** Build a secure filter for list endpoints based on role. */
function listFilterFromRole(req) {
  const match = {};
  const role = (req.user.role || "").toLowerCase();

  if (role === "student") {
    // Student: always restricted to SELF; ignore any incoming filters for other users
    match.studentId = toId(req.user.id);
  } else if (role === "teacher") {
    // Teacher: restricted to their own lessons regardless of query
    match.teacherId = toId(req.user.id);
  } else if (role === "admin") {
    // Admin: may filter by teacherId / studentId via query params
    if (req.query.teacherId) match.teacherId = toId(req.query.teacherId);
    if (req.query.studentId) match.studentId = toId(req.query.studentId);
  }

  // Common optional filters
  if (req.query.status) {
    const list = String(req.query.status)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (list.length) match.status = { $in: list };
  }
  if (req.query.q && String(req.query.q).trim()) {
    match.title = { $regex: String(req.query.q).trim(), $options: "i" };
  }

  return match;
}

// ------------------------------------------------------------------
// List lessons with basic filters
// - NOW allows students; students only see their own lessons.
// ------------------------------------------------------------------
router.get("/", authenticate, authorize("admin", "teacher", "student"), async (req, res) => {
  try {
    const match = listFilterFromRole(req);

    const lessons = await Lesson.find(match)
      .populate("teacherId", "_id name email")
      .populate("studentId", "_id name email")
      .sort({ date: 1 })
      .lean();

    res.json(lessons);
  } catch (err) {
    console.error("GET /lessons error", err);
    res.status(500).json({ error: "Failed to load lessons" });
  }
});

// ------------------------------------------------------------------
// Explicit "mine" endpoint (client helper)
// - Student: own lessons
// - Teacher: own lessons
// - Admin: empty by default (admins should use / with filters)
// ------------------------------------------------------------------
router.get("/mine", authenticate, async (req, res) => {
  try {
    const role = (req.user.role || "").toLowerCase();
    const match = {};
    if (role === "student") match.studentId = toId(req.user.id);
    else if (role === "teacher") match.teacherId = toId(req.user.id);
    else match._id = { $exists: false }; // admin: return empty by default

    const lessons = await Lesson.find(match)
      .populate("teacherId", "_id name email")
      .populate("studentId", "_id name email")
      .sort({ date: 1 })
      .lean();

    res.json({ lessons });
  } catch (err) {
    console.error("GET /lessons/mine error", err);
    res.status(500).json({ error: "Failed to load lessons" });
  }
});

// ------------------------------------------------------------------
// Update lesson (title/date/duration/status)
// Teachers can only update their lessons.
// Prevent moving to conflicting time.
// ------------------------------------------------------------------
router.put(
  "/:id",
  authenticate,
  authorize("admin", "teacher"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { title, date, duration, status } = req.body || {};
      const found = await Lesson.findById(id);
      if (!found) return res.status(404).json({ error: "Lesson not found" });
      if (
        req.user.role === "teacher" &&
        String(found.teacherId) !== String(req.user.id)
      ) {
        return res.status(403).json({ error: "Not your lesson" });
      }

      if (date || duration) {
        const start = date ? new Date(date) : new Date(found.date);
        const dur = Number.isFinite(duration)
          ? Number(duration)
          : Number(found.duration);
        const end = new Date(start.getTime() + dur * 60000);
        const bufferMinutes = Number(process.env.SCHEDULING_BUFFER_MIN || 0);
        const [tClash, sClash] = await Promise.all([
          Lesson.findOne({
            _id: { $ne: found._id },
            ...overlapExprBuffered(
              "teacherId",
              found.teacherId,
              start,
              end,
              bufferMinutes
            ),
          }).lean(),
          found.studentId
            ? Lesson.findOne({
                _id: { $ne: found._id },
                ...overlapExprBuffered(
                  "studentId",
                  found.studentId,
                  start,
                  end,
                  bufferMinutes
                ),
              }).lean()
            : Promise.resolve(null),
        ]);
        if (tClash)
          return res.status(409).json({ error: "Teacher conflict at new time" });
        if (sClash)
          return res.status(409).json({ error: "Student conflict at new time" });
        found.date = start;
        found.duration = dur;
      }

      if (typeof title === "string") found.title = title;
      if (
        status &&
        ["scheduled", "completed", "cancelled"].includes(status)
      )
        found.status = status;

      const updated = await found.save();
      res.json(updated);
    } catch (err) {
      console.error("PUT /lessons/:id error", err);
      res.status(500).json({ error: "Failed to update lesson" });
    }
  }
);

// ------------------------------------------------------------------
// Cancel (soft-delete)
// ------------------------------------------------------------------
router.delete(
  "/:id",
  authenticate,
  authorize("admin", "teacher", "student"),
  async (req, res) => {
    try {
      const { id } = req.params;
      const found = await Lesson.findById(id);
      if (!found) return res.status(404).json({ error: "Lesson not found" });

      if (
        req.user.role === "teacher" &&
        String(found.teacherId) !== String(req.user.id)
      ) {
        return res.status(403).json({ error: "Not your lesson" });
      }
      if (
        req.user.role === "student" &&
        String(found.studentId) !== String(req.user.id)
      ) {
        return res.status(403).json({ error: "Not your lesson" });
      }

      found.status = "cancelled";
      await found.save();

      // Notify teacher/student (best-effort)
      try {
        const io = req.app.get("io");
        const [teacher, student] = await Promise.all([
          found.teacherId ? User.findById(found.teacherId).lean() : null,
          found.studentId ? User.findById(found.studentId).lean() : null,
        ]);
        if (teacher) {
          await pushNotification(io, {
            userId: teacher._id,
            type: "lesson_cancelled",
            title: "Lesson cancelled",
            body: `${
              student?.name ? `With ${student.name}` : "Your lesson"
            } at ${new Date(found.date).toLocaleString()}`,
            data: { lessonId: found._id },
          });
        }
        if (student) {
          await pushNotification(io, {
            userId: student._id,
            type: "lesson_cancelled",
            title: "Lesson cancelled",
            body: `With ${
              teacher?.name || "your teacher"
            } at ${new Date(found.date).toLocaleString()}`,
            data: { lessonId: found._id },
          });
        }
      } catch (e) {
        console.warn("cancel notify failed", e.message);
      }

      res.json({ ok: true });
    } catch (err) {
      console.error("DELETE /lessons/:id error", err);
      res.status(500).json({ error: "Failed to cancel lesson" });
    }
  }
);

// ------------------------------------------------------------------
module.exports = router;
