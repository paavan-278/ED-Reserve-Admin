import React, { useEffect, useMemo, useState } from "react";

import AdminBookingTable from "../components/AdminBookingTable";
import AdminLayout from "../components/AdminLayout";
import { useAppContext } from "../context/AppContext";
import api from "../services/api";
import { formatErrorMessage } from "../utils/errorMessages";

const todayISO = () => new Date().toISOString().slice(0, 10);
const addDays = (days) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const rangeFor = (value) => {
  const now = new Date();
  if (value === "today") return { date_from: todayISO(), date_to: todayISO() };
  if (value === "tomorrow") return { date_from: addDays(1), date_to: addDays(1) };
  if (value === "week") return { date_from: todayISO(), date_to: addDays(7) };
  if (value === "month") {
    const end = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { date_from: todayISO(), date_to: end.toISOString().slice(0, 10) };
  }
  return {};
};

const AdminHistory = () => {
  const { blocks, resources, fetchInitialData } = useAppContext();
  const [history, setHistory] = useState([]);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({
    role: "all",
    status: "all",
    block_id: "",
    resource_id: "",
    department: "",
    dateMode: "all",
    date_from: "",
    date_to: "",
    search: "",
    sort: "newest",
  });

  const allResources = useMemo(() => Object.values(resources || {}).flat(), [resources]);
  const resourceOptions = useMemo(() => {
    if (!filters.block_id) return allResources;
    return allResources.filter((resource) => String(resource.block_id) === String(filters.block_id));
  }, [allResources, filters.block_id]);

  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      await fetchInitialData?.();
      const dateParams = filters.dateMode === "custom"
        ? { date_from: filters.date_from || undefined, date_to: filters.date_to || undefined }
        : rangeFor(filters.dateMode);
      const params = {
        role: filters.role,
        status: filters.status,
        block_id: filters.block_id || undefined,
        resource_id: filters.resource_id || undefined,
        department: filters.department || undefined,
        search: filters.search || undefined,
        sort: filters.sort,
        ...dateParams,
      };
      const response = await api.get("/admin/history", { params, cache: false });
      setHistory(response.data || []);
    } catch (error) {
      setMessage(formatErrorMessage(error.response?.data?.detail, "Could not load history"));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const update = (event) => {
    const { name, value } = event.target;
    setFilters((prev) => ({ ...prev, [name]: value, ...(name === "block_id" ? { resource_id: "" } : {}) }));
  };

  return (
    <AdminLayout title="Booking History" subtitle="Complete history with role, status, date, block, resource, department, and search filters." onRefresh={load} refreshing={loading}>
      {message ? <div className="notice danger">{message}</div> : null}
      <section className="glass-panel section-panel">
        <div className="panel-heading">
          <span className="panel-icon">F</span>
          <div>
            <h2>Smart Filters</h2>
            <p>Search by name, UID, or resource and sort the resulting history.</p>
          </div>
        </div>
        <div className="filter-grid">
          <label><span>Role</span><select name="role" value={filters.role} onChange={update}><option value="all">All</option><option value="teacher">Teacher</option><option value="student">Student</option></select></label>
          <label><span>Status</span><select name="status" value={filters.status} onChange={update}><option value="all">All</option><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label>
          <label><span>Block</span><select name="block_id" value={filters.block_id} onChange={update}><option value="">All</option>{blocks.map((block) => <option key={block.id} value={block.id}>Block {block.name}</option>)}</select></label>
          <label><span>Resource</span><select name="resource_id" value={filters.resource_id} onChange={update}><option value="">All</option>{resourceOptions.map((resource) => <option key={resource.id} value={resource.id}>{resource.name}</option>)}</select></label>
          <label><span>Department</span><input name="department" value={filters.department} onChange={update} /></label>
          <label><span>Date</span><select name="dateMode" value={filters.dateMode} onChange={update}><option value="all">All</option><option value="today">Today</option><option value="tomorrow">Tomorrow</option><option value="week">This Week</option><option value="month">This Month</option><option value="custom">Custom Range</option></select></label>
          {filters.dateMode === "custom" ? <label><span>From</span><input type="date" name="date_from" value={filters.date_from} onChange={update} /></label> : null}
          {filters.dateMode === "custom" ? <label><span>To</span><input type="date" name="date_to" value={filters.date_to} onChange={update} /></label> : null}
          <label><span>Search</span><input name="search" value={filters.search} onChange={update} placeholder="Name, UID, resource" /></label>
          <label><span>Sorting</span><select name="sort" value={filters.sort} onChange={update}><option value="newest">Newest</option><option value="oldest">Oldest</option><option value="upcoming">Upcoming</option></select></label>
        </div>
        <div className="form-actions">
          <button className="primary-action" type="button" onClick={load} disabled={loading}>{loading ? "Filtering..." : "Apply Filters"}</button>
        </div>
      </section>
      <section className="glass-panel section-panel">
        <AdminBookingTable bookings={history} detailed />
      </section>
    </AdminLayout>
  );
};

export default AdminHistory;
