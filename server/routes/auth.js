// server/routes/auth.js
require("dotenv").config();

const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const passport = require("passport");

const User = require("../models/User");
const PasswordResetToken = require("../models/PasswordResetToken");
const { authenticate, authorize } = require("../middleware/auth");

const router = express.Router();

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error("❌ JWT_SECRET is undefined. Check your .env file!");

// ---------- Helpers ----------
function buildResetUrl(token, usePath = false) {
  // If your UI expects a path param, set usePath = true
  return usePath
    ? `${CLIENT_ORIGIN}/reset-password/${token}`
    : `${CLIENT_ORIGIN}/reset-password?token=${token}`;
}

// ---------- Auth (Signup/Login) ----------
router.post("/signup", async (req, res) => {
  const { name, email, password, role } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: "All fields are required" });
  }

  try {
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ error: "User already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      name,
      email,
      password: hashedPassword,
      role: role || "student",
    });

    return res.status(201).json({ message: "User created" });
  } catch (err) {
    console.error("Signup error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password)
    return res.status(400).json({ error: "Email and password are required" });

  const user = await User.findOne({ email });
  if (!user) return res.status(400).json({ error: "Invalid credentials" });
  if (!user.password)
    return res.status(500).json({ error: "Server error: User has no password" });

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

  const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: "7d" });

  return res.json({
    token,
    user: { id: user._id, name: user.name, role: user.role },
  });
});

// ---------- Profile (Protected) ----------
router.get(
  "/profile",
  authenticate,
  authorize("admin", "teacher", "student"),
  async (req, res) => {
    try {
      const user = await User.findById(req.user.id).select("-password");
      return res.json(user);
    } catch (err) {
      console.error("Profile fetch error:", err);
      return res.status(500).json({ error: "Internal server error" });
    }
  }
);

// ---------- Dashboards (Role checks) ----------
router.get("/student-dashboard", authenticate, authorize("student"), (_req, res) => {
  res.json({ message: "🎓 Welcome to the student dashboard!" });
});

router.get("/teacher-dashboard", authenticate, authorize("teacher"), (_req, res) => {
  res.json({ message: "📚 Welcome to the teacher dashboard!" });
});

router.get("/admin-dashboard", authenticate, authorize("admin"), (_req, res) => {
  res.json({ message: "🛠️ Welcome to the admin dashboard!" });
});

// ---------- Password Reset Flow ----------

// Shared handler: POST { email }
async function forgotHandler(req, res) {
  try {
    const { email } = req.body || {};
    if (!email) return res.status(400).json({ error: "email required" });

    const user = await User.findOne({ email });
    // Always respond ok to avoid user enumeration
    if (!user) return res.json({ ok: true });

    const token = crypto.randomBytes(24).toString("hex");
    const expiresAt = new Date(Date.now() + 3600 * 1000); // 1 hour
    await PasswordResetToken.create({ userId: user._id, token, expiresAt });

    const resetUrl = buildResetUrl(token, /* usePath */ false);

    // Dev visibility: always print the URL unless prod
    if (process.env.NODE_ENV !== "production") {
      console.log("[dev] Password reset URL:", resetUrl);
    }

    try {
      const { sendMail, resetTemplate } = require("../services/mail");
      const html = resetTemplate({
        title: "Reset your password",
        body: `Click <a href='${resetUrl}'>here</a> to reset your password.`,
      });
      await sendMail({ to: email, subject: "Password reset", html });
    } catch (e) {
      console.warn("email not sent:", e.message);
      // Still return ok to the client to avoid enumeration
    }

    return res.json({ ok: true });
  } catch (e) {
    console.error("forgot error", e);
    return res.status(500).json({ error: "failed" });
  }
}

// Shared handler: POST { token, password }
async function resetHandler(req, res) {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ error: "token and password required" });
    }

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

    return res.json({ ok: true });
  } catch (e) {
    console.error("reset error", e);
    return res.status(500).json({ error: "failed" });
  }
}

// Mount both names for compatibility with UI/checklist
router.post("/forgot", forgotHandler);
router.post("/forgot-password", forgotHandler);
router.post("/reset", resetHandler);
router.post("/reset-password", resetHandler);

// ---------- Google OAuth ----------
router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get(
  "/google/callback",
  passport.authenticate("google", { session: true, failureRedirect: "/login?error=google" }),
  async (req, res) => {
    try {
      const user = req.user; // set by passport
      const token = jwt.sign(
        { id: user._id, role: user.role, name: user.name },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      const url = new URL("/oauth", CLIENT_ORIGIN);
      url.searchParams.set("token", token);
      return res.redirect(url.toString());
    } catch (e) {
      console.error("Google callback error:", e);
      return res.redirect(`${CLIENT_ORIGIN}/login?error=google`);
    }
  }
);

module.exports = router;
