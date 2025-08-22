// client/src/api/availability.js
import API from "../utils/axios";

const PREFIX = "/availability";

// Me
export const getMyAvailability  = () => API.get(`${PREFIX}/me`);
export const saveMyAvailability = ({ weeklyRules = [], exceptions = [] }) =>
  API.put(`${PREFIX}/me`, { weeklyRules, exceptions });

// Admin or self by id (read-only unless you add a server route)
export const getAvailability = (userId) => API.get(`${PREFIX}/${userId}`);

// Holidays (admin)
export const getHolidays   = () => API.get(`${PREFIX}/holidays`);
export const saveHolidays  = (holidays) => API.post(`${PREFIX}/holidays`, { holidays });
export const deleteHoliday = (id) => API.delete(`${PREFIX}/holidays/${id}`);
export const clearHolidays = () => API.delete(`${PREFIX}/holidays`);

export default {
  getMyAvailability,
  saveMyAvailability,
  getAvailability,
  getHolidays,
  saveHolidays,
  deleteHoliday,
  clearHolidays,
};
