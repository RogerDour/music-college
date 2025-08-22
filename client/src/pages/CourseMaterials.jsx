// client/src/pages/CourseMaterials.jsx
// -----------------------------------------------------------------------------
// Course Materials
// - Viewable by: admin, course teacher, or APPROVED student only
// - Manage (upload/move/delete): course teacher or admin
// - Robust error handling (403 shows a friendly message)
// -----------------------------------------------------------------------------

import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  Box,
  Paper,
  Stack,
  Typography,
  Chip,
  Divider,
  Button,
  IconButton,
  Tooltip,
  TextField,
  Alert,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import DriveFileMoveIcon from "@mui/icons-material/DriveFileMove";
import DownloadIcon from "@mui/icons-material/Download";

import {
  listMaterials,
  listFolders,
  uploadMaterial,
  updateMaterial,
  deleteMaterial,
  downloadMaterial,
  saveBlobAs,
} from "../api/materials";
import { getCourse } from "../api/courses";
import { myEnrollments } from "../api/enrollments"; // 👈 to verify approved status

export default function CourseMaterials() {
  const { courseId } = useParams();

  // ---------- page state ----------
  const [course, setCourse] = useState(null);
  const [canView, setCanView] = useState(false); // 🔐 computed access flag
  const [rows, setRows] = useState([]);
  const [folders, setFolders] = useState([]);
  const [folderFilter, setFolderFilter] = useState("");

  // upload form
  const [title, setTitle] = useState("");
  const [folder, setFolder] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState(null);

  // ui state
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [ok, setOk] = useState("");

  // identity (from localStorage; replace with your auth context if you have one)
  const myId = localStorage.getItem("userId");
  const role = (localStorage.getItem("role") || "").toLowerCase();

  // teacher/admin can manage; students cannot
  const isOwner =
    role === "admin" ||
    (course &&
      String(course.teacherId?._id || course.teacherId) === String(myId));
  const canManage = isOwner || role === "admin";

  // ---------- helpers ----------
  // Compute "can view" on the client to avoid calling list endpoints if blocked.
  async function computeAccess(nextCourse) {
    if (!nextCourse) return false;
    if (role === "admin") return true;
    const teacherId = String(
      nextCourse.teacherId?._id || nextCourse.teacherId || "",
    );
    if (role === "teacher" && teacherId === String(myId)) return true;

    if (role === "student") {
      try {
        const mine = await myEnrollments(); // array
        const approved = (mine || []).some((e) => {
          const c = String(e.courseId?._id || e.courseId || e.course);
          return c === String(courseId) && String(e.status) === "approved";
        });
        return approved;
      } catch {
        // if this fails, fall back to letting the server decide (but we’ll show a friendly message if 403)
        return false;
      }
    }
    return false;
  }

  async function loadAll() {
    if (!courseId) return;
    setErr("");
    setOk("");

    // 1) fetch course (for teacherId & title)
    const courseRes = await getCourse(courseId).catch(() => ({ data: null }));
    const nextCourse = courseRes?.data || null;
    setCourse(nextCourse);

    // 2) compute access locally (and still handle server 403 gracefully below)
    const view = await computeAccess(nextCourse);
    setCanView(view);

    if (!view) {
      // optional: still try hitting the API; if it 403s we show a friendly message
      try {
        await listMaterials({ courseId, folder: folderFilter });
        await listFolders(courseId);
        setCanView(true); // if server let us in, flip the switch
      } catch (e) {
        const code = e?.response?.status;
        if (code === 403) {
          setRows([]);
          setFolders([]);
          setErr(
            "You don’t have permission to view materials for this course.",
          );
          return;
        }
        // other errors: show generic
        setErr("Failed to load materials.");
        return;
      }
    }

    // 3) we can view → load data
    try {
      const [mats, flds] = await Promise.all([
        listMaterials({ courseId, folder: folderFilter }),
        listFolders(courseId),
      ]);
      setRows(Array.isArray(mats) ? mats : mats?.items || []);
      setFolders(Array.isArray(flds) ? flds : []);
    } catch (e) {
      const code = e?.response?.status;
      setRows([]);
      setFolders([]);
      setErr(
        code === 403
          ? "You don’t have permission to view these materials."
          : "Failed to load materials.",
      );
    }
  }

  useEffect(() => {
    loadAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, folderFilter]);

  // ---------- actions ----------
  async function doUpload() {
    setErr("");
    setOk("");
    if (!title || !file) {
      setErr("Title and file are required");
      return;
    }
    setBusy(true);
    try {
      await uploadMaterial({ courseId, title, notes, folder, file });
      setOk("Uploaded");
      setTitle("");
      setNotes("");
      setFolder("");
      setFile(null);
      await loadAll();
    } catch (e) {
      setErr(e?.response?.data?.error || e.message || "Upload failed");
    } finally {
      setBusy(false);
    }
  }

  async function moveToFolder(mat) {
    const f = prompt("Move to folder:", mat.folder || "");
    if (f === null) return;
    await updateMaterial(mat._id, { folder: f });
    await loadAll();
  }

  async function remove(mat) {
    if (!confirm(`Delete "${mat.title}"?`)) return;
    await deleteMaterial(mat._id);
    await loadAll();
  }

  async function doDownload(mat) {
    try {
      const blob = await downloadMaterial(mat._id); // has Authorization header
      const extGuess =
        (mat.originalName && mat.originalName.split(".").pop()) ||
        (mat.title && mat.title.split(".").pop()) ||
        "bin";
      const fname =
        (mat.originalName || mat.title || "material") +
        (/\./.test(mat.originalName || mat.title || "") ? "" : `.${extGuess}`);
      saveBlobAs(fname, blob);
    } catch {
      alert("Download failed");
    }
  }

  // ---------- group by folder for display ----------
  const groups = useMemo(() => {
    const map = {};
    for (const r of rows) {
      const key = r.folder || "(No folder)";
      (map[key] ||= []).push(r);
    }
    return map;
  }, [rows]);

  // ---------- render ----------
  return (
    <Box sx={{ maxWidth: 1000, m: "24px auto" }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <Typography variant="h5">Materials</Typography>
          <Chip label={`Course: ${courseId}`} size="small" />
          {course?.title && <Chip label={course.title} size="small" />}
        </Stack>
        <Button size="small" onClick={loadAll}>
          Refresh
        </Button>
      </Stack>

      {/* Errors / access message */}
      {err && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {err}
        </Alert>
      )}

      {/* Upload form (teacher owner/admin only) */}
      {canManage && canView && (
        <Paper sx={{ p: 2, mb: 2 }}>
          {ok && (
            <Alert severity="success" sx={{ mb: 1 }}>
              {ok}
            </Alert>
          )}
          <Typography variant="subtitle1" sx={{ mb: 1 }}>
            Add material
          </Typography>
          <Stack
            direction={{ xs: "column", md: "row" }}
            spacing={1}
            alignItems="center"
          >
            <TextField
              size="small"
              label="Title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
            <TextField
              size="small"
              label="Folder (optional)"
              value={folder}
              onChange={(e) => setFolder(e.target.value)}
            />
            <TextField
              size="small"
              label="Notes (optional)"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              sx={{ flex: 1 }}
            />
            <Button variant="outlined" component="label">
              {file ? "Change file" : "Choose file"}
              <input
                hidden
                type="file"
                onChange={(e) => setFile(e.target.files?.[0] || null)}
              />
            </Button>
            <Button variant="contained" disabled={busy} onClick={doUpload}>
              {busy ? "Uploading…" : "Upload"}
            </Button>
          </Stack>
        </Paper>
      )}

      {/* Folder filter — only show if user can view */}
      {canView && (
        <Paper sx={{ p: 1.5, mb: 2 }}>
          <Stack direction="row" spacing={1} flexWrap="wrap">
            <Chip
              label="All"
              color={folderFilter ? "default" : "primary"}
              onClick={() => setFolderFilter("")}
              clickable
            />
            {folders.map((f) => (
              <Chip
                key={f}
                label={f}
                color={folderFilter === f ? "primary" : "default"}
                onClick={() => setFolderFilter(f)}
                clickable
              />
            ))}
          </Stack>
        </Paper>
      )}

      {/* Grouped list */}
      {canView &&
        Object.entries(groups).map(([grp, items]) => (
          <Paper key={grp} sx={{ p: 2, mb: 2 }}>
            <Typography variant="subtitle1" sx={{ mb: 1 }}>
              {grp}
            </Typography>
            <Divider sx={{ mb: 1 }} />
            {items.map((m) => (
              <Stack
                key={m._id}
                direction={{ xs: "column", md: "row" }}
                alignItems={{ xs: "flex-start", md: "center" }}
                justifyContent="space-between"
                sx={{ py: 1 }}
                gap={1}
              >
                <Stack>
                  <Typography variant="body1" fontWeight={600}>
                    {m.title}
                  </Typography>
                  {m.notes && (
                    <Typography variant="body2" sx={{ opacity: 0.8 }}>
                      {m.notes}
                    </Typography>
                  )}
                  {m.createdAt && (
                    <Typography variant="caption" sx={{ opacity: 0.7 }}>
                      {new Date(m.createdAt).toLocaleString()}
                    </Typography>
                  )}
                </Stack>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Tooltip title="Download">
                    <IconButton onClick={() => doDownload(m)}>
                      <DownloadIcon />
                    </IconButton>
                  </Tooltip>

                  {canManage && (
                    <>
                      <Tooltip title="Move to folder / Rename folder">
                        <IconButton onClick={() => moveToFolder(m)}>
                          <DriveFileMoveIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton onClick={() => remove(m)} color="error">
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </>
                  )}
                </Stack>
              </Stack>
            ))}
          </Paper>
        ))}

      {canView && !rows.length && !err && (
        <Paper sx={{ p: 4, textAlign: "center", opacity: 0.7 }}>
          No materials yet.
        </Paper>
      )}
    </Box>
  );
}
