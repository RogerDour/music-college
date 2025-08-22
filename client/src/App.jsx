// client/src/App.jsx

// ------------------------------
// React & Router
// ------------------------------
import { Routes, Route, useNavigate, useParams } from "react-router-dom";
import { useEffect } from "react";
import axios from "axios";

// ------------------------------
// Pages (keep alphabetized within groups where possible)
// ------------------------------
// Public
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import OAuthLanding from "./pages/OAuthLanding";

// All roles (inside ProtectedLayout)
import Dashboard from "./pages/Dashboard";
import Profile from "./pages/Profile";
import SuggestLesson from "./pages/SuggestLesson";
import Availability from "./pages/Availability";
import Notifications from "./pages/Notifications";
import MyCourses from "./pages/MyCourses";
import Calendar from "./pages/Calendar";
import Chat from "./pages/Chat";
import CourseChat from "./pages/CourseChat";
import Courses from "./pages/Courses";
import CourseMaterials from "./pages/CourseMaterials";
import MaterialsListWrapper from "./pages/MaterialsListWrapper";
import UploadMaterial from "./pages/UploadMaterial";
import Tasks from "./pages/Tasks";
import Bulletin from "./pages/Bulletin";
import MyLessons from "./pages/MyLessons";

// Admin + Teacher
import ManageLessons from "./pages/ManageLessons";
import UsersList from "./pages/UsersList";
import Analytics from "./pages/Analytics";
import Students from "./pages/Students";

// Admin only
import Holidays from "./pages/Holidays";
import AdminAnnouncement from "./pages/AdminAnnouncement";
import AdminSettings from "./pages/AdminSettings";
import TestAPI from "./pages/TestAPI";

// ------------------------------
// Components (Layout / Guards)
// ------------------------------
import ProtectedRoute from "./components/ProtectedRoute";
import ProtectedLayout from "./components/ProtectedLayout";

// ------------------------------
// App-level utils
// ------------------------------
import "./utils/i18n";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// Small wrapper so /chat/:peerId keeps working with the same Chat component
function ChatWrapper() {
  const { peerId } = useParams();
  return <Chat peerId={peerId} />;
}

function App() {
  const navigate = useNavigate();

  // -------------------------------------------------
  // Handle OAuth redirect: a token may come via ?token
  // -------------------------------------------------
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const token = urlParams.get("token");

    if (!token) return;

    // 1) Persist token
    localStorage.setItem("token", token);

    // 2) Extract role from JWT payload (best-effort)
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload?.role) {
        localStorage.setItem("role", payload.role);
      }
    } catch (err) {
      console.error("Failed to decode token", err);
    }

    // 3) Fetch profile to persist userId (so sockets/links work after reload)
    axios
      .get(`${API_BASE}/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const id =
          res.data?.id ||
          res.data?._id ||
          res.data?.user?.id ||
          res.data?.user?._id;
        if (id) localStorage.setItem("userId", id);
      })
      .catch((err) => {
        console.error("Failed to load profile for userId", err);
      });

    // 4) Clean URL and move to dashboard
    window.history.replaceState({}, document.title, "/dashboard");
    navigate("/dashboard");
  }, [navigate]);

  // -------------------------------------------------
  // Safety net: if token exists but userId missing, fetch it
  // -------------------------------------------------
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");
    if (token && !userId) {
      axios
        .get(`${API_BASE}/profile`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        .then((res) => {
          const id =
            res.data?.id ||
            res.data?._id ||
            res.data?.user?.id ||
            res.data?.user?._id;
          if (id) localStorage.setItem("userId", id);
        })
        .catch(() => {});
    }
  }, []);

  // Note: role is used by some components; layout guards check roles themselves
  //const role = localStorage.getItem("role");

  return (
    <>
      <Routes>
        {/* ------------------------------
            Public routes
           ------------------------------ */}
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/reset-password/:token" element={<ResetPassword />} />

        {/* OAuth landing (token handoff) */}
        <Route path="/oauth" element={<OAuthLanding />} />

        {/* Simple API test (keep without sidebar) */}
        <Route
          path="/api-test"
          element={
            <ProtectedRoute allowedRoles={["admin", "teacher"]}>
              <TestAPI />
            </ProtectedRoute>
          }
        />

        {/* ---------------------------------------------------------
            Authenticated area with sidebar (ProtectedLayout wrapper)
            1) All roles
           --------------------------------------------------------- */}
        <Route
          element={<ProtectedLayout roles={["admin", "teacher", "student"]} />}
        >
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/suggest" element={<SuggestLesson />} />
          <Route path="/availability" element={<Availability />} />
          <Route path="/notifications" element={<Notifications />} />
          <Route path="/my-courses" element={<MyCourses />} />
          <Route path="/calendar" element={<Calendar />} />
          {/* Chat */}
          <Route path="/chat" element={<Chat />} /> {/* supports ?peer=<id> */}
          <Route path="/chat/:peerId" element={<ChatWrapper />} />
          {/* legacy param */}
          <Route path="/courses/:courseId/chat" element={<CourseChat />} />
          {/* Courses & Materials */}
          <Route path="/courses" element={<Courses />} />
          <Route
            path="/courses/:courseId/materials"
            element={<CourseMaterials />}
          />
          <Route
            path="/materials/:courseId"
            element={<MaterialsListWrapper />}
          />
          <Route path="/upload-material" element={<UploadMaterial />} />
          {/* Misc */}
          <Route path="/my-lessons" element={<MyLessons />} />
          <Route path="/tasks" element={<Tasks />} />
          <Route path="/bulletin" element={<Bulletin />} />
        </Route>

        {/* ---------------------------------------------------------
            Admin + Teacher (still inside ProtectedLayout for sidebar)
           --------------------------------------------------------- */}
        <Route element={<ProtectedLayout roles={["admin", "teacher"]} />}>
          <Route path="/manage-lessons" element={<ManageLessons />} />
          <Route path="/users" element={<UsersList />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/students" element={<Students />} />
          <Route path="/upload-material" element={<UploadMaterial />} />
        </Route>

        {/* ---------------------------------------------------------
            Admin only (inside ProtectedLayout)
            - Holidays admin
            - Announcements admin
            - NEW: Global Hours Settings (#14)
           --------------------------------------------------------- */}
        <Route element={<ProtectedLayout roles={["admin"]} />}>
          <Route path="/holidays" element={<Holidays />} />
          <Route path="/admin/announcement" element={<AdminAnnouncement />} />
          <Route path="/admin/settings" element={<AdminSettings />} />
        </Route>
      </Routes>
    </>
  );
}

export default App;
