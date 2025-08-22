import { useState } from "react";
import {
  Box,
  Paper,
  Stack,
  TextField,
  Button,
  Typography,
} from "@mui/material";
import { uploadMaterial } from "../api/materials";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function UploadMaterial() {
  const [courseId, setCourseId] = useState("");
  const [title, setTitle] = useState("");
  const [notes, setNotes] = useState("");
  const [folder, setFolder] = useState(""); // ✅ NEW
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);

  const onSubmit = async () => {
    if (!courseId || !title || !file)
      return alert("courseId, title and file are required");
    setBusy(true);
    try {
      await uploadMaterial({ courseId, title, notes, folder, file });
      alert("Uploaded!");
      setTitle("");
      setNotes("");
      setFolder("");
      setFile(null);
    } catch (e) {
      alert(e?.response?.data?.error || e.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Box sx={{ maxWidth: 700, m: "24px auto" }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Upload Material
      </Typography>
      <Paper sx={{ p: 2 }}>
        <Stack spacing={2}>
          <TextField
            label="Course ID"
            value={courseId}
            onChange={(e) => setCourseId(e.target.value)}
          />
          <TextField
            label="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <TextField
            label="Folder (optional)"
            value={folder}
            onChange={(e) => setFolder(e.target.value)}
            placeholder="e.g. Unit 1 / Homework"
          />
          <TextField
            label="Notes (optional)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            multiline
            minRows={2}
          />
          <input
            type="file"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />
          <Button variant="contained" disabled={busy} onClick={onSubmit}>
            Upload
          </Button>
          <Typography variant="caption" sx={{ opacity: 0.7 }}>
            Files are served from {API.replace(/\/api$/, "")}
            /uploads/materials/…
          </Typography>
        </Stack>
      </Paper>
    </Box>
  );
}
