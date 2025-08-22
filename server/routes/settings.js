const express = require("express");
const { authenticate, authorize } = require("../middleware/auth");
const GlobalSettings = require("../models/GlobalSettings");
const { pushNotification } = require("../services/notify");
const router = express.Router();

// Get current global hours
router.get("/hours", authenticate, authorize("admin","teacher","student"), async (req, res) => {
  const latest = await GlobalSettings.findOne().sort({ updatedAt: -1 }).lean();
  res.json(latest || { openHour: 9, closeHour: 21, daysOpen: [0,1,2,3,4,5,6] });
});

// Admin update hours
router.put("/hours", authenticate, authorize("admin"), async (req, res) => {
  const { openHour=9, closeHour=21, daysOpen=[0,1,2,3,4,5,6] } = req.body || {};
  const doc = await GlobalSettings.create({ openHour, closeHour, daysOpen });
  res.json(doc);
  try { const io = req.app.get('io'); io && pushNotification(io, { userId: req.user.id, type: 'system', title: 'Global hours updated', body: `Open: ${openHour}, Close: ${closeHour}` }); } catch (e) {}
});

module.exports = router;
