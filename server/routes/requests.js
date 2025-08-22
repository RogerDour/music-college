// server/routes/requests.js
const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const LessonRequest = require("../models/LessonRequest");
const Lesson = require("../models/Lesson");
const User = require("../models/User");
const { pushNotification } = require("../services/notify");
const {
  sendMail,
  requestCreatedTemplate,
  requestApprovedTemplate,
  requestRejectedTemplate,
} = require("../services/mail");
const { overlapExprBuffered } = require("../utils/scheduling");

const router = express.Router();

/** Student (or admin) creates a request */
router.post("/", authenticate, authorize("student", "admin"), async (req, res) => {
  const { teacherId, title = "Scheduled Lesson", start, duration = 60, studentId } = req.body || {};
  if (!teacherId || !start) return res.status(400).json({ message: "teacherId and start required" });

  const effectiveStudentId = req.user.role === "student" ? req.user.id : (studentId || req.user.id);

  const doc = await LessonRequest.create({
    teacherId,
    studentId: effectiveStudentId,
    title,
    start,
    duration
  });

  // Notify teacher (best-effort)
  try {
    const io = req.app.get("io");
    const [teacher, student] = await Promise.all([
      User.findById(teacherId).lean(),
      User.findById(effectiveStudentId).lean(),
    ]);

    await pushNotification(io, {
      userId: teacher?._id,
      type: "request_created",
      title: "New lesson request",
      body: `${student?.name || "Student"} requested ${new Date(start).toLocaleString()}`,
      data: { requestId: doc._id },
    });

    if (process.env.NODE_ENV !== "test" && teacher?.email) {
      await sendMail({
        to: teacher.email,
        subject: "New lesson request",
        html: requestCreatedTemplate({
          teacherName: teacher?.name,
          studentName: student?.name,
          start,
          duration,
        }),
      });
    }
  } catch (e) {
    console.error("request create notify/email failed", e);
  }

  res.json(doc);
});

/** Teacher lists pending requests (admin sees all) */
router.get("/", authenticate, authorize("teacher", "admin"), async (req, res) => {
  const query = req.user.role === "teacher" ? { teacherId: req.user.id, status: "pending" } : { status: "pending" };
  const items = await LessonRequest.find(query)
    .populate("studentId", "name email")
    .populate("teacherId", "name email")
    .sort({ createdAt: -1 })
    .lean();
  res.json({ items });
});

/** Approve → create Lesson, mark request approved, notify student */
router.post("/:id/approve", authenticate, authorize("teacher", "admin"), async (req, res) => {
  const { id } = req.params;
  const filter = req.user.role === "teacher" ? { _id: id, teacherId: req.user.id } : { _id: id };
  const reqDoc = await LessonRequest.findOne(filter);
  if (!reqDoc || reqDoc.status !== "pending") return res.status(404).json({ message: "Request not found" });

  const start = new Date(reqDoc.start);
  const end = new Date(start.getTime() + reqDoc.duration * 60000);
  const bufferMinutes = Number(process.env.SCHEDULING_BUFFER_MIN || 0);

  const [tClash, sClash] = await Promise.all([
    Lesson.findOne(overlapExprBuffered("teacherId", reqDoc.teacherId, start, end, bufferMinutes)).lean(),
    Lesson.findOne(overlapExprBuffered("studentId", reqDoc.studentId, start, end, bufferMinutes)).lean(),
  ]);
  if (tClash || sClash) return res.status(409).json({ message: "Time is no longer available" });

  const lesson = await Lesson.create({
    title: reqDoc.title,
    teacherId: reqDoc.teacherId,
    studentId: reqDoc.studentId,
    date: reqDoc.start,
    duration: reqDoc.duration,
    status: "scheduled",
  });

  reqDoc.status = "approved";
  await reqDoc.save();

  // Notify student (best-effort)
  try {
    const io = req.app.get("io");
    const [teacher, student] = await Promise.all([
      User.findById(reqDoc.teacherId).lean(),
      User.findById(reqDoc.studentId).lean(),
    ]);

    await pushNotification(io, {
      userId: student?._id,
      type: "request_approved",
      title: "Request approved",
      body: `With ${teacher?.name || "your teacher"} at ${new Date(reqDoc.start).toLocaleString()}`,
      data: { lessonId: lesson._id, requestId: reqDoc._id },
    });

    if (process.env.NODE_ENV !== "test" && student?.email) {
      await sendMail({
        to: student.email,
        subject: "Your lesson request was approved",
        html: requestApprovedTemplate({
          studentName: student?.name,
          teacherName: teacher?.name,
          start: reqDoc.start,
          duration: reqDoc.duration,
        }),
      });
    }
  } catch (e) {
    console.error("request approve notify/email failed", e);
  }

  res.json({ ok: true, lesson });
});

/** Reject → notify student */
router.post("/:id/reject", authenticate, authorize("teacher", "admin"), async (req, res) => {
  const { id } = req.params;
  const filter = req.user.role === "teacher" ? { _id: id, teacherId: req.user.id } : { _id: id };
  const reqDoc = await LessonRequest.findOne(filter);
  if (!reqDoc || reqDoc.status !== "pending") return res.status(404).json({ message: "Request not found" });

  reqDoc.status = "rejected";
  await reqDoc.save();

  try {
    const io = req.app.get("io");
    const [teacher, student] = await Promise.all([
      User.findById(reqDoc.teacherId).lean(),
      User.findById(reqDoc.studentId).lean(),
    ]);

    await pushNotification(io, {
      userId: student?._id,
      type: "request_rejected",
      title: "Request rejected",
      body: `With ${teacher?.name || "your teacher"} for ${new Date(reqDoc.start).toLocaleString()}`,
      data: { requestId: reqDoc._id },
    });

    if (process.env.NODE_ENV !== "test" && student?.email) {
      await sendMail({
        to: student.email,
        subject: "Your lesson request was rejected",
        html: requestRejectedTemplate({
          studentName: student?.name,
          teacherName: teacher?.name,
          start: reqDoc.start,
        }),
      });
    }
  } catch (e) {
    console.error("request reject notify/email failed", e);
  }

  res.json({ ok: true });
});

/** My requests (student sees their own; teacher sees requests to them) */
router.get("/mine", authenticate, async (req, res) => {
  try {
    const me = req.user.id;
    const role = (req.user.role || "").toLowerCase();

    let query = {};
    if (role === "student") query.studentId = me;
    else if (role === "teacher") query.teacherId = me;
    else if (role === "admin") query._id = { $exists: false }; // admin uses /api/requests

    const items = await LessonRequest.find(query)
      .populate("studentId", "name email")
      .populate("teacherId", "name email")
      .sort({ createdAt: -1 })
      .lean();

    const counts = items.reduce(
      (acc, r) => ((acc[r.status] = (acc[r.status] || 0) + 1), acc),
      { pending: 0, approved: 0, rejected: 0 }
    );

    res.json({ items, counts });
  } catch (e) {
    console.error("GET /requests/mine error:", e);
    res.status(500).json({ error: "Failed to load requests" });
  }
});

module.exports = router;
