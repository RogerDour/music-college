import { useEffect, useState } from "react";
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
} from "@mui/material";
import axios from "axios";
const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function Students() {
  const [items, setItems] = useState([]);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");

  const load = async () => {
    const res = await axios.get(`${API}/students`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    setItems(res.data);
  };
  useEffect(() => {
    load();
  }, []);

  const add = async () => {
    await axios.post(
      `${API}/students`,
      { email, name },
      { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } },
    );
    setEmail("");
    setName("");
    await load();
  };

  const remove = async (id) => {
    await axios.delete(`${API}/students/${id}`, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    });
    await load();
  };

  return (
    <Box sx={{ maxWidth: 800, m: "2rem auto" }}>
      <Typography variant="h5" sx={{ mb: 2 }}>
        My Students
      </Typography>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction="row" spacing={2}>
          <TextField
            size="small"
            label="Student email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <TextField
            size="small"
            label="Name (if new)"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Button variant="contained" onClick={add}>
            Add
          </Button>
        </Stack>
      </Paper>
      <Paper sx={{ p: 2 }}>
        <List>
          {items.map((it) => (
            <ListItem
              key={it._id}
              secondaryAction={
                <Button
                  onClick={() => remove(it.studentId?._id || it.studentId)}
                >
                  Remove
                </Button>
              }
            >
              <ListItemText
                primary={it.studentId?.name || "Student"}
                secondary={it.studentId?.email}
              />
            </ListItem>
          ))}
        </List>
      </Paper>
    </Box>
  );
}
