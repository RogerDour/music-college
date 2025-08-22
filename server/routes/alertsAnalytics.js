// server/routes/alertsAnalytics.js
//
// GET /api/analytics/alerts?from=YYYY-MM-DD&to=YYYY-MM-DD&bucket=day|week|month&teacherId?&courseId?
// Role: admin or teacher
// Returns anomaly “alerts” (not persisted) using a simple z-score on time series.

const express = require("express");
const mongoose = require("mongoose");
const { authenticate } = require("../middleware/auth");
const Lesson = require("../models/Lesson");
let Feedback; try { Feedback = require("../models/Feedback"); } catch {}

const router = express.Router();

function parseYmd(s) {
  const [y, m, d] = (s || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}
function dateRangeFromQuery(req) {
  const now = new Date();
  const from = parseYmd(req.query.from) || new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const to   = parseYmd(req.query.to)   || now;
  from.setHours(0,0,0,0);
  to.setHours(23,59,59,999);
  return { from, to };
}
function bucketStage(field, bucket = "day", tz = "UTC") {
  const fmt = bucket === "month" ? "%Y-%m" : bucket === "week" ? "%G-W%V" : "%Y-%m-%d";
  return { $dateToString: { format: fmt, date: `$${field}`, timezone: tz } };
}
const toId = (v) => mongoose.Types.ObjectId.isValid(String(v)) ? new mongoose.Types.ObjectId(String(v)) : null;

router.get("/", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "teacher") {
      return res.status(403).json({ error: "forbidden" });
    }

    const { from, to } = dateRangeFromQuery(req);
    const bucket = ["day", "week", "month"].includes(req.query.bucket) ? req.query.bucket : "day";
    const tz = "Asia/Jerusalem";

    const teacherId = req.user.role === "teacher" ? toId(req.user.id) : toId(req.query.teacherId);
    const courseId  = toId(req.query.courseId);

    const match = { date: { $gte: from, $lte: to } };
    if (teacherId) match.teacherId = teacherId;
    if (courseId)  match.courseId  = courseId;

    // Attendance rate TS
    const attendanceTS = await Lesson.aggregate([
      { $match: { ...match, status: "completed" } },
      { $group: {
          _id: bucketStage("date", bucket, tz),
          present: { $sum: { $cond: ["$attended", 1, 0] } },
          total:   { $sum: 1 },
        } },
      { $project: { rate: { $cond: [{ $gt: ["$total", 0] }, { $divide: ["$present", "$total"] }, 0] } } },
      { $sort: { _id: 1 } },
    ]);

    // Ratings TS (if model exists)
    let ratingTS = [];
    if (Feedback) {
      ratingTS = await mongoose.model("Feedback").aggregate([
        { $match: { createdAt: { $gte: from, $lte: to }, rating: { $ne: null } } },
        { $group: { _id: bucketStage("createdAt", bucket, tz), avg: { $avg: "$rating" }, n: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      ]);
    }

    // Simple z-score anomaly: compare last point to mean±2σ
    function zAlerts(ts, valueKey, label, lowIsBad = true) {
      const vals = ts.map((p) => Number(p[valueKey] ?? 0)).filter((v) => !Number.isNaN(v));
      if (vals.length < 5) return [];
      const mu = vals.reduce((a, b) => a + b, 0) / vals.length;
      const sd = Math.sqrt(vals.reduce((a, b) => a + Math.pow(b - mu, 2), 0) / (vals.length - 1) || 1);
      const last = vals[vals.length - 1];
      const z = sd ? (last - mu) / sd : 0;
      const K = 2;

      const out = [];
      if (lowIsBad && last < mu - K * sd) {
        out.push({ type: `${label}_drop`, severity: "warning", message: `${label} dropped (z=${z.toFixed(2)})`, value: last, mean: mu, std: sd });
      }
      if (!lowIsBad && last > mu + K * sd) {
        out.push({ type: `${label}_spike`, severity: "info", message: `${label} spiked (z=${z.toFixed(2)})`, value: last, mean: mu, std: sd });
      }
      return out;
    }

    const alerts = [
      ...zAlerts(attendanceTS, "rate", "attendance", true),
      ...(ratingTS.length ? zAlerts(ratingTS, "avg", "rating", false) : []),
    ];

    res.json({ from, to, bucket, alerts });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "alerts_failed", details: err.message });
  }
});

module.exports = router;
