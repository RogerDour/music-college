// Tasks API client
// ----------------
// Homework/assignments + submissions.

import API from "../utils/axios";

const PREFIX = "/tasks";

/** List tasks (with optional filters via params). */
export const listTasks = (params = {}) => API.get(PREFIX, { params });

/** Create a new task. */
export const createTask = (payload) => API.post(PREFIX, payload);

/**
 * Upload a submission file for a task.
 * `file` should be a File/Blob (from <input type="file" />).
 */
export const uploadSubmission = (taskId, file) => {
  const fd = new FormData();
  fd.append("file", file);
  return API.post(`${PREFIX}/${taskId}/submit`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
};

/** List submissions for a task. */
export const listSubmissions = (taskId) =>
  API.get(`${PREFIX}/${taskId}/submissions`);

/** Update a submission status (e.g., graded/approved). */
export const setSubmissionStatus = (taskId, submissionId, status) =>
  API.post(`${PREFIX}/${taskId}/submissions/${submissionId}/status`, { status });

export default {
  listTasks,
  createTask,
  uploadSubmission,
  listSubmissions,
  setSubmissionStatus,
};
