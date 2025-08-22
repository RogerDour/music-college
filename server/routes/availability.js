// server/routes/availability.js
const express = require("express");
const mongoose = require("mongoose");
const { authenticate, authorize } = require("../middleware/auth");
const Availability = require("../models/Availability");
const Holiday = require("../models/Holiday");

const router = express.Router();

// ---- helpers ----------------------------------------------------
const isValidHHMM = (s) => /^\d{2}:\d{2}$/.test(String(s || ""));
function normalizeLocalDay(d) {
  const x = new Date(d);
  if (isNaN(x)) return null;
  return new Date(x.getFullYear(), x.getMonth(), x.getDate(), 0, 0, 0, 0);
}

function validateWeeklyRules(rules = []) {
  if (!Array.isArray(rules)) return "weeklyRules must be an array";
  for (const r of rules) {
    const day = Number(r?.day);
    if (!Number.isInteger(day) || day < 0 || day > 6) return "weeklyRules[].day must be 0..6";
    if (!isValidHHMM(r?.start) || !isValidHHMM(r?.end)) return "weeklyRules[].start/end must be HH:mm";
  }
  return null;
}

function validateExceptions(exceptions = []) {
  if (!Array.isArray(exceptions)) return "exceptions must be an array";
  for (const ex of exceptions) {
    const date = new Date(ex?.date);
    if (isNaN(date)) return "exceptions[].date must be a valid date";
    if (!Array.isArray(ex?.slots)) return "exceptions[].slots must be an array";
    for (const s of ex.slots) {
      const st = new Date(s?.start), en = new Date(s?.end);
      if (isNaN(st) || isNaN(en)) return "exceptions[].slots[].start/end must be valid dates";
      if (en <= st) return "exceptions[].slots[].end must be after start";
    }
  }
  return null;
}

// ---- Availability (self) ---------------------------------------


/**
 * Save availability (compat): POST / -> upsert "me"
 */
router.post("/", authenticate, async (req, res) => {
  const { weeklyRules, exceptions } = req.body || {};

  const wrErr = validateWeeklyRules(weeklyRules || []);
  if (wrErr) return res.status(400).json({ error: wrErr });

  const exErr = validateExceptions(exceptions || []);
  if (exErr) return res.status(400).json({ error: exErr });

  const doc = await Availability.findOneAndUpdate(
    { userId: req.user.id },
    { $set: { weeklyRules, exceptions }, $setOnInsert: { userId: req.user.id } },
    { new: true, upsert: true }
  );

  try {
    const io = req.app.get("io");
    if (io) io.emit("availability:update", { userId: req.user.id, type: "self" });
  } catch {}

  res.json(doc);
});

// ---- Availability (admin or self) ------------------------------



// ---- Holidays (admin) ------------------------------------------

/**
 * GET /api/availability/holidays
 */
router.get("/holidays", authenticate, authorize("admin"), async (req, res) => {
  const list = await Holiday.find({}).sort({ date: 1 }).lean();
  res.json({ holidays: list });
});

/**
 * POST /api/availability/holidays
 * body: { holidays: [{ date, label? }] }
 * - Upserts by normalized local date
 */
router.post("/holidays", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { holidays = [] } = req.body || {};
    if (!Array.isArray(holidays)) {
      return res.status(400).json({ error: "holidays must be an array" });
    }

    await Promise.all(
      holidays.map(async (h) => {
        const day = normalizeLocalDay(h?.date);
        if (!day) return;
        await Holiday.updateOne(
          { date: day },
          { $set: { date: day, title: (h?.label || h?.title || "").trim() } },
          { upsert: true, runValidators: true }
        );
      })
    );

    const list = await Holiday.find({}).sort({ date: 1 }).lean();
    try {
      const io = req.app.get("io");
      if (io) io.emit("availability:update", { type: "holiday" });
    } catch {}
    res.json({ ok: true, holidays: list });
  } catch (e) {
    console.error("POST /availability/holidays error:", e);
    res.status(500).json({ error: "Server error", details: e.message });
  }
});

/**
 * DELETE /api/availability/holidays/:id
 */
router.delete("/holidays/:id", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ error: "Invalid holiday id" });
    }
    const r = await Holiday.deleteOne({ _id: id });
    if (r.deletedCount === 0) return res.status(404).json({ error: "Holiday not found" });

    const list = await Holiday.find({}).sort({ date: 1 }).lean();
    try {
      const io = req.app.get("io");
      if (io) io.emit("availability:update", { type: "holiday" });
    } catch {}
    res.json({ ok: true, holidays: list });
  } catch (e) {
    console.error("DELETE /availability/holidays/:id error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * DELETE /api/availability/holidays
 * - Clear all
 */
router.delete("/holidays", authenticate, authorize("admin"), async (req, res) => {
  try {
    await Holiday.deleteMany({});
    try {
      const io = req.app.get("io");
      if (io) io.emit("availability:update", { type: "holiday" });
    } catch {}
    res.json({ ok: true, holidays: [] });
  } catch (e) {
    console.error("DELETE /availability/holidays error:", e);
    res.status(500).json({ error: "Server error" });
  }
});

/**
 * GET /api/availability/me
 * Get my availability (weeklyRules, exceptions)
 */
router.get("/me", authenticate, async (req, res) => {
  const doc = await Availability.findOne({ userId: req.user.id }).lean();
  // Keep response aligned with schema; no stray "slots" field
  res.json(doc || { userId: req.user.id, weeklyRules: [], exceptions: [] });
});

/**
 * PUT /api/availability/me
 * Upsert my availability
 * body: { weeklyRules?, exceptions? }
 */
router.put("/me", authenticate, async (req, res) => {
  const { weeklyRules, exceptions } = req.body || {};

  const wrErr = validateWeeklyRules(weeklyRules || []);
  if (wrErr) return res.status(400).json({ error: wrErr });

  const exErr = validateExceptions(exceptions || []);
  if (exErr) return res.status(400).json({ error: exErr });

  const update = {
    ...(Array.isArray(weeklyRules) ? { weeklyRules } : {}),
    ...(Array.isArray(exceptions) ? { exceptions } : {}),
  };

  const doc = await Availability.findOneAndUpdate(
    { userId: req.user.id },
    { $set: update, $setOnInsert: { userId: req.user.id } },
    { new: true, upsert: true }
  );

  // Notify clients to refresh cached availability (best-effort)
  try {
    const io = req.app.get("io");
    if (io) io.emit("availability:update", { userId: req.user.id, type: "self" });
  } catch {}

  res.json(doc);
});

/**
 * GET /api/availability/:userId
 * - Admin can read anyone; users can read themselves
 */
router.get("/:userId", authenticate, async (req, res) => {
  const { userId } = req.params;
  const isSelf = String(userId) === String(req.user.id);
  if (!isSelf && req.user.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }
  const doc = await Availability.findOne({ userId }).lean();
  res.json(doc || { userId, weeklyRules: [], exceptions: [] });
});

module.exports = router;
