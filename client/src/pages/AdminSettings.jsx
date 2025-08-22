import { useEffect, useState } from "react";
import {
  Box,
  Stack,
  Paper,
  Typography,
  Chip,
  Button,
  TextField,
  Alert,
} from "@mui/material";
import { getHours, updateHours } from "../api/settings";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AdminSettings() {
  const [form, setForm] = useState({
    openHour: 9,
    closeHour: 21,
    daysOpen: [0, 1, 2, 3, 4, 5, 6],
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  useEffect(() => {
    (async () => {
      setLoading(true);
      setErr("");
      setOk("");
      try {
        const data = await getHours();
        if (data)
          setForm({
            openHour: Number(data.openHour ?? 9),
            closeHour: Number(data.closeHour ?? 21),
            daysOpen: Array.isArray(data.daysOpen)
              ? data.daysOpen
              : [0, 1, 2, 3, 4, 5, 6],
          });
      } catch {
        setErr("Failed to load settings");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const toggleDay = (d) =>
    setForm((f) => ({
      ...f,
      daysOpen: f.daysOpen.includes(d)
        ? f.daysOpen.filter((x) => x !== d)
        : [...f.daysOpen, d].sort((a, b) => a - b),
    }));

  const save = async () => {
    setSaving(true);
    setErr("");
    setOk("");
    try {
      await updateHours(form);
      setOk("Saved!");
    } catch (e) {
      setErr(e?.response?.data?.error || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box sx={{ p: 4, pt: 10 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>
        Global Hours
      </Typography>

      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}
      {ok && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {ok}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ p: 2, opacity: loading ? 0.6 : 1 }}>
        <Stack spacing={2}>
          <Stack direction="row" spacing={2}>
            <TextField
              type="number"
              label="Open hour (0–23)"
              inputProps={{ min: 0, max: 23 }}
              value={form.openHour}
              onChange={(e) =>
                setForm((f) => ({ ...f, openHour: Number(e.target.value) }))
              }
              sx={{ maxWidth: 220 }}
            />
            <TextField
              type="number"
              label="Close hour (0–23)"
              inputProps={{ min: 0, max: 23 }}
              value={form.closeHour}
              onChange={(e) =>
                setForm((f) => ({ ...f, closeHour: Number(e.target.value) }))
              }
              sx={{ maxWidth: 220 }}
            />
          </Stack>

          <Stack spacing={1}>
            <Typography variant="subtitle2">Days open</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {DAY_LABELS.map((lbl, d) => {
                const on = form.daysOpen.includes(d);
                return (
                  <Chip
                    key={d}
                    label={lbl}
                    color={on ? "primary" : "default"}
                    variant={on ? "filled" : "outlined"}
                    onClick={() => toggleDay(d)}
                    sx={{ mr: 1, mb: 1 }}
                  />
                );
              })}
            </Stack>
          </Stack>

          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={save} disabled={saving}>
              {saving ? "Saving…" : "Save"}
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}
