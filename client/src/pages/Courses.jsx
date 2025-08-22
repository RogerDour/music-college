// client/src/pages/Courses.jsx
// -----------------------------------------------------------------------------
// Courses page
// - Lists all courses with capacity & enrollment info
// - Students can request/leave enrollment
// - Teachers/Admins can see roster, edit capacity, upload a cover image,
//   and set a description (stored on the Course document)
// - Teacher name is shown (server populates teacherId -> teacher{name,email})
// - NEW: Materials button is enabled only for admin, course teacher, or
//         students who are APPROVED in that course
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useState, useCallback } from "react";
import { io } from "socket.io-client";
import axios from "axios";
import {
  // Layout & typography
  Box,
  Stack,
  Grid,
  Divider,
  Typography,
  Alert,
  Chip,
  // Cards
  Card,
  CardContent,
  CardActions,
  CardMedia,
  // Inputs & buttons
  Button,
  TextField,
  Tooltip,
  // Drawers & dialogs
  Drawer,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  // Selects (for roster status)
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  // Progress
  CircularProgress,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";

// Enrollment helpers (existing)
import {
  myEnrollments,
  enroll as apiEnroll,
  dropEnrollment as apiDropEnrollment,
  courseRoster as apiCourseRoster,
  updateEnrollmentStatus as apiUpdateEnrollmentStatus,
} from "../api/enrollments";

// Course helpers (description & cover image)
import { updateCourse, uploadCourseCover } from "../api/courses";

// -----------------------------------------------------------------------------
// Constants & generic helpers
// -----------------------------------------------------------------------------
const API = (
  import.meta.env.VITE_API_URL || "http://localhost:5000/api"
).replace(/\/$/, "");
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";
const API_ORIGIN = API.replace(/\/api$/, ""); // -> http://localhost:5000

const toAbsUrl = (p) => {
  if (!p) return "";
  if (/^https?:\/\//i.test(p)) return p; // already absolute
  return `${API_ORIGIN}${p.startsWith("/") ? p : "/" + p}`;
};

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Fetch approved counts per course
async function countByCourse(courseIds = []) {
  if (!courseIds.length) return {};
  const { data } = await axios.get(`${API}/enrollments/count`, {
    headers: authHeaders(),
    params: { courseIds: courseIds.join(",") },
  });
  return data.counts || {};
}

// Update only the capacity of a course
async function updateCapacity(courseId, nextValue) {
  const payload = {
    capacity: nextValue === "" || nextValue === null ? null : Number(nextValue),
  };
  await axios.put(`${API}/courses/${courseId}`, payload, {
    headers: authHeaders(),
  });
}

// -----------------------------------------------------------------------------
// Component
// -----------------------------------------------------------------------------
export default function Courses() {
  // ---- Identity / Role -----------------------------------------------------------
  const role = (localStorage.getItem("role") || "student").toLowerCase();
  const myId = localStorage.getItem("userId");
  const canAdd = useMemo(() => role === "admin" || role === "teacher", [role]);

  // ---- Page state ----------------------------------------------------------------
  const [items, setItems] = useState([]); // course list
  const [counts, setCounts] = useState({}); // courseId -> { approved }
  const [enrolled, setEnrolled] = useState({}); // courseId -> { enrollmentId, status }

  const [title, setTitle] = useState(""); // new course title
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // ---- Roster drawer state (admin/teacher) ---------------------------------------
  const [rosterOpen, setRosterOpen] = useState(false);
  const [rosterCourse, setRosterCourse] = useState(null); // { id, title }
  const [rosterItems, setRosterItems] = useState([]); // [{ _id, userId, status }]
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterErr, setRosterErr] = useState("");

  // ---- Edit dialog state (description + cover) -----------------------------------
  const [editOpen, setEditOpen] = useState(false);
  const [editCourse, setEditCourse] = useState(null); // full course object
  const [editDesc, setEditDesc] = useState("");
  const [editFile, setEditFile] = useState(null);

  // Map my enrollments to a quick lookup table (courseId -> { enrollmentId, status })
  const buildEnrollMap = useCallback((arr) => {
    const map = {};
    for (const e of arr || []) {
      const c = e.courseId?._id || e.courseId || e.course || e.course_id;
      if (!c) continue;
      map[String(c)] = {
        enrollmentId: String(e._id || e.id),
        status: String(e.status || "approved"),
      };
    }
    return map;
  }, []);

  // ---- Initial load ---------------------------------------------------------------
  const load = async () => {
    setErr("");
    setLoading(true);
    try {
      // 1) Courses
      const res = await axios.get(`${API}/courses`, { headers: authHeaders() });
      const list = Array.isArray(res.data) ? res.data : res.data.courses || [];
      setItems(list);

      // 2) Counts per course (approved only)
      const ids = list.map((c) => c._id || c.id).filter(Boolean);
      setCounts(ids.length ? await countByCourse(ids) : {});

      // 3) My enrollments (student only)
      if (role === "student") {
        try {
          const mine = await myEnrollments();
          setEnrolled(buildEnrollMap(mine));
        } catch (e) {
          console.warn("myEnrollments failed", e?.response?.data || e);
          setEnrolled({});
        }
      } else {
        setEnrolled({});
      }
    } catch (e) {
      console.error("Failed to load courses:", e);
      setErr("Failed to load courses.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Live updates: enrollment status via socket.io ------------------------------
  useEffect(() => {
    const token = localStorage.getItem("token");
    const userId = localStorage.getItem("userId");
    if (!token || !userId) return;

    const s = io(SOCKET_URL, { auth: { token } });
    // (legacy) user room join
    s.emit("identify", String(userId));

    s.on("notify", (n) => {
      if (n?.type === "enrollment_status" && n?.data) {
        const { courseId, enrollmentId, status } = n.data;
        if (!courseId) return;
        setEnrolled((m) => ({
          ...m,
          [String(courseId)]: {
            enrollmentId: String(
              enrollmentId ?? m[String(courseId)]?.enrollmentId ?? "",
            ),
            status: String(status || "approved"),
          },
        }));
      }
    });

    return () => s.close();
  }, []);

  // ---- Access helpers -------------------------------------------------------------
  const canOpenChat = (c) => {
    const id = c._id || c.id;
    const isTeacher = c.teacherId && String(c.teacherId) === String(myId);
    const status = enrolled[id]?.status;
    // admins/teachers OR approved students
    return role === "admin" || isTeacher || status === "approved";
  };

  // NEW: who can open the Materials page?
  const canAccessMaterials = (c) => {
    const id = c._id || c.id;
    const isTeacher = c.teacherId && String(c.teacherId) === String(myId);
    const status = enrolled[id]?.status; // approved | waitlisted | rejected
    // Only admin, course teacher, or approved students
    return role === "admin" || isTeacher || status === "approved";
  };

  // ---------------------------------------------------------------------------
  // Handlers: add course / enroll / unenroll / roster / status / edit
  // ---------------------------------------------------------------------------
  const add = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    try {
      const res = await axios.post(
        `${API}/courses`,
        { title: title.trim() },
        { headers: authHeaders() },
      );
      setItems((prev) => [...prev, res.data]);
      setTitle("");
    } catch (err) {
      console.error(err);
      setErr(err?.response?.data?.message || "Failed to create course.");
    }
  };

  const doEnroll = async (courseId) => {
    try {
      const doc = await apiEnroll(courseId); // returns enrollment doc
      const enrollmentId = String(doc?._id || doc?.id);
      const status = String(doc?.status || "approved");
      setEnrolled((m) => ({ ...m, [courseId]: { enrollmentId, status } }));

      if (status === "approved") {
        const fresh = await countByCourse([courseId]);
        setCounts((prev) => ({ ...prev, ...fresh }));
      }
    } catch (e) {
      console.error("Enroll failed", e);
      alert(e?.response?.data?.message || "Enroll failed");
    }
  };

  const doUnenroll = async (courseId) => {
    try {
      const rec = enrolled[courseId];
      const enrollmentId = rec?.enrollmentId;
      if (!enrollmentId)
        return alert("Missing enrollment id; please refresh and try again.");
      await apiDropEnrollment(enrollmentId);

    // Remove locally (avoid unused var by deleting key)
    setEnrolled((prev) => {
      const next = { ...prev };
      delete next[courseId];
      return next;
    });
      // Refresh counts
      const fresh = await countByCourse([courseId]);
      setCounts((prev) => ({ ...prev, ...fresh }));
    } catch (e) {
      console.error("Unenroll failed", e);
      alert(e?.response?.data?.message || "Unenroll failed");
    }
  };

  // ---- Roster logic (admin/teacher) ------------------------------------------
  const openRoster = async (course) => {
    const id = course._id || course.id;
    const title = course.title || course.name || "(untitled)";
    setRosterCourse({ id, title });
    setRosterOpen(true);
    await loadRoster(id);
  };

  const loadRoster = async (courseId) => {
    setRosterLoading(true);
    setRosterErr("");
    try {
      const roster = await apiCourseRoster(courseId);
      setRosterItems(Array.isArray(roster) ? roster : []);
    } catch (e) {
      const msg =
        e?.response?.data?.error ||
        e?.response?.data?.message ||
        "Failed to load roster.";
      setRosterErr(msg);
      setRosterItems([]);
    } finally {
      setRosterLoading(false);
    }
  };

  const changeStatus = async (enrollmentId, status) => {
    try {
      const updated = await apiUpdateEnrollmentStatus(enrollmentId, status);
      setRosterItems((prev) =>
        prev.map((r) =>
          String(r._id) === String(enrollmentId)
            ? { ...r, status: updated?.status || status }
            : r,
        ),
      );
      if (rosterCourse?.id) {
        const fresh = await countByCourse([rosterCourse.id]);
        setCounts((prev) => ({ ...prev, ...fresh }));
      }
    } catch (e) {
      alert(
        e?.response?.data?.error ||
          e?.response?.data?.message ||
          "Failed to update status",
      );
    }
  };

  // ---- Edit dialog (description + cover) -------------------------------------
  const openEdit = (course) => {
    setEditCourse(course);
    setEditDesc(course.description || "");
    setEditFile(null);
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!editCourse) return;
    let coverUrl = editCourse.coverUrl || "";
    try {
      // Upload new cover if chosen
      if (editFile) {
        const up = await uploadCourseCover(
          editCourse._id || editCourse.id,
          editFile,
        );
        coverUrl = up?.path || coverUrl;
      }
      // Persist description & cover
      const updated = await updateCourse(editCourse._id || editCourse.id, {
        description: editDesc,
        coverUrl,
      });
      // Merge into local list
      setItems((prev) =>
        prev.map((c) =>
          String(c._id || c.id) === String(editCourse._id || editCourse.id)
            ? { ...c, ...updated }
            : c,
        ),
      );
      setEditOpen(false);
    } catch (e) {
      alert(e?.response?.data?.error || "Update failed");
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------
  return (
    <Box>
      {/* Header */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Typography variant="h5">Courses</Typography>
        <Button
          size="small"
          variant="outlined"
          onClick={load}
          sx={{ textTransform: "none" }}
        >
          Refresh
        </Button>
      </Stack>

      {/* Errors */}
      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}

      {/* Create new course (admins & teachers) */}
      {canAdd && (
        <Card variant="outlined" sx={{ mb: 3 }}>
          <Box component="form" onSubmit={add}>
            <CardContent>
              <Grid container spacing={2} alignItems="center">
                <Grid item xs={12} md={8}>
                  <TextField
                    label="New course title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    fullWidth
                  />
                </Grid>
                <Grid item xs={12} md={4}>
                  <Button
                    type="submit"
                    variant="contained"
                    fullWidth
                    sx={{ height: { md: "100%" }, textTransform: "none" }}
                  >
                    Add Course
                  </Button>
                </Grid>
              </Grid>
            </CardContent>
          </Box>
        </Card>
      )}

      {/* List */}
      {loading ? (
        <Stack direction="row" alignItems="center" spacing={1}>
          <CircularProgress size={20} />
          <Typography variant="body2">Loading…</Typography>
        </Stack>
      ) : items.length === 0 ? (
        <Card variant="outlined">
          <CardContent>
            <Typography variant="body1" sx={{ opacity: 0.85 }}>
              No courses yet.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {items.map((c) => {
            const id = c._id || c.id;
            const title = c.title || c.name || "(untitled)";
            const isTeacher =
              c.teacherId && String(c.teacherId) === String(myId);

            // Enrollment state for THIS user (student only)
            const rec = enrolled[id];
            const status = rec?.status; // approved | waitlisted | rejected
            const isApproved = status === "approved";
            const isWaitlisted = status === "waitlisted";

            // Counts & capacity
            const approved = counts[id]?.approved ?? 0;
            const cap = c.capacity ?? null;
            const isFull = cap != null && approved >= cap;

            return (
              <Grid item xs={12} sm={6} md={4} key={id}>
                <Card
                  variant="outlined"
                  sx={{
                    height: "100%",
                    display: "flex",
                    flexDirection: "column",
                  }}
                >
                  {/* Cover image (if set) */}
                  {c.coverUrl && (
                    <CardMedia
                      component="img"
                      image={toAbsUrl(c.coverUrl)}
                      alt={`${title} cover`}
                      sx={{ height: 140, objectFit: "cover" }}
                    />
                  )}

                  {/* Main content */}
                  <CardContent sx={{ flex: 1 }}>
                    {/* Top row: title / id / counters / status chip */}
                    <Stack
                      direction="row"
                      alignItems="center"
                      justifyContent="space-between"
                      useFlexGap
                      flexWrap="wrap"
                    >
                      <div>
                        <Typography
                          variant="subtitle1"
                          sx={{ fontWeight: 600 }}
                        >
                          {title}
                        </Typography>

                        <Typography
                          variant="caption"
                          sx={{ opacity: 0.7, display: "block" }}
                        >
                          {id}
                        </Typography>

                        {/* Teacher label */}
                        {c.teacher?.name && (
                          <Typography
                            variant="caption"
                            sx={{ display: "block", mt: 0.5 }}
                          >
                            Teacher: {c.teacher.name}
                          </Typography>
                        )}
                        {isTeacher && (
                          <Typography
                            variant="caption"
                            sx={{ display: "block", mt: 0.25 }}
                          >
                            (You are the teacher)
                          </Typography>
                        )}
                      </div>

                      {/* Approved / Capacity chip */}
                      <Chip
                        size="small"
                        label={`${approved}${c.capacity != null ? ` / ${c.capacity}` : ""} approved`}
                      />

                      {/* Student-only status chip */}
                      {role === "student" && status && (
                        <Chip
                          size="small"
                          label={status}
                          color={
                            isApproved
                              ? "success"
                              : isWaitlisted
                                ? "warning"
                                : "default"
                          }
                          sx={{ ml: 1 }}
                        />
                      )}
                    </Stack>

                    {/* Description */}
                    {c.description && (
                      <Typography variant="body2" sx={{ mt: 1, opacity: 0.9 }}>
                        {c.description}
                      </Typography>
                    )}

                    {/* Capacity editor (admins & teachers only) */}
                    {(role === "admin" || isTeacher) && (
                      <Box sx={{ mt: 1 }}>
                        <Typography
                          component="span"
                          variant="caption"
                          sx={{ mr: 1, opacity: 0.7 }}
                        >
                          Capacity:
                        </Typography>
                        <input
                          type="number"
                          min="0"
                          placeholder="unlimited"
                          value={c.capacity ?? ""}
                          onChange={(e) => {
                            const next = e.target.value;
                            setItems((prev) =>
                              prev.map((x) =>
                                String(x._id || x.id) === String(id)
                                  ? {
                                      ...x,
                                      capacity:
                                        next === "" ? null : Number(next),
                                    }
                                  : x,
                              ),
                            );
                          }}
                          onBlur={(e) => updateCapacity(id, e.target.value)}
                          style={{ width: 100, padding: "4px 6px" }}
                        />
                        <small style={{ marginLeft: 6, opacity: 0.7 }}>
                          leave empty = unlimited
                        </small>
                      </Box>
                    )}
                  </CardContent>

                  {/* Actions */}
                  <CardActions sx={{ px: 2, pb: 2, gap: 1, flexWrap: "wrap" }}>
                    {/* Student controls */}
                    {role !== "admin" && !isTeacher ? (
                      rec ? (
                        isApproved ? (
                          <Button
                            variant="outlined"
                            size="small"
                            sx={{ textTransform: "none" }}
                            onClick={() => doUnenroll(id)}
                          >
                            Unenroll
                          </Button>
                        ) : (
                          <Button
                            variant="outlined"
                            size="small"
                            sx={{ textTransform: "none" }}
                            onClick={() => doUnenroll(id)}
                          >
                            {isWaitlisted ? "Leave waitlist" : "Remove"}
                          </Button>
                        )
                      ) : (
                        <Button
                          variant="contained"
                          size="small"
                          sx={{ textTransform: "none" }}
                          onClick={() => doEnroll(id)}
                        >
                          {isFull ? "Join waitlist" : "Request Enroll"}
                        </Button>
                      )
                    ) : (
                      <Tooltip
                        title={
                          role === "admin"
                            ? "Admin access"
                            : "You teach this course"
                        }
                      >
                        <span>
                          <Button
                            size="small"
                            disabled
                            sx={{ textTransform: "none" }}
                          >
                            {role === "admin" ? "Admin" : "Teacher"}
                          </Button>
                        </span>
                      </Tooltip>
                    )}

                    {/* Materials: gate by role/enrollment */}
                    <Tooltip
                      title={
                        canAccessMaterials(c)
                          ? "Open materials"
                          : "Only approved students, the course teacher, or admin"
                      }
                    >
                      <span>
                        <Button
                          component={RouterLink}
                          to={`/courses/${id}/materials`}
                          variant="outlined"
                          size="small"
                          sx={{ textTransform: "none" }}
                          disabled={!canAccessMaterials(c)}
                        >
                          Materials
                        </Button>
                      </span>
                    </Tooltip>

                    {/* Chat (requires approved OR teacher/admin) */}
                    <Tooltip
                      title={
                        canOpenChat(c)
                          ? "Open course chat"
                          : "Chat requires approved enrollment"
                      }
                    >
                      <span>
                        <Button
                          component={RouterLink}
                          to={`/courses/${id}/chat`}
                          variant="outlined"
                          size="small"
                          sx={{ textTransform: "none" }}
                          disabled={!canOpenChat(c)}
                        >
                          Chat
                        </Button>
                      </span>
                    </Tooltip>

                    {/* Roster (admin/teacher only) */}
                    {(role === "admin" || isTeacher) && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => openRoster(c)}
                        sx={{ textTransform: "none", ml: "auto" }}
                      >
                        Roster
                      </Button>
                    )}

                    {/* Edit (admin/teacher only) */}
                    {(role === "admin" || isTeacher) && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => openEdit(c)}
                        sx={{ textTransform: "none" }}
                      >
                        Edit
                      </Button>
                    )}
                  </CardActions>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* ---------------- Roster Drawer (admin/teacher) ---------------- */}
      <Drawer
        anchor="right"
        open={rosterOpen}
        onClose={() => setRosterOpen(false)}
      >
        <Box sx={{ width: { xs: 360, sm: 420 }, p: 2 }}>
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
          >
            <Typography variant="h6">Roster</Typography>
            <Stack direction="row" spacing={1}>
              {rosterCourse && (
                <Button
                  size="small"
                  onClick={() => loadRoster(rosterCourse.id)}
                >
                  Refresh
                </Button>
              )}
              <Button size="small" onClick={() => setRosterOpen(false)}>
                Close
              </Button>
            </Stack>
          </Stack>

          <Typography variant="body2" sx={{ mt: 0.5, opacity: 0.8 }}>
            {rosterCourse?.title}
          </Typography>

          <Divider sx={{ my: 1.5 }} />

          {rosterErr && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {rosterErr}
            </Alert>
          )}

          {rosterLoading ? (
            <Stack direction="row" alignItems="center" spacing={1}>
              <CircularProgress size={18} />
              <Typography variant="body2">Loading roster…</Typography>
            </Stack>
          ) : rosterItems.length === 0 ? (
            <Typography variant="body2" sx={{ opacity: 0.75 }}>
              No enrollments yet.
            </Typography>
          ) : (
            <Stack spacing={1}>
              {rosterItems.map((r) => {
                const u = r.userId || {};
                const display = u.name || u.email || r.userId || "(user)";
                return (
                  <Card key={r._id} variant="outlined">
                    <CardContent sx={{ py: 1.25 }}>
                      <Stack
                        direction="row"
                        spacing={1}
                        alignItems="center"
                        useFlexGap
                        flexWrap="wrap"
                        justifyContent="space-between"
                      >
                        <Stack
                          direction="row"
                          spacing={1}
                          alignItems="center"
                          useFlexGap
                          flexWrap="wrap"
                        >
                          <Typography sx={{ fontWeight: 600 }}>
                            {display}
                          </Typography>
                          <Chip
                            size="small"
                            label={r.status}
                            color={
                              r.status === "approved"
                                ? "success"
                                : r.status === "waitlisted"
                                  ? "warning"
                                  : "default"
                            }
                          />
                        </Stack>

                        <FormControl size="small" sx={{ minWidth: 160 }}>
                          <InputLabel id={`status-${r._id}`}>
                            Set status
                          </InputLabel>
                          <Select
                            labelId={`status-${r._id}`}
                            label="Set status"
                            value={r.status}
                            onChange={(e) =>
                              changeStatus(r._id, e.target.value)
                            }
                          >
                            <MenuItem value="approved">approved</MenuItem>
                            <MenuItem value="waitlisted">waitlisted</MenuItem>
                            <MenuItem value="rejected">rejected</MenuItem>
                          </Select>
                        </FormControl>
                      </Stack>
                    </CardContent>
                  </Card>
                );
              })}
            </Stack>
          )}
        </Box>
      </Drawer>

      {/* ---------------- Edit Dialog (admin/teacher) ---------------- */}
      <Dialog
        open={editOpen}
        onClose={() => setEditOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Edit course</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} sx={{ mt: 0.5 }}>
            <TextField
              label="Description"
              multiline
              minRows={3}
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              fullWidth
            />
            <Stack direction="row" spacing={1} alignItems="center">
              <Button
                component="label"
                variant="outlined"
                size="small"
                sx={{ textTransform: "none" }}
              >
                Choose cover image
                <input
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={(e) => setEditFile(e.target.files?.[0] || null)}
                />
              </Button>
              <Typography variant="body2" sx={{ opacity: 0.75 }}>
                {editFile
                  ? editFile.name
                  : editCourse?.coverUrl
                    ? "Current image set"
                    : "No image"}
              </Typography>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setEditOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={saveEdit}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}