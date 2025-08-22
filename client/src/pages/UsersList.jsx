import React, { useEffect, useMemo, useState } from "react";
import {
  Paper,
  Typography,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  CircularProgress,
  Box,
  Button,
  Stack,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Select,
  FormControl,
  InputLabel,
  Chip,
  Toolbar,
} from "@mui/material";
import { Link as RouterLink } from "react-router-dom";
import axios from "axios";
import { createUser, updateUserRole } from "../api/users";
import TeacherRatingSmall from "../components/TeacherRatingSmall";

const ROLES = ["student", "teacher", "admin"];
const BASE = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

// JWT helper
const auth = () => {
  const token = localStorage.getItem("token");
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

// tiny debounce hook
function useDebounced(value, ms = 400) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

export default function UsersList() {
  const [users, setUsers] = useState([]);

  // filters
  const [roleFilter, setRoleFilter] = useState("all"); // "all" | "student" | "teacher" | "admin"
  const [statusFilter, setStatusFilter] = useState("all"); // "all" | "active" | "inactive"
  const [search, setSearch] = useState("");
  const q = useDebounced(search, 400);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // add user dialog
  const [openAdd, setOpenAdd] = useState(false);
  const [addForm, setAddForm] = useState({
    name: "",
    email: "",
    password: "",
    role: "teacher",
  });
  const [saving, setSaving] = useState(false);

  // edit user dialog
  const [openEdit, setOpenEdit] = useState(false);
  const [editForm, setEditForm] = useState({ id: "", name: "", email: "" });

  // build params for API based on filters
  const params = useMemo(() => {
    const p = {};
    if (roleFilter !== "all") p.role = roleFilter;
    if (statusFilter !== "all") p.active = statusFilter === "active";
    if (q.trim()) p.q = q.trim();
    return p;
  }, [roleFilter, statusFilter, q]);

  // load users according to filters
  async function fetchUsers() {
    setLoading(true);
    setError(null);
    try {
      const res = await axios.get(`${BASE}/users`, { params, ...auth() });
      setUsers(res.data || []);
    } catch (e) {
      setError(e?.response?.data?.error || "Error fetching users");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchUsers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]); // reload when filters change

  const handleChangeRole = async (userId, role) => {
    try {
      const prev = users.find((u) => (u._id || u.id) === userId)?.role;
      if (prev === role) return;
      // optimistic
      setUsers((u) =>
        u.map((x) =>
          String(x._id || x.id) === String(userId) ? { ...x, role } : x,
        ),
      );
      await updateUserRole(userId, role); // your helper should include auth; if not, switch to axios.patch with auth()
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to change role");
      fetchUsers();
    }
  };

  const handleAddUser = async (e) => {
    e?.preventDefault?.();
    setSaving(true);
    try {
      const newUser = await createUser(addForm); // helper should include auth
      setUsers((prev) => [newUser, ...prev]);
      setOpenAdd(false);
      setAddForm({ name: "", email: "", password: "", role: "teacher" });
    } catch (e) {
      setError(e?.response?.data?.error || "Failed to create user");
    } finally {
      setSaving(false);
    }
  };

  const openEditDialog = (u) => {
    const uid = u._id || u.id;
    setEditForm({ id: uid, name: u.name || "", email: u.email || "" });
    setOpenEdit(true);
  };

  const submitEdit = async (e) => {
    e?.preventDefault?.();
    const { id, name, email } = editForm;
    if (!id) return;
    try {
      setUsers((prev) =>
        prev.map((u) =>
          String(u._id || u.id) === String(id) ? { ...u, name, email } : u,
        ),
      );
      await axios.patch(`${BASE}/users/${id}`, { name, email }, auth());
      setOpenEdit(false);
    } catch (e2) {
      setError(e2?.response?.data?.error || "Failed to update user");
      fetchUsers();
    }
  };

  const toggleActive = async (u) => {
    const id = u._id || u.id;
    const next = !(u.active !== false); // undefined -> true
    try {
      setUsers((prev) =>
        prev.map((x) =>
          String(x._id || x.id) === String(id) ? { ...x, active: next } : x,
        ),
      );
      await axios.patch(`${BASE}/users/${id}/status`, { active: next }, auth());
    } catch (e2) {
      setError(e2?.response?.data?.error || "Failed to change status");
      fetchUsers();
    }
  };

  const confirmDelete = async (u) => {
    if (!window.confirm("Delete this user?")) return;
    const id = u._id || u.id;
    try {
      await axios.delete(`${BASE}/users/${id}`, auth());
      setUsers((prev) =>
        prev.filter((x) => String(x._id || x.id) !== String(id)),
      );
    } catch (e2) {
      setError(e2?.response?.data?.error || "Failed to delete user");
    }
  };

  return (
    <Box sx={{ p: 4, pt: 10 }}>
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Typography variant="h4">Registered Users</Typography>
        <Button variant="contained" onClick={() => setOpenAdd(true)}>
          Add User
        </Button>
      </Stack>

      {/* Filters */}
      <Toolbar disableGutters sx={{ mb: 2, gap: 2, flexWrap: "wrap" }}>
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="f-role">Role</InputLabel>
          <Select
            labelId="f-role"
            label="Role"
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            {ROLES.map((r) => (
              <MenuItem key={r} value={r}>
                {r[0].toUpperCase() + r.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="f-status">Status</InputLabel>
          <Select
            labelId="f-status"
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All</MenuItem>
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>
        </FormControl>

        <TextField
          size="small"
          label="Search name/email"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ minWidth: 260 }}
        />
      </Toolbar>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {String(error)}
        </Alert>
      )}

      {loading ? (
        <Box display="flex" justifyContent="center" mt={4}>
          <CircularProgress />
        </Box>
      ) : users.length === 0 ? (
        <Typography>No users found.</Typography>
      ) : (
        <TableContainer component={Paper} elevation={3}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>
                  <strong>ID</strong>
                </TableCell>
                <TableCell>
                  <strong>Name</strong>
                </TableCell>
                <TableCell>
                  <strong>Email</strong>
                </TableCell>
                <TableCell>
                  <strong>Role</strong>
                </TableCell>
                <TableCell>
                  <strong>Status</strong>
                </TableCell>
                <TableCell>
                  <strong>Rating</strong>
                </TableCell>
                <TableCell>
                  <strong>Chat</strong>
                </TableCell>
                <TableCell>
                  <strong>Actions</strong>
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {users.map((user) => {
                const uid = user._id || user.id;
                const role = user.role || (user.isAdmin ? "admin" : "student");
                const isActive = user.active !== false; // default to active

                return (
                  <TableRow key={uid} sx={{ opacity: isActive ? 1 : 0.55 }}>
                    <TableCell sx={{ whiteSpace: "nowrap" }}>{uid}</TableCell>
                    <TableCell>{user.name || user.username || "—"}</TableCell>
                    <TableCell>{user.email}</TableCell>

                    <TableCell sx={{ minWidth: 160 }}>
                      <FormControl size="small" fullWidth>
                        <Select
                          value={role}
                          onChange={(e) =>
                            handleChangeRole(uid, e.target.value)
                          }
                        >
                          {ROLES.map((r) => (
                            <MenuItem key={r} value={r}>
                              {r[0].toUpperCase() + r.slice(1)}
                            </MenuItem>
                          ))}
                        </Select>
                      </FormControl>
                    </TableCell>

                    <TableCell>
                      <Chip
                        size="small"
                        label={isActive ? "Active" : "Inactive"}
                        color={isActive ? "success" : "default"}
                        variant={isActive ? "filled" : "outlined"}
                      />
                    </TableCell>

                    <TableCell>
                      {role === "teacher" ? (
                        <TeacherRatingSmall teacherId={uid} />
                      ) : (
                        "—"
                      )}
                    </TableCell>

                    <TableCell>
                      <Button
                        component={RouterLink}
                        to={`/chat/${uid}`}
                        variant="outlined"
                        size="small"
                        disabled={!isActive}
                      >
                        Message
                      </Button>
                    </TableCell>

                    <TableCell>
                      <Stack direction="row" spacing={1}>
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => openEditDialog(user)}
                        >
                          Edit
                        </Button>
                        <Button
                          size="small"
                          variant={isActive ? "outlined" : "contained"}
                          color={isActive ? "warning" : "success"}
                          onClick={() => toggleActive(user)}
                        >
                          {isActive ? "Deactivate" : "Activate"}
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          onClick={() => confirmDelete(user)}
                        >
                          Delete
                        </Button>
                      </Stack>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add User dialog */}
      <Dialog
        open={openAdd}
        onClose={() => setOpenAdd(false)}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={handleAddUser}>
          <DialogTitle>Add User</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <TextField
                label="Name"
                value={addForm.name}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, name: e.target.value }))
                }
                required
                fullWidth
              />
              <TextField
                label="Email"
                type="email"
                value={addForm.email}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, email: e.target.value }))
                }
                required
                fullWidth
              />
              <TextField
                label="Password"
                type="password"
                value={addForm.password}
                onChange={(e) =>
                  setAddForm((f) => ({ ...f, password: e.target.value }))
                }
                required
                fullWidth
              />
              <FormControl fullWidth>
                <InputLabel id="role-label">Role</InputLabel>
                <Select
                  labelId="role-label"
                  label="Role"
                  value={addForm.role}
                  onChange={(e) =>
                    setAddForm((f) => ({ ...f, role: e.target.value }))
                  }
                >
                  {ROLES.map((r) => (
                    <MenuItem key={r} value={r}>
                      {r[0].toUpperCase() + r.slice(1)}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenAdd(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? "Saving…" : "Create"}
            </Button>
          </DialogActions>
        </form>
      </Dialog>

      {/* Edit User dialog */}
      <Dialog
        open={openEdit}
        onClose={() => setOpenEdit(false)}
        fullWidth
        maxWidth="sm"
      >
        <form onSubmit={submitEdit}>
          <DialogTitle>Edit User</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2} sx={{ mt: 0.5 }}>
              <TextField
                label="Name"
                value={editForm.name}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, name: e.target.value }))
                }
                required
                fullWidth
              />
              <TextField
                label="Email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, email: e.target.value }))
                }
                required
                fullWidth
              />
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setOpenEdit(false)}>Cancel</Button>
            <Button type="submit" variant="contained">
              Save
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}
