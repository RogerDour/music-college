const express = require("express");
const bcrypt = require("bcryptjs");
const { authenticate, authorize } = require("../middleware/auth");
const User = require("../models/User");
const TeacherStudent = require("../models/TeacherStudent");

const router = express.Router();

// List my students (teacher)
router.get("/", authenticate, authorize("teacher","admin"), async (req, res) => {
  const qTeacher = req.user.role === "teacher" ? req.user.id : req.query.teacherId;
  if (!qTeacher) return res.status(400).json({ error: "teacherId required" });
  const items = await TeacherStudent.find({ teacherId: qTeacher }).populate("studentId", "name email").lean();
  res.json(items);
});

// Add existing student by email, or create new
router.post("/", authenticate, authorize("teacher","admin"), async (req, res) => {
  const teacherId = req.user.role === "teacher" ? req.user.id : req.body.teacherId;
  const { email, name, password = "changeme", note = "" } = req.body || {};
  if (!teacherId || !email) return res.status(400).json({ error: "teacherId and email required" });
  let student = await User.findOne({ email });
  if (!student) {
    if (!name) return res.status(400).json({ error: "name required for new student" });
    const hashed = await bcrypt.hash(password, 10);
    student = await User.create({ name, email, password: hashed, role: "student" });
  }
  const link = await TeacherStudent.findOneAndUpdate(
    { teacherId, studentId: student._id },
    { $setOnInsert: { note } },
    { new: true, upsert: true }
  );
  res.json({ ok: true, student, link });
});

// Update note
router.put("/:studentId", authenticate, authorize("teacher","admin"), async (req, res) => {
  const teacherId = req.user.role === "teacher" ? req.user.id : req.body.teacherId;
  const studentId = req.params.studentId;
  const { note = "" } = req.body || {};
  await TeacherStudent.findOneAndUpdate({ teacherId, studentId }, { note });
  res.json({ ok: true });
});

// Remove student link
router.delete("/:studentId", authenticate, authorize("teacher","admin"), async (req, res) => {
  const teacherId = req.user.role === "teacher" ? req.user.id : req.query.teacherId;
  const studentId = req.params.studentId;
  await TeacherStudent.findOneAndDelete({ teacherId, studentId });
  res.json({ ok: true });
});

module.exports = router;
