import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

import AdminBookingTable from "../components/AdminBookingTable";
import AdminLayout from "../components/AdminLayout";
import api from "../services/api";
import { formatErrorMessage } from "../utils/errorMessages";

const AdminSchedule = () => {
  const [schedule, setSchedule] = useState(null);
  const [message, setMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const loadSchedule = async (force = false) => {
      const cached = localStorage.getItem("adminSchedule");
      if (!force && cached) {
        setSchedule(JSON.parse(cached));
      }
      try {
        const response = await api.get("/admin/schedule", { cache: !force });
        setSchedule(response.data || []);
        localStorage.setItem("adminSchedule", JSON.stringify(response.data || []));
      } catch (error) {
        setMessage(formatErrorMessage(error.response?.data?.detail, "Something went wrong"));
        setSchedule([]);
      }
    };

  useEffect(() => {
    loadSchedule();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    api.clearCache(["/admin/schedule"]);
    try {
      await loadSchedule(true);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <AdminLayout title="Schedule" subtitle="Upcoming and active bookings for your assigned block." onRefresh={handleRefresh} refreshing={refreshing}>
      {message ? <motion.div className="alert info" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{String(message)}</motion.div> : null}
      <AdminBookingTable bookings={schedule} />
    </AdminLayout>
  );
};

export default AdminSchedule;
