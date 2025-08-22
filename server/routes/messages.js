// server/routes/messages.js
const express = require("express");
const { authenticate } = require("../middleware/auth");
const Message = require("../models/Message");
const Course = require("../models/Course");

const router = express.Router();

function normalizePrivate(a, b) {
  const A = String(a), B = String(b);
  return A < B ? `private:${A}:${B}` : `private:${B}:${A}`;
}

// Same membership rule as sockets (admin, teacher, or enrolled student)
async function isCourseMember(userId, role, courseId) {
  if (!courseId) return false;
  if (role === "admin") return true;

  const course = await Course.findById(courseId)
    .select("teacherId students")
    .lean();
  if (!course) return false;

  const uid = String(userId);
  const isTeacher = course.teacherId && String(course.teacherId) === uid;
  const isStudent =
    Array.isArray(course.students) &&
    course.students.some((s) => String(s) === uid);

  return isTeacher || isStudent;
}

// GET /api/messages/:roomId?limit=50
router.get("/:roomId", authenticate, async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit || 50), 200);
    const roomId = String(req.params.roomId);

    // course rooms
    if (roomId.startsWith("course:")) {
      const courseId = roomId.split(":")[1];

      const ok = await isCourseMember(req.user.id, req.user.role, courseId);
      if (!ok)
        return res
          .status(403)
          .json({ error: "Not a participant in this course" });

      const msgs = await Message.find({ roomId })
        .sort({ createdAt: 1 })
        .limit(limit)
        .populate("from", "name")
        .lean();
      return res.json(msgs);
    }

    // private rooms: support "private:A:B" and legacy "A:B"
    if (roomId.includes(":")) {
      let legacy = roomId;
      let normalized = roomId;
      if (!roomId.startsWith("private:")) {
        const [a, b] = roomId.split(":");
        normalized = normalizePrivate(a, b);
      } else {
        const [, a, b] = roomId.split(":");
        legacy = `${a}:${b}`;
      }

      // requester must be one of the two users
      const me = String(req.user.id);
      const [, uA, uB] = normalized.split(":");
      if (me !== uA && me !== uB) {
        return res
          .status(403)
          .json({ error: "Not a participant in this room" });
      }

      const msgs = await Message.find({
        roomId: { $in: [legacy, normalized] },
      })
        .sort({ createdAt: 1 })
        .limit(limit)
        .populate("from", "name")
        .lean();
      return res.json(msgs);
    }

    // fallback
    const msgs = await Message.find({ roomId })
      .sort({ createdAt: 1 })
      .limit(limit)
      .populate("from", "name")
      .lean();
    res.json(msgs);
  } catch (e) {
    console.error("GET /api/messages error:", e);
    res.status(500).json({ error: "Failed to load messages" });
  }
});

module.exports = router;
