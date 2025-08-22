// server/routes/analytics.js
//
// Analytics API (role-aware):
// - GET /api/analytics/overview  → admin or teacher
//     * Admin can filter by teacherId/courseId/studentId
//     * Teacher is always scoped to their own data (server-enforced)
//   Query: from=YYYY-MM-DD, to=YYYY-MM-DD, bucket=day|week|month,
//          teacherId?, courseId?, studentId?, trend=1 (SMA overlay), smaWindow=7
//
// - GET /api/analytics/series → simple attendance rate TS (kept for compatibility)

const express = require("express");
const mongoose = require("mongoose");
const { authenticate } = require("../middleware/auth");
const Lesson = require("../models/Lesson");
const Enrollment = require("../models/Enrollment");
let Feedback; try { Feedback = require("../models/Feedback"); } catch {}
let Performance; try { Performance = require("../models/Performance"); } catch {}

const router = express.Router();

// ---------------- helpers ----------------
function parseYmd(s) {
  const [y, m, d] = (s || "").split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d); // local midnight
}
function dateRangeFromQuery(req) {
  const now = new Date();
  const from = parseYmd(req.query.from) || new Date(now.getTime() - 30 * 24 * 3600 * 1000);
  const to   = parseYmd(req.query.to)   || now;
  from.setHours(0, 0, 0, 0);
  to.setHours(23, 59, 59, 999);
  return { from, to };
}
function bucketStage(field, bucket = "day", tz = "UTC") {
  const fmt = bucket === "month" ? "%Y-%m" : bucket === "week" ? "%G-W%V" : "%Y-%m-%d";
  return { $dateToString: { format: fmt, date: `$${field}`, timezone: tz } };
}
const toId = (v) => {
  const s = String(v || "");
  return mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : null;
};
const sum = (arr, key) => arr.reduce((s, x) => s + (x[key] ?? 0), 0);

// Simple SMA over {valKey} into {outKey} aligned to same index
function addSMA(series = [], valKey, outKey, window = 7) {
  if (!Array.isArray(series) || !series.length || window <= 1) return series;
  let acc = 0;
  for (let i = 0; i < series.length; i++) {
    acc += Number(series[i][valKey] ?? 0);
    if (i >= window) acc -= Number(series[i - window][valKey] ?? 0);
    if (i >= window - 1) {
      series[i][outKey] = acc / window;
    } else {
      series[i][outKey] = null; // not enough data yet
    }
  }
  return series;
}

// -----------------------------------------------------------------------------
// OVERVIEW (Admin or Teacher)
// -----------------------------------------------------------------------------
router.get("/overview", authenticate, async (req, res) => {
  try {
    if (req.user.role !== "admin" && req.user.role !== "teacher") {
      return res.status(403).json({ error: "forbidden" });
    }

    const { from, to } = dateRangeFromQuery(req);
    const bucket = ["day", "week", "month"].includes(req.query.bucket) ? req.query.bucket : "day";
    const tz = "Asia/Jerusalem";

    const teacherId = req.user.role === "teacher" ? toId(req.user.id) : toId(req.query.teacherId);
    const courseId  = toId(req.query.courseId);
    const studentId = req.user.role === "admin" ? toId(req.query.studentId) : null;

    const lessonMatch = { date: { $gte: from, $lte: to } };
    if (teacherId) lessonMatch.teacherId = teacherId;
    if (courseId)  lessonMatch.courseId  = courseId;
    if (studentId) lessonMatch.studentId = studentId;

    // ---- 1) Lessons time series ----
    const lessonsTS = await Lesson.aggregate([
      { $match: lessonMatch },
      { $group: { _id: bucketStage("date", bucket, tz), count: { $sum: 1 } } },
      { $sort: { _id: 1 } },
    ]);

    // ---- 2) Approved enrollments time series ----
    const approvalsPipeline = [
      {
        $match: {
          status: "approved",
          $or: [
            { approvedAt: { $gte: from, $lte: to } },
            // fallback to updatedAt if approvedAt missing
            { $and: [{ approvedAt: { $exists: false } }, { updatedAt: { $gte: from, $lte: to } }] },
          ],
        },
      },
    ];
    if (courseId || teacherId) {
      approvalsPipeline.push(
        { $lookup: { from: "courses", localField: "courseId", foreignField: "_id", as: "course" } },
        { $unwind: "$course" }
      );
    }
    if (courseId) approvalsPipeline.push({ $match: { courseId } });
    if (teacherId) approvalsPipeline.push({ $match: { "course.teacherId": teacherId } });
    approvalsPipeline.push(
      { $addFields: { _when: { $ifNull: ["$approvedAt", "$updatedAt"] } } },
      { $group: { _id: bucketStage("_when", bucket, tz), count: { $sum: 1 } } },
      { $sort: { _id: 1 } }
    );
    const approvalsTS = await Enrollment.aggregate(approvalsPipeline);

    // ---- 3) Attendance rate time series (completed lessons) ----
    const attendanceTS = await Lesson.aggregate([
      { $match: { ...lessonMatch, status: "completed" } },
      {
        $group: {
          _id: bucketStage("date", bucket, tz),
          present: { $sum: { $cond: ["$attended", 1, 0] } },
          total: { $sum: 1 },
        },
      },
      { $project: { rate: { $cond: [{ $gt: ["$total", 0] }, { $divide: ["$present", "$total"] }, 0] } } },
      { $sort: { _id: 1 } },
    ]);

    // ---- 4) Average rating time series (if Feedback model exists) ----
    let ratingTS = [];
    if (Feedback) {
      const fbPipeline = [
        { $match: { createdAt: { $gte: from, $lte: to }, rating: { $ne: null } } },
      ];
      if (teacherId || courseId) {
        fbPipeline.push(
          { $lookup: { from: "lessons", localField: "lessonId", foreignField: "_id", as: "lesson" } },
          { $unwind: "$lesson" }
        );
        const fbExtra = {};
        if (teacherId) fbExtra["lesson.teacherId"] = teacherId;
        if (courseId)  fbExtra["lesson.courseId"]  = courseId;
        if (Object.keys(fbExtra).length) fbPipeline.push({ $match: fbExtra });
      }
      fbPipeline.push(
        { $group: { _id: bucketStage("createdAt", bucket, tz), avg: { $avg: "$rating" }, n: { $sum: 1 } } },
        { $sort: { _id: 1 } },
      );
      ratingTS = await mongoose.model("Feedback").aggregate(fbPipeline);
    }

    // ---- 5) Student performance time series (if Performance model exists) ----
    // Normalized to percentage (score/maxScore) for the series.
    let performanceTS = [];
    if (Performance) {
      const perfMatch = { date: { $gte: from, $lte: to } };
      if (teacherId) perfMatch.teacherId = teacherId;
      if (courseId)  perfMatch.courseId  = courseId;
      if (studentId) perfMatch.studentId = studentId;

      performanceTS = await Performance.aggregate([
        { $match: perfMatch },
        {
          $group: {
            _id: bucketStage("date", bucket, tz),
            avgPct: {
              $avg: {
                $cond: [
                  { $gt: ["$maxScore", 0] },
                  { $divide: ["$score", "$maxScore"] },
                  null
                ]
              }
            },
            n: { $sum: 1 },
          },
        },
        { $sort: { _id: 1 } },
      ]);
    }

    // ---- 6) Status breakdown & overall attendance ----
    const statusBreakdownAgg = await Lesson.aggregate([
      { $match: lessonMatch },
      { $group: { _id: { $ifNull: ["$status", "scheduled"] }, count: { $sum: 1 } } },
    ]);
    const statusBreakdown = statusBreakdownAgg.reduce((obj, x) => {
      obj[x._id || "unknown"] = x.count;
      return obj;
    }, {});

    const overallAttendanceAgg = await Lesson.aggregate([
      { $match: { ...lessonMatch, status: "completed" } },
      { $group: { _id: null, present: { $sum: { $cond: ["$attended", 1, 0] } }, total: { $sum: 1 } } },
      { $project: { rate: { $cond: [{ $gt: ["$total", 0] }, { $divide: ["$present", "$total"] }, 0] } } },
    ]);
    const attendanceRate = overallAttendanceAgg[0]?.rate ?? null;

    // ---- 7) Summary stats (attendance & rating & performance) ----
    const [attStatsDoc = null] = await Lesson.aggregate([
      { $match: { ...lessonMatch, status: "completed" } },
      { $project: { att: { $cond: ["$attended", 1, 0] } } },
      { $group: { _id: null, avg: { $avg: "$att" }, std: { $stdDevSamp: "$att" }, count: { $sum: 1 } } },
    ]);

    let ratingStatsDoc = null;
    if (Feedback) {
      const fbStatsPipeline = [
        { $match: { createdAt: { $gte: from, $lte: to }, rating: { $ne: null } } },
      ];
      if (teacherId || courseId) {
        fbStatsPipeline.push(
          { $lookup: { from: "lessons", localField: "lessonId", foreignField: "_id", as: "lesson" } },
          { $unwind: "$lesson" }
        );
        const fbExtra = {};
        if (teacherId) fbExtra["lesson.teacherId"] = teacherId;
        if (courseId)  fbExtra["lesson.courseId"]  = courseId;
        if (Object.keys(fbExtra).length) fbStatsPipeline.push({ $match: fbExtra });
      }
      [ratingStatsDoc = null] = await mongoose.model("Feedback").aggregate([
        ...fbStatsPipeline,
        { $group: { _id: null, avg: { $avg: "$rating" }, std: { $stdDevSamp: "$rating" }, count: { $sum: 1 } } },
      ]);
    }

    let performanceStatsDoc = null;
    if (Performance) {
      [performanceStatsDoc = null] = await Performance.aggregate([
        { $match: { date: { $gte: from, $lte: to }, ...(teacherId && { teacherId }), ...(courseId && { courseId }), ...(studentId && { studentId }) } },
        {
          $group: {
            _id: null,
            avg: {
              $avg: {
                $cond: [{ $gt: ["$maxScore", 0] }, { $divide: ["$score", "$maxScore"] }, null]
              }
            },
            std: { $stdDevSamp: "$score" }, // std over raw scores (informative)
            count: { $sum: 1 },
          },
        },
      ]);
    }

    const attendanceStats = attStatsDoc
      ? { avg: attStatsDoc.avg, std: attStatsDoc.std, count: attStatsDoc.count }
      : { avg: null, std: null, count: 0 };

    const ratingStats = ratingStatsDoc
      ? { avg: ratingStatsDoc.avg, std: ratingStatsDoc.std, count: ratingStatsDoc.count }
      : { avg: null, std: null, count: 0 };

    const performanceStats = performanceStatsDoc
      ? { avg: performanceStatsDoc.avg, std: performanceStatsDoc.std, count: performanceStatsDoc.count }
      : { avg: null, std: null, count: 0 };

    // ---- KPIs ----
    const lessonsTotal   = sum(lessonsTS, "count");
    const approvalsTotal = sum(approvalsTS, "count");
    const attendanceAvg =
      attendanceTS.length
        ? Math.round((sum(attendanceTS, "rate") / attendanceTS.length) * 100)
        : attendanceRate != null
        ? Math.round(attendanceRate * 100)
        : null;

    // ---- (Optional) trend overlays (SMA) ----
    const wantTrend = String(req.query.trend || "0") === "1";
    const smaWindow = Math.max(2, Math.min(30, parseInt(req.query.smaWindow || "7", 10)));
    let trend = null;
    if (wantTrend) {
      const clone = (arr) => JSON.parse(JSON.stringify(arr || []));
      const t = {};
      t.lessons     = addSMA(clone(lessonsTS),   "count", "sma", smaWindow);
      t.approvals   = addSMA(clone(approvalsTS), "count", "sma", smaWindow);
      t.attendance  = addSMA(clone(attendanceTS),"rate",  "sma", smaWindow);
      if (ratingTS?.length)       t.rating      = addSMA(clone(ratingTS),     "avg",   "sma", smaWindow);
      if (performanceTS?.length)  t.performance = addSMA(clone(performanceTS),"avgPct","sma", smaWindow);
      trend = t;
    }

    // ---- Response ----
    res.json({
      range: { from, to, bucket, tz },
      series: {
        lessons: lessonsTS,
        approvals: approvalsTS,
        attendanceRate: attendanceTS, // [{ _id, rate }]
        avgRating: ratingTS,          // [{ _id, avg, n }]
        performance: performanceTS,   // [{ _id, avgPct, n }]
      },
      trend,                           // same shapes with {sma}
      kpis: { lessonsTotal, approvalsTotal, attendanceAvg },
      stats: { attendance: attendanceStats, rating: ratingStats, performance: performanceStats },
      statusBreakdown,
      attendanceRate, // legacy
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "analytics_failed", details: err.message });
  }
});

// -----------------------------------------------------------------------------
// SERIES (compat)
// -----------------------------------------------------------------------------
router.get("/series", authenticate, async (req, res) => {
  const from = req.query.from ? new Date(req.query.from) : new Date(Date.now() - 30*24*3600*1000);
  const to   = req.query.to   ? new Date(req.query.to)   : new Date();
  const { teacherId, courseId, studentId } = req.query;

  const bucket = ["day", "week", "month"].includes(req.query.bucket) ? req.query.bucket : "day";
  const tz = "Asia/Jerusalem";

  const match = { date: { $gte: from, $lte: to }, status: "completed" };
  if (teacherId && toId(teacherId)) match.teacherId = toId(teacherId);
  if (courseId  && toId(courseId))  match.courseId  = toId(courseId);
  if (studentId && toId(studentId)) match.studentId = toId(studentId);

  const data = await Lesson.aggregate([
    { $match: match },
    { $group: { _id: bucketStage("date", bucket, tz), present: { $sum: { $cond: ["$attended", 1, 0] } }, total: { $sum: 1 } } },
    { $project: { date: "$_id", count: "$total", attended: "$present", rate: { $cond: [{ $gt: ["$total", 0] }, { $divide: ["$present", "$total"] }, 0] }, _id: 0 } },
    { $sort: { date: 1 } },
  ]);

  res.json(data);
});

module.exports = router;
