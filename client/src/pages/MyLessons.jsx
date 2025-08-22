// Student-facing page: shows only the current user's lessons.
// Much smaller now—no requests, no suggest/book, no create/edit.

import {
  Box,
  Paper,
  Stack,
  Typography,
  Grid,
  Snackbar,
  Alert,
  CircularProgress,
} from "@mui/material";
import { useState } from "react";
import { getMyLessons, updateLesson } from "../api/lessons";

import { useLessons } from "../features/lessons/useLessons";
import LessonsToolbar from "../features/lessons/LessonsToolbar";
import LessonCard from "../features/lessons/LessonCard";

export default function MyLessons() {
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
  } = useLessons(getMyLessons);

  const [snack, setSnack] = useState({ open: false, msg: "", sev: "info" });
  const notify = (msg, sev = "info") => setSnack({ open: true, msg, sev });

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

  const cancelLesson = async (lesson) => {
    try {
      const res = await updateLesson(lesson._id, { status: "cancelled" });
      setAll((prev) =>
        (prev ?? []).map((l) => (l._id === lesson._id ? res.data : l)),
      );
      notify("Lesson cancelled", "success");
    } catch {
      notify("Failed to cancel lesson.", "error");
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 1 }}>
        My Lessons
      </Typography>

      <Paper sx={{ p: 2, mb: 3 }}>
        <LessonsToolbar
          showOnlyMine={false}
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
                onToggleAttended={toggleAttended}
                onCancel={cancelLesson} // students can cancel upcoming lessons
              />
            </Grid>
          ))}
        </Grid>
      )}

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
