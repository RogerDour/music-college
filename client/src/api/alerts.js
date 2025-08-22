// Alerts API client
// -----------------
// - Saved user alerts (notifications you persist in DB)
// - Analytics anomaly alerts (for the Analytics page)

import API from "../utils/axios";

const PREFIX = "/alerts";

/** List my saved alerts/notifications. */
export async function listUserAlerts() {
  const { data } = await API.get(PREFIX);
  return data; // server decides shape
}

/** Mark an alert as seen. */
export async function markAlertSeen(id) {
  const { data } = await API.post(`${PREFIX}/${id}/seen`, null);
  return data; // e.g. { ok: true }
}

/**
 * Fetch anomaly alerts for analytics (time-series).
 * Accepts params like: { from, to, bucket, teacherId?, courseId?, ... }
 */
export async function getAnomalyAlerts(params = {}) {
  const { data } = await API.get("/analytics/alerts", { params });
  return data; // { from, to, bucket, alerts: [...] }
}

export default { listUserAlerts, markAlertSeen, getAnomalyAlerts };
