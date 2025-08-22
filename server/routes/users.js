// server/routes/users.js
//
// Users routes (organized & deduplicated)
// - Authenticated: minimal public profile, teachers list, students list (role-aware)
// - Admin-only: list/manage users
//
// NOTE: /students is ABOVE the admin guard so teachers can load their own students.

const express = require("express");
const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const { authenticate, authorize } = require("../middleware/auth");
const User = require("../models/User");

// Relations for teacher↔student
const Lesson = require("../models/Lesson");
const Course = require("../models/Course");
const Enrollment = require("../models/Enrollment");

const router = express.Router();

const VALID_ROLES = ["student", "teacher", "admin"];
const toId = (v) => (mongoose.Types.ObjectId.isValid(String(v)) ? new mongoose.Types.ObjectId(String(v)) : null);

const textSearch = (q) =>
  (q = (q || "").trim())
    ? { $or: [{ name: { $regex: q, $options: "i" } }, { email: { $regex: q, $options: "i" } }] }
    : {};

const safeUser = (u) => {
  if (!u) return u;
  const obj = u.toObject ? u.toObject() : u;
  const { password, ...rest } = obj;
  return rest;
};

// ---------------- Authenticated (read-only) ----------------

// Minimal profile
router.get("/public/:id", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("_id name email role avatar").lean();
    if (!user) return res.status(404).json({ error: "Not found" });
    res.json(user);
  } catch (e) {
    res.status(500).json({ error: "Failed to load user" });
  }
});

// Teachers (for dropdowns/autocomplete)
router.get("/teachers", authenticate, async (req, res) => {
  try {
    const rows = await User.find({ role: "teacher", ...textSearch(req.query.q) })
      .select("_id name email avatar role")
      .limit(200)
      .lean();
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Students (role-aware)
// - Admin: all students (with optional ?q)
// - Teacher: only students tied to their lessons or approved enrollments in their courses
router.get("/students", authenticate, async (req, res) => {
  try {
    const role = req.user.role;
    if (role !== "admin" && role !== "teacher") {
      return res.status(403).json({ error: "forbidden" });
    }

    if (role === "admin") {
      const rows = await User.find({ role: "student", ...textSearch(req.query.q) })
        .select("_id name email avatar role")
        .limit(500)
        .lean();
      return res.json(rows);
    }

    // Teacher
    const teacherId = toId(req.user.id);

    const fromLessons = await Lesson.distinct("studentId", {
      teacherId,
      studentId: { $ne: null },
    });

    const teacherCourseIds = await Course.distinct("_id", { teacherId });
    let fromEnrollments = [];
    if (teacherCourseIds.length) {
      fromEnrollments = await Enrollment.distinct("userId", {
        courseId: { $in: teacherCourseIds },
        status: "approved",
      });
    }

    const allowed = [...new Set([...fromLessons, ...fromEnrollments])].filter(Boolean);
    if (!allowed.length) return res.json([]);

    const rows = await User.find({ _id: { $in: allowed }, role: "student", ...textSearch(req.query.q) })
      .select("_id name email avatar role")
      .limit(500)
      .lean();

    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ---------------- Admin-only below ----------------
router.use(authenticate, authorize("admin"));

// List users (admin)
router.get("/", async (req, res) => {
  try {
    const filter = { ...textSearch(req.query.q) };
    if (req.query.role && VALID_ROLES.includes(req.query.role)) filter.role = req.query.role;
    if (typeof req.query.active !== "undefined") filter.active = String(req.query.active) === "true";
    const users = await User.find(filter).select("-password");
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Create user
router.post("/", async (req, res) => {
  try {
    const { name, email, password, role = "student" } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email, and password are required" });
    }
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: "Invalid role" });

    const existing = await User.findOne({ email });
    if (existing) return res.status(409).json({ error: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, role, active: true });
    res.status(201).json(safeUser(user));
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// Change role
router.patch("/:id/role", async (req, res) => {
  try {
    const { role } = req.body || {};
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: "Invalid role" });
    if (String(req.user.id) === String(req.params.id) && role !== "admin") {
      return res.status(400).json({ error: "You cannot change your own role to non-admin" });
    }
    const updated = await User.findByIdAndUpdate(req.params.id, { role }, { new: true, runValidators: true });
    if (!updated) return res.status(404).json({ error: "User not found" });
    res.json(safeUser(updated));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Patch basic fields
router.patch("/:id", async (req, res) => {
  try {
    const { name, email } = req.body || {};
    if (!name && !email) return res.status(400).json({ error: "Nothing to update" });

    const updates = {};
    if (typeof name  !== "undefined") updates.name  = name;
    if (typeof email !== "undefined") updates.email = email;

    const updated = await User.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true })
      .select("-password");

    if (!updated) return res.status(404).json({ error: "User not found" });
    res.json(safeUser(updated));
  } catch (error) {
    if (error?.code === 11000) return res.status(409).json({ error: "Email already in use" });
    res.status(500).json({ error: error.message });
  }
});

// Toggle active
router.patch("/:id/status", async (req, res) => {
  try {
    const { active } = req.body || {};
    if (typeof active !== "boolean") return res.status(400).json({ error: "active(boolean) is required" });
    if (String(req.user.id) === String(req.params.id) && active === false) {
      return res.status(400).json({ error: "You cannot deactivate your own account" });
    }
    const updated = await User.findByIdAndUpdate(req.params.id, { $set: { active } }, { new: true, runValidators: true })
      .select("-password");
    if (!updated) return res.status(404).json({ error: "User not found" });
    res.json(safeUser(updated));
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Delete user
router.delete("/:id", async (req, res) => {
  try {
    if (String(req.user.id) === String(req.params.id)) {
      return res.status(400).json({ error: "You cannot delete your own account" });
    }
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
