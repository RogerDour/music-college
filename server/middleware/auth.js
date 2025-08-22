// server/middleware/auth.js
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "";
if (!JWT_SECRET) {
  // Log once at load time; keep runtime behavior predictable
  // (We don't throw to avoid crashing servers started for tests/dev by mistake.)
  console.warn("[auth] JWT_SECRET is not set. Tokens will fail verification.");
}

/**
 * authenticate
 * - Expects an Authorization header: "Bearer <token>"
 * - Verifies token and attaches { id, role } to req.user
 */
function authenticate(req, res, next) {
  try {
    const authHeader = req.headers.authorization || "";
    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET, {
      // optional small clock skew tolerance
      clockTolerance: 5,
    });

    // Minimal shape hardening
    const id = decoded?.id;
    const role = String(decoded?.role || "").toLowerCase();
    if (!id || !role) {
      return res.status(401).json({ error: "Invalid token payload" });
    }

    req.user = { id, role };
    next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid token" });
  }
}

/**
 * authorize(...roles)
 * - Ensures req.user.role is in allowed list
 */
function authorize(...allowedRoles) {
  const normalized = allowedRoles.map((r) => String(r).toLowerCase());
  return (req, res, next) => {
    const role = String(req.user?.role || "").toLowerCase();
    if (!role) return res.status(401).json({ error: "Unauthenticated" });
    if (!normalized.includes(role)) {
      return res.status(403).json({ error: "Access denied: Insufficient permissions" });
    }
    next();
  };
}

module.exports = { authenticate, authorize };
