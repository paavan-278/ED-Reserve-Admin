import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";

import AdminBookingTable from "../components/AdminBookingTable";
import AdminLayout from "../components/AdminLayout";
import RejectBookingModal from "../components/RejectBookingModal";
import api from "../services/api";
import { formatErrorMessage } from "../utils/errorMessages";

const AdminBookings = () => {
  const [bookings, setBookings] = useState(null);
  const [message, setMessage] = useState("");
  const [rejectBooking, setRejectBooking] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejectLoading, setRejectLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadBookings = async (force = false) => {
    const cached = localStorage.getItem("adminPendingBookings");
    if (!force && cached) {
      setBookings(JSON.parse(cached));
    } else {
      setBookings(null);
    }
    try {
      const response = await api.get("/admin/bookings/pending", { cache: !force });
      setBookings(response.data || []);
      localStorage.setItem("adminPendingBookings", JSON.stringify(response.data || []));
    } catch (error) {
      setMessage(formatErrorMessage(error.response?.data?.detail, "Something went wrong"));
      setBookings([]);
    }
  };

  useEffect(() => {
    loadBookings();
  }, []);

  const handleApprove = async (bookingId) => {
    const previous = bookings;
    setBookings((current) => (current || []).filter((booking) => booking.id !== bookingId));
    try {
      await api.post(`/admin/bookings/${bookingId}/approve`);
      setMessage("Booking approved.");
      localStorage.removeItem("adminPendingBookings");
    } catch (error) {
      setBookings(previous);
      setMessage(formatErrorMessage(error.response?.data?.detail, "Something went wrong"));
    }
  };

  const handleRejectSubmit = async () => {
    if (!rejectBooking || !rejectReason.trim()) {
      return;
    }

    setRejectLoading(true);
    const previous = bookings;
    setBookings((current) => (current || []).filter((booking) => booking.id !== rejectBooking.id));
    try {
      await api.post(`/admin/bookings/${rejectBooking.id}/reject`, {
        reason: rejectReason.trim()
      });
      setRejectBooking(null);
      setRejectReason("");
      setMessage("Booking rejected.");
      localStorage.removeItem("adminPendingBookings");
    } catch (error) {
      setBookings(previous);
      setMessage(formatErrorMessage(error.response?.data?.detail, "Something went wrong"));
    } finally {
      setRejectLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    api.clearCache(["/admin/bookings/pending"]);
    try {
      await loadBookings(true);
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <AdminLayout title="Bookings" subtitle="Review and process pending booking requests." onRefresh={handleRefresh} refreshing={refreshing}>
      {message ? <motion.div className="alert info" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>{String(message)}</motion.div> : null}
      <AdminBookingTable
        bookings={bookings}
        showActions
        onApprove={handleApprove}
        onReject={(booking) => {
          setRejectBooking(booking);
          setRejectReason("");
        }}
      />
      <RejectBookingModal
        booking={rejectBooking}
        reason={rejectReason}
        loading={rejectLoading}
        onReasonChange={setRejectReason}
        onClose={() => {
          setRejectBooking(null);
          setRejectReason("");
          setRejectLoading(false);
        }}
        onSubmit={handleRejectSubmit}
      />
    </AdminLayout>
  );
};

export default AdminBookings;
