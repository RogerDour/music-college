import { useEffect, useMemo, useState } from "react";
import { myCalendar } from "../api/calendar";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Divider,
  Button,
  TextField,
} from "@mui/material";

const typeColor = (t) =>
  t === "lesson" ? "success" : t === "holiday" ? "warning" : "info";

function toISODate(d) {
  const x = new Date(d);
  return new Date(x.getTime() - x.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
}

export default function Calendar() {
  const [rangeDays, setRangeDays] = useState(30);
  const [fromDate, setFromDate] = useState(() => toISODate(new Date()));
  const [toDate, setToDate] = useState(() =>
    toISODate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
  );

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  const fetchData = async (fISO, tISO, signal) => {
    setErr("");
    setLoading(true);
    try {
      const from = new Date(fISO);
      const to = new Date(
        new Date(tISO).getTime() +
          23 * 60 * 60 * 1000 +
          59 * 60 * 1000 +
          59 * 1000,
      ); // include whole end day
      const list = await myCalendar(from.toISOString(), to.toISOString(), {
        signal,
      });
      setEvents(Array.isArray(list) ? list : []);
    } catch (e) {
      setErr(
        e?.response?.data?.error || e?.message || "Failed to load calendar.",
      );
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchData(fromDate, toDate, controller.signal);
    return () => controller.abort();
     
  }, [fromDate, toDate]);

  // quick presets
  const setPreset = (days) => {
    const f = new Date();
    const t = new Date(Date.now() + days * 24 * 60 * 60 * 1000);
    setFromDate(toISODate(f));
    setToDate(toISODate(t));
    setRangeDays(days);
  };

  const sorted = useMemo(() => {
    return [...events].sort((a, b) => {
      const ta = a.start ? new Date(a.start).getTime() : 0;
      const tb = b.start ? new Date(b.start).getTime() : 0;
      return ta - tb;
    });
  }, [events]);

  const grouped = useMemo(() => {
    const map = new Map();
    const keyOf = (ev) =>
      ev.start ? toISODate(new Date(ev.start)) : "no-time";
    for (const ev of sorted) {
      const k = keyOf(ev);
      if (!map.has(k)) map.set(k, []);
      map.get(k).push(ev);
    }
    return map;
  }, [sorted]);

  return (
    <Box sx={{ maxWidth: 960, mx: "auto", p: 2 }}>
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={1.5}
        alignItems={{ xs: "stretch", sm: "center" }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Typography variant="h5">My Calendar</Typography>

        <Stack direction="row" spacing={1} useFlexGap flexWrap="wrap">
          <Button
            size="small"
            variant={rangeDays === 7 ? "contained" : "outlined"}
            onClick={() => setPreset(7)}
          >
            7 days
          </Button>
          <Button
            size="small"
            variant={rangeDays === 30 ? "contained" : "outlined"}
            onClick={() => setPreset(30)}
          >
            30 days
          </Button>
          <Button
            size="small"
            variant={rangeDays === 60 ? "contained" : "outlined"}
            onClick={() => setPreset(60)}
          >
            60 days
          </Button>
        </Stack>
      </Stack>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
          <TextField
            label="From"
            type="date"
            size="small"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <TextField
            label="To"
            type="date"
            size="small"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            InputLabelProps={{ shrink: true }}
          />
          <Button
            size="small"
            variant="outlined"
            onClick={() => fetchData(fromDate, toDate)}
            sx={{ ml: { sm: "auto" } }}
          >
            Refresh
          </Button>
        </Stack>
      </Paper>

      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}

      {loading ? (
        <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 1 }}>
          <CircularProgress size={20} />
          <Typography variant="body2">Loading…</Typography>
        </Stack>
      ) : events.length === 0 ? (
        <Typography variant="body2" sx={{ opacity: 0.7 }}>
          No events in this range.
        </Typography>
      ) : (
        [...grouped.entries()].map(([day, list]) => (
          <Box key={day} sx={{ mb: 2 }}>
            <Divider textAlign="left" sx={{ mb: 1.5 }}>
              <Typography variant="subtitle2" sx={{ opacity: 0.8 }}>
                {day === "no-time"
                  ? "Other"
                  : new Date(day).toLocaleDateString()}
                {"  "}
                <Chip label={`${list.length}`} size="small" sx={{ ml: 1 }} />
              </Typography>
            </Divider>

            <Stack spacing={1}>
              {list.map((ev) => (
                <Paper key={`${ev.type}-${ev.id}`} sx={{ p: 1.25 }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    useFlexGap
                    flexWrap="wrap"
                  >
                    <Chip
                      size="small"
                      label={ev.type}
                      color={typeColor(ev.type)}
                    />
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {ev.title}
                    </Typography>
                    {ev.start ? (
                      <Typography variant="body2">
                        {new Date(ev.start).toLocaleString()}
                        {ev.end
                          ? ` → ${new Date(ev.end).toLocaleString()}`
                          : ""}
                      </Typography>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        (no time)
                      </Typography>
                    )}
                  </Stack>
                </Paper>
              ))}
            </Stack>
          </Box>
        ))
      )}
    </Box>
  );
}
