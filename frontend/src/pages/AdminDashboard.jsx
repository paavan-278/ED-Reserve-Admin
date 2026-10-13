import React, {
  useCallback,
  useEffect,
  useState,
} from "react";

import AdminBookingTable from "../components/AdminBookingTable";
import AdminLayout from "../components/AdminLayout";
import { useAppContext } from "../context/AppContext";
import api from "../services/api";
import { formatErrorMessage } from "../utils/errorMessages";

const cards = [
  ["total_users", "Total Users"],
  ["total_teachers", "Total Teachers"],
  ["total_students", "Total Students"],
  ["total_bookings", "Total Bookings"],
  ["pending", "Pending Bookings"],
  ["approved", "Approved Bookings"],
  ["rejected", "Rejected Bookings"],
  ["today", "Today's Bookings"],
  ["upcoming", "Upcoming Bookings"],
];

const AdminDashboard = () => {
  const { fetchInitialData } = useAppContext();

  const [data, setData] = useState(null);
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setMessage("");

    try {
      /*
       IMPORTANT:
       Dashboard request aur initial data ko alag handle kar rahe hain.
       Pehle Promise.all ki wajah se agar fetchInitialData fail hota tha
       toh pura dashboard bhi fail ho sakta tha.
      */

      const dashboardResponse = await api.get(
        "/admin/dashboard",
        {
          cache: false,
        }
      );

      const dashboardData =
        dashboardResponse?.data || {};

      setData({
        ...dashboardData,

        stats:
          dashboardData.stats &&
          typeof dashboardData.stats === "object"
            ? dashboardData.stats
            : {},

        recent: Array.isArray(
          dashboardData.recent
        )
          ? dashboardData.recent
          : Array.isArray(
              dashboardData.recent_bookings
            )
          ? dashboardData.recent_bookings
          : Array.isArray(
              dashboardData.bookings
            )
          ? dashboardData.bookings
          : [],
      });

      /*
       Initial data fail hone par
       dashboard crash nahi hona chahiye.
      */
      if (typeof fetchInitialData === "function") {
        try {
          await fetchInitialData();
        } catch (initialDataError) {
          console.warn(
            "Initial data could not be loaded:",
            initialDataError
          );
        }
      }
    } catch (error) {
      console.error(
        "Dashboard load error:",
        error
      );

      setData(null);

      setMessage(
        formatErrorMessage(
          error?.response?.data?.detail ||
            error?.response?.data?.message,
          "Could not load dashboard"
        )
      );
    }
  }, [fetchInitialData]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    setMessage("");

    try {
      api.clearCache();
      await load();
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <AdminLayout
      title="Dashboard"
      subtitle="Complete campus booking control and recent activity."
      onRefresh={refresh}
      refreshing={refreshing}
    >
      {message ? (
        <div className="notice danger">
          {message}
        </div>
      ) : null}

      {!data && !message ? (
        <div className="skeleton-grid">
          <div />
          <div />
          <div />
          <div />
        </div>
      ) : null}

      {data ? (
        <>
          <section className="metric-grid admin-metrics">
            {cards.map(([key, label]) => (
              <article
                key={key}
                className={`metric-card glass-panel ${key}`}
              >
                <span>{label}</span>

                <strong>
                  {Number(
                    data?.stats?.[key] ?? 0
                  ) || 0}
                </strong>
              </article>
            ))}
          </section>

          <section className="glass-panel section-panel">
            <div className="panel-heading">
              <span className="panel-icon">
                📋
              </span>

              <div>
                <h2>
                  Recent Booking Activity
                </h2>

                <p>
                  Requester, role, block,
                  resource, time, and status.
                </p>
              </div>
            </div>

            <AdminBookingTable
              bookings={data?.recent || []}
              detailed
            />
          </section>
        </>
      ) : null}
    </AdminLayout>
  );
};

export default AdminDashboard;