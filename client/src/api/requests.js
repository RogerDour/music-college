// Requests API client
// -------------------
// Lesson requests / approvals flow.

import API from "../utils/axios";

const PREFIX = "/requests";

/** Create a new request (e.g., { teacherId, title?, start, duration? }). */
export const createRequest = (payload) => API.post(PREFIX, payload);

/** List requests (teacher/admin). */
export const listRequests = () => API.get(PREFIX);

/** Approve a request by id. */
export const approveRequest = (id) => API.post(`${PREFIX}/${id}/approve`);

/** Reject a request by id. */
export const rejectRequest = (id) => API.post(`${PREFIX}/${id}/reject`);

/** List my requests (student/teacher). */
export const getMyRequests = () => API.get(`${PREFIX}/mine`);

export default {
  createRequest,
  listRequests,
  approveRequest,
  rejectRequest,
  getMyRequests,
};
