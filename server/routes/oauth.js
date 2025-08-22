// server/routes/oauth.js
const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const passport = require("passport");
const router = express.Router();

const User = require("../models/User");
const PasswordResetToken = require("../models/PasswordResetToken");
const { authenticate, authorize } = require("../middleware/auth");
const { sendMail, resetTemplate } = require("../services/mail");

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("❌ JWT_SECRET is undefined. Check your .env");
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

/* =========================
   Google OAuth (unchanged)
   ========================= */
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"], session: false }));

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: "/login", session: false }),
  (req, res) => {
    const user = req.user;
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    // Redirect back to client with ?token=...
    res.redirect(`${CLIENT_ORIGIN}?token=${encodeURIComponent(token)}`);
  }
);

/* =========================
   Local auth: signup/login
   ========================= */
// POST /api/auth/signup
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password, role } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Name, email and password are required" });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      password: hashed,
      role: role || "student",
    });
    res.status(201).json({ ok: true, user: { _id: user._id, name: user.name, email: user.email, role: user.role } });
  } catch (e) {
    console.error("signup error", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// POST /api/auth/login
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "Email and password are required" });

    const user = await User.findOne({ email });
    if (!user || !user.password) return res.status(400).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({
      token,
      user: { _id: user._id, name: user.name, email: user.email, role: user.role, avatar: user.avatar || "" },
    });
  } catch (e) {
    console.error("login error", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/auth/profile (protected)
router.get("/profile", authenticate, authorize("admin", "teacher", "student"), async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (e) {
    console.error("profile error", e);
    res.status(500).json({ error: "Internal server error" });
  }
});

/* =========================
   Forgot / Reset password
   ========================= */
// POST /api/auth/forgot { email }
router.post("/forgot", async (req, res) => {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "email required" });

    const user = await User.findOne({ email }).select("_id email");
    // Always return ok to prevent email enumeration
    if (!user) {
      console.log("[auth/forgot] (no user) email:", email);
      return res.json({ ok: true });
    }

    // create token
    const crypto = require("crypto");
    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1h

    await PasswordResetToken.create({ userId: user._id, token, expiresAt, used: false });

    const resetUrl = `${CLIENT_ORIGIN}/reset-password?token=${token}`;

    // Try sending email; if SMTP not configured, mail.js will print to console
    await sendMail({
      to: email,
      subject: "Password reset",
      html: resetTemplate({
        title: "Reset your password",
        body: `Click <a href="${resetUrl}">here</a> to reset your password.`,
      }),
    });

    console.log("[auth/forgot] Reset URL:", resetUrl);
    res.json({ ok: true });
  } catch (e) {
    console.error("forgot error", e);
    res.status(500).json({ error: "failed" });
  }
});

// POST /api/auth/reset { token, password }
router.post("/reset", async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) return res.status(400).json({ error: "token and password required" });

    const rec = await PasswordResetToken.findOne({
      token,
      used: false,
      expiresAt: { $gte: new Date() },
    });
    if (!rec) return res.status(400).json({ error: "invalid or expired token" });

    const hashed = await bcrypt.hash(password, 10);
    await User.findByIdAndUpdate(rec.userId, { password: hashed });

    rec.used = true;
    await rec.save();

    res.json({ ok: true });
  } catch (e) {
    console.error("reset error", e);
    res.status(500).json({ error: "failed" });
  }
});

/* =========================
   Dev helper (admin only)
   ========================= */
// GET /api/auth/reset/dev-latest?email=...
router.get("/reset/dev-latest", authenticate, authorize("admin"), async (req, res) => {
  try {
    const { email } = req.query || {};
    if (!email) return res.status(400).json({ error: "email required" });

    const user = await User.findOne({ email }).select("_id email");
    if (!user) return res.status(404).json({ error: "user not found" });

    const rec = await PasswordResetToken.findOne({ userId: user._id }).sort({ createdAt: -1 }).lean();
    if (!rec) return res.status(404).json({ error: "no token for user" });

    const url = `${CLIENT_ORIGIN}/reset-password?token=${rec.token}`;
    res.json({ token: rec.token, url, expiresAt: rec.expiresAt });
  } catch (e) {
    res.status(500).json({ error: "failed" });
  }
});

module.exports = router;
