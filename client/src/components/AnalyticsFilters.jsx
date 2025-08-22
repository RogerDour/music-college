import {
  Stack,
  TextField,
  MenuItem,
  Button,
  FormControl,
  InputLabel,
  Select,
} from "@mui/material";

/**
 * Shared filters toolbar for Analytics/Reports.
 */
export default function AnalyticsFilters({
  role,
  from,
  to,
  bucket,
  setFrom,
  setTo,
  setBucket,
  teachers = [],
  teacherId,
  setTeacherId,
  courses = [],
  courseId,
  setCourseId,
  students = [],
  studentId,
  setStudentId,
  loading = false,
  invalidRange = false,
  onReload,
  onExportCsv,
  extraControls = null,
}) {
  return (
    <Stack
      direction="row"
      spacing={2}
      useFlexGap
      flexWrap="wrap"
      sx={{ mb: 2 }}
    >
      <TextField
        type="date"
        label="From"
        size="small"
        value={from}
        onChange={(e) => setFrom(e.target.value)}
      />
      <TextField
        type="date"
        label="To"
        size="small"
        value={to}
        onChange={(e) => setTo(e.target.value)}
      />
      <TextField
        select
        label="Bucket"
        size="small"
        value={bucket}
        onChange={(e) => setBucket(e.target.value)}
        sx={{ minWidth: 140 }}
      >
        <MenuItem value="day">Day</MenuItem>
        <MenuItem value="week">Week</MenuItem>
        <MenuItem value="month">Month</MenuItem>
      </TextField>

      {role === "admin" && (
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="teacher-label">Teacher</InputLabel>
          <Select
            labelId="teacher-label"
            label="Teacher"
            value={teacherId}
            onChange={(e) => setTeacherId(e.target.value)}
          >
            <MenuItem value="">
              <em>All teachers</em>
            </MenuItem>
            {teachers.map((t) => (
              <MenuItem key={t._id} value={t._id}>
                {t.name || t.email}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      )}

      <FormControl size="small" sx={{ minWidth: 220 }}>
        <InputLabel id="course-label">Course</InputLabel>
        <Select
          labelId="course-label"
          label="Course"
          value={courseId}
          onChange={(e) => setCourseId(e.target.value)}
        >
          <MenuItem value="">
            <em>All courses</em>
          </MenuItem>
          {courses.map((c) => (
            <MenuItem key={c._id} value={c._id}>
              {c.title}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 220 }}>
        <InputLabel id="student-label">Student</InputLabel>
        <Select
          labelId="student-label"
          label="Student"
          value={studentId}
          onChange={(e) => setStudentId(e.target.value)}
        >
          <MenuItem value="">
            <em>All students</em>
          </MenuItem>
          {students.length === 0 ? (
            <MenuItem value="" disabled>
              No students
            </MenuItem>
          ) : (
            students.map((s) => (
              <MenuItem key={s._id} value={s._id}>
                {s.name || s.email}
              </MenuItem>
            ))
          )}
        </Select>
      </FormControl>

      {onReload && (
        <Button
          variant="contained"
          onClick={onReload}
          disabled={loading || invalidRange}
        >
          Reload
        </Button>
      )}
      {onExportCsv && (
        <Button variant="outlined" onClick={onExportCsv} disabled={loading}>
          Export CSV
        </Button>
      )}

      {extraControls}
    </Stack>
  );
}
