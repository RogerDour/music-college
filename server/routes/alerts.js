const express = require("express");
const { authenticate } = require("../middleware/auth");
const Alert = require("../models/Alert");
const router = express.Router();

router.get("/", authenticate, async (req, res) => {
  const items = await Alert.find({ userId: req.user.id }).sort({ createdAt: -1 }).lean();
  res.json(items);
});

router.post("/:id/seen", authenticate, async (req, res) => {
  await Alert.findOneAndUpdate({ _id: req.params.id, userId: req.user.id }, { seen: true });
  res.json({ ok: true });
});

module.exports = router;
