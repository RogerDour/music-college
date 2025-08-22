import { Navigate } from "react-router-dom";

function ProtectedRoute({ allowedRoles = [], children }) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) return <Navigate to="/login" replace />;

  // If no roles specified, just require auth
  if (allowedRoles.length === 0) return children;

  if (!role || !allowedRoles.includes(role)) {
    return <Navigate to="/" replace />;
  }

  return children;
}

export default ProtectedRoute;
