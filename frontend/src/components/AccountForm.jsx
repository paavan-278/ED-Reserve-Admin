import React, { useMemo, useState } from "react";

const DEPARTMENTS = [
  "Department A",
  "Department B",
  "Department C",
  "Department D",
  "Department E",
  "Department F",
  "Department G",
  "Department H",
  "Department I",
];

const emptyForm = {
  name: "",
  uid: "",
  email: "",
  department: "",
  role: "student",
  block_id: "",
  password: "",
  confirm_password: "",
};

const AccountForm = ({
  blocks = [],
  allowedRoles = ["student"],
  defaultRole = "student",
  onSubmit,
  loading,
}) => {
  const [form, setForm] = useState({
    ...emptyForm,
    role: defaultRole,
  });

  const roleOptions = useMemo(
    () => allowedRoles.filter(Boolean),
    [allowedRoles]
  );

  const isStudent = form.role === "student";

  const update = (event) => {
    const { name, value } = event.target;

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const submit = async (event) => {
    event.preventDefault();

    if (form.password !== form.confirm_password) {
      alert("Password and Confirm Password do not match.");
      return;
    }

    await onSubmit({
      ...form,
      block_id: isStudent ? Number(form.block_id) : null,
    });

    setForm({
      ...emptyForm,
      role: defaultRole,
    });
  };

  return (
    <form className="modern-form grid-form" onSubmit={submit}>

      {roleOptions.length > 1 ? (
        <label>
          <span>Role</span>

          <select
            name="role"
            value={form.role}
            onChange={update}
          >
            {roleOptions.map((role) => (
              <option key={role} value={role}>
                {role === "teacher"
                  ? "Teacher"
                  : "Student"}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label>
        <span>
          {isStudent
            ? "Student Name"
            : "Teacher Name"}
        </span>

        <input
          name="name"
          value={form.name}
          onChange={update}
          required
        />
      </label>

      <label>
        <span>
          {isStudent
            ? "Student UID"
            : "Teacher UID"}
        </span>

        <input
          name="uid"
          value={form.uid}
          onChange={update}
          required
        />
      </label>

      <label>
        <span>Email</span>

        <input
          name="email"
          type="email"
          value={form.email}
          onChange={update}
          required
        />
      </label>

      {/* DEPARTMENT DROPDOWN */}
      <label>
        <span>Department</span>

        <select
          name="department"
          value={form.department}
          onChange={update}
          required
        >
          <option value="">
            Select Department
          </option>

          {DEPARTMENTS.map((department) => (
            <option
              key={department}
              value={department}
            >
              {department}
            </option>
          ))}
        </select>
      </label>

      {/* BLOCK ONLY FOR STUDENTS */}
      {isStudent ? (
        <label>
          <span>Assigned Block</span>

          <select
            name="block_id"
            value={form.block_id}
            onChange={update}
            required
          >
            <option value="">
              Select block
            </option>

            {blocks.map((block) => (
              <option
                key={block.id}
                value={block.id}
              >
                Block {block.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label>
        <span>Password</span>

        <input
          name="password"
          type="password"
          value={form.password}
          onChange={update}
          minLength={6}
          required
        />
      </label>

      <label>
        <span>Confirm Password</span>

        <input
          name="confirm_password"
          type="password"
          value={form.confirm_password}
          onChange={update}
          minLength={6}
          required
        />
      </label>

      <div className="form-actions full-width">
        <button
          type="submit"
          className="primary-action"
          disabled={loading}
        >
          {loading
            ? "Saving..."
            : `Create ${
                isStudent
                  ? "Student"
                  : "Teacher"
              }`}
        </button>
      </div>

    </form>
  );
};

export default AccountForm;