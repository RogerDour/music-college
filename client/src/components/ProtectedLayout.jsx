import { Navigate, Outlet } from "react-router-dom";
import Layout from "./Layout";

export default function ProtectedLayout({ roles = [] }) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  if (!token) return <Navigate to="/login" replace />;
  if (roles.length && !roles.includes(role)) return <Navigate to="/" replace />;

  return (
    <Layout role={role}>
      <Outlet />
    </Layout>
  );
}
