import React, { Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";

const AdminDashboard = React.lazy(() => import("./pages/AdminDashboard"));
const AdminBookings = React.lazy(() => import("./pages/AdminBookings"));
const AdminHistory = React.lazy(() => import("./pages/AdminHistory"));
const AdminUsers = React.lazy(() => import("./pages/AdminUsers"));
const ClientDashboard = React.lazy(() => import("./pages/ClientDashboard"));
const Login = React.lazy(() => import("./pages/Login"));

const decodeToken = (token) => {
  const base64Value = token.split(".")[1];
  const normalized = base64Value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");

  return JSON.parse(atob(padded));
};

const readTokenPayload = () => {
  const token = localStorage.getItem("token");
  if (!token) {
    return null;
  }

  try {
    const payload = decodeToken(token);
    return { token, payload };
  } catch (error) {
    localStorage.removeItem("token");
    return null;
  }
};

const normalizeRole = (role) => (role === "client" ? "student" : role);

const getHomeForRole = (role) => {
  const normalized = normalizeRole(role);
  return normalized === "admin" ? "/admin" : "/";
};

const ProtectedRoute = ({ allowedRoles, children }) => {
  const auth = readTokenPayload();

  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  const role = normalizeRole(auth.payload.role);
  if (!allowedRoles.includes(role)) {
    return <Navigate to={getHomeForRole(role)} replace />;
  }

  return children;
};

const DefaultRoute = () => {
  const auth = readTokenPayload();

  if (!auth) {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to={getHomeForRole(auth.payload.role)} replace />;
};

function App() {
  return (
    <Suspense fallback={<div className="app-loader"><div className="skeleton-line" /></div>}>
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedRoute allowedRoles={["teacher", "student"]}>
              <ClientDashboard view="overview" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/new-booking"
          element={
            <ProtectedRoute allowedRoles={["teacher", "student"]}>
              <ClientDashboard view="new-booking" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/my-bookings"
          element={
            <ProtectedRoute allowedRoles={["teacher", "student"]}>
              <ClientDashboard view="my-bookings" />
            </ProtectedRoute>
          }
        />
        <Route
          path="/create-student"
          element={
            <ProtectedRoute allowedRoles={["teacher"]}>
              <ClientDashboard view="create-student" />
            </ProtectedRoute>
          }
        />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/client" element={<DefaultRoute />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/users"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminUsers />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/bookings"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminBookings />
            </ProtectedRoute>
          }
        />
        <Route
          path="/admin/history"
          element={
            <ProtectedRoute allowedRoles={["admin"]}>
              <AdminHistory />
            </ProtectedRoute>
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}

export default App;
