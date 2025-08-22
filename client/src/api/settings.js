// Settings API client
// -------------------
// (e.g., opening hours, org-level config)

import API from "../utils/axios";

/** Get current opening hours/settings. */
export const getHours = async () =>
  (await API.get("/settings/hours")).data;

/** Update opening hours/settings. */
export const updateHours = async (payload) =>
  (await API.put("/settings/hours", payload)).data;

export default { getHours, updateHours };
