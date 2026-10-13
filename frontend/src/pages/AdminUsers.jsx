import React, { useEffect, useMemo, useState } from "react";

import AccountForm from "../components/AccountForm";
import AdminLayout from "../components/AdminLayout";
import { useAppContext } from "../context/AppContext";
import api from "../services/api";
import { formatErrorMessage } from "../utils/errorMessages";

const labelRole = (role) => (role === "admin" ? "HOD / Admin" : role === "teacher" ? "Teacher" : "Student");

const AdminUsers = () => {
  const { blocks, fetchInitialData } = useAppContext();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const blockNameById = useMemo(() => Object.fromEntries((blocks || []).map((block) => [block.id, block.name])), [blocks]);

  const load = async () => {
    const [usersResponse] = await Promise.all([
      api.get("/admin/users", { cache: false }),
      fetchInitialData?.({ force: false }),
    ]);
    setUsers(usersResponse.data || []);
  };

  useEffect(() => {
    load().catch((error) => setMessage(formatErrorMessage(error.response?.data?.detail, "Could not load users")));
  }, []);

  const createAccount = async (payload) => {
    setLoading(true);
    setMessage("");
    try {
      const response = await api.post("/admin/users", payload);
      setUsers((current) => [response.data, ...current]);
      setMessage(`${labelRole(response.data.role)} created successfully.`);
    } catch (error) {
      setMessage(formatErrorMessage(error.response?.data?.detail, "Could not create user"));
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout title="Manage Users" subtitle="Create teacher and student accounts. Public registration is disabled.">
      {message ? <div className="notice info">{message}</div> : null}
      <section className="glass-panel section-panel">
        <div className="panel-heading">
          <span className="panel-icon">+</span>
          <div>
            <h2>Create Account</h2>
            <p>Teachers can book any block. Students are assigned to one block.</p>
          </div>
        </div>
        <AccountForm blocks={blocks} allowedRoles={["teacher", "student"]} defaultRole="teacher" onSubmit={createAccount} loading={loading} />
      </section>

      <section className="glass-panel section-panel">
        <div className="panel-heading">
          <span className="panel-icon">U</span>
          <div>
            <h2>Existing Users</h2>
            <p>{users.length} accounts currently in MySQL.</p>
          </div>
        </div>
        <div className="responsive-table">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>UID</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Block</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td>{user.name || user.username}</td>
                  <td>{user.uid || user.username}</td>
                  <td>{user.email || "Not set"}</td>
                  <td><span className={`status-pill ${user.role}`}>{labelRole(user.role)}</span></td>
                  <td>{user.department || "Not set"}</td>
                  <td>{user.block_id ? `Block ${blockNameById[user.block_id] || user.block_id}` : "-"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </AdminLayout>
  );
};

export default AdminUsers;
