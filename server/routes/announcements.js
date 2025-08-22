const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const Announcement = require("../models/Announcement");
const { pushNotification } = require("../services/notify");

const router = express.Router();

// Public list (optional auth for audience filtering later)
router.get("/", authenticate, async (req, res) => {
  const items = await Announcement.find({ publishAt: { $lte: new Date() } }).sort({ publishAt: -1 }).limit(100).lean();
  res.json(items);
});

// Admin create
router.post("/", authenticate, authorize("admin"), async (req, res) => {
  const { title, body, audience = "all", publishAt = new Date() } = req.body || {};
  const doc = await Announcement.create({ title, body, audience, publishAt, authorId: req.user.id });
  // Inform users via notifications channel (best-effort)
  await pushNotification(req.app.get("io"), { userId: req.user.id, type: "system", title: `Announcement: ${title}`, body, data: { id: doc._id }});
  res.json(doc);
});

// Admin delete
router.delete("/:id", authenticate, authorize("admin"), async (req, res) => {
  await Announcement.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
});

module.exports = router;
