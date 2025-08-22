// client/src/pages/Profile.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Paper,
  Stack,
  TextField,
  Button,
  Avatar,
  Chip,
  Typography,
} from "@mui/material";
import axios from "axios";

const API = import.meta.env.VITE_API_URL || "http://localhost:5000/api";
const hostFromApi = (u) => u.replace(/\/api\/?$/, ""); // "http://localhost:5000"

export default function Profile() {
  const HOST = useMemo(() => hostFromApi(API), []);
  const [me, setMe] = useState(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [avatarFile, setAvatarFile] = useState(null); // local preview
  const [avatarPath, setAvatarPath] = useState(""); // server path (/uploads/...)

  const auth = useMemo(
    () => ({
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
    }),
    []
  );

  useEffect(() => {
    (async () => {
      try {
        const r = await axios.get(`${API}/profile`, auth);
        setMe(r.data);
        setName(r.data?.name || "");
        setEmail(r.data?.email || "");
        setAvatarPath(r.data?.avatar || ""); // e.g. "/uploads/avatars/xyz.png"
      } catch (e) {
        console.error("load profile failed", e);
      }
    })();
  }, [auth]);

  const onSave = async () => {
    try {
      await axios.put(
        `${API}/profile`,
        { name, email, password: password || undefined },
        auth,
      );
      setPassword("");
      alert("Saved");
    } catch (e) {
      alert(e?.response?.data?.error || "Save failed");
    }
  };

  const onPickAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarFile(file); // instant preview

    try {
      const fd = new FormData();
      fd.append("file", file);
      const r = await axios.post(`${API}/upload/avatar`, fd, {
        ...auth,
        headers: { ...auth.headers, "Content-Type": "multipart/form-data" },
      });
      // r.data.path is a relative path like "/uploads/avatars/<filename>"
      setAvatarPath(r.data?.path || "");
      // also reflect in me so other parts that read me.avatar get updated
      setMe((prev) => ({ ...prev, avatar: r.data?.path || "" }));
    } catch (e) {
      console.error("upload avatar failed", e);
      alert(e?.response?.data?.error || "Upload failed");
    }
  };

  // What to display in the Avatar:
  // 1) if a file was just picked, show a local preview
  // 2) else if server stored path exists, build HOST + path
  const avatarSrc = avatarFile
    ? URL.createObjectURL(avatarFile)
    : avatarPath
      ? `${HOST}${avatarPath}`
      : undefined;

  return (
    <Box sx={{ p: 2 }}>
      <Typography variant="h5" sx={{ mb: 1 }}>
        Profile{" "}
        {me?.role && <Chip size="small" label={me.role} sx={{ ml: 1 }} />}
      </Typography>

      <Paper sx={{ p: 2 }}>
        <Stack direction="row" spacing={3} alignItems="flex-start">
          <Stack spacing={1} alignItems="center">
            <Avatar src={avatarSrc} sx={{ width: 96, height: 96 }}>
              {name?.[0]?.toUpperCase?.()}
            </Avatar>
            <Button component="label" size="small" variant="outlined">
              Choose File
              <input
                hidden
                type="file"
                accept="image/*"
                onChange={onPickAvatar}
              />
            </Button>
          </Stack>

          <Stack spacing={2} sx={{ flex: 1 }}>
            <Stack direction="row" spacing={2}>
              <TextField
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                fullWidth
              />
              <TextField
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                fullWidth
              />
              <TextField
                label="Password"
                type="password"
                value={password}
                placeholder="leave blank to keep"
                onChange={(e) => setPassword(e.target.value)}
                fullWidth
              />
            </Stack>

            <Button
              onClick={onSave}
              variant="contained"
              sx={{ alignSelf: "flex-start" }}
            >
              Save
            </Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  );
}