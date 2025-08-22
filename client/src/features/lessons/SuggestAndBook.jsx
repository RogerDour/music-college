import { useState } from "react";
import {
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Divider,
  Chip,
  Stack,
} from "@mui/material";
import { suggestSlots, createLesson } from "../../api/lessons";
import { createRequest } from "../../api/requests";

export default function SuggestAndBook({ onBooked, notify }) {
  const [teacherId, setTeacherId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [title, setTitle] = useState("Piano Lesson - Suggested");
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSuggest = async () => {
    if (!teacherId || !studentId) {
      notify?.("Please fill Teacher ID and Student ID", "warning");
      return;
    }
    setLoading(true);
    try {
      const { data } = await suggestSlots({
        teacherId,
        studentId,
        durationMinutes,
        maxSuggestions: 5,
        stepMinutes: 15,
        bufferMinutes: 0,
        days: 7,
        algorithm: "greedy",
      });
      setSuggestions(data?.suggestions || []);
    } catch (err) {
      notify?.(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to find suggestions.",
        "error",
      );
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async (startISO) => {
    try {
      const { data } = await createLesson({
        title,
        teacherId,
        studentId,
        date: startISO,
        duration: durationMinutes,
        status: "scheduled",
      });
      onBooked?.(data);
      notify?.("Lesson booked ✔️", "success");
    } catch (err) {
      notify?.(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to book lesson.",
        "error",
      );
      console.error(err);
    }
  };

  const handleRequest = async (startISO) => {
    try {
      await createRequest({
        teacherId,
        studentId: studentId || undefined,
        title,
        start: startISO,
        duration: durationMinutes,
      });
      notify?.("Request sent to teacher ✔️", "success");
    } catch (err) {
      notify?.(
        err.response?.data?.message ||
          err.response?.data?.error ||
          "Failed to create request.",
        "error",
      );
      console.error(err);
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Typography variant="h6" sx={{ mb: 1 }}>
        Suggest & Book
      </Typography>

      <Grid container spacing={2} sx={{ mb: 1 }}>
        <Grid item xs={12} md={3}>
          <TextField
            label="Teacher ID"
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
            size="small"
            fullWidth
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            label="Student ID"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            size="small"
            fullWidth
          />
        </Grid>
        <Grid item xs={12} md={4}>
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            size="small"
            fullWidth
          />
        </Grid>
        <Grid item xs={12} md={2}>
          <TextField
            label="Duration (min)"
            type="number"
            inputProps={{ min: 15, step: 15 }}
            value={durationMinutes}
            onChange={(e) =>
              setDurationMinutes(parseInt(e.target.value || "60", 10))
            }
            size="small"
            fullWidth
          />
        </Grid>
        <Grid item xs={12}>
          <Button
            variant="contained"
            onClick={handleSuggest}
            disabled={loading}
          >
            {loading ? "Finding…" : "Find Suggestions"}
          </Button>
        </Grid>
      </Grid>

      {!!suggestions.length && (
        <>
          <Divider sx={{ my: 1 }}>
            <Chip label="Suggestions" />
          </Divider>
          <Stack spacing={1}>
            {suggestions.map((s, i) => (
              <Paper
                key={`${s.start}-${i}`}
                sx={{
                  p: 1.5,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 1,
                }}
              >
                <Typography>
                  {new Date(s.start).toLocaleString()} —{" "}
                  {new Date(s.end).toLocaleString()}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() => handleConfirm(s.start)}
                  >
                    Confirm
                  </Button>
                  <Button
                    size="small"
                    variant="text"
                    onClick={() => handleRequest(s.start)}
                  >
                    Request
                  </Button>
                </Stack>
              </Paper>
            ))}
          </Stack>
        </>
      )}
    </Paper>
  );
}
