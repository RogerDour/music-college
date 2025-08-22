import { useEffect, useMemo, useRef, useState } from "react";
import {
  useNavigate,
  useParams,
  useSearchParams,
  Link,
} from "react-router-dom";
import {
  Box,
  Paper,
  List,
  ListItemButton,
  ListItemText,
  TextField,
  Typography,
  Avatar,
  Stack,
  Button,
  Divider,
} from "@mui/material";
import axios from "axios";
import { getSocket } from "../socket"; // ✅ use the singleton

const API = (import.meta.env.VITE_API_URL || "http://localhost:5000/api").replace(/\/$/, "");

// ---- helpers ----
const tokenHeader = () => ({
  headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
});

const getMe = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};
const getRole = () => getMe()?.role || localStorage.getItem("role") || "";

// Normalize any user-ish shape to a plain user object
const normalizeContact = (doc) => doc?.student || doc?.studentId || doc?.user || doc;

// Stable private room id `private:minId:maxId`
const privateRoomId = (a, b) => {
  const A = String(a), B = String(b);
  return A < B ? `private:${A}:${B}` : `private:${B}:${A}`;
};

export default function Chat() {
  const navigate = useNavigate();
  const params = useParams();
  const [searchParams] = useSearchParams();
  const peerIdFromUrl = params.peerId || searchParams.get("peer") || "";
  const role = getRole();

  const [contacts, setContacts] = useState([]);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setErr("");
      try {
        let list = [];

        if (role === "teacher") {
          // teacher → own students
          const r = await axios.get(`${API}/students`, tokenHeader());
          list = (r.data || []).map(normalizeContact).filter(Boolean);
        } else if (role === "student") {
          // student → teachers
          const r = await axios.get(`${API}/users/teachers`, tokenHeader());
          list = (r.data || []).map(normalizeContact).filter(Boolean);
        } else {
          // admin → students
          const r = await axios.get(`${API}/users?role=student`, tokenHeader());
          list = (r.data || []).map(normalizeContact).filter(Boolean);
        }

        // Enrich missing name/email/avatar via public profile
        const enriched = await Promise.all(
          list.map(async (u) => {
            if (!u) return null;
            const id = typeof u === "string" ? u : u._id;
            let out = typeof u === "string" ? null : u;

            const needs = !out || !out.name || !out.email || !out.avatar;
            if (id && needs) {
              try {
                const rr = await axios.get(`${API}/users/public/${id}`, tokenHeader());
                out = { ...(out || {}), ...(rr.data || {}) };
              } catch {/* keep existing */}
            }
            return out;
          })
        );

        setContacts(enriched.filter(Boolean));
      } catch (e) {
        setErr(e?.response?.data?.error || e.message || "Failed to load contacts");
        setContacts([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [role]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    if (!qq) return contacts;
    return contacts.filter(
      (u) =>
        (u.name || "").toLowerCase().includes(qq) ||
        (u.email || "").toLowerCase().includes(qq)
    );
  }, [q, contacts]);

  const openChat = (userId) => navigate(`/chat/${userId}`);

  return (
    <Box sx={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 2, height: "calc(100vh - 120px)" }}>
      {/* Contacts */}
      <Paper sx={{ p: 2, overflow: "hidden", display: "flex", flexDirection: "column" }}>
        <Typography variant="h6" sx={{ mb: 1 }}>
          {role === "teacher" ? "My Students" : role === "student" ? "Teachers" : "Users"}
        </Typography>
        <TextField
          size="small"
          placeholder="Search by name/email"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          sx={{ mb: 1 }}
        />
        <Box sx={{ overflowY: "auto", flex: 1 }}>
          {loading ? (
            <Typography sx={{ p: 2, opacity: 0.7 }}>Loading…</Typography>
          ) : err ? (
            <Typography sx={{ p: 2, color: "error.main" }}>{err}</Typography>
          ) : filtered.length ? (
            <List dense>
              {filtered.map((u) => {
                const label =
                  u.name ||
                  (u.firstName || u.lastName
                    ? `${u.firstName || ""} ${u.lastName || ""}`.trim()
                    : "") ||
                  u.email ||
                  `User ${String(u._id).slice(-4)}`;
                return (
                  <ListItemButton
                    key={u._id}
                    selected={peerIdFromUrl === String(u._id)}
                    onClick={() => openChat(String(u._id))}
                  >
                    <Stack direction="row" spacing={2} alignItems="center" sx={{ width: "100%" }}>
                      <Stack alignItems="center" spacing={0.5} sx={{ minWidth: 56 }}>
                        <Avatar
                          src={u.avatar ? `${API.replace("/api", "")}${u.avatar}` : undefined}
                          sx={{ width: 40, height: 40 }}
                        >
                          {(label || "?")[0]?.toUpperCase?.()}
                        </Avatar>
                        <Typography variant="caption" sx={{ maxWidth: 72, textAlign: "center" }} noWrap title={label}>
                          {label}
                        </Typography>
                      </Stack>
                      <ListItemText primary={label} secondary={u.email || u.role} />
                    </Stack>
                  </ListItemButton>
                );
              })}
            </List>
          ) : (
            <>
              <Typography sx={{ p: 2, opacity: 0.7 }}>No matches.</Typography>
              {role === "teacher" && (
                <Box sx={{ p: 2 }}>
                  <Button component={Link} to="/students" variant="outlined">
                    Add / link students
                  </Button>
                </Box>
              )}
            </>
          )}
        </Box>
      </Paper>

      {/* Chat window */}
      <Paper sx={{ p: 2, display: "flex", flexDirection: "column", minWidth: 0 }}>
        {peerIdFromUrl ? (
          <ChatWindow peerId={String(peerIdFromUrl)} />
        ) : (
          <Box sx={{ m: "auto", textAlign: "center", opacity: 0.7 }}>
            <Typography variant="h6">Pick someone to start chatting</Typography>
            <Typography variant="body2">Select a contact from the left.</Typography>
          </Box>
        )}
      </Paper>
    </Box>
  );
}

function ChatWindow({ peerId }) {
  const me = getMe();
  const myId = String(me?._id || me?.id || "");
  const roomId = privateRoomId(myId, peerId);

  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const bottomRef = useRef(null);

  // de-dupe helper (by _id, else by signature)
  const addUnique = (arr, msg) => {
    if (!msg) return arr;
    const id = msg?._id ? String(msg._id) : "";
    if (id && arr.some((m) => String(m?._id) === id)) return arr;
    const sig = `${msg.from?._id || msg.from}|${msg.text}|${msg.createdAt}`;
    if (arr.some((m) => `${m.from?._id || m.from}|${m.text}|${m.createdAt}` === sig)) return arr;
    return [...arr, msg];
  };

  // socket subscribe
  useEffect(() => {
    const socket = getSocket(); // ✅ one shared connection (with JWT)
    // join both new & legacy names (server supports both)
    socket.emit("joinRoom", { roomId });
    socket.emit("join", roomId);

    const onMsg = (msg) => {
      if (msg?.roomId === roomId) {
        setMessages((prev) => addUnique(prev, msg));
      }
    };
    socket.on("message", onMsg);

    return () => {
      socket.off("message", onMsg);
    };
  }, [roomId]);

  // history fetch
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await axios.get(
          `${API}/messages/${encodeURIComponent(roomId)}?limit=100`,
          tokenHeader()
        );
        const base = Array.isArray(r.data) ? r.data : [];
        if (!cancelled) {
          const unique = base.reduce((acc, m) => addUnique(acc, m), []);
          setMessages(unique);
        }
      } catch {
        if (!cancelled) setMessages([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const send = async () => {
    const body = text.trim();
    if (!body) return;
    setText("");
    const socket = getSocket();
    socket.emit("sendMessage", { roomId, text: body });
  };

  const onKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <Typography variant="subtitle2" sx={{ mb: 1 }}>
        Chat with: {peerId}
      </Typography>

      <Paper variant="outlined" sx={{ flex: 1, p: 1, overflowY: "auto" }}>
        {messages.map((m) => {
          const isMe = String(m.from?._id || m.from) === myId;
          const ts = new Date(m.createdAt || Date.now()).toLocaleTimeString();
          return (
            <Box
              key={m._id || ts + m.text}
              sx={{ display: "flex", justifyContent: isMe ? "flex-end" : "flex-start", mb: 0.75 }}
            >
              <Box
                sx={{
                  maxWidth: "70%",
                  bgcolor: isMe ? "primary.main" : "grey.200",
                  color: isMe ? "primary.contrastText" : "text.primary",
                  px: 1.2,
                  py: 0.8,
                  borderRadius: 2,
                }}
              >
                <Typography variant="body2" sx={{ whiteSpace: "pre-wrap" }}>
                  {m.text}
                </Typography>
                <Typography variant="caption" sx={{ opacity: 0.8, display: "block", textAlign: "right" }}>
                  {ts}
                </Typography>
              </Box>
            </Box>
          );
        })}
        <div ref={bottomRef} />
      </Paper>

      <Divider sx={{ my: 1 }} />

      <Stack direction="row" spacing={1}>
        <TextField
          size="small"
          fullWidth
          placeholder="Type a message… (Enter to send)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
        />
        <Button variant="contained" onClick={send} disabled={!text.trim()}>
          Send
        </Button>
      </Stack>
    </Box>
  );
}
