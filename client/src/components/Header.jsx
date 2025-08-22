// client/src/components/Header.jsx
// A single source of truth for real-time notifications:
// - Uses the shared socket from getSocket()
// - Adds ONE 'notify' listener and removes it on cleanup
// - Does not create or disconnect sockets itself

import { useEffect, useRef, useState, useMemo } from "react";
import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Badge,
  Box,
  Drawer,
  Divider,
  Tooltip,
  Container,
  useTheme,
  useMediaQuery,
  Link as MUILink,
  Button,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import NotificationsIcon from "@mui/icons-material/Notifications";
import { Link as RouterLink, useNavigate, useLocation } from "react-router-dom";

import { listNotifications } from "../api/notifications";
import { getSocket } from "../socket"; // ← shared, authenticated socket
import Sidebar from "./Sidebar";

export default function Header() {
  const [unread, setUnread] = useState(0);
  const [open, setOpen] = useState(false);
  const socketRef = useRef(null);

  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("md"));
  const { pathname } = useLocation();

  const token = localStorage.getItem("token");
  const role = useMemo(
    () => (localStorage.getItem("role") || "student").toLowerCase(),
    [],
  );
  const user = useMemo(() => {
    try {
      return JSON.parse(localStorage.getItem("user") || "{}");
    } catch {
      return {};
    }
  }, []);
  const displayName = user?.name || user?.email || role;
  const isActive = (path) => pathname === path;

  // Load unread count once and set up the single socket listener.
  useEffect(() => {
    let mounted = true;

    // 1) Initial unread count from API
    listNotifications()
      .then((items) => {
        if (!mounted) return;
        const count = Array.isArray(items)
          ? items.filter((n) => !n.isRead).length
          : 0;
        setUnread(count);
      })
      .catch(() => {
        /* best-effort */
      });

    // 2) Attach ONE 'notify' listener to the shared socket
    const s = getSocket(); // shared instance; already carries JWT (see client/src/socket.js)
    socketRef.current = s;

    const onNotify = () => {
      // Server emits one message per notification to the user’s room
      setUnread((prev) => prev + 1);
    };

    s.on("notify", onNotify);

    // (Optional backwards-compat) if you still have old clients/servers that use "notification",
    // you can also listen to it, but KEEP ONLY ONE or you'll double count.
    // s.on("notification", onNotify);

    // 3) Cleanup: remove only the listener, DO NOT disconnect the shared socket
    return () => {
      mounted = false;
      s?.off("notify", onNotify);
      // s?.off("notification", onNotify);
    };
  }, []);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    localStorage.removeItem("user");
    localStorage.removeItem("userId");
    setOpen(false);
    navigate("/login");
  };

  const drawerAnchor = theme.direction === "rtl" ? "right" : "left";

  return (
    <AppBar
      position="sticky"
      color="primary"
      elevation={0}
      sx={{ zIndex: (t) => t.zIndex.drawer + 1 }}
    >
      <Container maxWidth={false} disableGutters sx={{ px: 2 }}>
        <Toolbar sx={{ gap: 1 }}>
          {/* Left cluster */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1,
              flexShrink: 0,
            }}
          >
            {/* Sidebar toggle */}
            <IconButton
              onClick={() => setOpen(true)}
              edge="start"
              color="inherit"
              aria-label="open menu"
            >
              <MenuIcon />
            </IconButton>

            {/* Brand */}
            <Typography
              variant="h6"
              noWrap
              sx={{ cursor: "pointer", fontWeight: 700 }}
              onClick={() => navigate(token ? "/dashboard" : "/")}
            >
              🎵 Music College
            </Typography>

            {/* Desktop inline nav */}
            {!isMobile && (
              <Box sx={{ display: "flex", alignItems: "center", ml: 2 }}>
                <MUILink
                  component={RouterLink}
                  to="/"
                  underline={isActive("/") ? "always" : "hover"}
                  sx={{
                    color: "inherit",
                    mx: 1,
                    fontWeight: isActive("/") ? 700 : 500,
                  }}
                >
                  Home
                </MUILink>
                {token && (
                  <MUILink
                    component={RouterLink}
                    to="/dashboard"
                    underline={isActive("/dashboard") ? "always" : "hover"}
                    sx={{
                      color: "inherit",
                      mx: 1,
                      fontWeight: isActive("/dashboard") ? 700 : 500,
                    }}
                  >
                    Dashboard
                  </MUILink>
                )}
              </Box>
            )}
          </Box>

          {/* Spacer */}
          <Box sx={{ flexGrow: 1 }} />

          {/* Right cluster */}
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            {token ? (
              <>
                {/* Notifications */}
                <Tooltip title="Notifications">
                  <IconButton
                    component={RouterLink}
                    to="/notifications"
                    size="large"
                    color="inherit"
                    aria-label="notifications"
                  >
                    <Badge
                      badgeContent={unread}
                      color="error"
                      max={99}
                      overlap="circular"
                    >
                      <NotificationsIcon />
                    </Badge>
                  </IconButton>
                </Tooltip>

                {/* User display + Logout (desktop) */}
                {!isMobile && (
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {displayName}
                  </Typography>
                )}
                {!isMobile && (
                  <Button
                    variant="outlined"
                    color="inherit"
                    size="small"
                    onClick={handleLogout}
                    sx={{ textTransform: "none" }}
                  >
                    Logout
                  </Button>
                )}
              </>
            ) : (
              <>
                <MUILink
                  component={RouterLink}
                  to="/login"
                  underline="hover"
                  sx={{ color: "inherit", mx: 1 }}
                >
                  Login
                </MUILink>
                <MUILink
                  component={RouterLink}
                  to="/signup"
                  underline="hover"
                  sx={{ color: "inherit", mx: 1 }}
                >
                  Signup
                </MUILink>
              </>
            )}
          </Box>
        </Toolbar>
      </Container>

      {/* Sidebar drawer (always available) */}
      <Drawer
        anchor={drawerAnchor}
        open={open}
        onClose={() => setOpen(false)}
        ModalProps={{ keepMounted: true }}
      >
        <Box sx={{ width: 280 }} role="presentation">
          <Box sx={{ px: 2, py: 1, fontWeight: 600 }}>Menu</Box>
          <Divider />

          {token ? (
            <>
              {/* Quick nav (mobile friendly) */}
              <Box sx={{ p: 1, display: "grid", gap: 0.5 }}>
                <MUILink
                  component={RouterLink}
                  to="/"
                  underline={isActive("/") ? "always" : "hover"}
                  onClick={() => setOpen(false)}
                  sx={{
                    color: "text.primary",
                    px: 1,
                    py: 0.75,
                    borderRadius: 1,
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  Home
                </MUILink>
                <MUILink
                  component={RouterLink}
                  to="/dashboard"
                  underline={isActive("/dashboard") ? "always" : "hover"}
                  onClick={() => setOpen(false)}
                  sx={{
                    color: "text.primary",
                    px: 1,
                    py: 0.75,
                    borderRadius: 1,
                    "&:hover": { bgcolor: "action.hover" },
                  }}
                >
                  Dashboard
                </MUILink>
              </Box>

              <Sidebar role={role} onItemClick={() => setOpen(false)} />

              <Divider />
              <Box sx={{ p: 1 }}>
                <Button fullWidth variant="outlined" onClick={handleLogout}>
                  Logout
                </Button>
              </Box>
            </>
          ) : (
            <Box sx={{ p: 2, display: "grid", gap: 1 }}>
              <Button
                component={RouterLink}
                to="/login"
                variant="contained"
                onClick={() => setOpen(false)}
              >
                Login
              </Button>
              <Button
                component={RouterLink}
                to="/signup"
                variant="outlined"
                onClick={() => setOpen(false)}
              >
                Signup
              </Button>
            </Box>
          )}
        </Box>
      </Drawer>
    </AppBar>
  );
}
