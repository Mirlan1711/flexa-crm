import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute() {
  return localStorage.getItem("access_token") ? <Outlet /> : <Navigate to="/" replace />;
}
