import { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
  CartesianGrid,
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
} from "@mui/material";

import { getOverview } from "../api/analytics";
import { listTeachers, listStudents } from "../api/users";
import { listCourses } from "../api/courses";

import AnalyticsFilters from "../components/AnalyticsFilters";
import {
  COLORS,
  mergeSeries,
  tooltipValueFormatter,
  rowsToCsv,
} from "../utils/analytics";

export default function Reports() {
  const role = (localStorage.getItem("role") || "").toLowerCase();

  // Filters
  const [from, setFrom] = useState(
    new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().slice(0, 10),
  );
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [bucket, setBucket] = useState("day");

  // Options
  const [teachers, setTeachers] = useState([]);
  const [courses, setCourses] = useState([]);
  const [students, setStudents] = useState([]);

  // Selections
  const [teacherId, setTeacherId] = useState("");
  const [courseId, setCourseId] = useState("");
  const [studentId, setStudentId] = useState("");

  // Data
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState(null);
  const [res, setRes] = useState(null);

  const invalidRange = useMemo(() => new Date(from) > new Date(to), [from, to]);
  const rows = useMemo(() => (res ? mergeSeries(res.series) : []), [res]);

  useEffect(() => {
    if (role === "admin") {
      listTeachers()
        .then(setTeachers)
        .catch(() => {});
    }
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
    } catch (e) {
      setErr(e?.response?.data?.error || e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(); /* initial */ // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const exportCsv = () => {
    const csv = rowsToCsv(rows);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const r = res?.range || { from, to, bucket };
    const name = `reports_${String(r.from).slice(0, 10)}_${String(r.to).slice(0, 10)}_${r.bucket}.csv`;
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ maxWidth: 1100, mx: "auto", p: 2 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Reports
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
      />

      {invalidRange && (
        <Alert severity="warning">“From” must be before “To”.</Alert>
      )}
      {err && (
        <Alert severity="error" sx={{ mt: 1 }}>
          {String(err)}
        </Alert>
      )}

      {/* KPI row (lean) */}
      <Grid container spacing={2} sx={{ my: 2 }}>
        <Grid item xs={12} sm={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="overline">Lessons (total)</Typography>
            <Typography variant="h5" sx={{ mt: 0.5 }}>
              {res?.kpis?.lessonsTotal ?? 0}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="overline">Approvals (total)</Typography>
            <Typography variant="h5" sx={{ mt: 0.5 }}>
              {res?.kpis?.approvalsTotal ?? 0}
            </Typography>
          </Paper>
        </Grid>
      </Grid>

      <Paper variant="outlined" sx={{ p: 2 }}>
        <Box sx={{ height: 360 }}>
          {loading ? (
            <Stack
              alignItems="center"
              justifyContent="center"
              sx={{ height: "100%" }}
            >
              <CircularProgress />
            </Stack>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={rows}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="bucket" />
                <YAxis />
                <Tooltip formatter={tooltipValueFormatter} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="lessons"
                  stroke={COLORS.lessons}
                />
                <Line
                  type="monotone"
                  dataKey="approvals"
                  stroke={COLORS.approvals}
                />
                <Line
                  type="monotone"
                  dataKey="attendance"
                  stroke={COLORS.attendance}
                />
                <Line type="monotone" dataKey="rating" stroke={COLORS.rating} />
                <Brush dataKey="bucket" height={20} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </Box>
      </Paper>
    </Box>
  );
}
