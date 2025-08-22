// client/src/pages/Tasks.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Stack,
  Typography,
  TextField,
  Button,
  Paper,
  List,
  ListItem,
  ListItemText,
  Input,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableHead,
  TableRow,
  TableCell,
  TableBody,
  IconButton,
  Tooltip,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import CheckIcon from "@mui/icons-material/CheckCircleOutline";
import ReportIcon from "@mui/icons-material/ReportGmailerrorred";

import {
  listTasks,
  createTask,
  uploadSubmission,
  listSubmissions,
  setSubmissionStatus,
} from "../api/tasks";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Tasks() {
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [items, setItems] = useState([]);
  const [files, setFiles] = useState({}); // taskId -> File

  // teacher review dialog
  const [subOpen, setSubOpen] = useState(false);
  const [activeTask, setActiveTask] = useState(null);
  const [subRows, setSubRows] = useState([]);

  // (student) my submissions map: { [taskId]: submission }
  const [mineMap, setMineMap] = useState({});

  const role = useMemo(() => {
    try {
      return (
        JSON.parse(localStorage.getItem("user") || "{}")?.role ||
        localStorage.getItem("role") ||
        ""
      );
    } catch {
      return localStorage.getItem("role") || "";
    }
  }, []);
  const myId = localStorage.getItem("userId") || "";

  const load = async () => {
    const { data } = await listTasks(courseId ? { courseId } : {});
    const list = Array.isArray(data) ? data : [];
    setItems(list);

    // build student's “mine” map so they can see status at a glance
    if (role === "student" && list.length) {
      const checks = await Promise.allSettled(
        list.map(async (t) => {
          const r = await listSubmissions(t._id);
          const arr = Array.isArray(r?.data) ? r.data : [];
          const mine = arr.find(
            (s) => String(s.studentId?._id || s.studentId) === myId,
          );
          return { tid: t._id, mine };
        }),
      );
      const map = {};
      for (const c of checks) {
        if (c.status === "fulfilled" && c.value?.mine) {
          map[c.value.tid] = c.value.mine;
        }
      }
      setMineMap(map);
    } else {
      setMineMap({});
    }
  };

  const onCreate = async () => {
    if (!courseId || !title) return alert("courseId and title are required");
    await createTask({ courseId, title });
    setTitle("");
    await load();
  };

  const onSubmit = async (taskId) => {
    const f = files[taskId];
    if (!f) return alert("Choose a file first");
    try {
      await uploadSubmission(taskId, f);
      alert("Submitted");
      await load();
    } catch (e) {
      const msg = e?.response?.data?.error || e.message;
      alert(msg);
    }
  };

  const openSubmissions = async (task) => {
    setActiveTask(task);
    const { data } = await listSubmissions(task._id);
    setSubRows(Array.isArray(data) ? data : []);
    setSubOpen(true);
  };

  const updateRowStatus = async (row, status) => {
    await setSubmissionStatus(activeTask._id, row._id, status);
    setSubRows((prev) =>
      prev.map((r) => (r._id === row._id ? { ...r, status } : r)),
    );
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  return (
    <Box sx={{ maxWidth: 1000, m: "24px auto" }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Tasks
      </Typography>

      {/* Create task — teacher or admin only */}
      {(role === "teacher" || role === "admin") && (
        <Paper sx={{ p: 2, mb: 2 }}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <TextField
              size="small"
              label="CourseId"
              value={courseId}
              onChange={(e) => setCourseId(e.target.value)}
            />
            <TextField
              size="small"
              label="New task title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              sx={{ flex: 1 }}
            />
            <Button variant="contained" onClick={onCreate}>
              Create
            </Button>
          </Stack>
        </Paper>
      )}

      <Paper sx={{ p: 2 }}>
        <List>
          {items.map((t) => {
            const mine = mineMap[t._id]; // student’s own submission for this task
            return (
              <ListItem
                key={t._id}
                sx={{ flexDirection: "column", alignItems: "stretch" }}
              >
                <Stack
                  direction={{ xs: "column", md: "row" }}
                  spacing={2}
                  alignItems={{ xs: "stretch", md: "center" }}
                  justifyContent="space-between"
                >
                  <ListItemText
                    primary={t.title}
                    secondary={
                      t.dueAt
                        ? `Due: ${new Date(t.dueAt).toLocaleString()}`
                        : ""
                    }
                  />

                  {/* Student side: upload + status */}
                  {role === "student" ? (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Input
                        type="file"
                        onChange={(e) =>
                          setFiles((prev) => ({
                            ...prev,
                            [t._id]: e.target.files?.[0] || null,
                          }))
                        }
                      />
                      <Button
                        variant="outlined"
                        onClick={() => onSubmit(t._id)}
                      >
                        Submit
                      </Button>

                      {/* show my status if exists */}
                      {mine ? (
                        <Chip
                          size="small"
                          color={
                            mine.status === "approved"
                              ? "success"
                              : mine.status === "needs_changes"
                                ? "warning"
                                : "info"
                          }
                          label={`Status: ${mine.status}`}
                          sx={{ ml: 1 }}
                          component="a"
                          href={
                            mine.url?.startsWith("http")
                              ? mine.url
                              : `${API.replace(/\/api$/, "")}${mine.url || ""}`
                          }
                          target="_blank"
                          clickable
                        />
                      ) : (
                        <Chip size="small" label="No submission yet" />
                      )}
                    </Stack>
                  ) : (
                    // Teacher/Admin: open review dialog
                    <Stack direction="row" spacing={1} alignItems="center">
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => openSubmissions(t)}
                      >
                        View submissions
                      </Button>
                    </Stack>
                  )}
                </Stack>
              </ListItem>
            );
          })}
        </List>
      </Paper>

      {/* Teacher review dialog */}
      <Dialog
        open={subOpen}
        onClose={() => setSubOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Submissions — {activeTask?.title}</DialogTitle>
        <DialogContent dividers>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Student</TableCell>
                <TableCell>Submitted at</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {subRows.map((r) => (
                <TableRow key={r._id} hover>
                  <TableCell>
                    {r.studentId?.name || r.studentId?.email || r.studentId}
                  </TableCell>
                  <TableCell>
                    {r.createdAt ? new Date(r.createdAt).toLocaleString() : ""}
                  </TableCell>
                  <TableCell>
                    <Chip
                      size="small"
                      color={
                        r.status === "approved"
                          ? "success"
                          : r.status === "needs_changes"
                            ? "warning"
                            : "info"
                      }
                      label={r.status}
                    />
                  </TableCell>
                  <TableCell align="right">
                    {r.url && (
                      <Tooltip title="Download file">
                        <IconButton
                          component="a"
                          href={
                            r.url.startsWith("http")
                              ? r.url
                              : `${API.replace(/\/api$/, "")}${r.url}`
                          }
                          target="_blank"
                        >
                          <DownloadIcon />
                        </IconButton>
                      </Tooltip>
                    )}

                    <Tooltip title="Approve">
                      <IconButton
                        onClick={() => updateRowStatus(r, "approved")}
                      >
                        <CheckIcon />
                      </IconButton>
                    </Tooltip>

                    <Tooltip title="Needs changes">
                      <IconButton
                        color="warning"
                        onClick={() => updateRowStatus(r, "needs_changes")}
                      >
                        <ReportIcon />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {!subRows.length && (
                <TableRow>
                  <TableCell
                    colSpan={4}
                    align="center"
                    sx={{ py: 4, opacity: 0.7 }}
                  >
                    No submissions yet
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSubOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
