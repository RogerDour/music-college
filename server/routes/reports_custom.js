const express = require("express");
const { authenticate } = require("../middleware/auth");
const ReportPreset = require("../models/ReportPreset");

const router = express.Router();

router.get("/", authenticate, async (req, res) => {
  const items = await ReportPreset.find({ userId: req.user.id }).sort({ updatedAt: -1 }).lean();
  res.json(items);
});

router.post("/", authenticate, async (req, res) => {
  const { name, filters = {} } = req.body || {};
  if (!name) return res.status(400).json({ error: "name required" });
  const doc = await ReportPreset.findOneAndUpdate({ userId: req.user.id, name }, { filters }, { upsert: true, new: true });
  res.json(doc);
});

router.delete("/:name", authenticate, async (req, res) => {
  await ReportPreset.findOneAndDelete({ userId: req.user.id, name: req.params.name });
  res.json({ ok: true });
});

module.exports = router;
