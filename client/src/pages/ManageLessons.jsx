import { useMemo, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  Paper,
  Grid,
  TextField,
  Button,
  Snackbar,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from "@mui/material";

import {
  getLessons,
  getMyLessons,
  createLesson,
  deleteLesson,
  updateLesson,
} from "../api/lessons";
import RecurringLessonDialog from "../components/RecurringLessonDialog";

import { useLessons } from "../features/lessons/useLessons";
import LessonsToolbar from "../features/lessons/LessonsToolbar";
import LessonCard from "../features/lessons/LessonCard";
import SuggestAndBook from "../features/lessons/SuggestAndBook";
import PendingRequests from "../features/lessons/PendingRequests";

function toLocalDatetimeInputValue(d = new Date()) {
  const pad = (n) => n.toString().padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export default function ManageLessons() {
  const role = (localStorage.getItem("role") || "").toLowerCase();
  const currentUserId = localStorage.getItem("userId") || "";

  // flip between all vs mine using a local flag + fetcher
  const [onlyMine, setOnlyMine] = useState(false);
  const fetcher = useMemo(
    () => (onlyMine ? getMyLessons : getLessons),
    [onlyMine],
  );

  const {
    loading,
    lessons,
    allCount,
    setAll,
    refresh,
    status,
    setStatus,
    q,
    setQ,
  } = useLessons(fetcher);

  // notifications
  const [snack, setSnack] = useState({ open: false, msg: "", sev: "info" });
  const notify = (msg, sev = "info") => setSnack({ open: true, msg, sev });

  const sortByStart = (arr) =>
    [...arr].sort((a, b) => new Date(a.date) - new Date(b.date));

  // create/edit
  const [form, setForm] = useState({
    title: "",
    date: toLocalDatetimeInputValue(),
    duration: 60,
    status: "scheduled",
    studentId: "",
  });
  const [editingId, setEditingId] = useState(null);
  const handleChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  const resetForm = () =>
    setForm({
      title: "",
      date: toLocalDatetimeInputValue(),
      duration: 60,
      status: "scheduled",
      studentId: "",
    });

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await createLesson({
        title: form.title,
        date: form.date,
        duration: Number(form.duration),
        status: form.status,
        studentId: form.studentId || undefined,
      });
      setAll((prev) => sortByStart([...(prev ?? []), res.data]));
      resetForm();
      notify("Lesson created ✔️", "success");
    } catch (err) {
      const msg =
        err.response?.status === 409
          ? err.response?.data?.message || "Overlapping booking."
          : err.response?.data?.message ||
            err.response?.data?.error ||
            "Failed to create lesson.";
      notify(msg, "error");
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteLesson(id);
      setAll((prev) => (prev ?? []).filter((l) => l._id !== id));
      notify("Lesson deleted", "success");
    } catch {
      notify("Failed to delete lesson.", "error");
    }
  };

  const toggleComplete = async (lesson) => {
    const newStatus = lesson.status === "completed" ? "scheduled" : "completed";
    const payload = {
      status: newStatus,
      ...(newStatus === "completed" ? { attended: true } : {}),
    };
    try {
      const res = await updateLesson(lesson._id, payload);
      setAll((prev) =>
        (prev ?? []).map((l) => (l._id === lesson._id ? res.data : l)),
      );
      notify("Lesson updated", "success");
    } catch {
      notify("Failed to update lesson.", "error");
    }
  };

  const toggleAttended = async (lesson) => {
    try {
      const res = await updateLesson(lesson._id, {
        attended: !lesson.attended,
      });
      setAll((prev) =>
        (prev ?? []).map((l) => (l._id === lesson._id ? res.data : l)),
      );
      notify(
        `Attendance ${!lesson.attended ? "marked" : "cleared"}`,
        "success",
      );
    } catch {
      notify("Failed to update attendance.", "error");
    }
  };

  const toEdit = (lesson) => {
    setEditingId(lesson._id);
    setForm({
      title: lesson.title || "",
      date: toLocalDatetimeInputValue(new Date(lesson.date)),
      duration: lesson.duration || 60,
      status: lesson.status || "scheduled",
      studentId: lesson.studentId?._id || lesson.studentId || "",
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveEdit = async (e) => {
    e.preventDefault();
    try {
      const res = await updateLesson(editingId, {
        title: form.title,
        date: form.date,
        duration: Number(form.duration),
        status: form.status,
        studentId: form.studentId || undefined,
      });
      setAll((prev) =>
        (prev ?? []).map((l) => (l._id === editingId ? res.data : l)),
      );
      setEditingId(null);
      resetForm();
      notify("Lesson saved ✔️", "success");
    } catch (err) {
      const msg =
        err.response?.status === 409
          ? err.response?.data?.message || "Overlapping booking."
          : err.response?.data?.message ||
            err.response?.data?.error ||
            "Failed to save lesson.";
      notify(msg, "error");
    }
  };

  // recurring dialog
  const [openRecurring, setOpenRecurring] = useState(false);
  const handleRecurringCreated = (result) => {
    const created = Array.isArray(result?.created) ? result.created : [];
    const skipped = Array.isArray(result?.skipped) ? result.skipped : [];
    if (created.length)
      setAll((prev) => sortByStart([...(prev ?? []), ...created]));
    notify(
      `Created ${created.length} lessons${skipped.length ? `, skipped ${skipped.length}` : ""}.`,
      "success",
    );
  };

  return (
    <Box>
      {/* Title + Recurring */}
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 1 }}
      >
        <Typography variant="h5">Manage Lessons</Typography>
        {(role === "teacher" || role === "admin") && (
          <Button variant="contained" onClick={() => setOpenRecurring(true)}>
            Add Recurring
          </Button>
        )}
      </Stack>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <LessonsToolbar
          showOnlyMine
          onlyMine={onlyMine}
          setOnlyMine={setOnlyMine}
          status={status}
          setStatus={setStatus}
          q={q}
          setQ={setQ}
          onRefresh={refresh}
        />
        <Typography variant="body2" sx={{ mt: 1, opacity: 0.7 }}>
          Showing {lessons.length} of {allCount}
        </Typography>
      </Paper>

      {/* Requests + Suggest/Book (teachers/admins) */}
      {(role === "teacher" || role === "admin") && (
        <>
          <PendingRequests
            notify={notify}
            onApprovedLesson={(lesson) =>
              setAll((prev) => sortByStart([...(prev ?? []), lesson]))
            }
          />
          <SuggestAndBook
            notify={notify}
            onBooked={(lesson) =>
              setAll((prev) => sortByStart([...(prev ?? []), lesson]))
            }
          />
        </>
      )}

      {/* Create / Edit form */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 1 }}>
          {editingId ? "Edit Lesson" : "Create Lesson"}
        </Typography>

        <Box
          component="form"
          onSubmit={editingId ? saveEdit : handleCreate}
          sx={{ display: "grid", gap: 2 }}
        >
          <TextField
            name="title"
            label="Lesson Title"
            value={form.title}
            onChange={handleChange}
            required
            fullWidth
          />
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <TextField
                name="date"
                label="Start"
                type="datetime-local"
                value={form.date}
                onChange={handleChange}
                required
                fullWidth
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField
                name="duration"
                label="Duration (min)"
                type="number"
                inputProps={{ min: 15, max: 240 }}
                value={form.duration}
                onChange={handleChange}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} md={3}>
              <FormControl size="small" fullWidth>
                <InputLabel id="status-edit-label">Status</InputLabel>
                <Select
                  labelId="status-edit-label"
                  name="status"
                  label="Status"
                  value={form.status}
                  onChange={handleChange}
                >
                  <MenuItem value="scheduled">scheduled</MenuItem>
                  <MenuItem value="completed">completed</MenuItem>
                  <MenuItem value="cancelled">cancelled</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <TextField
            name="studentId"
            label="Student ID (optional)"
            value={form.studentId}
            onChange={handleChange}
            fullWidth
          />

          <Stack direction="row" spacing={1}>
            <Button variant="contained" type="submit">
              {editingId ? "Save" : "Create"}
            </Button>
            {editingId && (
              <Button
                variant="text"
                onClick={() => {
                  setEditingId(null);
                  resetForm();
                }}
              >
                Cancel
              </Button>
            )}
          </Stack>
        </Box>
      </Paper>

      {/* List */}
      {loading ? (
        <Stack direction="row" alignItems="center" spacing={1}>
          <CircularProgress size={20} />
          <Typography variant="body2">Loading…</Typography>
        </Stack>
      ) : (
        <Grid container spacing={2}>
          {lessons.map((lesson) => (
            <Grid item xs={12} md={6} key={lesson._id}>
              <LessonCard
                lesson={lesson}
                onEdit={toEdit}
                onToggleComplete={toggleComplete}
                onToggleAttended={toggleAttended}
                onDelete={handleDelete}
              />
            </Grid>
          ))}
        </Grid>
      )}

      {/* Recurring dialog */}
      <RecurringLessonDialog
        open={openRecurring}
        onClose={() => setOpenRecurring(false)}
        onCreated={handleRecurringCreated}
        defaultTeacherId={role === "teacher" ? currentUserId : ""}
      />

      {/* Snackbar */}
      <Snackbar
        open={snack.open}
        autoHideDuration={3000}
        onClose={() => setSnack((s) => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          onClose={() => setSnack((s) => ({ ...s, open: false }))}
          severity={snack.sev}
          variant="filled"
          sx={{ width: "100%" }}
        >
          {snack.msg}
        </Alert>
      </Snackbar>
    </Box>
  );
}
