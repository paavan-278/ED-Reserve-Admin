import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import AccountForm from "../components/AccountForm";
import BookingForm from "../components/BookingForm";
import BookingList from "../components/BookingList";
import InchargeModal from "../components/InchargeModal";
import Navbar from "../components/Navbar";
import RejectModal from "../components/RejectModal";
import Sidebar from "../components/Sidebar";
import { useAppContext } from "../context/AppContext";
import api from "../services/api";
import { formatErrorMessage } from "../utils/errorMessages";


const readUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};


const roleLabel = (role) =>
  role === "teacher" ? "Teacher" : "Student";


const ClientDashboard = ({ view = "overview" }) => {
  const navigate = useNavigate();

  const {
    blocks,
    incharges,
    fetchInitialData,
  } = useAppContext();

  const currentUser = useMemo(readUser, []);

  const normalizedRole =
    currentUser.role === "client"
      ? "student"
      : currentUser.role;

  const isStudent =
    normalizedRole === "student";

  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [studentLoading, setStudentLoading] = useState(false);

  const [message, setMessage] = useState("");
  const [availabilityMsg, setAvailabilityMsg] = useState(null);
  const [successBooking, setSuccessBooking] = useState(null);

  const [showIncharges, setShowIncharges] = useState(false);
  const [cancelBookingId, setCancelBookingId] = useState(null);


  // =========================
  // BOOKING FORM DATA
  // =========================

  const [formData, setFormData] = useState({
    resourceScope: "block",

    blockId: currentUser.block_id
      ? String(currentUser.block_id)
      : "",

    resourceId: "",

    name:
      currentUser.name ||
      currentUser.username ||
      "",

    department:
      currentUser.department ||
      "",

    bookingDate: "",

    startTime: "",
    endTime: "",

    duration_minutes: "15",

    purpose: "",
  });


  // =========================
  // STATS
  // =========================

  const stats = useMemo(() => {
    const status = (value) =>
      (value || "").toLowerCase();

    const today =
      new Date()
        .toISOString()
        .slice(0, 10);

    return {
      total: bookings.length,

      pending: bookings.filter(
        (item) =>
          status(item.status) === "pending"
      ).length,

      approved: bookings.filter(
        (item) =>
          status(item.status) === "approved"
      ).length,

      rejected: bookings.filter(
        (item) =>
          status(item.status) === "rejected"
      ).length,

      upcoming: bookings.filter(
        (item) =>
          item.booking_date >= today &&
          ["pending", "approved"].includes(
            status(item.status)
          )
      ).length,
    };
  }, [bookings]);


  // =========================
  // MENU
  // =========================

  const menuItems = useMemo(() => {
    const items = [
      {
        key: "dashboard",
        label: "Dashboard",
        icon: "D",
        to: "/",
        end: true,
      },

      {
        key: "new-booking",
        label: "New Booking",
        icon: "B",
        to: "/new-booking",
      },

      {
        key: "my-bookings",
        label: "My Bookings",
        icon: "M",
        to: "/my-bookings",
      },
    ];

    if (normalizedRole === "teacher") {
      items.push({
        key: "create-student",
        label: "Create Student",
        icon: "S",
        to: "/create-student",
      });
    }

    items.push({
      key: "incharges",
      label: "Incharges",
      icon: "I",
    });

    return items;
  }, [normalizedRole]);


  // =========================
  // LOAD BOOKINGS
  // =========================

  const loadBookings = useCallback(async () => {
    setLoading(true);

    try {
      const [bookingResponse] =
        await Promise.all([
          api.get(
            "/client/bookings",
            { cache: false }
          ),

          fetchInitialData?.(),
        ]);

      setBookings(
        bookingResponse.data || []
      );

      setMessage("");

    } catch (error) {

      setMessage(
        formatErrorMessage(
          error.response?.data?.detail,
          "Failed to load dashboard"
        )
      );

    } finally {
      setLoading(false);
    }
  }, [fetchInitialData]);


  useEffect(() => {
    loadBookings();
  }, [loadBookings]);


  // =========================
  // ENSURE STUDENT BLOCK
  // =========================

  useEffect(() => {

    if (
      isStudent &&
      currentUser.block_id
    ) {

      setFormData((prev) => {

        const studentBlockId =
          String(currentUser.block_id);

        if (
          prev.blockId === studentBlockId
        ) {
          return prev;
        }

        return {
          ...prev,

          resourceScope: "block",

          blockId:
            studentBlockId,

          resourceId: "",
        };
      });
    }

  }, [
    isStudent,
    currentUser.block_id,
  ]);


  // =========================
  // FORM UPDATE
  // =========================

  const updateForm = (event) => {

    const {
      name,
      value,
    } = event.target;

    if (
      name === "dismissAvailability"
    ) {
      setAvailabilityMsg(null);
      return;
    }

    if (
      name === "dismissSuccess"
    ) {
      setSuccessBooking(null);
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };


  // =========================
  // VALIDATE BOOKING
  // =========================

  const validateBookingForm = () => {

    const now = new Date();

    const today =
      now
        .toISOString()
        .slice(0, 10);

    const currentTime =
      now
        .toTimeString()
        .slice(0, 5);


    // Block
    if (
      formData.resourceScope === "block" &&
      !formData.blockId
    ) {
      return "Please select a block.";
    }


    // Resource
    if (!formData.resourceId) {
      return "Please select a resource.";
    }


    // Date
    if (!formData.bookingDate) {
      return "Please select a date.";
    }

    if (
      formData.bookingDate < today
    ) {
      return "Past dates cannot be booked.";
    }


    // =========================
    // STUDENT VALIDATION
    // =========================

    if (isStudent) {

      if (!formData.startTime) {
        return "Start time is required for students.";
      }

      if (
        formData.bookingDate === today &&
        formData.startTime <= currentTime
      ) {
        return "Past times cannot be selected today.";
      }

      const allowedDurations = [
        "15",
        "30",
        "45",
        "60",
      ];

      if (
        !allowedDurations.includes(
          String(
            formData.duration_minutes
          )
        )
      ) {
        return (
          "Please select a valid booking duration."
        );
      }

    } else {

      // =========================
      // TEACHER VALIDATION
      // =========================

      if (
        !formData.startTime ||
        !formData.endTime
      ) {
        return (
          "Start and end time are required."
        );
      }

      if (
        formData.bookingDate === today &&
        formData.startTime <= currentTime
      ) {
        return (
          "Past times cannot be selected today."
        );
      }

      if (
        formData.endTime <=
        formData.startTime
      ) {
        return (
          "End time must be greater than start time."
        );
      }
    }


    // Purpose
    if (
      !formData.purpose.trim()
    ) {
      return "Purpose is required.";
    }


    return "";
  };


  // =========================
  // CREATE PAYLOAD
  // =========================

  const payload = () => {

    const basePayload = {

      block_id:
        formData.resourceScope === "block"
          ? Number(formData.blockId)
          : null,

      resource_id:
        Number(formData.resourceId),

      name:
        formData.name.trim(),

      department:
        formData.department.trim(),

      booking_date:
        formData.bookingDate,

      purpose:
        formData.purpose.trim(),
    };


    // =========================
    // STUDENT PAYLOAD
    // =========================

    if (isStudent) {

      return {
        ...basePayload,

        // IMPORTANT:
        // Student now sends start time
        start_time:
          formData.startTime,

        duration_minutes:
          Number(
            formData.duration_minutes
          ),
      };
    }


    // =========================
    // TEACHER PAYLOAD
    // =========================

    return {
      ...basePayload,

      start_time:
        formData.startTime,

      end_time:
        formData.endTime,
    };
  };


  // =========================
  // CHECK AVAILABILITY
  // =========================

  const checkAvailability =
    async () => {

      const error =
        validateBookingForm();

      if (error) {

        setAvailabilityMsg({
          type: "error",
          message: error,
        });

        return;
      }

      try {

        const response =
          await api.post(
            "/client/availability",
            payload()
          );

        setAvailabilityMsg({

          type:
            response.data.available
              ? "success"
              : "error",

          message:
            response.data.available
              ? "Resource is available."
              : response.data.message,

          conflict:
            response.data.conflict,

        });

      } catch (error) {

        const detail =
          error.response?.data?.detail;

        setAvailabilityMsg({

          type: "error",

          message:
            typeof detail === "object"
              ? detail.message
              : formatErrorMessage(
                  detail,
                  "Availability check failed"
                ),

          conflict:
            detail?.conflict,

        });
      }
    };


  // =========================
  // CREATE BOOKING
  // =========================

  const createBooking =
    async (event) => {

      event.preventDefault();

      const error =
        validateBookingForm();

      if (error) {

        setAvailabilityMsg({
          type: "error",
          message: error,
        });

        return;
      }

      setBookingLoading(true);

      try {

        const response =
          await api.post(
            "/client/bookings",
            payload()
          );

        const created =
          response.data.booking;

        setSuccessBooking(created);

        // Reset form
        setFormData((prev) => ({

          ...prev,

          resourceId: "",

          bookingDate: "",

          startTime: "",

          endTime: "",

          duration_minutes:
            "15",

          purpose: "",
        }));

        await loadBookings();

      } catch (error) {

        const detail =
          error.response?.data?.detail;

        setAvailabilityMsg({

          type: "error",

          message:
            typeof detail === "object"
              ? detail.message
              : formatErrorMessage(
                  detail,
                  "Booking request failed"
                ),

          conflict:
            detail?.conflict,
        });

      } finally {

        setBookingLoading(false);
      }
    };


  // =========================
  // CREATE STUDENT
  // =========================

  const createStudent = async (payloadData) => {

    setStudentLoading(true);
    setMessage("");

    try {

      await api.post(
        "/client/students",
        {
          ...payloadData,
          role: "student",
        }
      );

      setMessage(
        "Student account created successfully."
      );

    } catch (error) {

      if (
        error.response?.status === 409
      ) {

        setMessage(
          "This email is already registered. Please use a different email."
        );

        return;
      }

      setMessage(
        formatErrorMessage(
          error.response?.data?.detail,
          "Could not create student"
        )
      );

    } finally {

      setStudentLoading(false);
    }
  };


  // =========================
  // CANCEL BOOKING
  // =========================

  const cancelBooking =
    async (reason) => {

      try {

        await api.post(
          `/client/bookings/${cancelBookingId}/cancel`,
          { reason }
        );

        setCancelBookingId(null);

        await loadBookings();

      } catch (error) {

        setMessage(
          formatErrorMessage(
            error.response?.data?.detail,
            "Cancel failed"
          )
        );
      }
    };


  // =========================
  // LOGOUT
  // =========================

  const logout = () => {

    localStorage.clear();

    navigate("/login");
  };


  // =========================
  // RENDER CONTENT
  // =========================

  const renderContent = () => {

    if (loading) {

      return (
        <div className="skeleton-grid">
          <div />
          <div />
          <div />
        </div>
      );
    }


    // NEW BOOKING
    if (view === "new-booking") {

      return (

        <BookingForm

          formData={formData}

          onChange={updateForm}

          onSubmit={createBooking}

          onAvailabilityCheck={
            checkAvailability
          }

          availabilityMsg={
            availabilityMsg
          }

          successBooking={
            successBooking
          }

          loading={
            bookingLoading
          }

          currentUser={{
            ...currentUser,

            role:
              normalizedRole,
          }}

        />

      );
    }


    // MY BOOKINGS
    if (
      view === "my-bookings"
    ) {

      return (

        <BookingList

          title="My Bookings"

          description={
            "Track status, approval decisions, and rejection reasons."
          }

          bookings={bookings}

          onCancel={(id) =>
            setCancelBookingId(id)
          }

          showActions

        />

      );
    }


    // CREATE STUDENT
    if (
      view === "create-student" &&
      normalizedRole === "teacher"
    ) {

      return (

        <section className="glass-panel section-panel">

          <div className="panel-heading">

            <span className="panel-icon">
              S
            </span>

            <div>

              <h2>
                Create Student
              </h2>

              <p>
                Teachers can create student accounts only.
              </p>

            </div>

          </div>

          <AccountForm

            blocks={blocks}

            allowedRoles={[
              "student",
            ]}

            defaultRole="student"

            onSubmit={
              createStudent
            }

            loading={
              studentLoading
            }

          />

        </section>
      );
    }


    // DASHBOARD
    return (

      <>

        <section className="metric-grid">

          {Object.entries(stats).map(
            ([key, value]) => (

              <article
                key={key}
                className={
                  `metric-card glass-panel ${key}`
                }
              >

                <span>
                  {key.replace("_", " ")}
                </span>

                <strong>
                  {value}
                </strong>

              </article>

            )
          )}

        </section>


        <BookingList

          title="Recent Booking Activity"

          description="Your latest resource requests."

          bookings={
            bookings.slice(0, 6)
          }

          onCancel={(id) =>
            setCancelBookingId(id)
          }

          showActions

        />

      </>
    );
  };


  // =========================
  // MAIN RETURN
  // =========================

  return (

    <div className="dashboard-shell">

      <Sidebar

        role={
          roleLabel(
            normalizedRole
          )
        }

        items={menuItems}

        onLogout={logout}

        onSelect={(key) =>
          key === "incharges" &&
          setShowIncharges(true)
        }

      />

      <main className="dashboard-main">

        <Navbar

          title={
            `${roleLabel(
              normalizedRole
            )} Dashboard`
          }

          subtitle={
            normalizedRole === "student"
              ? "Students can book only their assigned block."
              : "Teachers can book any block and Extra Centers."
          }

          onRefresh={
            loadBookings
          }

        />

        {message ? (

          <div className="notice info">
            {message}
          </div>

        ) : null}

        {renderContent()}

      </main>

      <InchargeModal

        open={showIncharges}

        groups={incharges}

        onClose={() =>
          setShowIncharges(false)
        }

      />

      <RejectModal

        open={
          Boolean(cancelBookingId)
        }

        onClose={() =>
          setCancelBookingId(null)
        }

        onSubmit={
          cancelBooking
        }

      />

    </div>
  );
};


export default ClientDashboard;