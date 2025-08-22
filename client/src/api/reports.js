// Reports API client
// ------------------
// Keeps arraybuffer response for file downloads (CSV/XLSX/PDF/etc.)

import API from "../utils/axios";

/**
 * Export a report.
 * @param {"csv"|"xlsx"|"pdf"|string} format
 * @param {object} payload - report query/body
 * @returns {Promise<AxiosResponse<ArrayBuffer>>}
 */
export async function exportReport(format, payload) {
  return API.post("/reports/export", payload, {
    params: { format },
    responseType: "arraybuffer", // important for binary files
  });
}

export default { exportReport };
