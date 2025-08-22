import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  List,
  ListItem,
  ListItemText,
  Button,
  Stack,
  Paper,
  Chip,
  Divider,
  CircularProgress,
  ListItemSecondaryAction,
} from "@mui/material";
import InfoOutlined from "@mui/icons-material/InfoOutlined";
import EventAvailableOutlined from "@mui/icons-material/EventAvailableOutlined";
import EditCalendarOutlined from "@mui/icons-material/EditCalendarOutlined";
import CancelOutlined from "@mui/icons-material/CancelOutlined";
import AlarmOutlined from "@mui/icons-material/AlarmOutlined";
import { listNotifications, markRead } from "../api/notifications";

// Map notification type -> UI meta (label, icon, color)
const TYPE_META = {
  lesson_booked: {
    label: "Lesson booked",
    icon: EventAvailableOutlined,
    color: "success",
  },
  lesson_changed: {
    label: "Lesson updated",
    icon: EditCalendarOutlined,
    color: "warning",
  },
  lesson_cancelled: {
    label: "Lesson cancelled",
    icon: CancelOutlined,
    color: "error",
  },
  reminder: { label: "Reminder", icon: AlarmOutlined, color: "info" },
  system: { label: "System", icon: InfoOutlined, color: "primary" }, // ← NEW
};

function metaFor(type) {
  const m = TYPE_META[type];
  if (m) return m;
  // fallback for unknown types
  return {
    label: String(type || "Notification"),
    icon: InfoOutlined,
    color: "default",
  };
}

export default function Notifications() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      const data = await listNotifications(); // should return an array
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("load notifications failed", e);
      setErr("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const unread = useMemo(() => items.filter((n) => !n.isRead), [items]);

  const onRead = async (id) => {
    try {
      await markRead(id);
      setItems((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
    } catch {
      await load();
    }
  };

  const onMarkAll = async () => {
    if (!unread.length) return;
    setItems((prev) =>
      prev.map((n) => (n.isRead ? n : { ...n, isRead: true })),
    );
    try {
      await Promise.all(unread.map((n) => markRead(n._id)));
    } catch {
      await load();
    }
  };

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h5">Notifications</Typography>
          <Chip label={`Unread: ${unread.length}`} size="small" />
        </Stack>
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            onClick={load}
            sx={{ textTransform: "none" }}
          >
            Refresh
          </Button>
          <Button
            variant="contained"
            size="small"
            onClick={onMarkAll}
            disabled={!unread.length}
            sx={{ textTransform: "none" }}
          >
            Mark all read
          </Button>
        </Stack>
      </Stack>

      <Paper variant="outlined">
        {loading ? (
          <Stack direction="row" alignItems="center" spacing={1} sx={{ p: 2 }}>
            <CircularProgress size={20} />
            <Typography variant="body2">Loading…</Typography>
          </Stack>
        ) : err ? (
          <Typography variant="body2" color="error" sx={{ p: 2 }}>
            {err}
          </Typography>
        ) : items.length === 0 ? (
          <Box sx={{ p: 4, textAlign: "center", opacity: 0.8 }}>
            <Typography variant="body1">No notifications yet.</Typography>
          </Box>
        ) : (
          <>
            <List disablePadding>
              {items.map((n, idx) => {
                const meta = metaFor(n.type);
                const Icon = meta.icon;
                const created = n.createdAt
                  ? new Date(n.createdAt).toLocaleString()
                  : "";

                return (
                  <Box key={n._id}>
                    <ListItem
                      sx={{
                        py: 1.25,
                        px: 2,
                        opacity: n.isRead ? 0.6 : 1,
                      }}
                    >
                      <Stack
                        direction="row"
                        spacing={1.25}
                        alignItems="center"
                        sx={{ flex: 1, minWidth: 0 }}
                      >
                        <Chip
                          size="small"
                          color={meta.color}
                          variant="outlined"
                          icon={<Icon fontSize="small" />}
                          label={meta.label}
                          sx={{ minWidth: 140 }}
                        />
                        <ListItemText
                          primary={n.title || meta.label || "Notification"}
                          secondary={[n.body, created]
                            .filter(Boolean)
                            .join(" — ")}
                          primaryTypographyProps={{ noWrap: true }}
                          secondaryTypographyProps={{ noWrap: true }}
                        />
                      </Stack>

                      {!n.isRead && (
                        <ListItemSecondaryAction>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => onRead(n._id)}
                            sx={{ textTransform: "none" }}
                          >
                            Mark read
                          </Button>
                        </ListItemSecondaryAction>
                      )}
                    </ListItem>
                    {idx < items.length - 1 && <Divider component="li" />}
                  </Box>
                );
              })}
            </List>
          </>
        )}
      </Paper>
    </Box>
  );
}
