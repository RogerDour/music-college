// Analytics API client
// --------------------
// Overview metrics with optional filters.

import API from "../utils/axios";

/** Remove empty/undefined params so server doesn't get junk. */
const compact = (obj = {}) =>
  Object.fromEntries(
    Object.entries(obj).filter(
      ([, v]) => v !== "" && v !== undefined && v !== null
    )
  );

/**
 * GET /api/analytics/overview
 * Params: { from, to, bucket, teacherId?, courseId?, studentId? }
 */
export async function getOverview(params = {}) {
  const { data } = await API.get("/analytics/overview", {
    params: compact(params),
  });
  return data;
}

export default { getOverview };
