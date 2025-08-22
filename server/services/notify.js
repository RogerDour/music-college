// server/services/notify.js
// Emits **one** consistent event ("notify") and stores the notification.
// Keeping it simple prevents clients from accidentally handling the same
// notification twice.

const Notification = require("../models/Notification");

/**
 * Persist a notification and emit it to the user's personal room.
 *
 * @param {import('socket.io').Server} io
 * @param {{userId: string, type: string, title: string, body?: string, data?: any}} payload
 * @returns {Promise<object|null>} saved notification document (lean) or null on failure
 */
async function pushNotification(io, { userId, type, title, body, data }) {
  try {
    // Persist in DB
    const doc = await Notification.create({ userId, type, title, body, data });

    // Emit exactly one event name to the user's room
    if (io && userId) {
      io.to(String(userId)).emit("notify", doc);
    }

    return doc;
  } catch (e) {
    console.error("pushNotification error:", e);
    // Don’t throw; keep main request flow resilient
    return null;
  }
}

module.exports = { pushNotification };
