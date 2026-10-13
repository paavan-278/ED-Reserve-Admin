import React from "react";

const InchargeModal = ({ open, groups, onClose }) => {
  if (!open) {
    return null;
  }

  const groupedIncharges = Array.isArray(groups)
    ? groups.reduce((acc, group) => {
        const blockKey = group.block_name?.replace(" Block", "") || "Other";
        acc[blockKey] = group.incharges || [];
        return acc;
      }, {})
    : groups || {};

  return (
    <div className="modal-backdrop" role="presentation" onClick={onClose}>
      <div className="modal-card modal-large" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h3>Incharges</h3>
            <p>Block-wise and resource-wise contact list.</p>
          </div>
          <button type="button" className="icon-button" onClick={onClose}>
            Close
          </button>
        </div>

        <div className="incharge-grid">
          {Object.entries(groupedIncharges).map(([block, list]) => (
            <section key={block} className="incharge-card">
              <h4>{block} Block</h4>
              <div className="incharge-list">
                {list.map((item, index) => (
                  <div key={item.id || index} className="incharge-item">
                    <div>
                      <strong>{item.name}</strong>
                      {item.resource_name ? <p>{item.resource_name}</p> : null}
                    </div>
                    <span>{item.contact || "Contact not listed"}</span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
};

export default InchargeModal;
