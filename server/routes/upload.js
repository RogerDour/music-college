const express = require("express");
const multer = require("multer");
const fs = require("fs");
const path = require("path");
const { authenticate } = require("../middleware/auth");
const User = require("../models/User");
const Course = require("../models/Course");            // 👈 add
const router = express.Router();

const AVATAR_DIR = path.join(process.cwd(), "uploads", "avatars");
const COURSE_DIR = path.join(process.cwd(), "uploads", "course_covers"); // 👈 add
fs.mkdirSync(AVATAR_DIR, { recursive: true });
fs.mkdirSync(COURSE_DIR, { recursive: true });                              // 👈 add

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // route decides dir via req._uploadDir
    cb(null, req._uploadDir || AVATAR_DIR);
  },
  filename: (req, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_")),
});
const upload = multer({ storage });

router.post("/avatar", authenticate, (req, _res, next) => {
  req._uploadDir = AVATAR_DIR;
  next();
}, upload.single("file"), async (req, res) => {
  const rel = `/uploads/avatars/${req.file.filename}`;
  await User.findByIdAndUpdate(req.user.id, { $set: { avatar: rel } });
  res.json({ ok: true, path: rel });
});

// NEW: course cover upload (teacher who owns the course OR admin)
router.post("/course-cover/:courseId", authenticate, async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const filter = req.user.role === "teacher"
      ? { _id: courseId, teacherId: req.user.id }
      : { _id: courseId };

    const course = await Course.findOne(filter).select("_id");
    if (!course) return res.status(404).json({ error: "course_not_found_or_forbidden" });

    req._uploadDir = COURSE_DIR;
    next();
  } catch (e) {
    return res.status(400).json({ error: "bad_request" });
  }
}, upload.single("file"), async (req, res) => {
  const rel = `/uploads/course_covers/${req.file.filename}`;
  await Course.findByIdAndUpdate(req.params.courseId, { $set: { coverUrl: rel } });
  res.json({ ok: true, path: rel });
});

module.exports = router;
