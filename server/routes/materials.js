// server/routes/materials.js
// -----------------------------------------------------------------------------
// Course materials routes
//
// • CREATE/UPDATE/DELETE: only the course's teacher (owner) OR admin
// • LIST/FOLDERS/DOWNLOAD: admin, course teacher, or students APPROVED
//   for that course
//
// Notes:
// - We require ?courseId=... on list/folders so we can check access.
// - Downloads enforce the same access check by looking up the material's courseId.
// -----------------------------------------------------------------------------

const express = require("express");
const path = require("path");
const fs = require("fs");
const multer = require("multer");
const { authenticate, authorize } = require("../middleware/auth");
const Material = require("../models/Material");
const Course = require("../models/Course");
// If your Enrollment model is named differently, adjust this import:
const Enrollment = require("../models/Enrollment");

const router = express.Router();

// -----------------------------------------------------------------------------
// Upload dir + Multer
// -----------------------------------------------------------------------------
const DIR = path.join(process.cwd(), "uploads", "materials");
fs.mkdirSync(DIR, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, DIR),
  filename: (_, file, cb) =>
    cb(null, Date.now() + "-" + file.originalname.replace(/\s+/g, "_")),
});

// Optional: basic file filter + size limit (10MB)
const fileFilter = (_, file, cb) => {
  const ok = /pdf|zip|octet-stream|image|msword|officedocument/.test(file.mimetype);
  cb(null, ok);
};
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// -----------------------------------------------------------------------------
// Helpers: permission checks
// -----------------------------------------------------------------------------

/**
 * Can this user MANAGE (create/update/delete) materials for the course?
 * - Admin => yes
 * - Teacher => only if they own the course
 */
async function canManageCourseMaterials({ user, courseId }) {
  if (!courseId) return false;
  if (user.role === "admin") return true;

  const course = await Course.findById(courseId).select("_id teacherId").lean();
  if (!course) return false;

  return user.role === "teacher" && String(course.teacherId) === String(user.id);
}

/**
 * Can this user VIEW (list/download) materials for the course?
 * - Admin => yes
 * - Course teacher => yes (owner)
 * - Student => only if they have an APPROVED enrollment for that course
 */
async function canViewCourseMaterials({ user, courseId }) {
  if (!courseId) return false;
  if (user.role === "admin") return true;

  const course = await Course.findById(courseId).select("_id teacherId").lean();
  if (!course) return false;

  // Course teacher may view
  if (user.role === "teacher" && String(course.teacherId) === String(user.id)) {
    return true;
  }

  // Students: require approved enrollment
  if (user.role === "student") {
    const approved = await Enrollment.findOne({
      userId: user.id,
      courseId: course._id,
      status: "approved",
    })
      .select("_id")
      .lean();

    return !!approved;
  }

  return false;
}

// -----------------------------------------------------------------------------
// CREATE  (teacher owner OR admin)
// Body: { courseId, title, notes?, folder? }, file: multipart "file"
// -----------------------------------------------------------------------------
router.post(
  "/",
  authenticate,
  authorize("teacher", "admin"),
  upload.single("file"),
  async (req, res) => {
    try {
      const { courseId, title, notes = "", folder = "" } = req.body || {};
      if (!courseId || !title || !req.file) {
        return res
          .status(400)
          .json({ error: "courseId, title and file are required" });
      }

      // Ownership check (admin passes)
      const ok = await canManageCourseMaterials({ user: req.user, courseId });
      if (!ok) return res.status(403).json({ error: "forbidden" });

      const rel = `/uploads/materials/${req.file.filename}`;
      const doc = await Material.create({
        courseId,
        uploaderId: req.user.id,
        title: String(title).trim(),
        notes: String(notes || ""),
        folder: String(folder || "").trim(),
        filename: req.file.filename,
        originalName: req.file.originalname,
        mimetype: req.file.mimetype,
        size: req.file.size,
        url: rel,
      });

      res.json(doc);
    } catch (e) {
      console.error("POST /materials error:", e);
      res.status(500).json({ error: "create_failed" });
    }
  }
);

// -----------------------------------------------------------------------------
// LIST (admin, course teacher, or approved student)
// Query: ?courseId=... [&folder=...] [&q=...]
// -----------------------------------------------------------------------------
router.get("/", authenticate, async (req, res) => {
  try {
    const { courseId, folder = "", q = "" } = req.query || {};
    if (!courseId) {
      // Require courseId so we can enforce permissions
      return res.status(400).json({ error: "courseId required" });
    }

    // Permission gate
    const allowed = await canViewCourseMaterials({ user: req.user, courseId });
    if (!allowed) return res.status(403).json({ error: "forbidden" });

    const filter = { courseId };
    if (folder) filter.folder = folder;
    if (q) filter.title = { $regex: q, $options: "i" };

    const items = await Material.find(filter)
      .sort({ folder: 1, createdAt: -1 })
      .lean();

    res.json(items);
  } catch (e) {
    console.error("GET /materials error:", e);
    res.status(500).json({ error: "list_failed" });
  }
});

// -----------------------------------------------------------------------------
// FOLDERS (admin, course teacher, or approved student)
// Query: ?courseId=...
// -----------------------------------------------------------------------------
router.get("/folders", authenticate, async (req, res) => {
  try {
    const { courseId } = req.query || {};
    if (!courseId) return res.json([]);

    const allowed = await canViewCourseMaterials({ user: req.user, courseId });
    if (!allowed) return res.status(403).json({ error: "forbidden" });

    const folders = await Material.distinct("folder", {
      courseId,
      folder: { $ne: "" },
    });

    folders.sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" })
    );

    res.json(folders);
  } catch (e) {
    console.error("GET /materials/folders error:", e);
    res.status(500).json({ error: "folders_failed" });
  }
});

// -----------------------------------------------------------------------------
// UPDATE (teacher owner OR admin)
// Body: { title?, notes?, folder? }
// -----------------------------------------------------------------------------
router.put("/:id", authenticate, authorize("teacher", "admin"), async (req, res) => {
  try {
    const mat = await Material.findById(req.params.id).lean();
    if (!mat) return res.status(404).json({ error: "not_found" });

    // Ownership check (admin passes)
    const ok = await canManageCourseMaterials({
      user: req.user,
      courseId: mat.courseId,
    });
    if (!ok) return res.status(403).json({ error: "forbidden" });

    const { title, notes, folder } = req.body || {};
    const update = {};
    if (title !== undefined) update.title = String(title).trim();
    if (notes !== undefined) update.notes = String(notes);
    if (folder !== undefined) update.folder = String(folder).trim();

    const doc = await Material.findByIdAndUpdate(req.params.id, update, { new: true });
    res.json(doc);
  } catch (e) {
    console.error("PUT /materials/:id error:", e);
    res.status(500).json({ error: "update_failed" });
  }
});

// -----------------------------------------------------------------------------
// DELETE (teacher owner OR admin)
// -----------------------------------------------------------------------------
router.delete("/:id", authenticate, authorize("teacher", "admin"), async (req, res) => {
  try {
    const mat = await Material.findById(req.params.id);
    if (!mat) return res.status(404).json({ error: "not_found" });

    // Ownership check (admin passes)
    const ok = await canManageCourseMaterials({
      user: req.user,
      courseId: mat.courseId,
    });
    if (!ok) return res.status(403).json({ error: "forbidden" });

    await mat.deleteOne();

    // Best-effort file removal
    if (mat.filename) {
      const abs = path.join(DIR, mat.filename);
      fs.promises.unlink(abs).catch(() => {});
    }

    res.json({ ok: true });
  } catch (e) {
    console.error("DELETE /materials/:id error:", e);
    res.status(500).json({ error: "delete_failed" });
  }
});

// -----------------------------------------------------------------------------
// DOWNLOAD (admin, course teacher, or approved student)
// -----------------------------------------------------------------------------
router.get("/:id/download", authenticate, async (req, res) => {
  try {
    const mat = await Material.findById(req.params.id).lean();
    if (!mat) return res.status(404).send("Not found");

    // Permission gate based on the material's course
    const allowed = await canViewCourseMaterials({
      user: req.user,
      courseId: mat.courseId,
    });
    if (!allowed) return res.status(403).send("forbidden");

    const abs = path.join(DIR, mat.filename || "");
    if (!fs.existsSync(abs)) return res.status(404).send("file_missing");

    res.download(abs, mat.originalName || mat.title || "material");
  } catch (e) {
    console.error("GET /materials/:id/download error:", e);
    res.status(500).send("download_failed");
  }
});

module.exports = router;
