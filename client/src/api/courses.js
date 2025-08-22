// Courses API client
// ------------------
// All requests flow through the shared API instance with auth + baseURL.

import API from "../utils/axios";

const PREFIX = "/courses";

/** Get all courses. */
export async function listCourses() {
  const { data } = await API.get(PREFIX);
  return Array.isArray(data) ? data : data.courses || [];
}

/** Update a course by id. */
export async function updateCourse(id, payload) {
  const { data } = await API.put(`${PREFIX}/${id}`, payload);
  return data;
}

/**
 * Upload/replace a course cover image.
 * `file` should be a File/Blob (from <input type="file" />).
 */
export async function uploadCourseCover(id, file) {
  const fd = new FormData();
  fd.append("file", file);

  const { data } = await API.post(`/upload/course-cover/${id}`, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  // expected: { ok, path }
  return data;
}

/** Fetch a single course by id. */
export const getCourse = (id) => API.get(`${PREFIX}/${id}`);
