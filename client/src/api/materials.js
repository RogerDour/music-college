// Materials API client
// --------------------
// List/upload/update/delete/download course materials.

import API from "../utils/axios";

const PREFIX = "/materials";

/** List materials (optionally filter by courseId/folder, etc.). */
export async function listMaterials(params = {}) {
  const { data } = await API.get(PREFIX, { params });
  return data;
}

/** List logical folders for a course (server groups paths). */
export async function listFolders(courseId) {
  const { data } = await API.get(`${PREFIX}/folders`, { params: { courseId } });
  return data;
}

/**
 * Upload a material file.
 * payload: { courseId, title, notes?, folder?, file }
 */
export async function uploadMaterial({ courseId, title, notes, folder, file }) {
  const fd = new FormData();
  fd.append("courseId", courseId);
  fd.append("title", title);
  if (notes) fd.append("notes", notes);
  if (folder) fd.append("folder", folder);
  fd.append("file", file);

  const { data } = await API.post(PREFIX, fd, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return data;
}

/** Update material metadata (title, notes, folder…). */
export async function updateMaterial(id, payload) {
  const { data } = await API.put(`${PREFIX}/${id}`, payload);
  return data;
}

/** Delete a material by id. */
export async function deleteMaterial(id) {
  const { data } = await API.delete(`${PREFIX}/${id}`);
  return data;
}

/**
 * Download a material as a Blob (you can then call `saveBlobAs()`).
 * NOTE: We set `responseType: "blob"` so the browser doesn’t try to parse JSON.
 */
export async function downloadMaterial(id) {
  const res = await API.get(`${PREFIX}/${id}/download`, {
    responseType: "blob",
  });
  return res.data; // Blob
}

/** Utility to trigger a browser download for a Blob. */
export function saveBlobAs(filename, blob) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "download";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
