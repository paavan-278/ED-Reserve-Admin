import React, { memo } from "react";

const formatResourceLabel = (resource, fallbackId) => {
  if (!resource) {
    return `Resource #${fallbackId}`;
  }
  return resource.floor ? `${resource.name} - ${resource.floor}` : resource.name;
};

const formatStatus = (status) => {
  if (status === "rejected") {
    return "Rejected";
  }
  return status;
};

const BookingList = ({
  title,
  description,
  bookings,
  onCancel,
  onApprove,
  onReject,
  showActions = false,
  adminMode = false
}) => {
  return (
    <div className="panel-card">
      <div className="panel-header">
        <div>
          <h3>{title}</h3>
          <p>{description}</p>
        </div>
      </div>

      {bookings.length === 0 ? (
        <div className="empty-booking-state">No records found.</div>
      ) : (
        <div className="booking-grid">
          {bookings.map((booking) => (
            <article key={booking.id} className={`booking-item booking-item-${booking.status}`}>
              <div className="booking-item-top">
                <div>
                  <p className="booking-label">Resource</p>
                  <h4>{formatResourceLabel(booking.resource, booking.resource_id)}</h4>
                </div>
                <span className={`status-pill ${booking.status}`}>{formatStatus(booking.status)}</span>
              </div>

              <div className="booking-meta-grid">
                <div>
                  <p className="booking-label">Date</p>
                  <strong>{booking.booking_date}</strong>
                </div>
                <div>
                  <p className="booking-label">Time</p>
                  <strong>
                    {booking.start_time?.slice(0, 5)} - {booking.end_time?.slice(0, 5)}
                  </strong>
                </div>
                <div>
                  <p className="booking-label">Name</p>
                  <strong>{booking.name || booking.user?.username || "You"}</strong>
                </div>
                <div>
                  <p className="booking-label">Department</p>
                  <strong>{booking.department || "Not provided"}</strong>
                </div>
                <div>
                  <p className="booking-label">Purpose</p>
                  <strong>{booking.purpose || "Not provided"}</strong>
                </div>
              </div>

              {booking.status === "rejected" ? (
                <div className="reject-box">
                  <span>Status: Rejected <span aria-hidden="true">❌</span></span>
                  <p><strong>Reason:</strong> {booking.rejection_reason || "No reason provided"}</p>
                </div>
              ) : null}

              {booking.cancellation_reason ? (
                <div className="booking-alert booking-alert-cancelled">
                  <span>Status: Cancelled</span>
                  <p>Reason: {booking.cancellation_reason}</p>
                </div>
              ) : null}

              {showActions ? (
                <div className="action-row">
                  {adminMode ? (
                    <>
                      <button
                        type="button"
                        className="mini-button approve"
                        onClick={() => onApprove(booking.id)}
                      >
                        Approve
                      </button>
                      <button
                        type="button"
                        className="mini-button reject"
                        onClick={() => onReject(booking)}
                      >
                        Reject
                      </button>
                    </>
                  ) : booking.status === "pending" ? (
                    <button
                      type="button"
                      className="mini-button reject"
                      onClick={() => onCancel(booking.id)}
                    >
                      Cancel
                    </button>
                  ) : null}
                </div>
              ) : null}
            </article>
          ))}
        </div>
      )}
    </div>
  );
};

export default memo(BookingList);
