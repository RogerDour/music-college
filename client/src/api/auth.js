// Auth API client
// ---------------
// Login / signup. Uses shared API (baseURL + token header if present).
// Note: token header is harmless on login/signup even if present.

import API from "../utils/axios";

/** POST /api/auth/login */
export const login = (email, password) =>
  API.post("/auth/login", { email, password });

/** POST /api/auth/signup */
export const signup = (data) => API.post("/auth/signup", data);

export default { login, signup };
