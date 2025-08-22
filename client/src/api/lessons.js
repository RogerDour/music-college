// Lessons API client
// ------------------
// Handles CRUD + suggestions + helpers.

import API from "../utils/axios";

const PREFIX = "/lessons";

/* ─────────────── CRUD ─────────────── */

/** List lessons with optional query params (role-aware on server). */
export const getLessons = (params = {}) => API.get(PREFIX, { params });

/** Get *my* lessons (shortcut endpoint). */
export const getMyLessons = (params = {}) =>
  API.get(`${PREFIX}/mine`, { params });

/** Create a new lesson. */
export const createLesson = (data) => API.post(PREFIX, data);

/** Update a lesson by id. */
export const updateLesson = (id, data) => API.put(`${PREFIX}/${id}`, data);

/** Delete a lesson by id. */
export const deleteLesson = (id) => API.delete(`${PREFIX}/${id}`);

/* ───────────── Suggestions ───────────── */

/**
 * Ask server for suggested time slots.
 * UI may pass `durationMinutes`; backend expects `durationMin`.
 */
export const suggestSlots = (params = {}) => {
  const { durationMinutes, ...rest } = params;
  return API.post(`${PREFIX}/suggest`, {
    ...rest,
    ...(durationMinutes != null
      ? { durationMin: Number(durationMinutes) }
      : {}),
  });
};

/* Helpers for UI toggles */
export const markAttended = (id, attended = true) =>
  updateLesson(id, { attended });

export const markCompleted = (id, completed = true) =>
  updateLesson(id, { status: completed ? "completed" : "scheduled" });

/* ───────────── Recurring ───────────── */

/** Create a recurring-lesson rule. */
export const createRecurring = (payload) =>
  API.post(`${PREFIX}/recurring`, payload);
