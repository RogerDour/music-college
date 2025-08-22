import { useEffect, useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
  FormGroup,
  FormControlLabel,
  Checkbox,
  MenuItem,
  Select,
  InputLabel,
  FormControl,
  Chip,
  Typography,
  Divider,
  LinearProgress,
  Alert,
  Box,
  Paper,
} from "@mui/material";
import dayjs from "dayjs";
import { createRecurring } from "../api/lessons";
import * as UsersAPI from "../api/users";
import * as ProfileAPI from "../api/profile";

const DOW = [
  { i: 0, lbl: "Sun" },
  { i: 1, lbl: "Mon" },
  { i: 2, lbl: "Tue" },
  { i: 3, lbl: "Wed" },
  { i: 4, lbl: "Thu" },
  { i: 5, lbl: "Fri" },
  { i: 6, lbl: "Sat" },
];

function defaultAnchorISO() {
  const now = new Date();
  const delta = (8 - now.getDay()) % 7 || 7;
  const d = new Date(now);
  d.setDate(now.getDate() + delta);
  d.setHours(10, 0, 0, 0);
  return d.toISOString();
}

function generatePreview({ startISO, byDay, interval, count, durationMin }) {
  const out = [];
  const anchor = dayjs(startISO);
  const baseH = anchor.hour();
  const baseM = anchor.minute();
  const by = [...byDay].sort((a, b) => a - b);
  let weekStart = anchor.startOf("week");
  let produced = 0;
  while (produced < count) {
    for (const d of by) {
      if (produced >= count) break;
      let dt = weekStart
        .add(d, "day")
        .hour(baseH)
        .minute(baseM)
        .second(0)
        .millisecond(0);
      if (dt.isBefore(anchor)) continue;
      out.push({
        start: dt.toISOString(),
        end: dt.add(durationMin, "minute").toISOString(),
        ok: true,
        reason: "candidate",
      });
      produced++;
    }
    weekStart = weekStart.add(interval, "week");
  }
  return out;
}

export default function RecurringLessonDialog({
  open,
  onClose,
  onCreated,
  defaultTeacherId,
}) {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [studentsLoadError, setStudentsLoadError] = useState("");
  const [form, setForm] = useState({
    title: "",
    teacherId: defaultTeacherId || "",
    studentId: "",
    startDate: defaultAnchorISO(),
    duration: 60,
    interval: 1,
    count: 8,
    byDay: [1, 4],
  });
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fromLocal = defaultTeacherId || localStorage.getItem("userId") || "";
    setForm((f) => ({ ...f, teacherId: fromLocal || f.teacherId }));
  }, [defaultTeacherId, open]);

  useEffect(() => {
    if (!open) return;
    if (form.teacherId) return;
    (async () => {
      try {
        const res = ProfileAPI.getMe
          ? await ProfileAPI.getMe()
          : ProfileAPI.me
            ? await ProfileAPI.me()
            : ProfileAPI.getProfile
              ? await ProfileAPI.getProfile()
              : null;
        const id = res?.data?._id || res?.data?.user?._id;
        if (id) setForm((f) => ({ ...f, teacherId: id }));
      } catch {
        // ignore (non-fatal)
      }
    })();
  }, [open, form.teacherId]);

  useEffect(() => {
    if (!open) return;
    setStudentsLoadError("");
    (async () => {
      try {
        let res;
        if (typeof UsersAPI.list === "function")
          res = await UsersAPI.list({ role: "student", limit: 1000 });
        else if (typeof UsersAPI.getUsers === "function")
          res = await UsersAPI.getUsers({ role: "student", limit: 1000 });
        else if (typeof UsersAPI.fetchUsers === "function")
          res = await UsersAPI.fetchUsers({ role: "student", limit: 1000 });
        else if (typeof UsersAPI.all === "function")
          res = await UsersAPI.all({ role: "student", limit: 1000 });
        const items = res ? res.data?.items || res.data || [] : [];
        setStudents(Array.isArray(items) ? items : []);
      } catch {
        setStudents([]);
        setStudentsLoadError(
          "Could not load students — paste a Student ID manually.",
        );
      }
    })();
  }, [open]);

  const toggleDay = (arr, val) =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  const handleCreate = async () => {
    setLoading(true);
    setError("");
    try {
      const bySorted = [...form.byDay].sort((a, b) => a - b);
      const payload = {
        title: form.title || "Lesson",
        teacherId: String(form.teacherId).trim(),
        studentId: form.studentId,
        duration: Number(form.duration),
        startDate: form.startDate,
        freq: "weekly",
        interval: Number(form.interval),
        count: Number(form.count),
        byDay: bySorted,
      };

      const { data } = await createRecurring(payload);
      onCreated?.(data);
      onClose();
    } catch (e) {
      const msg =
        e?.response?.data?.message ||
        e?.response?.data?.error ||
        (typeof e?.response?.data === "string" ? e.response.data : null) ||
        e?.message ||
        "Create failed";
      setError(String(msg));
       
      console.error("recurring:create error", e);
    } finally {
      setLoading(false);
    }
  };

  const canCreate =
    form.title &&
    String(form.teacherId).trim().length > 0 &&
    form.studentId &&
    form.byDay.length > 0 &&
    Number(form.count) > 0 &&
    Number(form.duration) > 0;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>Add Recurring Lessons</DialogTitle>
      <DialogContent dividers>
        {loading && <LinearProgress sx={{ mb: 2 }} />}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Stack spacing={2}>
          <TextField
            label="Title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            fullWidth
          />

          <TextField
            label="Teacher ID"
            value={form.teacherId}
            onChange={(e) => setForm({ ...form, teacherId: e.target.value })}
            fullWidth
            helperText="Teacher who will own the series"
          />

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            {students.length > 0 ? (
              <FormControl fullWidth>
                <InputLabel id="student-label">Student</InputLabel>
                <Select
                  labelId="student-label"
                  label="Student"
                  value={form.studentId}
                  onChange={(e) =>
                    setForm({ ...form, studentId: e.target.value })
                  }
                >
                  {students.map((s) => (
                    <MenuItem key={s._id} value={s._id}>
                      {s.name || s.username || s.email}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : (
              <TextField
                label="Student ID"
                value={form.studentId}
                onChange={(e) =>
                  setForm({ ...form, studentId: e.target.value })
                }
                fullWidth
                helperText={studentsLoadError || "Paste a Student ID"}
              />
            )}

            <TextField
              label="Duration (min)"
              type="number"
              value={form.duration}
              onChange={(e) =>
                setForm({ ...form, duration: Number(e.target.value || 60) })
              }
              fullWidth
              inputProps={{ min: 15, step: 15 }}
            />
          </Stack>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              label="Start week anchor"
              type="datetime-local"
              value={dayjs(form.startDate).format("YYYY-MM-DDTHH:mm")}
              onChange={(e) =>
                setForm({
                  ...form,
                  startDate: dayjs(e.target.value).toISOString(),
                })
              }
              fullWidth
              helperText="Pick a date/time in the first week of the series"
            />
            <TextField
              label="Interval (weeks)"
              type="number"
              value={form.interval}
              onChange={(e) =>
                setForm({ ...form, interval: Number(e.target.value || 1) })
              }
              fullWidth
              inputProps={{ min: 1 }}
            />
            <TextField
              label="Count"
              type="number"
              value={form.count}
              onChange={(e) =>
                setForm({ ...form, count: Number(e.target.value || 1) })
              }
              fullWidth
              inputProps={{ min: 1, max: 50 }}
            />
          </Stack>

          <Box>
            <Typography variant="subtitle2" sx={{ mb: 1 }}>
              Days of week
            </Typography>
            <FormGroup row>
              {DOW.map((d) => (
                <FormControlLabel
                  key={d.i}
                  control={
                    <Checkbox
                      checked={form.byDay.includes(d.i)}
                      onChange={() =>
                        setForm({ ...form, byDay: toggleDay(form.byDay, d.i) })
                      }
                    />
                  }
                  label={d.lbl}
                />
              ))}
            </FormGroup>
          </Box>

          <Divider />

          <Stack direction="row" spacing={1}>
            <Button
              variant="outlined"
              onClick={() =>
                setPreview(
                  generatePreview({
                    startISO: form.startDate,
                    byDay: form.byDay,
                    interval: Number(form.interval),
                    count: Number(form.count),
                    durationMin: Number(form.duration),
                  }),
                )
              }
              disabled={!canCreate || loading}
            >
              Preview
            </Button>
            <Button
              variant="contained"
              onClick={handleCreate}
              disabled={!canCreate || loading}
            >
              Create {form.count} lessons
            </Button>
          </Stack>

          {preview.length > 0 && (
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Preview ({preview.length}) — server will skip holidays &
                conflicts
              </Typography>
              <Stack spacing={1}>
                {preview.map((p, idx) => (
                  <Stack
                    key={idx}
                    direction={{ xs: "column", sm: "row" }}
                    spacing={1}
                    alignItems="center"
                    justifyContent="space-between"
                  >
                    <Typography variant="body2">
                      {dayjs(p.start).format("ddd, MMM D YYYY, HH:mm")} —{" "}
                      {dayjs(p.end).format("HH:mm")}
                    </Typography>
                    <Chip size="small" label="candidate" />
                  </Stack>
                ))}
              </Stack>
            </Paper>
          )}
        </Stack>
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
