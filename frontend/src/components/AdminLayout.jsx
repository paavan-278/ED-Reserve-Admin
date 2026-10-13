import React, { useState } from "react";
import { useNavigate } from "react-router-dom";

import InchargeModal from "./InchargeModal";
import Navbar from "./Navbar";
import Sidebar from "./Sidebar";
import { useAppContext } from "../context/AppContext";

const adminNavItems = [
  { key: "dashboard", label: "Dashboard", icon: "D", to: "/admin", end: true },
  { key: "users", label: "Manage Users", icon: "U", to: "/admin/users" },
  { key: "bookings", label: "Pending Bookings", icon: "B", to: "/admin/bookings" },
  { key: "history", label: "Booking History", icon: "H", to: "/admin/history" },
  { key: "incharges", label: "Incharges", icon: "I" }
];

const AdminLayout = ({ title, subtitle, children, onRefresh, refreshing }) => {
  const navigate = useNavigate();
  const { incharges } = useAppContext();
  const [showIncharges, setShowIncharges] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    navigate("/login");
  };

  const handleSidebarSelect = (itemKey) => {
    if (itemKey === "incharges") {
      setShowIncharges(true);
    }
  };

  return (
    <div className="admin-pro-shell">
      <Sidebar
        role="HOD / Admin"
        items={adminNavItems}
        activeItem={showIncharges ? "incharges" : undefined}
        onSelect={handleSidebarSelect}
        onLogout={handleLogout}
      />

      <main className="admin-pro-main">
        <Navbar title={title} subtitle={subtitle} userRole="HOD / Admin" onRefresh={onRefresh} refreshing={refreshing} />
        {children}
      </main>

      <InchargeModal open={showIncharges} groups={incharges} onClose={() => setShowIncharges(false)} />
    </div>
  );
};

export default AdminLayout;
