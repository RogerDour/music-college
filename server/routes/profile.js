const express = require("express");
const bcrypt = require("bcryptjs");
const { authenticate } = require("../middleware/auth");
const User = require("../models/User");

const router = express.Router();

// GET /api/profile  -> current user (no password)
router.get("/", authenticate, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Profile GET error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/profile -> update current user
// Allowed fields: name, email, password (hash if provided)
// We do NOT allow role change here.
router.put("/", authenticate, async (req, res) => {
  try {
    const updates = {};
    const { name, email, password } = req.body;

    if (name) updates.name = name;
    if (email) updates.email = email;

    if (password && password.trim().length > 0) {
      updates.password = await bcrypt.hash(password, 10);
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    console.error("Profile PUT error:", err);
    // duplicate email, validation, etc.
    if (err.code === 11000) {
      return res.status(400).json({ error: "Email already in use" });
    }
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
