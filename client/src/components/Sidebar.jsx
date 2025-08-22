// client/src/components/Sidebar.jsx
//
// Role-based left navigation for the protected area.
// - Admin, Teacher, Student each get a curated set of links
// - Highlights the active route
// - Adds "Analytics" for Admins and Teachers (scope differs on the server)

import {
  List,
  ListItemText,
  ListItemButton,
  ListSubheader,
} from "@mui/material";
import { Link, useLocation } from "react-router-dom";

/**
 * Links per role.
 * Keep order meaningful (top → bottom) and labels concise.
 * If you add a new page, wire its route in App.jsx and then add a link here.
 */
const linksByRole = {
  admin: [
    // --- Overview ---
    { path: "/dashboard", label: "Dashboard" },

    // --- People & Admin ---
    { path: "/users", label: "Users" },
    { path: "/manage-lessons", label: "Manage Lessons" },
    { path: "/courses", label: "Courses" },

    // --- Scheduling / Learning ---
    { path: "/my-lessons", label: "My Lessons" },
    { path: "/calendar", label: "Calendar" },
    { path: "/upload-material", label: "Upload Material" },
    { path: "/holidays", label: "Holidays" },

    // --- Communication ---
    { path: "/chat", label: "Chat" },
    { path: "/notifications", label: "Notifications" },
    { path: "/admin/announcement", label: "Create Announcement" },
    { path: "/bulletin", label: "Bulletin" },

    // --- Insights ---
    { path: "/analytics", label: "Analytics" },

    // --- Admin-only Settings ---
    { path: "/admin/settings", label: "Settings (Hours)" },

    // --- Account ---
    { path: "/profile", label: "Profile" },
  ],

  teacher: [
    // --- Overview ---
    { path: "/dashboard", label: "Dashboard" },

    // --- Students & Courses ---
    { path: "/students", label: "My Students" },
    { path: "/courses", label: "Courses" },
    { path: "/upload-material", label: "Upload Material" },

    // --- Scheduling ---
    { path: "/manage-lessons", label: "Manage Lessons" },
    { path: "/my-lessons", label: "My Lessons" },
    { path: "/suggest", label: "Suggest Lesson" },
    { path: "/availability", label: "Availability" },
    { path: "/calendar", label: "Calendar" },

    // --- Tasks ---
    { path: "/tasks", label: "Tasks" },

    // --- Insights (NEW for teachers) ---
    { path: "/analytics", label: "Analytics" },

    // --- Communication ---
    { path: "/chat", label: "Chat" },
    { path: "/notifications", label: "Notifications" },
    { path: "/bulletin", label: "Bulletin" },

    // --- Account ---
    { path: "/profile", label: "Profile" },
  ],

  student: [
    // --- Overview ---
    { path: "/dashboard", label: "Dashboard" },

    // --- Learning ---
    { path: "/my-courses", label: "My Courses" },
    { path: "/courses", label: "Courses" },

    // --- Scheduling ---
    { path: "/my-lessons", label: "My Lessons" },
    { path: "/suggest", label: "Suggest Lesson" },
    { path: "/availability", label: "Availability" },
    { path: "/calendar", label: "Calendar" },

    // --- Tasks ---
    { path: "/tasks", label: "Tasks" },

    // --- Communication ---
    { path: "/chat", label: "Chat" },
    { path: "/notifications", label: "Notifications" },
    { path: "/bulletin", label: "Bulletin" },

    // --- Account ---
    { path: "/profile", label: "Profile" },
  ],
};

/**
 * Sidebar
 * @param {"admin"|"teacher"|"student"} [role="student"] Current user role
 * @param {() => void} [onItemClick] Optional: close drawer on mobile, etc.
 */
export default function Sidebar({ role = "student", onItemClick }) {
  const links = linksByRole[role] || linksByRole.student;
  const { pathname } = useLocation();

  return (
    <List
      dense
      subheader={
        <ListSubheader component="div" disableSticky>
          Navigation
        </ListSubheader>
      }
      sx={{ "--ListItem-minHeight": "36px" }}
    >
      {links.map(({ path, label }) => {
        // Selected if exact match OR nested routes (e.g., /courses/123)
        const selected = pathname === path || pathname.startsWith(path + "/");

        return (
          <ListItemButton
            key={path}
            component={Link}
            to={path}
            selected={selected}
            onClick={onItemClick}
            aria-current={selected ? "page" : undefined}
          >
            <ListItemText primary={label} />
          </ListItemButton>
        );
      })}
    </List>
  );
}
