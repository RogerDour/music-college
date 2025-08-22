const express = require("express");
const router = express.Router();
const Course = require("../models/Course");
const { authenticate, authorize } = require("../middleware/auth");

// ---------- Course CRUD ----------

// Get all courses
// GET /api/courses
router.get("/", async (req, res) => {
  try {
    const docs = await Course.find()
      .select("title instrument teacherId capacity description coverUrl createdAt updatedAt")
      .populate({ path: "teacherId", select: "name email" })
      .lean();

    const courses = docs.map((c) => {
      const teacherObj =
        c.teacherId && typeof c.teacherId === "object" ? c.teacherId : null;
      const teacherId =
        c.teacherId ? String(c.teacherId._id || c.teacherId) : null;

      return {
        ...c,
        teacher: teacherObj,   // populated { _id, name, email } (or null)
        teacherId,             // always a string (or null)
      };
    });

    res.json(courses);
  } catch (e) {
    console.error("GET /courses failed:", e);
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});


// Get a single course
router.get("/:id", async (req, res) => {
  try {
    const course = await Course.findById(req.params.id);
    if (!course) return res.status(404).json({ error: "Course not found" });
    res.json(course);
  } catch (e) {
    res.status(400).json({ error: "Failed to fetch course" });
  }
});

// Create new course (teacher/admin only). Auto-assign teacher.
router.post("/", authenticate, authorize("teacher", "admin"), async (req, res) => {
  try {
    const body = req.body || {};
    const teacherId = req.user.role === "teacher"
      ? req.user.id
      : (body.teacherId || req.user.id);

    const course = new Course({
      title: body.title,
      instrument: body.instrument,
      capacity: body.capacity ?? null,
      teacherId,
    });

    await course.save();
    res.status(201).json(course);
  } catch (e) {
    res.status(400).json({ error: "Failed to create course" });
  }
});

// Update a course (teacher can edit only own course; admin any)
router.put("/:id", authenticate, authorize("teacher", "admin"), async (req, res) => {
  try {
    const filter = req.user.role === "teacher"
      ? { _id: req.params.id, teacherId: req.user.id }
      : { _id: req.params.id };

    const up = {
      // optional updates
      ...(req.body.title != null ? { title: req.body.title } : {}),
      ...(req.body.instrument != null ? { instrument: req.body.instrument } : {}),
      ...(req.body.description != null ? { description: String(req.body.description || "") } : {}),
      ...(req.body.coverUrl != null ? { coverUrl: String(req.body.coverUrl || "") } : {}),
    };

    // capacity edits stay as-is
    if ("capacity" in req.body) {
      up.capacity = (req.body.capacity === "" || req.body.capacity == null)
        ? null
        : Number(req.body.capacity);
    }

    // server/routes/course.js (inside router.put)
    if ("description" in req.body) up.description = req.body.description ?? "";
    if ("coverUrl" in req.body)   up.coverUrl   = req.body.coverUrl ?? "";

    // only admins may reassign teacher
    if (req.user.role === "admin" && req.body.teacherId) {
      up.teacherId = req.body.teacherId;
    }

    const course = await Course.findOneAndUpdate(filter, up, { new: true })
      .populate({ path: "teacherId", select: "name email" })
      .lean();

    if (!course) return res.status(404).json({ error: "Course not found" });

    // same shape as GET /
    res.json({
      ...course,
      teacher: course.teacherId && typeof course.teacherId === "object" ? course.teacherId : null,
      teacherId: course.teacherId && typeof course.teacherId === "object" ? String(course.teacherId._id) : String(course.teacherId),
    });
  } catch (e) {
    res.status(400).json({ error: "Failed to update course" });
  }
});

// Delete a course (teacher can delete only own; admin any)
router.delete("/:id", authenticate, authorize("teacher", "admin"), async (req, res) => {
  try {
    const filter = req.user.role === "teacher"
      ? { _id: req.params.id, teacherId: req.user.id }
      : { _id: req.params.id };

    const result = await Course.findOneAndDelete(filter);
    if (!result) return res.status(404).json({ error: "Course not found" });
    res.json({ message: "Course deleted" });
  } catch (e) {
    res.status(400).json({ error: "Failed to delete course" });
  }
});

module.exports = router;
