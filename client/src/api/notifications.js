// Notifications API client
// ------------------------
// Uses shared API instance (adds baseURL + Bearer token automatically)

import API from "../utils/axios";

const PREFIX = "/notifications";

/** Get my notifications (server decides shape). */
export async function listNotifications() {
  const { data } = await API.get(PREFIX);
  return data;
}

/** Mark a single notification as read. */
export async function markRead(id) {
  await API.post(`${PREFIX}/${id}/read`, {});
}

export default { listNotifications, markRead };
