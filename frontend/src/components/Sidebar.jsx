import React, { useState } from "react";
import { NavLink, useLocation } from "react-router-dom";

const hideSidebarRoutes = ["/login", "/register"];

const Sidebar = ({
  role = "User",
  items = [],   // ✅ SAFE DEFAULT
  activeItem,
  onSelect = () => {},
  onLogout = () => {},
}) => {
  const location = useLocation();
  const [open, setOpen] = useState(false);

  if (hideSidebarRoutes.includes(location.pathname)) {
    return null;
  }

  const closeMenu = () => setOpen(false);

  const handleSelect = (itemKey) => {
    onSelect(itemKey);
    closeMenu();
  };

  const handleLogout = () => {
    closeMenu();
    onLogout();
  };

  // ✅ SAFE ARRAY (CRASH FIX)
  const safeItems = Array.isArray(items) ? items : [];

  return (
    <>
      {/* ✅ HAMBURGER */}
      <button
        type="button"
        className="menu-toggle menu-btn"
        aria-label="Open navigation menu"
        aria-expanded={open}
        onClick={() => setOpen(true)}
      >
        <span />
        <span />
        <span />
      </button>

      {/* ✅ OVERLAY */}
      {open && (
        <button
          type="button"
          className="sidebar-overlay"
          aria-label="Close navigation menu"
          onClick={closeMenu}
        />
      )}

      {/* ✅ SIDEBAR */}
      <aside className={`sidebar ${open ? "open" : ""}`}>
        <div className="brand-card">
          <div className="brand-icon">CB</div>
          <div>
            <h2>Campus Booking</h2>
            <p>{role} dashboard</p>
          </div>
        </div>

        {/* ✅ NAV ITEMS SAFE */}
        <nav className="sidebar-nav">
          {safeItems.length > 0 ? (
            safeItems.map((item) =>
              item?.to ? (
                <NavLink
                  key={item.key}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    `nav-item ${isActive ? "active" : ""}`
                  }
                  onClick={closeMenu}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </NavLink>
              ) : (
                <button
                  key={item.key}
                  type="button"
                  className={`nav-item ${
                    activeItem === item.key ? "active" : ""
                  }`}
                  onClick={() => handleSelect(item.key)}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </button>
              )
            )
          ) : (
            // ✅ FALLBACK (NO CRASH)
            <p style={{ padding: "10px", color: "#888" }}>
              Loading menu...
            </p>
          )}
        </nav>

        {/* ✅ LOGOUT */}
        <button
          type="button"
          className="logout-button"
          onClick={handleLogout}
        >
          Logout
        </button>
      </aside>
    </>
  );
};

export default Sidebar;
