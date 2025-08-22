// client/src/socket.js
// Single shared Socket.IO client with JWT handshake + auto re-auth.

import { io } from "socket.io-client";

let socket = null;
let lastToken = null;

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || "http://localhost:5000";

function safeGetUser() {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
}

export function getSocket() {
  const currentToken = localStorage.getItem("token") || null;

  // create or re-create if token changed
  if (!socket || currentToken !== lastToken) {
    if (socket) {
      try {
        socket.disconnect();
      } catch {}
    }

    socket = io(SOCKET_URL, {
      transports: ["websocket"],
      auth: { token: currentToken },
      autoConnect: true,
      reconnection: true,
    });

    lastToken = currentToken;

    socket.on("connect", () => {
      const me = safeGetUser();
      const myId = String(me?.id || me?._id || "");
      if (myId) socket.emit("identify", myId);
      // console.log("✅ socket connected", socket.id);
    });

    socket.on("connect_error", (err) => {
      // console.warn("❌ socket connect_error:", err?.message);
    });

    socket.on("error", (err) => {
      // console.warn("❌ socket error:", err);
    });
  }

  return socket;
}

// Call this after login/logout so the next getSocket() re-auths with the new token
export function refreshSocketAuth() {
  lastToken = null;
}
