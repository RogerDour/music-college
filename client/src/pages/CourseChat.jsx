import { useEffect, useMemo, useRef, useState } from "react";
import axios from "axios";
import { useParams } from "react-router-dom";
import { getSocket } from "../socket";
import {
  Box,
  Typography,
  Paper,
  TextField,
  IconButton,
  Stack,
  Divider,
} from "@mui/material";
import SendIcon from "@mui/icons-material/Send";

const API = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

export default function CourseChat() {
  const { courseId } = useParams();
  const token = localStorage.getItem("token");
  const myId = localStorage.getItem("userId"); // set at login
  const roomId = useMemo(() => `course:${courseId}`, [courseId]);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const viewportRef = useRef(null);

  // helper: handle populated vs raw message format
  const getSenderId = (m) => String(m.from?._id || m.from);
  const getSenderName = (m) => m.fromName || m.from?.name || getSenderId(m);

  // history + live subscribe
  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const { data } = await axios.get(`${API}/messages/${roomId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (active) setMessages(Array.isArray(data) ? data : []);
      } catch (e) {
        // console.warn("load course history failed", e);
      }
    })();

    const socket = getSocket();
    socket.emit("joinRoom", { roomId });

    const onMsg = (msg) => {
      if (msg?.roomId === roomId) {
        setMessages((prev) => [...prev, msg]);
      }
    };
    socket.on("message", onMsg);

    return () => {
      active = false;
      socket.off("message", onMsg);
    };
  }, [roomId, token]);

  // auto-scroll to bottom on new messages
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  const sendMessage = () => {
    const val = text.trim();
    if (!val) return;
    const socket = getSocket();
    socket.emit("sendMessage", { roomId, text: val });
    setText("");
  };

  return (
    <Box sx={{ maxWidth: 800, mx: "auto", mt: 4 }}>
      <Typography variant="h5" gutterBottom>
        Course Chat
      </Typography>

      <Paper
        variant="outlined"
        sx={{
          height: { xs: 380, sm: 460 },
          display: "flex",
          flexDirection: "column",
          mb: 2,
        }}
      >
        {/* messages viewport */}
        <Box
          ref={viewportRef}
          sx={{
            flex: 1,
            overflowY: "auto",
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          {messages.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              No messages yet.
            </Typography>
          ) : (
            messages.map((m, idx) => {
              const mine = getSenderId(m) === String(myId);
              return (
                <Box
                  key={idx}
                  sx={{
                    display: "flex",
                    justifyContent: mine ? "flex-end" : "flex-start",
                  }}
                >
                  <Box
                    sx={{
                      maxWidth: "75%",
                      px: 1.25,
                      py: 1,
                      borderRadius: 2,
                      bgcolor: mine ? "primary.main" : "grey.200",
                      color: mine ? "primary.contrastText" : "text.primary",
                    }}
                  >
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.25 }}>
                      {getSenderName(m)}
                    </Typography>
                    <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                      {m.text}
                    </Typography>
                  </Box>
                </Box>
              );
            })
          )}
        </Box>

        <Divider />

        {/* composer */}
        <Box sx={{ p: 1 }}>
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              fullWidth
              size="small"
              placeholder="Type a message..."
              value={text}
              onChange={(e) => setText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
            />
            <IconButton color="primary" onClick={sendMessage} aria-label="send">
              <SendIcon />
            </IconButton>
          </Stack>
        </Box>
      </Paper>
    </Box>
  );
}
