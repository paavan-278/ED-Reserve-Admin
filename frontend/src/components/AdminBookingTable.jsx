import React from "react";

const formatResource = (booking = {}) => {
  const resource = booking?.resource;

  if (!resource) {
    return booking?.resource_id
      ? `Resource #${booking.resource_id}`
      : "-";
  }

  if (resource.floor) {
    return `${resource.name || "Resource"} - ${resource.floor}`;
  }

  return resource.name || "-";
};

const formatBlock = (booking = {}) => {
  const resource = booking?.resource;

  if (resource?.is_extra_center) {
    return "Extra Center";
  }

  if (resource?.block?.name) {
    return `Block ${resource.block.name}`;
  }

  if (booking?.block?.name) {
    return `Block ${booking.block.name}`;
  }

  if (booking?.block_id) {
    return `Block #${booking.block_id}`;
  }

  return "-";
};

const formatRole = (role) => {
  if (role === "admin") return "HOD / Admin";
  if (role === "teacher") return "Teacher";
  if (role === "student") return "Student";
  return role || "-";
};

const formatTime = (time) => {
  if (!time) return "-";
  return String(time).slice(0, 5);
};

const formatDateTime = (value) => {
  if (!value) return "-";

  try {
    return new Date(value).toLocaleString();
  } catch {
    return "-";
  }
};

const AdminBookingTable = ({
  bookings,
  showActions = false,
  onApprove = () => {},
  onReject = () => {},
  detailed = false,
}) => {
  // IMPORTANT: NULL / OBJECT / UNDEFINED SAB HANDLE HOGA
  const safeBookings = Array.isArray(bookings)
    ? bookings
    : Array.isArray(bookings?.items)
    ? bookings.items
    : Array.isArray(bookings?.data)
    ? bookings.data
    : [];

  const columnCount =
    8 + // Requester, Role, Department, Block, Resource, Date, Time, Status
    (detailed ? 5 : 0) + // UID, Purpose, Created, Decision, Rejection
    (showActions ? 1 : 0);

  return (
    <div className="responsive-table">
      <table>
        <thead>
          <tr>
            <th>Requester</th>
            <th>Role</th>

            {detailed && <th>UID</th>}

            <th>Department</th>
            <th>Block</th>
            <th>Resource</th>
            <th>Date</th>
            <th>Time</th>

            {detailed && <th>Purpose</th>}

            <th>Status</th>

            {detailed && <th>Created At</th>}
            {detailed && <th>Decision Time</th>}
            {detailed && <th>Rejection Reason</th>}

            {showActions && <th>Actions</th>}
          </tr>
        </thead>

        <tbody>
          {safeBookings.length === 0 ? (
            <tr>
              <td
                colSpan={columnCount}
                className="empty-table-cell"
              >
                No booking records found.
              </td>
            </tr>
          ) : (
            safeBookings.map((booking, index) => {
              const safeBooking = booking || {};

              const status =
                safeBooking.status || "pending";

              return (
                <tr
                  key={
                    safeBooking.id ||
                    safeBooking.booking_id ||
                    `booking-${index}`
                  }
                >
                  <td>
                    {safeBooking.name ||
                      safeBooking.user?.name ||
                      safeBooking.user?.username ||
                      "User"}
                  </td>

                  <td>
                    {formatRole(
                      safeBooking.user?.role ||
                        safeBooking.role
                    )}
                  </td>

                  {detailed && (
                    <td>
                      {safeBooking.user?.uid ||
                        safeBooking.uid ||
                        safeBooking.user?.username ||
                        "-"}
                    </td>
                  )}

                  <td>
                    {safeBooking.department ||
                      safeBooking.user?.department ||
                      "-"}
                  </td>

                  <td>
                    {formatBlock(safeBooking)}
                  </td>

                  <td>
                    {formatResource(safeBooking)}
                  </td>

                  <td>
                    {safeBooking.booking_date ||
                      safeBooking.date ||
                      "-"}
                  </td>

                  <td>
                    {formatTime(
                      safeBooking.start_time
                    )}
                    {" - "}
                    {formatTime(
                      safeBooking.end_time
                    )}
                  </td>

                  {detailed && (
                    <td>
                      {safeBooking.purpose || "-"}
                    </td>
                  )}

                  <td>
                    <span
                      className={`status-pill ${String(
                        status
                      ).toLowerCase()}`}
                    >
                      {status}
                    </span>
                  </td>

                  {detailed && (
                    <td>
                      {formatDateTime(
                        safeBooking.created_at
                      )}
                    </td>
                  )}

                  {detailed && (
                    <td>
                      {formatDateTime(
                        safeBooking.decision_at
                      )}
                    </td>
                  )}

                  {detailed && (
                    <td>
                      {safeBooking.rejection_reason ||
                        "-"}
                    </td>
                  )}

                  {showActions && (
                    <td>
                      <div className="table-actions">
                        <button
                          className="approve-action"
                          type="button"
                          onClick={() =>
                            onApprove(
                              safeBooking.id ||
                                safeBooking.booking_id
                            )
                          }
                        >
                          Approve
                        </button>

                        <button
                          className="reject-action"
                          type="button"
                          onClick={() =>
                            onReject(safeBooking)
                          }
                        >
                          Reject
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
};

export default AdminBookingTable;