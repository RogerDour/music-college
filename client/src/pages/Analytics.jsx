// client/src/pages/Analytics.jsx
import { useEffect, useMemo, useState } from "react";
import { getOverview } from "../api/analytics";
import { listTeachers, listStudents } from "../api/users";
import { listCourses } from "../api/courses";
import { getAnomalyAlerts } from "../api/alerts";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  LabelList,
  Cell,
  Brush,
} from "recharts";

import {
  Box,
  Typography,
  Paper,
  Stack,
  CircularProgress,
  Grid,
  Alert,
  FormControlLabel,
  Switch,
} from "@mui/material";

import AnalyticsFilters from "../components/AnalyticsFilters";
import {
  COLORS,
  PIE_COLORS,
  mergeSeries,
  tooltipValueFormatter,
  rowsToCsv,
} from "../utils/analytics";

// Reusable line to remove repeated <Line> markup
function MetricLine({
  yAxisId,
  dataKey,
  name,
  color,
  showLabels,
  labelFormatter,
  rows,
}) {
  return (
    <Line
      yAxisId={yAxisId}
      type="monotone"
      dataKey={dataKey}
      name={name}
      stroke={color}
      dot={!showLabels}
    >
      {showLabels && rows.length <= 20 && (
        <LabelList
          dataKey={dataKey}
          position="top"
          formatter={labelFormatter}
        />
      )}
    </Line>
  );
}

export default function Analytics() {
  const role = (localStorage.getItem("role") || "").toLowerCase();

  // Filters
  const [from, setFrom] = useState(
    new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [bucket, setBucket] = useState("day");
  const [autoReload, setAutoReload] = useState(true);
  const [showLabels, setShowLabels] = useState(true);

  // Options
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);

  // Selected values
  const [teacherId, setTeacherId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [studentId, setStudentId] = useState("");

  // Data
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [res, setRes] = useState(null);
  const [alerts, setAlerts] = useState([]);

  const invalidRange = useMemo(() => new Date(from) > new Date(to), [from, to]);

  // Dropdown data
  useEffect(() => {
    if (role === "admin")
      listTeachers()
        .then(setTeachers)
        .catch(() => {});
    listCourses()
      .then(setCourses)
      .catch(() => {});
    listStudents()
      .then(setStudents)
      .catch(() => {});
     
  }, [role]);

  const load = async () => {
    if (invalidRange) return;
    setLoading(true);
    setErr(null);
    try {
      const data = await getOverview({
        from,
        to,
        bucket,
        teacherId: role === "admin" ? teacherId || undefined : undefined,
        courseId: courseId || undefined,
        studentId: studentId || undefined,
      });
      setRes(data);

      const a = await getAnomalyAlerts({
        from,
        to,
        bucket,
        teacherId: role === "admin" ? teacherId || undefined : undefined,
        courseId: courseId || undefined,
      });
      setAlerts(a.alerts || []);
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(); /* initial */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (autoReload && !invalidRange) load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from, to, bucket, teacherId, courseId, studentId, autoReload]);

  const rows = useMemo(() => (res ? mergeSeries(res.series) : []), [res]);
  const hasAnyData = rows.length > 0;

  // KPIs & stats
  const lessonsTotal = res?.kpis?.lessonsTotal ?? 0;
  const approvalsTotal = res?.kpis?.approvalsTotal ?? 0;
  const attendanceAvgPct = res?.kpis?.attendanceAvg ?? null;

  const attStdPct =
    res?.stats?.attendance?.std != null
      ? Math.round(res.stats.attendance.std * 100)
      : null;
  const attCount = res?.stats?.attendance?.count ?? 0;
  const ratingAvg =
    res?.stats?.rating?.avg != null
      ? Number(res.stats.rating.avg).toFixed(1)
      : null;
  const ratingStd =
    res?.stats?.rating?.std != null
      ? Number(res.stats.rating.std).toFixed(2)
      : null;
  const ratingCount = res?.stats?.rating?.count ?? 0;

  const pieData = useMemo(() => {
    const bd = res?.statusBreakdown || {};
    return Object.entries(bd).map(([name, value]) => ({ name, value }));
  }, [res?.statusBreakdown]);

  // ---- Deduplicate legend + lines via a single config ----
  const seriesConfig = [
    {
      key: "lessons",
      name: "Lessons",
      color: COLORS.lessons,
      yAxisId: "counts",
      labelFormatter: (v) => v,
      legendFormat: (v) => `${v}`,
    },
    {
      key: "approvals",
      name: "Approvals",
      color: COLORS.approvals,
      yAxisId: "counts",
      labelFormatter: (v) => v,
      legendFormat: (v) => `${v}`,
    },
    {
      key: "attendance",
      name: "Attendance",
      color: COLORS.attendance,
      yAxisId: "att",
      labelFormatter: (v) => `${Math.round(v * 100)}%`,
      legendFormat: (v) => `${Math.round(v * 100)}%`,
    },
    {
      key: "rating",
      name: "Avg Rating",
      color: COLORS.rating,
      yAxisId: "rat",
      labelFormatter: (v) => Number(v).toFixed(1),
      legendFormat: (v) => v.toFixed(1),
    },
  ];

  const lastValue = (key) => {
    for (let i = rows.length - 1; i >= 0; i--) {
      const v = rows[i]?.[key];
      if (v != null && !Number.isNaN(v)) return v;
    }
    return "—";
  };

  const CustomLegend = () => (
    <Stack
      direction="row"
      spacing={3}
      justifyContent="center"
      sx={{ mt: 1, flexWrap: "wrap" }}
    >
      {seriesConfig.map((s) => (
        <Stack key={s.key} direction="row" spacing={1} alignItems="center">
          <span
            style={{
              width: 12,
              height: 12,
              borderRadius: 3,
              display: "inline-block",
              background: s.color,
            }}
          />
          <Typography variant="body2">
            {s.name}:{" "}
            <strong>
              {(() => {
                const v = lastValue(s.key);
                if (v === "—") return "—";
                try {
                  return s.legendFormat(v);
                } catch {
                  return v;
                }
              })()}
            </strong>
          </Typography>
        </Stack>
      ))}
    </Stack>
  );

  const exportCsv = () => {
    const csv = rowsToCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const r = res?.range || { from, to, bucket };
    const name = `analytics_${String(r.from).slice(0, 10)}_${String(r.to).slice(0, 10)}_${r.bucket}.csv`;
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  // ---- KPI & Stats cards via config arrays (removes remaining clones) ----
  const kpis = [
    { label: "Lessons (total)", value: lessonsTotal },
    { label: "Approvals (total)", value: approvalsTotal },
    {
      label: "Attendance (avg)",
      value: attendanceAvgPct == null ? "N/A" : `${attendanceAvgPct}%`,
    },
  ];

  const stats = [
    {
      label: "Avg Rating",
      value: ratingAvg == null ? "N/A" : `${ratingAvg} / 5`,
      sub: `${ratingCount} feedbacks`,
    },
    { label: "Rating Std Dev", value: ratingStd == null ? "N/A" : ratingStd },
    {
      label: "Attendance Std Dev",
      value: attStdPct == null ? "N/A" : `${attStdPct}%`,
      sub: `${attCount} completed lessons`,
    },
  ];

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Reports & Analytics
      </Typography>

      <AnalyticsFilters
        role={role}
        from={from}
        to={to}
        bucket={bucket}
        setFrom={setFrom}
        setTo={setTo}
        setBucket={setBucket}
        teachers={teachers}
        teacherId={teacherId}
        setTeacherId={setTeacherId}
        courses={courses}
        courseId={courseId}
        setCourseId={setCourseId}
        students={students}
        studentId={studentId}
        setStudentId={setStudentId}
        loading={loading}
        invalidRange={invalidRange}
        onReload={load}
        onExportCsv={exportCsv}
        extraControls={
          <>
            <FormControlLabel
              control={
                <Switch
                  checked={autoReload}
                  onChange={(e) => setAutoReload(e.target.checked)}
                />
              }
              label="Auto reload"
            />
            <FormControlLabel
              control={
                <Switch
                  checked={showLabels}
                  onChange={(e) => setShowLabels(e.target.checked)}
                />
              }
              label="Show values on chart"
            />
          </>
        }
      />

      {invalidRange && (
        <Alert severity="warning">“From” must be before “To”.</Alert>
      )}
      {err && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {String(err)}
        </Alert>
      )}

      {alerts?.length > 0 && (
        <Stack spacing={1} sx={{ my: 2 }}>
          {alerts.map((al, i) => (
            <Alert key={i} severity={al.severity || "info"}>
              {al.message}
            </Alert>
          ))}
        </Stack>
      )}

      {/* KPI row */}
      <Grid container spacing={2} sx={{ my: 2 }}>
        {kpis.map((k) => (
          <Grid item xs={12} sm={4} key={k.label}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="overline">{k.label}</Typography>
              <Typography variant="h5" sx={{ mt: 0.5 }}>
                {k.value}
              </Typography>
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Stats row */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        {stats.map((s) => (
          <Grid item xs={12} sm={4} key={s.label}>
            <Paper variant="outlined" sx={{ p: 2 }}>
              <Typography variant="overline">{s.label}</Typography>
              <Typography variant="h5" sx={{ mt: 0.5 }}>
                {s.value}
              </Typography>
              {s.sub && (
                <Typography variant="caption" color="text.secondary">
                  {s.sub}
                </Typography>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>

      {/* Time-series */}
      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ height: 380 }}>
          {loading ? (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{ height: "100%" }}
            >
              <CircularProgress />
            </Stack>
          ) : hasAnyData ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" />
                <YAxis yAxisId="counts" allowDecimals={false} />
                <YAxis
                  yAxisId="att"
                  orientation="right"
                  domain={[0, 1]}
                  tickFormatter={(v) => `${Math.round(v * 100)}%`}
                />
                <YAxis yAxisId="rat" orientation="right" domain={[0, 5]} hide />
                <Tooltip formatter={tooltipValueFormatter} />
                <Legend content={<CustomLegend />} />

                {seriesConfig.map((s) => (
                  <MetricLine
                    key={s.key}
                    yAxisId={s.yAxisId}
                    dataKey={s.key}
                    name={s.name}
                    color={s.color}
                    showLabels={showLabels}
                    labelFormatter={s.labelFormatter}
                    rows={rows}
                  />
                ))}

                <Brush dataKey="bucket" height={24} stroke="#ccc" />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{ height: "100%" }}
            >
              <Typography color="text.secondary">
                No data for the selected range.
              </Typography>
            </Stack>
          )}
        </Box>
      </Paper>

      {/* Status breakdown pie */}
      <Paper variant="outlined" sx={{ p: 2, mt: 2, height: 300 }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Tooltip />
            <Legend />
            <Pie
              data={pieData}
              dataKey="value"
              nameKey="name"
              label={({ name, percent }) =>
                `${name}: ${Math.round(percent * 100)}%`
              }
            >
              {pieData.map((_, idx) => (
                <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
      </Paper>
    </Box>
  );
}