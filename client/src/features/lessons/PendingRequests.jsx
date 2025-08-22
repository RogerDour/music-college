import { useEffect, useState, useCallback } from "react";
import {
  Paper,
  Stack,
  Typography,
  Button,
  CircularProgress,
} from "@mui/material";
import {
  listRequests,
  approveRequest,
  rejectRequest,
} from "../../api/requests";

export default function PendingRequests({ notify, onApprovedLesson }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [visible, setVisible] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await listRequests();
      setItems(data.items || []);
    } catch (e) {
      if (e?.response?.status === 403) setVisible(false);
      else
        notify?.(
          e?.response?.data?.message || "Failed to load requests",
          "error",
        );
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    load();
  }, [load]);
  if (!visible) return null;

  const approve = async (id) => {
    try {
      const { data } = await approveRequest(id);
      notify?.("Request approved → Lesson created", "success");
      setItems((prev) => prev.filter((x) => x._id !== id));
      if (data?.lesson) onApprovedLesson?.(data.lesson);
    } catch (e) {
      notify?.(e?.response?.data?.message || "Approve failed", "error");
    }
  };

  const reject = async (id) => {
    try {
      await rejectRequest(id);
      notify?.("Request rejected", "info");
      setItems((prev) => prev.filter((x) => x._id !== id));
    } catch (e) {
      notify?.(e?.response?.data?.message || "Reject failed", "error");
    }
  };

  return (
    <Paper sx={{ p: 2, mb: 3 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 1 }}
      >
        <Typography variant="h6">Pending Requests</Typography>
        <Button size="small" onClick={load} disabled={loading}>
          Refresh
        </Button>
      </Stack>

      {loading ? (
        <Stack direction="row" alignItems="center" spacing={1}>
          <CircularProgress size={18} />
          <Typography variant="body2">Loading…</Typography>
        </Stack>
      ) : items.length === 0 ? (
        <Typography variant="body2" sx={{ opacity: 0.7 }}>
          No pending requests.
        </Typography>
      ) : (
        <Stack spacing={1}>
          {items.map((r) => (
            <Paper
              key={r._id}
              sx={{
                p: 1.5,
                display: "grid",
                gridTemplateColumns: "1fr auto",
                alignItems: "center",
                gap: 1,
              }}
            >
              <div>
                <Typography sx={{ fontWeight: 600 }}>{r.title}</Typography>
                <Typography variant="body2" sx={{ mt: 0.3 }}>
                  {new Date(r.start).toLocaleString()} • <b>Duration:</b>{" "}
                  {r.duration}m
                </Typography>
                <Typography variant="body2" sx={{ mt: 0.3 }}>
                  <b>Student:</b>{" "}
                  {r.studentId?.name || r.studentId?.email || "—"} •
                  <b> Teacher:</b>{" "}
                  {r.teacherId?.name || r.teacherId?.email || "—"}
                </Typography>
              </div>
              <Stack direction="row" spacing={1}>
                <Button
                  size="small"
                  variant="contained"
                  onClick={() => approve(r._id)}
                >
                  Approve
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  onClick={() => reject(r._id)}
                >
                  Reject
                </Button>
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Paper>
  );
}
