// Calendar API client
// -------------------
// Uses the shared Axios instance (API) which already:
//  - sets baseURL from VITE_API_URL (fallback http://localhost:5000/api)
//  - attaches Authorization: Bearer <token> if it exists in localStorage

import API from "../utils/axios";

const PREFIX = "/calendar";

/**
 * Fetch *my* calendar events in a time range.
 * Both `from` and `to` are optional ISO strings. If omitted, the server can default.
 *
 * @param {string=} from - ISO 8601 string
 * @param {string=} to   - ISO 8601 string
 * @param {{signal?: AbortSignal}=} opts
 * @returns {Promise<Array>} events[]
 */
export async function myCalendar(from, to, { signal } = {}) {
  const params = {};
  if (from) params.from = from;
  if (to) params.to = to;

  const { data } = await API.get(`${PREFIX}/my`, { params, signal });
  return data?.events || [];
}

export default { myCalendar };
