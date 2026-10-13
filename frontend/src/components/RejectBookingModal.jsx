import React from "react";
import { AnimatePresence, motion } from "framer-motion";

const RejectBookingModal = ({
  booking,
  reason,
  loading,
  onReasonChange,
  onClose,
  onSubmit
}) => {
  const quickReasons = [
    "Resource already reserved",
    "Maintenance",
    "Event conflict",
    "Incorrect details",
    "Unauthorized request",
    "Timing conflict",
    "Other",
  ];
  const resourceLabel = booking?.resource?.floor
    ? `${booking.resource.name} - ${booking.resource.floor}`
    : booking?.resource?.name;

  const handleSubmit = (event) => {
    event.preventDefault();
    onSubmit();
  };

  return (
    <AnimatePresence>
      {booking ? (
        <motion.div
          className="modal-backdrop overlay reject-modal-backdrop"
          role="presentation"
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.form
            className="modal-card modal reject-modal-card"
            role="dialog"
            aria-modal="true"
            onClick={(event) => event.stopPropagation()}
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 18, scale: 0.96 }}
            transition={{ duration: 0.22 }}
          >
            <div className="modal-header">
              <div>
                <h3>Reject Booking</h3>
                <p>{resourceLabel || `Booking #${booking.id}`}</p>
              </div>
              <button type="button" className="icon-button" onClick={onClose}>
                Close
              </button>
            </div>

            <label className="modal-field">
              <span>Reason</span>
              <div className="quick-reasons">
                {quickReasons.map((item) => (
                  <button key={item} type="button" className={reason === item ? "active" : ""} onClick={() => onReasonChange(item)}>
                    {item}
                  </button>
                ))}
              </div>
              <textarea
                value={reason}
                onChange={(event) => onReasonChange(event.target.value)}
                rows="5"
                placeholder="Enter rejection reason..."
                required
              />
            </label>

            <div className="form-actions">
              <motion.button type="button" className="secondary-button" onClick={onClose} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}>
                Cancel
              </motion.button>
              <motion.button
                type="submit"
                className="mini-button reject"
                disabled={!reason.trim() || loading}
                whileHover={{ scale: 1.03 }}
                whileTap={{ scale: 0.97 }}
              >
                {loading ? "Saving..." : "Submit"}
              </motion.button>
            </div>
          </motion.form>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
};

export default RejectBookingModal;
