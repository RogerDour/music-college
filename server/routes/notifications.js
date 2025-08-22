const express = require("express");
const { authenticate } = require("../middleware/auth");
const Notification = require("../models/Notification");

const router = express.Router();

// GET /api/notifications
router.get("/", authenticate, async (req, res) => {
  const items = await Notification.find({ userId: req.user.id })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  res.json(items);
});

// POST /api/notifications/:id/read
router.post("/:id/read", authenticate, async (req, res) => {
  await Notification.findOneAndUpdate(
    { _id: req.params.id, userId: req.user.id },
    { isRead: true }
  );
  res.json({ ok: true });
});

module.exports = router;
