// Enrollments API client
// ----------------------
// Standardized on the shared API instance.

import API from "../utils/axios";

const PREFIX = "/enrollments";

/** Get my enrollments. */
export const myEnrollments = async () => {
  const { data } = await API.get(`${PREFIX}/my`);
  return data.enrollments || [];
};

/** Enroll a user into a course (admin/teacher flow depending on backend rules). */
export const enroll = async (courseId, userId) => {
  const { data } = await API.post(PREFIX, { courseId, userId });
  return data.enrollment;
};

/** Drop/remove an enrollment by id. */
export const dropEnrollment = async (enrollmentId) => {
  const { data } = await API.delete(`${PREFIX}/${enrollmentId}`);
  return data.ok;
};

/** Get roster for a course (list of enrolled users). */
export const courseRoster = async (courseId) => {
  const { data } = await API.get(`${PREFIX}/roster/${courseId}`);
  return data.roster || [];
};

/** Update enrollment status (e.g., approved/pending/denied). */
export const updateEnrollmentStatus = async (id, status) => {
  const { data } = await API.patch(`${PREFIX}/${id}`, { status });
  return data.enrollment;
};

/** Count enrollments grouped by course id. */
export const countByCourse = async (courseIds) => {
  const params = { courseIds: (courseIds || []).join(",") };
  const { data } = await API.get(`${PREFIX}/counts`, { params });
  return data.counts || {};
};
