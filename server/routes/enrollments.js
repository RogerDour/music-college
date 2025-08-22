// server/routes/enrollments.js
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Enrollment = require("../models/Enrollment");
const Course = require("../models/Course");
const { authenticate } = require("../middleware/auth");

function uid(req) {
  return String(req?.user?._id || req?.user?.id || "");
}

async function getCounts(courseId) {
  const approved = await Enrollment.countDocuments({ courseId, status: "approved" });
  return { approved };
}

/**
 * Enroll (students default to approved unless capacity reached → waitlisted).
 * Admin/teacher may enroll another user by passing body.userId.
 */
router.post("/", authenticate, async (req, res) => {
  try {
    const { courseId, userId: bodyUserId } = req.body;
    if (!courseId) return res.status(400).json({ error: "courseId required" });

    const me = uid(req);
    if (!me) return res.status(401).json({ error: "Unauthorized" });

    const isStaff = ["admin", "teacher"].includes(req.user.role);
    const userId = isStaff && bodyUserId ? bodyUserId : me;

    const course = await Course.findById(courseId).lean();
    if (!course) return res.status(404).json({ error: "Course not found" });

    // decide initial status by capacity + role
    let status = "pending"; // ← students need manual approval by default

    if (typeof course.capacity === "number") {
    const { approved } = await getCounts(courseId);
    if (approved >= course.capacity) {
        status = "waitlisted"; // class is full
    }
    }

    if (isStaff) {
    // admins/teachers enrolling someone go straight to approved
    status = "approved";
    }

    // IMPORTANT: do not set approvedAt here
    const doc = await Enrollment.findOneAndUpdate(
    { courseId, userId },
    { $setOnInsert: { status, createdBy: me } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
    );


    res.json({ ok: true, enrollment: doc });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** Unenroll / remove */
router.delete("/:id", authenticate, async (req, res) => {
  try {
    const me = uid(req);
    if (!me) return res.status(401).json({ error: "Unauthorized" });

    const enr = await Enrollment.findById(req.params.id);
    if (!enr) return res.status(404).json({ error: "Not found" });

    const canManage = ["admin", "teacher"].includes(req.user.role);
    if (!canManage && String(enr.userId) !== me) {
      return res.status(403).json({ error: "Forbidden" });
    }
    await enr.deleteOne();
    res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

/** My enrollments */
router.get("/my", authenticate, async (req, res) => {
  const me = uid(req);
  if (!me) return res.status(401).json({ error: "Unauthorized" });

  const list = await Enrollment.find({ userId: me })
    .populate("courseId", "title description capacity")
    .lean();
  res.json({ ok: true, enrollments: list });
});

/** Roster for a course (teacher/admin) */
router.get("/roster/:courseId", authenticate, async (req, res) => {
  if (!["admin", "teacher"].includes(req.user.role))
    return res.status(403).json({ error: "Forbidden" });

  const list = await Enrollment.find({ courseId: req.params.courseId })
    .populate("userId", "name email")
    .lean();
  res.json({ ok: true, roster: list });
});

/** Update enrollment status (teacher/admin) */
router.patch("/:id", authenticate, async (req, res) => {
  if (!["admin", "teacher"].includes(req.user.role))
    return res.status(403).json({ error: "Forbidden" });

  const { status } = req.body;
  if (!["approved", "rejected", "waitlisted", "pending"].includes(status))
    return res.status(400).json({ error: "Invalid status" });

  const update = { $set: { status } };
  if (status === "approved") {
    update.$set.approvedAt = new Date();
  } else {
    update.$unset = { approvedAt: "" };
  }

  const enr = await Enrollment.findByIdAndUpdate(req.params.id, update, { new: true });
  if (!enr) return res.status(404).json({ error: "Not found" });
  res.json({ ok: true, enrollment: enr });
});


/**
 * NEW: Counts per course (approved only)
 * GET /api/enrollments/count?courseIds=ID,ID,ID
 * Returns: { counts: { "<courseId>": { approved: N } } }
 */
router.get("/count", authenticate, async (req, res) => {
  try {
    const raw = String(req.query.courseIds || "").trim();
    const ids = raw
      ? raw.split(",").map((s) => s.trim()).filter(Boolean)
      : [];

    // Build ObjectId list; allow empty to count across all (but client always sends ids)
    const objIds = ids
      .filter((id) => mongoose.isValidObjectId(id))
      .map((id) => new mongoose.Types.ObjectId(id));

    const match = { status: "approved" };
    if (objIds.length) match.courseId = { $in: objIds };

    const agg = await Enrollment.aggregate([
      { $match: match },
      { $group: { _id: "$courseId", approved: { $sum: 1 } } },
    ]);

    const counts = {};
    // zero-fill for requested ids
    for (const id of ids) counts[id] = { approved: 0 };
    // overwrite with real counts
    for (const row of agg) {
      counts[String(row._id)] = { approved: row.approved };
    }

    res.json({ counts });
  } catch (e) {
    console.error("GET /enrollments/count error:", e);
    res.status(500).json({ error: "Failed to compute counts" });
  }
});

module.exports = router;
