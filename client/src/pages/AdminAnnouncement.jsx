import { useState } from "react";
import {
  Box,
  Paper,
  Typography,
  TextField,
  Button,
  MenuItem,
} from "@mui/material";
import axios from "axios";
const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function AdminAnnouncement() {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState("all");
  const save = async () => {
    await axios.post(
      `${API}/announcements`,
      { title, body, audience },
      { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
    );
    setTitle("");
    setBody("");
    alert("Announcement created");
  };
  return (
    <Box sx={{ maxWidth: 800, m: "2rem auto" }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Create Announcement
      </Typography>
      <Paper sx={{ p: 2 }}>
        <TextField
          fullWidth
          label="Title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          sx={{ mb: 2 }}
        />
        <TextField
          fullWidth
          label="Body"
          value={body}
          onChange={(e) => setBody(e.target.value)}
          multiline
          minRows={4}
          sx={{ mb: 2 }}
        />
        <TextField
          select
          label="Audience"
          value={audience}
          onChange={(e) => setAudience(e.target.value)}
          sx={{ mb: 2 }}
        >
          <MenuItem value="all">All</MenuItem>
          <MenuItem value="students">Students</MenuItem>
          <MenuItem value="teachers">Teachers</MenuItem>
        </TextField>
        <Button variant="contained" onClick={save}>
          Publish
        </Button>
      </Paper>
    </Box>
  );
}
