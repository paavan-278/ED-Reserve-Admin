import React, { memo, useEffect, useState } from "react";

const RejectModal = ({ open, loading, onClose, onSubmit }) => {
  const [reason, setReason] = useState("");

  useEffect(() => {
    if (open) {
      setReason("");
    }
  }, [open]);

  if (!open) {
    return null;
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    if (reason.trim()) {
      onSubmit(reason.trim());
    }
  };

  return (
    <div className="modal-overlay" role="presentation" onClick={onClose}>
      <form className="modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()} onSubmit={handleSubmit}>
        <h3>Reject Booking</h3>
        <p>Please provide a reason</p>

        <textarea
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Enter rejection reason..."
          rows="4"
          required
        />

        <div className="actions">
          <button type="button" className="cancel-btn" onClick={onClose} disabled={loading}>
            Cancel
          </button>
          <button type="submit" className="submit-btn" disabled={!reason.trim() || loading}>
            {loading ? "Submitting..." : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default memo(RejectModal);
