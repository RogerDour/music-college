// Users API client
// ----------------
// Admin + convenience endpoints for teachers/students lists.

import API from "../utils/axios";

const PREFIX = "/users";

/** Admin: list users (supports params like ?role=&q=). */
export const listUsers = (params = {}) =>
  API.get(PREFIX, { params }).then((r) => r.data);

/** Admin: create a user. */
export const createUser = (payload) =>
  API.post(PREFIX, payload).then((r) => r.data);

/** Admin: change a user's role. */
export const updateUserRole = (userId, role) =>
  API.patch(`${PREFIX}/${userId}/role`, { role }).then((r) => r.data);

/** Teachers (auth): list teachers (optional search q). */
export const listTeachers = (q = "") =>
  API.get(`${PREFIX}/teachers`, { params: q ? { q } : {} }).then((r) => r.data);

/** Students (auth): teacher gets own students, admin gets all (optional search q). */
export const listStudents = (q = "") =>
  API.get(`${PREFIX}/students`, { params: q ? { q } : {} }).then((r) => r.data);

/* -------- Back-compat aliases some components import -------- */
export const list = listUsers;
export const getUsers = listUsers;
export const fetchUsers = listUsers;
export const all = listUsers;

export default {
  listUsers,
  createUser,
  updateUserRole,
  listTeachers,
  listStudents,
  list,
  getUsers,
  fetchUsers,
  all,
};
