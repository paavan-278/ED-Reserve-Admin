import React, { memo, useEffect, useMemo, useState } from "react";

import api from "../services/api";
import { useAppContext } from "../context/AppContext";

const formatResourceLabel = (resource) => {
  if (!resource) return "";

  return resource.floor
    ? `${resource.name} - ${resource.floor}`
    : resource.name;
};

const STUDENT_DURATION_OPTIONS = [
  { value: "15", label: "15 Minutes" },
  { value: "30", label: "30 Minutes" },
  { value: "45", label: "45 Minutes" },
  { value: "60", label: "1 Hour" },
];

const readLocalUser = () => {
  try {
    return JSON.parse(localStorage.getItem("user") || "{}");
  } catch {
    return {};
  }
};

const getStudentBlockId = (user = {}) => {
  const value =
    user.block_id ??
    user.blockId ??
    user.assigned_block_id ??
    user.assignedBlockId ??
    user.block?.id ??
    user.assigned_block?.id ??
    user.assignedBlock?.id ??
    "";

  if (
    value === null ||
    value === undefined ||
    value === ""
  ) {
    return "";
  }

  return String(value);
};

const BookingForm = ({
  formData = {},
  onChange = () => {},
  onSubmit = () => {},
  onAvailabilityCheck = () => {},
  availabilityMsg,
  successBooking,
  loading,
  currentUser = {},
}) => {
  const {
    blocks,
    resources: contextResources,
    fetchInitialData,
  } = useAppContext();

  const [resourceRows, setResourceRows] = useState([]);
  const [resourceLoading, setResourceLoading] = useState(false);
  const [resourceError, setResourceError] = useState("");

  const today = new Date().toISOString().slice(0, 10);

  const actualUser = useMemo(() => {
    const localUser = readLocalUser();

    return {
      ...localUser,
      ...currentUser,

      block_id:
        currentUser.block_id ??
        currentUser.blockId ??
        currentUser.assigned_block_id ??
        currentUser.assignedBlockId ??
        currentUser.block?.id ??
        currentUser.assigned_block?.id ??
        currentUser.assignedBlock?.id ??
        localUser.block_id ??
        localUser.blockId ??
        localUser.assigned_block_id ??
        localUser.assignedBlockId ??
        localUser.block?.id ??
        localUser.assigned_block?.id ??
        localUser.assignedBlock?.id ??
        null,
    };
  }, [currentUser]);

  const role = String(
    actualUser.role || ""
  ).toLowerCase();

  const isStudent =
    role === "student" ||
    role === "client";

  const safeFormData = {
    resourceScope: "block",

    blockId: "",
    resourceId: "",

    name: "",
    department: "",

    bookingDate: "",

    startTime: "",
    endTime: "",

    duration_minutes: "15",

    purpose: "",

    ...formData,
  };

  const {
    blocks: blockList = [],
  } = {
    blocks: Array.isArray(blocks) ? blocks : [],
  };

  const blockOptions = useMemo(
    () => blockList,
    [blockList]
  );

  const studentBlockId = useMemo(() => {
    return getStudentBlockId(actualUser);
  }, [actualUser]);

  useEffect(() => {
    fetchInitialData?.();
  }, [fetchInitialData]);

  useEffect(() => {
    if (!isStudent) {
      return;
    }

    if (
      studentBlockId &&
      String(safeFormData.blockId) !==
        String(studentBlockId)
    ) {
      onChange({
        target: {
          name: "blockId",
          value: studentBlockId,
        },
      });
    }

    if (
      safeFormData.resourceScope !== "block"
    ) {
      onChange({
        target: {
          name: "resourceScope",
          value: "block",
        },
      });
    }
  }, [
    isStudent,
    studentBlockId,
    safeFormData.blockId,
    safeFormData.resourceScope,
    onChange,
  ]);

  const activeBlockId = useMemo(() => {
    if (isStudent) {
      return (
        studentBlockId ||
        safeFormData.blockId ||
        ""
      );
    }

    return safeFormData.blockId || "";
  }, [
    isStudent,
    studentBlockId,
    safeFormData.blockId,
  ]);

  const loadResources = async () => {
    setResourceError("");

    if (
      safeFormData.resourceScope === "block" &&
      !activeBlockId
    ) {
      setResourceRows([]);
      return;
    }

    setResourceLoading(true);

    try {
      if (
        safeFormData.resourceScope === "block"
      ) {
        const cachedResources =
          contextResources?.[
            String(activeBlockId)
          ] ||
          contextResources?.[activeBlockId] ||
          [];

        if (
          Array.isArray(cachedResources) &&
          cachedResources.length > 0
        ) {
          setResourceRows(cachedResources);
          setResourceLoading(false);
          return;
        }
      }

      let url = "";

      if (
        safeFormData.resourceScope === "extra"
      ) {
        url = "/extra-centers";
      } else {
        url =
          `/blocks/${activeBlockId}/resources`;
      }

      const response = await api.get(
        url,
        {
          cache: false,
        }
      );

      let loadedResources = [];

      if (
        Array.isArray(response.data)
      ) {
        loadedResources =
          response.data;
      } else if (
        Array.isArray(
          response.data?.resources
        )
      ) {
        loadedResources =
          response.data.resources;
      } else if (
        Array.isArray(
          response.data?.data
        )
      ) {
        loadedResources =
          response.data.data;
      }

      setResourceRows(
        loadedResources
      );
    } catch (error) {
      console.error(
        "Could not load resources:",
        error.response?.data || error
      );

      if (
        safeFormData.resourceScope === "block"
      ) {
        const cachedResources =
          contextResources?.[
            String(activeBlockId)
          ] ||
          contextResources?.[
            activeBlockId
          ] ||
          [];

        if (
          Array.isArray(cachedResources) &&
          cachedResources.length > 0
        ) {
          setResourceRows(
            cachedResources
          );

          setResourceError("");

          return;
        }
      }

      setResourceRows([]);

      setResourceError(
        error.response?.data?.detail ||
        "Could not load resources for this block."
      );
    } finally {
      setResourceLoading(false);
    }
  };

  useEffect(() => {
    loadResources();
  }, [
    activeBlockId,
    safeFormData.resourceScope,
    isStudent,
    contextResources,
  ]);

  const setField = (
    name,
    value
  ) => {
    onChange({
      target: {
        name,
        value,
      },
    });
  };

  const handleScopeChange = (
    value
  ) => {
    if (
      isStudent &&
      value === "extra"
    ) {
      return;
    }

    setField(
      "resourceScope",
      value
    );

    setField(
      "blockId",
      ""
    );

    setField(
      "resourceId",
      ""
    );

    setResourceRows([]);
  };

  const handleBlockChange = (
    event
  ) => {
    setField(
      "blockId",
      event.target.value
    );

    setField(
      "resourceId",
      ""
    );

    setResourceRows([]);
  };

  const studentBlockName = useMemo(() => {
    if (!studentBlockId) {
      return "No assigned block";
    }

    const foundBlock =
      blockOptions.find(
        (block) =>
          String(block.id) ===
          String(studentBlockId)
      );

    if (foundBlock) {
      return `Block ${foundBlock.name}`;
    }

    return `Assigned Block #${studentBlockId}`;
  }, [
    studentBlockId,
    blockOptions,
  ]);

  return (
    <section className="glass-panel section-panel booking-surface">

      <div className="panel-heading">

        <span className="panel-icon">
          B
        </span>

        <div>

          <h2>
            New Booking
          </h2>

          <p>
            {isStudent
              ? "Choose a resource from your assigned block, select a start time and booking duration."
              : "Choose a block or extra center, select a resource, check availability, then submit for approval."}
          </p>

        </div>

      </div>

      {!isStudent ? (
        <div className="segmented">

          <button
            type="button"
            className={
              safeFormData.resourceScope === "block"
                ? "active"
                : ""
            }
            onClick={() =>
              handleScopeChange("block")
            }
          >
            Block
          </button>

          <button
            type="button"
            className={
              safeFormData.resourceScope === "extra"
                ? "active"
                : ""
            }
            onClick={() =>
              handleScopeChange("extra")
            }
          >
            Extra Centers
          </button>

        </div>
      ) : null}

      <form
        className="modern-form grid-form"
        onSubmit={onSubmit}
      >

        <label>

          <span>
            Your Name
          </span>

          <input
            name="name"
            value={safeFormData.name}
            onChange={onChange}
            required
            readOnly
          />

        </label>

        <label>

          <span>
            Department
          </span>

          <select
            name="department"
            value={safeFormData.department}
            onChange={onChange}
            required
          >

            <option value="">
              Select Department
            </option>

            {Array.from(
              { length: 9 },
              (_, index) => {

                const letter =
                  String.fromCharCode(
                    65 + index
                  );

                return (
                  <option
                    key={letter}
                    value={`Department ${letter}`}
                  >
                    Department {letter}
                  </option>
                );
              }
            )}

          </select>

        </label>

        {isStudent ? (

          <div className="readonly-tile">

            <span>
              Your Assigned Block
            </span>

            <strong>
              {studentBlockName}
            </strong>

          </div>

        ) : safeFormData.resourceScope === "block" ? (

          <label>

            <span>
              Block
            </span>

            <select
              value={safeFormData.blockId}
              onChange={handleBlockChange}
              required
            >

              <option value="">
                Select block
              </option>

              {blockOptions.map(
                (block) => (
                  <option
                    key={block.id}
                    value={block.id}
                  >
                    Block {block.name}
                  </option>
                )
              )}

            </select>

          </label>

        ) : (

          <div className="readonly-tile">

            <span>
              Extra Center
            </span>

            <strong>
              Extra Centers
            </strong>

          </div>
        )}

        <label>

          <span>
            Resource
          </span>

          <select
            name="resourceId"
            value={safeFormData.resourceId}
            onChange={onChange}
            required
            disabled={
              resourceLoading ||
              (
                safeFormData.resourceScope ===
                  "block" &&
                !activeBlockId
              )
            }
          >

            <option value="">

              {resourceLoading
                ? "Loading resources..."
                : resourceRows.length > 0
                  ? "Select resource"
                  : !activeBlockId
                    ? isStudent
                      ? "Assigned block not found"
                      : "Select block first"
                    : "No resources found"}

            </option>

            {resourceRows.map(
              (resource) => (
                <option
                  key={resource.id}
                  value={resource.id}
                >
                  {formatResourceLabel(
                    resource
                  )}
                </option>
              )
            )}

          </select>

        </label>

        {resourceError ? (

          <div className="notice danger full-width">

            {typeof resourceError ===
            "string"
              ? resourceError
              : "Could not load resources."}

            <button
              type="button"
              className="inline-button"
              onClick={loadResources}
            >
              Retry
            </button>

          </div>

        ) : null}

        <label>

          <span>
            Date
          </span>

          <input
            type="date"
            name="bookingDate"
            value={safeFormData.bookingDate}
            onChange={onChange}
            min={today}
            required
          />

        </label>

        {/* STUDENT START TIME */}

        {isStudent ? (

          <label>

            <span>
              Start Time
            </span>

            <input
              type="time"
              name="startTime"
              value={safeFormData.startTime}
              onChange={onChange}
              required
            />

          </label>

        ) : null}

        {/* STUDENT DURATION */}

        {isStudent ? (

          <label>

            <span>
              Booking Duration
            </span>

            <select
              name="duration_minutes"
              value={
                safeFormData.duration_minutes ||
                ""
              }
              onChange={onChange}
              required
            >

              <option value="">
                Select duration
              </option>

              {STUDENT_DURATION_OPTIONS.map(
                (option) => (
                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>
                )
              )}

            </select>

          </label>

        ) : (

          <>
            <label>

              <span>
                Start Time
              </span>

              <input
                type="time"
                name="startTime"
                value={safeFormData.startTime}
                onChange={onChange}
                required
              />

            </label>

            <label>

              <span>
                End Time
              </span>

              <input
                type="time"
                name="endTime"
                value={safeFormData.endTime}
                onChange={onChange}
                required
              />

            </label>
          </>
        )}

        <label className="full-width">

          <span>
            Purpose
          </span>

          <textarea
            name="purpose"
            value={safeFormData.purpose}
            onChange={onChange}
            required
          />

        </label>

        <div className="form-actions full-width">

          <button
            type="button"
            className="secondary-action"
            onClick={onAvailabilityCheck}
            disabled={
              loading ||
              resourceLoading ||
              !safeFormData.resourceId
            }
          >
            Check Availability
          </button>

          <button
            type="submit"
            className="primary-action"
            disabled={
              loading ||
              resourceLoading ||
              !safeFormData.resourceId
            }
          >
            {loading
              ? "Submitting..."
              : "Submit Booking Request"}
          </button>

        </div>

      </form>

      {availabilityMsg ? (

        <div
          className={`modal-backdrop ${
            availabilityMsg.type === "success"
              ? "success-backdrop"
              : "danger-backdrop"
          }`}
          role="presentation"
        >

          <div className="modal-card glass-panel availability-modal">

            <h3>
              {availabilityMsg.type === "success"
                ? "Available"
                : "Unavailable"}
            </h3>

            <p>
              {availabilityMsg.message}
            </p>

            {availabilityMsg.conflict ? (

              <div className="conflict-box">

                <strong>
                  Conflict
                </strong>

                <span>
                  {availabilityMsg.conflict.date}{" "}
                  {String(
                    availabilityMsg.conflict.start_time
                  ).slice(0, 5)}
                  {" - "}
                  {String(
                    availabilityMsg.conflict.end_time
                  ).slice(0, 5)}
                </span>

              </div>

            ) : null}

            <button
              type="button"
              className="primary-action"
              onClick={() =>
                onChange({
                  target: {
                    name: "dismissAvailability",
                    value: "",
                  },
                })
              }
            >
              Close
            </button>

          </div>

        </div>

      ) : null}

      {successBooking ? (

        <div
          className="modal-backdrop success-backdrop"
          role="presentation"
        >

          <div className="modal-card glass-panel availability-modal">

            <h3>
              Booking Request Submitted Successfully
            </h3>

            <p>
              {successBooking.resource?.name ||
                `Resource #${successBooking.resource_id}`}
            </p>

            <div className="conflict-box success">

              <span>
                {successBooking.booking_date}
              </span>

              <span>
                {String(
                  successBooking.start_time
                ).slice(0, 5)}
                {" - "}
                {String(
                  successBooking.end_time
                ).slice(0, 5)}
              </span>

              <strong>
                Status: Pending
              </strong>

            </div>

            <button
              type="button"
              className="primary-action"
              onClick={() =>
                onChange({
                  target: {
                    name: "dismissSuccess",
                    value: "",
                  },
                })
              }
            >
              Done
            </button>

          </div>

        </div>

      ) : null}

    </section>
  );
};

export default memo(BookingForm);