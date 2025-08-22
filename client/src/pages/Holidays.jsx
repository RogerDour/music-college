// client/src/pages/Holidays.jsx
import { useEffect, useState } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  Grid,
  TextField,
  Button,
  Stack,
  Divider,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import RefreshIcon from "@mui/icons-material/Refresh";
import {
  getHolidays,
  saveHolidays,
  deleteHoliday,
  clearHolidays,
} from "../api/availability";

function toYYYYMMDD(dateLike) {
  const d = new Date(dateLike);
  if (isNaN(d)) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default function Holidays() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const [form, setForm] = useState({ date: "", label: "" });
  const [saving, setSaving] = useState(false);
  const [clearing, setClearing] = useState(false);

  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      const { data } = await getHolidays();
      setItems(data?.holidays || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to load holidays");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const addOne = async () => {
    setErr("");
    if (!form.date) {
      setErr("Please choose a date.");
      return;
    }
    setSaving(true);
    try {
      // API expects array of { date, label }
      const iso = new Date(form.date + "T00:00:00.000Z").toISOString();
      const { data } = await saveHolidays([
        { date: iso, label: form.label || "" },
      ]);
      setItems(data?.holidays || []);
      setForm({ date: "", label: "" });
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to save holiday");
    } finally {
      setSaving(false);
    }
  };

  const removeOne = async (id) => {
    setErr("");
    try {
      const { data } = await deleteHoliday(id);
      setItems(data?.holidays || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to delete holiday");
    }
  };

  const clearAll = async () => {
    if (!confirm("Clear ALL holidays?")) return;
    setClearing(true);
    setErr("");
    try {
      const { data } = await clearHolidays();
      setItems(data?.holidays || []);
    } catch (e) {
      setErr(e?.response?.data?.message || "Failed to clear holidays");
    } finally {
      setClearing(false);
    }
  };

  return (
    <Container maxWidth="md" sx={{ py: 3 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          Holidays (Admin)
        </Typography>
        <Stack direction="row" spacing={1}>
          <Button
            startIcon={<RefreshIcon />}
            variant="outlined"
            onClick={load}
            disabled={loading}
          >
            Refresh
          </Button>
          <Button
            color="error"
            variant="outlined"
            onClick={clearAll}
            disabled={clearing || loading || items.length === 0}
          >
            {clearing ? "Clearing…" : "Clear All"}
          </Button>
        </Stack>
      </Stack>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
          Add / Update Holiday
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={4}>
            <TextField
              label="Date"
              type="date"
              value={form.date}
              onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
              fullWidth
              size="small"
              InputLabelProps={{ shrink: true }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Label (optional)"
              value={form.label}
              onChange={(e) =>
                setForm((f) => ({ ...f, label: e.target.value }))
              }
              fullWidth
              size="small"
              placeholder="e.g., Independence Day"
            />
          </Grid>
          <Grid item xs={12} sm={2}>
            <Button
              variant="contained"
              onClick={addOne}
              fullWidth
              disabled={saving}
            >
              {saving ? <CircularProgress size={18} /> : "Save"}
            </Button>
          </Grid>
        </Grid>

        <Divider sx={{ my: 2 }}>
          <Chip label="Existing Holidays" />
        </Divider>

        {err && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setErr("")}>
            {err}
          </Alert>
        )}

        {loading ? (
          <Stack direction="row" alignItems="center" spacing={1}>
            <CircularProgress size={20} />
            <Typography variant="body2">Loading…</Typography>
          </Stack>
        ) : items.length === 0 ? (
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            No holidays yet.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {items.map((h) => (
              <Paper
                key={h._id}
                variant="outlined"
                sx={{
                  p: 1.25,
                  display: "grid",
                  gridTemplateColumns: { xs: "1fr auto", sm: "180px 1fr auto" },
                  alignItems: "center",
                  gap: 1,
                }}
              >
                <Typography sx={{ fontWeight: 600 }}>
                  {toYYYYMMDD(h.date)}
                </Typography>
                <Typography sx={{ opacity: 0.9 }}>{h.label || "—"}</Typography>
                <Stack direction="row" spacing={1} justifyContent="flex-end">
                  <IconButton
                    aria-label="delete"
                    color="error"
                    onClick={() => removeOne(h._id)}
                  >
                    <DeleteIcon />
                  </IconButton>
                </Stack>
              </Paper>
            ))}
          </Stack>
        )}
      </Paper>
    </Container>
  );
}
