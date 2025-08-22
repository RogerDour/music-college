// client/src/pages/Availability.jsx
import { useEffect, useState, useCallback, useMemo } from "react";
import {
  Box,
  Paper,
  Stack,
  Typography,
  TextField,
  Button,
  IconButton,
  List,
  ListItem,
  ListItemText,
  Divider,
  Alert,
  Grid,
  Chip,
  CircularProgress,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import {
  getMyAvailability,
  getAvailability,
  saveMyAvailability,
} from "../api/availability";
import axios from "axios";

/* Helpers */
function toLocal(d = new Date()) {
  const pad = (n) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours(),
  )}:${pad(d.getMinutes())}`;
}
function normalizeLocalDay(d) {
  const x = new Date(d);
  return new Date(x.getFullYear(), x.getMonth(), x.getDate(), 0, 0, 0, 0);
}

export default function Availability() {
  // me
  const [myId, setMyId] = useState("");
  const [role, setRole] = useState("");

  // who we’re viewing
  const [editingUserId, setEditingUserId] = useState("");

  // UI state (simple “slots” UI)
  const [slots, setSlots] = useState([]); // [{start,end} in ISO]
  const [start, setStart] = useState(toLocal());
  const [end, setEnd] = useState(
    toLocal(new Date(Date.now() + 60 * 60 * 1000)),
  );
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [users, setUsers] = useState([]);
  const token = localStorage.getItem("token");

  /* Load profile (id + role) */
  useEffect(() => {
    if (!token) return;
    axios
      .get("http://localhost:5000/api/profile", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => {
        const u = res.data || {};
        const id = u._id || u.id || u.userId || "";
        setMyId(id);
        setRole(u.role || "");
        setEditingUserId(id); // default to me
      })
      .catch((err) => {
        console.error(
          "Failed to load profile:",
          err?.response?.data || err.message,
        );
        setError("Failed to load profile.");
      });
  }, [token]);

  /* If admin, fetch some users for convenience */
  useEffect(() => {
    if (role !== "admin" || !token) return;
    axios
      .get("http://localhost:5000/api/users", {
        headers: { Authorization: `Bearer ${token}` },
      })
      .then((res) => setUsers(Array.isArray(res.data) ? res.data : []))
      .catch(() => {});
  }, [role, token]);

  /* Load availability for selected user */
  const loadAvailability = useCallback(
    async (uid) => {
      if (!uid) return;
      setLoading(true);
      setError("");
      try {
        const res =
          uid === myId ? await getMyAvailability() : await getAvailability(uid);

        const doc = res.data || {};
        // Convert server doc → flat slots (use EXCEPTIONS only for this simple UI)
        const arr = (doc.exceptions || []).flatMap((ex) =>
          (ex.slots || []).map((s) => ({ start: s.start, end: s.end })),
        );
        arr.sort((a, b) => new Date(a.start) - new Date(b.start));
        setSlots(arr);
      } catch (err) {
        console.error(err);
        setError("Failed to load availability.");
        setSlots([]);
      } finally {
        setLoading(false);
      }
    },
    [myId],
  );

  useEffect(() => {
    if (editingUserId) loadAvailability(editingUserId);
  }, [editingUserId, loadAvailability]);

  /* Local helpers */
  const overlaps = useCallback((a, b) => {
    const as = new Date(a.start).getTime();
    const ae = new Date(a.end).getTime();
    const bs = new Date(b.start).getTime();
    const be = new Date(b.end).getTime();
    return as < be && ae > bs;
  }, []);

  const addSlot = () => {
    setError("");
    if (!start || !end) return;
    const s = new Date(start);
    const e = new Date(end);
    if (isNaN(s) || isNaN(e)) return setError("Invalid date/time.");
    if (e <= s) return setError("End must be after start.");

    const newSlot = { start: s.toISOString(), end: e.toISOString() };

    const hasConflict = slots.some(
      (x) =>
        (x.start === newSlot.start && x.end === newSlot.end) ||
        overlaps(x, newSlot),
    );
    if (hasConflict)
      return setError("Slot duplicates or overlaps an existing slot.");

    const next = [...slots, newSlot].sort(
      (a, b) => new Date(a.start) - new Date(b.start),
    );
    setSlots(next);

    // convenience: chain next slot
    setStart(end);
    setEnd(toLocal(new Date(e.getTime() + 60 * 60 * 1000)));
  };

  const removeSlot = (slot) => {
    setSlots((prev) =>
      prev.filter((s) => !(s.start === slot.start && s.end === slot.end)),
    );
  };

  const savingOthers = useMemo(
    () => editingUserId && myId && editingUserId !== myId,
    [editingUserId, myId],
  );

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      if (savingOthers) {
        setError("Saving others’ availability isn’t enabled yet.");
      } else {
        // Convert flat slots -> exceptions grouped by local day
        const map = new Map(); // dayKey -> { date, slots: [] }
        for (const s of slots) {
          const day = normalizeLocalDay(new Date(s.start));
          const key = day.getTime();
          if (!map.has(key)) map.set(key, { date: day, slots: [] });
          map
            .get(key)
            .slots.push({ start: new Date(s.start), end: new Date(s.end) });
        }
        const exceptions = [...map.values()].map((e) => ({
          date: e.date,
          slots: e.slots,
        }));

        // We don’t edit weeklyRules in this simple UI
        const weeklyRules = [];

        await saveMyAvailability({ weeklyRules, exceptions });
      }
    } catch (e) {
      console.error(e);
      setError("Failed to save availability.");
    } finally {
      setSaving(false);
    }
  };

  /* UI */
  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h5">Availability</Typography>
          <Chip label={`${slots.length} slots`} size="small" />
        </Stack>
        <Button
          variant="outlined"
          size="small"
          onClick={() => loadAvailability(editingUserId)}
          sx={{ textTransform: "none" }}
        >
          Refresh
        </Button>
      </Stack>

      {role === "admin" && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <TextField
                label="User ID"
                size="small"
                fullWidth
                value={editingUserId}
                onChange={(e) => setEditingUserId(e.target.value)}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl size="small" fullWidth>
                <InputLabel id="user-picker-label">Pick user</InputLabel>
                <Select
                  labelId="user-picker-label"
                  label="Pick user"
                  value={editingUserId}
                  onChange={(e) => setEditingUserId(e.target.value)}
                >
                  <MenuItem value="">
                    <em>— choose —</em>
                  </MenuItem>
                  {users.map((u) => (
                    <MenuItem key={u._id} value={u._id}>
                      {u.name || u.email} ({u.role})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <Typography variant="body2" sx={{ mt: 1, opacity: 0.75 }}>
            Note: saving others is view-only here unless you add an admin PUT
            route.
          </Typography>
        </Paper>
      )}

      <Paper sx={{ p: 2, mb: 2 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              label="Start"
              type="datetime-local"
              size="small"
              fullWidth
              value={start}
              onChange={(e) => setStart(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="End"
              type="datetime-local"
              size="small"
              fullWidth
              value={end}
              onChange={(e) => setEnd(e.target.value)}
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={addSlot}>
                Add
              </Button>
              <Button
                variant="outlined"
                onClick={save}
                disabled={saving || savingOthers}
              >
                {saving ? "Saving…" : "Save"}
              </Button>
            </Stack>
          </Grid>
        </Grid>

        {error && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}

        <Divider sx={{ my: 2 }} />

        {loading ? (
          <Stack direction="row" alignItems="center" spacing={1}>
            <CircularProgress size={20} />
            <Typography variant="body2">Loading…</Typography>
          </Stack>
        ) : slots.length === 0 ? (
          <Typography sx={{ opacity: 0.85 }}>
            No slots yet. Add one above.
          </Typography>
        ) : (
          <List dense>
            {slots.map((s) => (
              <ListItem
                key={`${s.start}|${s.end}`}
                secondaryAction={
                  <IconButton
                    edge="end"
                    onClick={() => removeSlot(s)}
                    aria-label="delete"
                  >
                    <DeleteIcon />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={`${new Date(s.start).toLocaleString()} — ${new Date(s.end).toLocaleString()}`}
                  secondary={`${s.start} — ${s.end}`}
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>

      <Typography variant="body2" sx={{ opacity: 0.7 }}>
        Times are stored in UTC and shown in your local timezone.
      </Typography>
    </Box>
  );
}
