import { useEffect, useState } from "react";
import { Box, Paper, Typography, Divider } from "@mui/material";
import axios from "axios";
const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Bulletin() {
  const [items, setItems] = useState([]);
  useEffect(() => {
    axios
      .get(`${API}/announcements`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      })
      .then((res) => setItems(res.data));
  }, []);
  return (
    <Box sx={{ maxWidth: 800, m: "2rem auto" }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        Announcements
      </Typography>
      {items.map((a) => (
        <Paper key={a._id} sx={{ p: 2, mb: 2 }}>
          <Typography variant="h6">{a.title}</Typography>
          <Typography variant="body2" sx={{ opacity: 0.7 }}>
            {new Date(a.publishAt).toLocaleString()}
          </Typography>
          <Divider sx={{ my: 1 }} />
          <Typography>{a.body}</Typography>
        </Paper>
      ))}
    </Box>
  );
}
