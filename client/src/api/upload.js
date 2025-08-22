// Upload API client
// -----------------
// User-centric uploads (e.g., avatar).

import API from "../utils/axios";

/**
 * Upload user avatar.
 * @param {File|Blob} file
 * @returns {Promise<any>} server response (e.g., { ok, path })
 */
export async function uploadAvatar(file) {
  const fd = new FormData();
  fd.append("avatar", file);
  const { data } = await API.post("/upload/avatar", fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

export default { uploadAvatar };
