// server/index.js
// Entry point for the API + Socket.IO server.
// 1) Auto-join the user's personal room (no more client-side "identify" needed)
// 2) Clear sections and comments for easier maintenance
// 3) Legacy chat semantics still supported

const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "../.env") });

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");

const passport = require("passport");
require("./passport");
const session = require("cookie-session");

const http = require("http");
const { Server } = require("socket.io");

const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT_SECRET || "change_me";

// ---------- Routes & Services ----------
const userRoutes = require("./routes/users");
const courseRoutes = require("./routes/course");
const authRoutes = require("./routes/auth");
const oauthRoutes = require("./routes/oauth");
const profileRoutes = require("./routes/profile");
const lessonRoutes = require("./routes/lesson");
const availabilityRoutes = require("./routes/availability");
const materialsRoutes = require("./routes/materials");
const { authenticate, authorize } = require("./middleware/auth");
const messagesRoutes = require("./routes/messages");
const Message = require("./models/Message");
const notificationsRoutes = require("./routes/notifications");
const analyticsRoutes = require("./routes/analytics");
const requestRoutes = require("./routes/requests");
const enrollmentRoutes = require("./routes/enrollments");
const calendarRoutes = require("./routes/calendar");
const feedbackRoutes = require("./routes/feedback"); // ← feedback router

const Course = require("./models/Course");

const { metricsMiddleware, metricsRoute } = require("./middleware/metrics");
const { startReminderWorker } = require("./services/reminders");
const { startAlertsWorker } = require("./services/alerts");
const alertsRoutes = require("./routes/alerts");
const reportsCustomRoutes = require("./routes/reports_custom");
const settingsRoutes = require("./routes/settings");
const uploadRoutes = require("./routes/upload");
const tasksRoutes = require("./routes/tasks");
const announcementsRoutes = require("./routes/announcements");
const studentsRoutes = require("./routes/students");

// ---------- App & Middleware ----------
const app = express();

const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";
app.use(cors({ origin: CLIENT_ORIGIN, credentials: true }));
app.use(express.json());

// Cookie session (for OAuth)
app.use(
  session({
    secret: process.env.SESSION_SECRET || "secret",
    resave: false,
    saveUninitialized: false,
  })
);

// Passport
app.use(passport.initialize());
app.use(passport.session());

// Metrics + DEV uploads
app.use(metricsMiddleware);
app.use("/uploads", express.static(path.join(process.cwd(), "uploads")));

// ---------- HTTP Routes ----------

// OAuth + auth (kept compatible with your existing mounts)
app.use("/auth", oauthRoutes);
app.use("/api/auth", oauthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/auth", oauthRoutes);
app.use("/auth", oauthRoutes);

// Core API
app.use("/api/users", userRoutes);
app.use("/api/courses", courseRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/lessons", lessonRoutes);
app.use("/api/availability", availabilityRoutes);
app.use("/api/materials", materialsRoutes);
app.use("/api/messages", messagesRoutes);
app.use("/api/notifications", notificationsRoutes);
app.use("/api/settings", settingsRoutes);
app.use("/api/reports/custom", reportsCustomRoutes);
app.use("/api/alerts", alertsRoutes);
app.use("/api/analytics/alerts", require("./routes/alertsAnalytics"));
app.use("/api/upload", uploadRoutes);
app.use("/api/tasks", tasksRoutes);
app.use("/api/announcements", announcementsRoutes);
app.use("/api/students", studentsRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/requests", requestRoutes);
app.use("/api/enrollments", enrollmentRoutes);
app.use("/api/calendar", calendarRoutes);
app.use("/api/reports", analyticsRoutes);          // historic alias
app.use("/api/feedback", feedbackRoutes);          // ← ✅ added back
app.get("/metrics", metricsRoute);                 // ← optional, if you use it

// Simple tests
app.get("/", (req, res) => res.send("Music College API is running"));
app.get("/api/test", authenticate, authorize("admin"), (req, res) =>
  res.json({ message: "✅ Admin test passed! Hello " + req.user.role })
);
app.get("/api/dashboard", authenticate, (req, res) =>
  res.json({ message: `Hello ${req.user.role}, your ID is ${req.user.id}` })
);

// ---------- MongoDB ----------
const MONGO_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/music_college";
mongoose
  .connect(MONGO_URI)
  .then(() => console.log("✅ Connected to MongoDB"))
  .catch((err) => console.error("❌ MongoDB connection error:", err));

// ---------- Socket.IO ----------
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: CLIENT_ORIGIN, credentials: true },
});
app.set("io", io);

// 1) JWT handshake authentication for sockets
io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token"));
    const payload = jwt.verify(token, JWT_SECRET);
    socket.user = {
      id: String(payload.id),
      role: payload.role,
      name: payload.name,
    };
    next();
  } catch (e) {
    next(new Error("Auth failed"));
  }
});

// Helpers
function isObjectId(s) {
  return typeof s === "string" && /^[a-f\d]{24}$/i.test(s);
}
function normalizeRoomId(roomId) {
  if (!roomId) return null;
  const raw = String(roomId);
  if (raw.startsWith("course:") || raw.startsWith("private:")) return raw;

  // legacy private "A:B" -> stable ordering
  if (raw.includes(":")) {
    const [a, b] = raw.split(":").map(String);
    if (a && b) return a < b ? `private:${a}:${b}` : `private:${b}:${a}`;
  }
  if (isObjectId(raw)) return `course:${raw}`; // legacy course id
  return raw;
}
async function isCourseMember(userId, role, courseId) {
  if (!courseId) return false;
  if (role === "admin") return true;

  const course = await require("./models/Course")
    .findById(courseId)
    .select("teacherId students")
    .lean();
  if (!course) return false;

  const uid = String(userId);
  const isTeacher = course.teacherId && String(course.teacherId) === uid;
  const isStudent =
    Array.isArray(course.students) &&
    course.students.some((s) => String(s) === uid);

  return isTeacher || isStudent;
}

// 2) Connection handler
io.on("connection", (socket) => {
  console.log("🔌 Socket connected:", socket.id, "user:", socket.user?.id);

  // Auto-join the user's personal room for notifications
  if (socket.user?.id) {
    socket.join(String(socket.user.id));
  }

  // (Legacy support) explicit identify
  socket.on("identify", (userId) => {
    if (!userId) return;
    socket.join(String(userId));
  });

  // Join a chat room (new API)
  socket.on("joinRoom", async ({ roomId }) => {
    const finalId = normalizeRoomId(roomId);
    if (!finalId) return;

    // Guard course rooms
    if (finalId.startsWith("course:")) {
      const courseId = finalId.split(":")[1];
      const ok = await isCourseMember(
        socket.user?.id,
        socket.user?.role,
        courseId
      );
      if (!ok) return;
    }

    console.log(`joinRoom -> ${finalId} by ${socket.user?.id}`);
    socket.join(finalId);
  });

  // Join a chat room (legacy API)
  socket.on("join", async (roomId) => {
    const finalId = normalizeRoomId(roomId);
    if (!finalId) return;

    if (finalId.startsWith("course:")) {
      const courseId = finalId.split(":")[1];
      const ok = await isCourseMember(
        socket.user?.id,
        socket.user?.role,
        courseId
      );
      if (!ok) return;
    }

    console.log(`join (legacy) -> ${finalId} by ${socket.user?.id}`);
    socket.join(finalId);
  });

  // Create & broadcast a chat message
  async function handleSend({ roomId, text }) {
    const finalId = normalizeRoomId(roomId);
    if (!finalId || !text || !String(text).trim()) return;

    // Guards
    if (finalId.startsWith("course:")) {
      const courseId = finalId.split(":")[1];
      const ok = await isCourseMember(
        socket.user?.id,
        socket.user?.role,
        courseId
      );
      if (!ok) return;
    }
    if (finalId.startsWith("private:")) {
      const [, uA, uB] = finalId.split(":");
      const me = String(socket.user?.id);
      if (me !== uA && me !== uB) return;
    }

    const saved = await Message.create({
      roomId: finalId,
      from: String(socket.user?.id),
      text: String(text).trim(),
    });
    const populated = await saved.populate("from", "name");

    io.to(finalId).emit("message", populated);
  }

  socket.on("sendMessage", (payload, ack) =>
    Promise.resolve(handleSend(payload))
      .then(() => ack?.({ ok: true }))
      .catch(() => ack?.({ ok: false }))
  );

  socket.on("message", (payload) => handleSend(payload)); // legacy

  socket.on("disconnect", () => {
    console.log("🔌 Socket disconnected:", socket.id);
  });
});

// ---------- Server start & workers ----------
const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== "test") {
  server.listen(PORT, () => {
    console.log(`🚀 Server + WS running on port ${PORT}`);
    startReminderWorker(io, { windowMin: 60 });
    startAlertsWorker(io);
  });
}

module.exports = { app, server };
