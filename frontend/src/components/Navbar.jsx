import React, { useMemo } from "react";

const safeParse = (value) => {
  try {
    return value ? JSON.parse(value) : null;
  } catch {
    return null;
  }
};

const formatName = (username = "") =>
  username.replace(/^admin_/, "Admin ").replace(/_/g, " ");

const Navbar = ({ title, subtitle, userRole, onRefresh, refreshing = false }) => {
  const userLabel = useMemo(() => {
    const user = safeParse(localStorage.getItem("user"));
    const blocks = safeParse(localStorage.getItem("blocks")) || [];
    const block = blocks.find((item) => item.id === user?.block_id);
    const blockLabel = block ? `Block ${block.name}` : user?.block_name;

    if (!user) {
      return userRole;
    }

    if (user.role === "admin") {
      return `Logged in as: ${formatName(user.username)}${blockLabel ? ` (${blockLabel})` : ""}`;
    }

    const roleLabel = user.role === "teacher" ? "Teacher" : user.role === "student" || user.role === "client" ? "Student" : userRole;
    return `${roleLabel}: ${formatName(user.name || user.username)}${user.department ? ` (${user.department})` : ""}`;
  }, [userRole]);

  return (
    <header className="topbar header">
      <div>
        <p className="eyebrow">Campus Booking System</p>
        <h1 className="title">{title}</h1>
        {subtitle ? <p className="subtle-text">{subtitle}</p> : null}
      </div>

      <div className="topbar-actions">
        <div className="topbar-badge">
          <span className="status-dot" />
          {userLabel}
        </div>
        {onRefresh ? (
          <button type="button" className="refresh-button" onClick={onRefresh} disabled={refreshing}>
            {refreshing ? <span className="button-spinner dark" /> : "🔄 Refresh"}
          </button>
        ) : null}
      </div>
    </header>
  );
};

export default Navbar;
