// client/src/pages/Dashboard.jsx
import { useEffect, useState, useMemo } from "react";
import {
  Typography,
  Stack,
  Card,
  CardContent,
  Alert,
  CircularProgress,
  Grid,
  Button,
  Box,
  Divider,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import http from "../utils/axios"; // axios singleton with interceptor
import { listNotifications } from "../api/notifications";
import { getMyLessons } from "../api/lessons";

export default function Dashboard() {
  const role = (localStorage.getItem("role") || "student").toLowerCase();
  const roleTitle = role.charAt(0).toUpperCase() + role.slice(1);

  const [state, setState] = useState({
    loading: true,
    error: "",
    message: "",
    unreadCount: 0,
    upcoming7: 0,
  });

  useEffect(() => {
    const controller = new AbortController();

    const load = async () => {
      try {
        // 1) Role-specific greeting/message
        const { data } = await http.get(`/auth/${role}-dashboard`, {
          signal: controller.signal,
        });

        // 2) Notifications + Lessons in parallel (best effort)
        const [notifsRes, lessonsRes] = await Promise.allSettled([
          listNotifications(),
          getMyLessons(), // for upcoming lessons calc
        ]);

        // Unread notifications
        const notifications = Array.isArray(notifsRes.value)
          ? notifsRes.value
          : [];
        const unreadCount = notifications.filter((n) => !n.isRead).length;

        // Upcoming lessons in next 7 days (scheduled)
        const now = Date.now();
        const in7 = now + 7 * 24 * 60 * 60 * 1000;
        const lessonsData =
          lessonsRes.status === "fulfilled"
            ? Array.isArray(lessonsRes.value?.data)
              ? lessonsRes.value.data
              : lessonsRes.value?.data?.lessons || []
            : [];
        const upcoming7 = lessonsData.filter((l) => {
          const start = new Date(l.date).getTime();
          return l.status === "scheduled" && start >= now && start <= in7;
        }).length;

        setState({
          loading: false,
          error: "",
          message: data?.message || "Welcome!",
          unreadCount,
          upcoming7,
        });
      } catch (err) {
        if (err.name === "CanceledError" || err.code === "ERR_CANCELED") return;
        setState((s) => ({
          ...s,
          loading: false,
          error: "Access denied or error loading dashboard.",
          message: "",
        }));
      }
    };

    load();
    return () => controller.abort();
  }, [role]);

  // Quick actions by role
  const actions = useMemo(() => {
    const common = [
      { to: "/lessons", label: "My Lessons" },
      { to: "/courses", label: "Courses" },
      { to: "/availability", label: "Availability" },
      { to: "/notifications", label: "Notifications" },
      { to: "/profile", label: "Profile" },
    ];
    if (role === "admin")
      return [
        { to: "/manage-lessons", label: "Manage Lessons" },
        { to: "/users", label: "Users" },
        ...common,
        { to: "/analytics", label: "Analytics" },
      ];
    if (role === "teacher")
      return [
        { to: "/manage-lessons", label: "Manage Lessons" },
        ...common,
        { to: "/analytics", label: "Analytics" },
      ];
    return common; // student
  }, [role]);

  return (
    <Box>
      {/* Header */}
      <Stack spacing={0.5} sx={{ mb: 2 }}>
        <Typography variant="h5">{roleTitle} Dashboard</Typography>
        <Typography variant="body2" sx={{ opacity: 0.8 }}>
          {state.loading ? "Loading…" : state.message}
        </Typography>
      </Stack>

      {state.error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          ❌ {state.error}
        </Alert>
      )}

      {/* Content */}
      {state.loading ? (
        <Stack direction="row" alignItems="center" spacing={1}>
          <CircularProgress size={20} />
          <Typography variant="body2">Loading…</Typography>
        </Stack>
      ) : (
        <Grid container spacing={2}>
          {/* KPI cards */}
          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline">Upcoming Lessons</Typography>
                <Typography variant="h5" sx={{ mt: 0.5 }}>
                  {state.upcoming7}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Next 7 days
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline">Unread Notifications</Typography>
                <Typography variant="h5" sx={{ mt: 0.5 }}>
                  {state.unreadCount}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  Since last login
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Placeholder example; replace when you have a courses API */}
          {/* <Grid item xs={12} md={4}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="overline">Active Courses</Typography>
                <Typography variant="h5" sx={{ mt: 0.5 }}>
                  —
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.7 }}>
                  (Hook to your courses API)
                </Typography>
              </CardContent>
            </Card>
          </Grid> */}

          {/* Quick actions */}
          <Grid item xs={12}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle1" sx={{ mb: 1 }}>
                  Quick Actions
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
                  {actions.map((a) => (
                    <Button
                      key={a.to}
                      component={RouterLink}
                      to={a.to}
                      variant="outlined"
                      size="small"
                      sx={{ textTransform: "none" }}
                    >
                      {a.label}
                    </Button>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
}
