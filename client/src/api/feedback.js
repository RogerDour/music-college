// Feedback API client
// -------------------
// Normalized return shapes for the existing UI components.

import API from "../utils/axios";

const PREFIX = "/feedback";

/** Submit feedback for a lesson. */
export async function submitFeedback({ lessonId, rating, comment }) {
  const { data } = await API.post(PREFIX, { lessonId, rating, comment });
  return data;
}

/** Get aggregated rating summary for a teacher (avg + count). */
export async function getTeacherSummary(teacherId, params = {}) {
  const { data } = await API.get(`${PREFIX}/teacher/${teacherId}/summary`, {
    params,
  });
  return {
    avg: data?.average ?? null,
    count: data?.count ?? 0,
  };
}

/** Check if *I* already rated this specific lesson. */
export async function getMyLessonFeedback(lessonId) {
  const { data } = await API.get(`${PREFIX}/lesson/${lessonId}/mine`);
  // {exists:boolean, feedback?:{rating, comment, createdAt}}
  return data;
}

/**
 * Paginated list of feedback rows for a teacher.
 * Normalized to: { rows, total, page, limit }
 */
export async function listTeacherFeedback(
  teacherId,
  { page = 1, limit = 10, sort = "-createdAt" } = {},
) {
  const { data } = await API.get(PREFIX, {
    params: { teacherId, page, limit, sort },
  });
  return {
    rows: data?.items ?? [],
    total: data?.total ?? 0,
    page: data?.page ?? page,
    limit: data?.limit ?? limit,
  };
}

export default {
  submitFeedback,
  getTeacherSummary,
  getMyLessonFeedback,
  listTeacherFeedback,
};
