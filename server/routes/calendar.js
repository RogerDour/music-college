const express = require("express");
const router = express.Router();
const { authenticate } = require("../middleware/auth");
const Lesson = require("../models/Lesson");
const Holiday = require("../models/Holiday");
const Enrollment = require("../models/Enrollment");

router.get("/my", authenticate, async (req, res) => {
  try {
    const { from, to } = req.query;

    const range = {};
    if (from) range.$gte = new Date(from);
    if (to)   range.$lte = new Date(to);

    // Lessons where I am teacher or student
    const lessonQ = {
      ...(from || to ? { date: range } : {}),
      $or: [{ teacherId: req.user.id }, { studentId: req.user.id }],
      status: { $ne: "cancelled" },
    };

    const [lessons, holidays, myEnrolls] = await Promise.all([
      Lesson.find(lessonQ).lean(),
      Holiday.find(from || to ? { date: range } : {}).lean(),
      Enrollment.find({
        userId: req.user.id,
        status: { $in: ["approved", "waitlisted"] },
      })
        .populate("courseId", "title")
        .lean(),
    ]);

    const events = [];

    // Lessons → timed events (compute end from duration)
    for (const l of lessons) {
      const start = new Date(l.date);
      const end = new Date(start.getTime() + (l.duration || 60) * 60000);
      events.push({
        type: "lesson",
        id: String(l._id),
        title: l.title || "Lesson",
        start,
        end,
        courseId: l.courseId || null,
        meta: { teacherId: l.teacherId, studentId: l.studentId },
      });
    }

    // Holidays → all-day events
    for (const h of holidays) {
      const dayStart = new Date(h.date);
      const dayEnd = new Date(dayStart); dayEnd.setDate(dayEnd.getDate() + 1);
      events.push({
        type: "holiday",
        id: String(h._id),
        title: h.label || "Holiday",
        start: dayStart,
        end: dayEnd,
        allDay: true,
      });
    }

    // Optional: course membership reminders (no time)
    for (const e of myEnrolls) {
      events.push({
        type: "course",
        id: `course-${e._id}`,
        title: `Enrolled: ${e.courseId?.title || "Course"}`,
        start: null,
        end: null,
        allDay: false,
      });
    }

    res.json({ ok: true, events });
  } catch (err) {
    console.error("GET /api/calendar/my error:", err);
    res.status(500).json({ error: "Failed to load calendar" });
  }
});

module.exports = router;
