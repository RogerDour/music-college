// server/routes/feedback.js
const express = require("express");
const mongoose = require("mongoose");
const { authenticate, authorize } = require("../middleware/auth");
const Lesson = require("../models/Lesson");
const Feedback = require("../models/Feedback");

const router = express.Router();

const toId = (v) => {
  const s = String(v || "");
  return mongoose.Types.ObjectId.isValid(s) ? new mongoose.Types.ObjectId(s) : null;
};
const num = (v, def) => (v === undefined ? def : Number(v));
const parseYmd = (s) => {
  if (!s) return null;
  const [y, m, d] = s.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(Date.UTC(y, m - 1, d, 0, 0, 0, 0));
};

/**
 * POST /api/feedback
 * body: { lessonId, rating (1..5), comment? }
 * rule: only the lesson's student may rate, and only if status=completed
 */
router.post("/", authenticate, async (req, res) => {
  try {
    const { lessonId, rating, comment } = req.body || {};
    const me = String(req.user?.id || "");

    if (!lessonId || rating == null) {
      return res.status(400).json({ error: "missing_fields" });
    }
    const r = Number(rating);
    if (!(r >= 1 && r <= 5)) {
      return res.status(400).json({ error: "invalid_rating" });
    }

    const lesson = await Lesson.findById(lessonId).select("studentId status");
    if (!lesson) return res.status(404).json({ error: "lesson_not_found" });

    const studentId = String(lesson.studentId || "");
    if (studentId !== me) {
      return res.status(403).json({ error: "not_your_lesson" });
    }
    if (lesson.status !== "completed") {
      return res.status(400).json({ error: "not_completed" });
    }

    const fb = await Feedback.create({
      lessonId,
      studentId: lesson.studentId,
      rating: r,
      comment: (comment || "").trim(),
    });

    res.json({ ok: true, feedback: fb });
  } catch (e) {
    if (e?.code === 11000) {
      return res.status(409).json({ error: "already_rated" });
    }
    console.error(e);
    res.status(500).json({ error: "feedback_failed", details: e.message });
  }
});

/**
 * GET /api/feedback/lesson/:lessonId/mine
 * Returns whether the logged-in user already left feedback for this lesson.
 */
router.get("/lesson/:lessonId/mine", authenticate, async (req, res) => {
  try {
    const { lessonId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(lessonId)) {
      return res.status(400).json({ error: "invalid_lesson_id" });
    }

    const fb = await Feedback.findOne({
      lessonId: new mongoose.Types.ObjectId(lessonId),
      studentId: req.user.id,
    })
      .select("_id rating comment createdAt")
      .lean();

    if (!fb) return res.json({ exists: false });
    res.json({ exists: true, feedback: fb });
  } catch (e) {
    console.error("GET /feedback/lesson/:lessonId/mine error:", e);
    res.status(500).json({ error: "check_failed", details: e.message });
  }
});

/**
 * GET /api/feedback/teacher/:teacherId/summary
 * Returns { average: number|null, count: number }
 */
router.get("/teacher/:teacherId/summary", authenticate, async (req, res) => {
  try {
    const { teacherId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(teacherId)) {
      return res.status(400).json({ error: "invalid_teacher_id" });
    }

    const result = await Feedback.aggregate([
      {
        $lookup: {
          from: "lessons",
          localField: "lessonId",
          foreignField: "_id",
          as: "lesson",
        },
      },
      { $unwind: "$lesson" },
      { $match: { "lesson.teacherId": new mongoose.Types.ObjectId(teacherId) } },
      { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);

    if (!result.length) return res.json({ average: null, count: 0 });

    const average = Math.round(result[0].avg * 10) / 10;
    res.json({ average, count: result[0].count });
  } catch (e) {
    console.error("summary error", e);
    res.status(500).json({ error: "summary_failed", details: e.message });
  }
});

/**
 * GET /api/feedback
 * Admin list with filters + pagination.
 * Query:
 *  - from=YYYY-MM-DD, to=YYYY-MM-DD (by createdAt)
 *  - teacherId, studentId, courseId (via lesson join)
 *  - ratingMin, ratingMax
 *  - q  (regex search in comment)
 *  - sort (e.g. -createdAt, rating)
 *  - page, limit
 */
router.get("/", authenticate, authorize("admin"), async (req, res) => {
  try {
    // Dates (createdAt)
    const from = parseYmd(req.query.from);
    const toRaw = parseYmd(req.query.to);
    const to =
      toRaw && new Date(toRaw.getTime() + 24 * 3600 * 1000 - 1); // end-of-day

    // IDs
    const teacherId = toId(req.query.teacherId);
    const studentId = toId(req.query.studentId);
    const courseId = toId(req.query.courseId); // only effective if lessons have courseId

    // Numbers & search
    const ratingMin = Number.isFinite(+req.query.ratingMin)
      ? Number(req.query.ratingMin)
      : undefined;
    const ratingMax = Number.isFinite(+req.query.ratingMax)
      ? Number(req.query.ratingMax)
      : undefined;
    const q = (req.query.q || "").trim();

    // Pagination & sort
    const page = Math.max(1, num(req.query.page, 1));
    const limit = Math.min(100, Math.max(1, num(req.query.limit, 20)));
    const skip = (page - 1) * limit;

    const sortParam = String(req.query.sort || "-createdAt");
    const sort = {};
    sort[sortParam.replace("-", "")] = sortParam.startsWith("-") ? -1 : 1;

    // Build pipeline
    const pipeline = [];

    // Base match on Feedback (createdAt, rating range, studentId, comment search)
    const baseMatch = {};
    if (from || to) {
      baseMatch.createdAt = {};
      if (from) baseMatch.createdAt.$gte = from;
      if (to) baseMatch.createdAt.$lte = to;
    }
    if (Number.isFinite(ratingMin)) baseMatch.rating = { ...(baseMatch.rating || {}), $gte: ratingMin };
    if (Number.isFinite(ratingMax)) baseMatch.rating = { ...(baseMatch.rating || {}), $lte: ratingMax };
    if (studentId) baseMatch.studentId = studentId;
    if (q) baseMatch.comment = { $regex: q, $options: "i" };

    if (Object.keys(baseMatch).length) pipeline.push({ $match: baseMatch });

    // Join lesson (always, so we can project context)
    pipeline.push(
      {
        $lookup: {
          from: "lessons",
          localField: "lessonId",
          foreignField: "_id",
          as: "lesson",
        },
      },
      { $unwind: "$lesson" }
    );

    // Optional filters via lesson
    const lessonMatch = {};
    if (teacherId) lessonMatch["lesson.teacherId"] = teacherId;
    if (courseId) lessonMatch["lesson.courseId"] = courseId; // only if lessons have courseId
    if (Object.keys(lessonMatch).length) pipeline.push({ $match: lessonMatch });

    // Join teacher & student user docs for display
    pipeline.push(
      {
        $lookup: {
          from: "users",
          localField: "lesson.teacherId",
          foreignField: "_id",
          as: "teacher",
        },
      },
      { $unwind: { path: "$teacher", preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: "users",
          localField: "studentId",
          foreignField: "_id",
          as: "student",
        },
      },
      { $unwind: { path: "$student", preserveNullAndEmptyArrays: true } }
    );

    // Sort, paginate, and count
    pipeline.push(
      { $sort: sort },
      {
        $facet: {
          items: [
            { $skip: skip },
            { $limit: limit },
            {
              $project: {
                _id: 1,
                rating: 1,
                comment: 1,
                createdAt: 1,
                lesson: {
                  _id: "$lesson._id",
                  date: "$lesson.date",
                  status: "$lesson.status",
                  courseId: "$lesson.courseId",
                },
                teacher: {
                  _id: "$teacher._id",
                  name: "$teacher.name",
                  email: "$teacher.email",
                },
                student: {
                  _id: "$student._id",
                  name: "$student.name",
                  email: "$student.email",
                },
              },
            },
          ],
          meta: [{ $count: "total" }],
        },
      }
    );

    const [result] = await Feedback.aggregate(pipeline);
    const items = result?.items || [];
    const total = result?.meta?.[0]?.total || 0;

    res.json({
      page,
      limit,
      total,
      pages: Math.ceil(total / limit) || 1,
      items,
    });
  } catch (e) {
    console.error("GET /feedback error:", e);
    res.status(500).json({ error: "list_failed", details: e.message });
  }
});

module.exports = router;
