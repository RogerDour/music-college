const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { authenticate, authorize } = require("../middleware/auth");
const Task = require("../models/Task");
const Submission = require("../models/TaskSubmission");

const router = express.Router();

// Teacher creates a task
router.post("/", authenticate, authorize("teacher","admin"), async (req, res) => {
  const { courseId, title, description = "", dueAt } = req.body || {};
  if (!courseId || !title) return res.status(400).json({ error: "courseId and title required" });
  const doc = await Task.create({ courseId, teacherId: req.user.id, title, description, dueAt });
  res.json(doc);
});

// List tasks for a course (both roles)
router.get("/", authenticate, async (req, res) => {
  const { courseId } = req.query;
  const q = courseId ? { courseId } : {};
  const items = await Task.find(q).sort({ createdAt: -1 }).lean();
  res.json(items);
});

// Upload submission
const subDir = path.join(process.cwd(), "uploads", "submissions");
fs.mkdirSync(subDir, { recursive: true });
const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, subDir),
  filename: (_, file, cb) => cb(null, Date.now() + "-" + Math.round(Math.random()*1e9) + path.extname(file.originalname))
});
const fileFilter = (_, file, cb) => cb(null, /octet-stream|pdf|zip|msword|officedocument|image/.test(file.mimetype));
const upload = multer({ storage, limits: { fileSize: 10*1024*1024 }, fileFilter });

router.post("/:taskId/submit", authenticate, authorize("student","admin"), upload.single("file"), async (req, res) => {
  const { taskId } = req.params;
  if (!req.file) return res.status(400).json({ error: "No file" });
  const sub = await Submission.create({
    taskId,
    studentId: req.user.id,
    filename: req.file.filename,
    originalName: req.file.originalname,
    mimetype: req.file.mimetype,
    size: req.file.size,
    url: `/uploads/submissions/${req.file.filename}`
  });
  res.json(sub);
});

// Teacher updates submission status
router.post("/:taskId/submissions/:id/status", authenticate, authorize("teacher","admin"), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body || {};
  await Submission.findByIdAndUpdate(id, { status });
  res.json({ ok: true });
});

// List submissions for a task
router.get("/:taskId/submissions", authenticate, async (req, res) => {
  const { taskId } = req.params;
  const items = await Submission.find({ taskId }).populate("studentId", "name email").sort({ createdAt: -1 }).lean();
  res.json(items);
});

module.exports = router;
