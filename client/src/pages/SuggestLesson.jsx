import { useState, useEffect, useMemo } from "react";
import {
  Box,
  Container,
  Paper,
  Grid,
  Stack,
  Typography,
  TextField,
  Button,
  Alert,
  Collapse,
  Divider,
  Chip,
  IconButton,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CircularProgress,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { createLesson, suggestSlots as suggestLessons } from "../api/lessons";
import { createRequest, getMyRequests } from "../api/requests";

export default function SuggestLesson() {
  const role = (localStorage.getItem("role") || "").toLowerCase();
  const isTeacherOrAdmin = role === "teacher" || role === "admin";

  const [teacherId, setTeacherId] = useState("");
  const [studentId, setStudentId] = useState("");
  const [title, setTitle] = useState("Scheduled Lesson");
  const [durationMinutes, setDurationMinutes] = useState(60);

  // advanced knobs
  const [algorithm, setAlgorithm] = useState("greedy");
  const [maxSuggestions, setMaxSuggestions] = useState(5);
  const [stepMinutes, setStepMinutes] = useState(30);
  const [bufferMinutes, setBufferMinutes] = useState(10);
  const [days, setDays] = useState(7);
  const [from, setFrom] = useState(""); // ISO (UTC) optional

  const [openAdvanced, setOpenAdvanced] = useState(true);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // ---------- My Requests (student) ----------
  const [reqItems, setReqItems] = useState([]);
  const [reqCounts, setReqCounts] = useState({
    pending: 0,
    approved: 0,
    rejected: 0,
  });
  const [reqLoading, setReqLoading] = useState(false);

  const loadMyRequests = async () => {
    if (role !== "student") return;
    setReqLoading(true);
    try {
      const { data } = await getMyRequests();
      setReqItems(Array.isArray(data?.items) ? data.items : []);
      setReqCounts(data?.counts || { pending: 0, approved: 0, rejected: 0 });
    } catch (e) {
      console.error("loadMyRequests failed", e?.response?.data || e.message);
    } finally {
      setReqLoading(false);
    }
  };

  useEffect(() => {
    loadMyRequests();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  const grouped = useMemo(() => {
    const g = { pending: [], approved: [], rejected: [] };
    for (const r of reqItems) g[r.status]?.push(r);
    return g;
  }, [reqItems]);

  // ---------- Suggest / Confirm / Request ----------
  const suggest = async () => {
    setErr("");
    if (!teacherId || !studentId) {
      setErr("Please enter both Teacher ID and Student ID.");
      return;
    }
    setLoading(true);
    try {
      const { data } = await suggestLessons({
        teacherId,
        studentId,
        durationMinutes, // mapped to durationMin in API layer
        maxSuggestions,
        stepMinutes,
        bufferMinutes,
        days,
        algorithm,
        ...(from ? { from } : {}),
      });
      setSuggestions(data?.suggestions || []);
    } catch (e) {
      setErr(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          e?.message ||
          "Failed to get suggestions",
      );
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const confirm = async (startISO) => {
    setErr("");
    try {
      const { data } = await createLesson({
        title,
        teacherId,
        studentId,
        date: startISO,
        duration: durationMinutes,
      });
      alert("Booked: " + new Date(data.date).toLocaleString());
    } catch (e) {
      setErr(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Failed to book lesson",
      );
      console.error(e);
    }
  };

  const requestIt = async (startISO) => {
    setErr("");
    try {
      await createRequest({
        teacherId,
        studentId: studentId || undefined,
        title,
        start: startISO,
        duration: durationMinutes,
      });
      alert("Request sent to teacher ✔️");
      loadMyRequests();
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to create request");
      console.error(e);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2, fontWeight: 600 }}>
        Suggest & Book Lesson
      </Typography>

      <Paper variant="outlined" sx={{ p: 2 }}>
        {/* IDs & basic info */}
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField
              label="Teacher ID"
              value={teacherId}
              onChange={(e) => setTeacherId(e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField
              label="Student ID"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={8}>
            <TextField
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              fullWidth
              size="small"
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <TextField
              label="Duration (minutes)"
              type="number"
              inputProps={{ min: 15, step: 15 }}
              value={durationMinutes}
              onChange={(e) =>
                setDurationMinutes(parseInt(e.target.value || "60", 10))
              }
              fullWidth
              size="small"
            />
          </Grid>
        </Grid>

        {/* Advanced options toggle */}
        <Box
          sx={{
            mt: 2,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Divider sx={{ flex: 1, mr: 1 }}>
            <Chip label="Advanced options" />
          </Divider>
          <IconButton
            size="small"
            onClick={() => setOpenAdvanced((o) => !o)}
            aria-label="toggle advanced"
          >
            {openAdvanced ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        </Box>

        {/* Advanced options */}
        <Collapse in={openAdvanced} unmountOnExit>
          <Grid container spacing={2} sx={{ mt: 0.5 }}>
            <Grid item xs={12} sm={6} md={4}>
              <FormControl fullWidth size="small">
                <InputLabel id="algo-label">Algorithm</InputLabel>
                <Select
                  labelId="algo-label"
                  label="Algorithm"
                  value={algorithm}
                  onChange={(e) => setAlgorithm(e.target.value)}
                >
                  <MenuItem value="greedy">Greedy</MenuItem>
                  <MenuItem value="backtracking">Backtracking</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Max suggestions"
                type="number"
                inputProps={{ min: 1, max: 20 }}
                value={maxSuggestions}
                onChange={(e) =>
                  setMaxSuggestions(parseInt(e.target.value || "5", 10))
                }
                fullWidth
                size="small"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Step (minutes)"
                type="number"
                inputProps={{ min: 5, step: 5 }}
                value={stepMinutes}
                onChange={(e) =>
                  setStepMinutes(parseInt(e.target.value || "30", 10))
                }
                fullWidth
                size="small"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Buffer (minutes)"
                type="number"
                inputProps={{ min: 0, step: 5 }}
                value={bufferMinutes}
                onChange={(e) =>
                  setBufferMinutes(parseInt(e.target.value || "10", 10))
                }
                fullWidth
                size="small"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="Days to search"
                type="number"
                inputProps={{ min: 1, max: 60 }}
                value={days}
                onChange={(e) => setDays(parseInt(e.target.value || "7", 10))}
                fullWidth
                size="small"
              />
            </Grid>

            <Grid item xs={12} sm={6} md={4}>
              <TextField
                label="From (ISO, optional)"
                placeholder="2025-08-11T00:00:00.000Z"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                fullWidth
                size="small"
              />
            </Grid>
          </Grid>
        </Collapse>

        {/* Actions */}
        <Stack direction="row" spacing={1.5} sx={{ mt: 2 }}>
          <Button
            variant="contained"
            onClick={suggest}
            disabled={loading}
            startIcon={loading ? <CircularProgress size={18} /> : null}
          >
            {loading ? "Finding…" : "Find Suggestions"}
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setSuggestions([]);
              setErr("");
            }}
          >
            Clear
          </Button>
        </Stack>

        {/* Error */}
        <Collapse in={!!err} unmountOnExit>
          <Alert severity="error" sx={{ mt: 2 }} onClose={() => setErr("")}>
            {err}
          </Alert>
        </Collapse>

        {/* Suggestions */}
        <Box sx={{ mt: 2 }}>
          {suggestions.length === 0 && !loading ? (
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              No suggestions yet. Try widening the search.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {suggestions.map((s, i) => (
                <Paper
                  key={`${s.start}-${i}`}
                  variant="outlined"
                  sx={{
                    p: 1.5,
                    display: "grid",
                    gridTemplateColumns: { xs: "1fr", sm: "1fr auto" },
                    alignItems: "center",
                    gap: 1,
                  }}
                >
                  <Typography>
                    {new Date(s.start).toLocaleString()} —{" "}
                    {new Date(s.end).toLocaleString()}
                  </Typography>
                  <Stack direction="row" spacing={1} justifyContent="flex-end">
                    {isTeacherOrAdmin && (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => confirm(s.start)}
                      >
                        Confirm
                      </Button>
                    )}
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => requestIt(s.start)}
                    >
                      Request
                    </Button>
                  </Stack>
                </Paper>
              ))}
            </Stack>
          )}
        </Box>
      </Paper>

      {/* ---- My Requests (students) ---- */}
      {role === "student" && (
        <Paper variant="outlined" sx={{ p: 2, mt: 3 }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            sx={{ mb: 1 }}
          >
            <Typography variant="h6">My Requests</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Chip label={`Pending: ${reqCounts.pending || 0}`} size="small" />
              <Chip
                label={`Approved: ${reqCounts.approved || 0}`}
                size="small"
              />
              <Chip
                label={`Rejected: ${reqCounts.rejected || 0}`}
                size="small"
              />
              <Button
                size="small"
                onClick={loadMyRequests}
                disabled={reqLoading}
              >
                {reqLoading ? "Loading…" : "Refresh"}
              </Button>
            </Stack>
          </Stack>

          {reqItems.length === 0 ? (
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              You have no requests yet.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {["pending", "approved", "rejected"].map((status) =>
                grouped[status].length ? (
                  <Box key={status}>
                    <Typography
                      variant="subtitle2"
                      sx={{ mt: 1, mb: 0.5, opacity: 0.85 }}
                    >
                      {status[0].toUpperCase() + status.slice(1)}
                    </Typography>
                    <Stack spacing={1}>
                      {grouped[status].map((r) => (
                        <Paper
                          key={r._id}
                          variant="outlined"
                          sx={{
                            p: 1.25,
                            display: "grid",
                            gridTemplateColumns: "1fr auto",
                            gap: 1,
                          }}
                        >
                          <div>
                            <Typography sx={{ fontWeight: 600 }}>
                              {r.title || "Lesson request"}
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.3 }}>
                              {new Date(r.start).toLocaleString()} •{" "}
                              <b>Duration:</b> {r.duration}m
                            </Typography>
                            <Typography variant="body2" sx={{ mt: 0.3 }}>
                              <b>Teacher:</b>{" "}
                              {r.teacherId?.name || r.teacherId?.email || "—"}
                            </Typography>
                          </div>
                          <Chip label={status} size="small" />
                        </Paper>
                      ))}
                    </Stack>
                  </Box>
                ) : null,
              )}
            </Stack>
          )}
        </Paper>
      )}
    </Container>
  );
}
