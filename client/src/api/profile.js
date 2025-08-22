// Profile API client
// ------------------

import API from "../utils/axios";

const PREFIX = "/profile";

/** GET /api/profile → current user profile */
export const getProfile = () => API.get(PREFIX);

/** PUT /api/profile → update current user profile */
export const updateProfile = (data) => API.put(PREFIX, data);

/** Back-compat aliases used by some components */
export const getMe = getProfile;
export const me = getProfile;

export default { getProfile, updateProfile, getMe, me };
