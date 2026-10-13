import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import api from "../services/api";
import { formatErrorMessage } from "../utils/errorMessages";

const Register = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({ username: "", password: "" });
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage("");
    setError("");
    setLoading(true);

    try {
      await api.post("/auth/register", formData);
      setMessage("Registration successful. Redirecting to login...");
      setTimeout(() => navigate("/login"), 1000);
    } catch (err) {
      setError(formatErrorMessage(err.response?.data?.detail, "Registration failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-shell auth-register">
      <div className="auth-hero accent">
        <div className="auth-shape shape-one" />
        <div className="auth-shape shape-two" />
        <div className="auth-brand">
          <span className="auth-brand-mark">CB</span>
          <span>Campus Booking System</span>
        </div>

        <div className="auth-hero-content">
          <p className="eyebrow">Campus Resource Platform</p>
          <h1>Create Your Booking Account</h1>
          <p>
            Register to access campus resources and submit booking requests.
          </p>

          <ul className="auth-feature-list" aria-label="Platform features">
            <li><span>✓</span>Real-time availability</li>
            <li><span>✓</span>Fast approval workflow</li>
            <li><span>✓</span>Resource tracking</li>
            <li><span>✓</span>Booking history</li>
          </ul>
        </div>
      </div>

      <div className="auth-card">
        <div className="auth-card-header">
          <span className="auth-card-icon">+</span>
          <div>
            <h2>Create account</h2>
            <p>Set up your access to request campus resources.</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <label>
            <span>Username</span>
            <div className="auth-input-wrap">
              <span className="auth-input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img">
                  <path d="M20 21a8 8 0 0 0-16 0" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <input
                type="text"
                name="username"
                value={formData.username}
                onChange={handleChange}
                placeholder="Choose username"
                required
              />
            </div>
          </label>

          <label>
            <span>Password</span>
            <div className="auth-input-wrap">
              <span className="auth-input-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" role="img">
                  <rect x="4" y="11" width="16" height="9" rx="2" />
                  <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                </svg>
              </span>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder="Create password"
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? (
                  <svg viewBox="0 0 24 24" role="img">
                    <path d="m3 3 18 18" />
                    <path d="M10.6 10.6A2 2 0 0 0 13.4 13.4" />
                    <path d="M9.9 4.2A10.8 10.8 0 0 1 12 4c5 0 9 5 9 8a9.2 9.2 0 0 1-2.3 3.7" />
                    <path d="M6.1 6.1C4.2 7.5 3 9.8 3 12c0 3 4 8 9 8a10.7 10.7 0 0 0 4-.8" />
                  </svg>
                ) : (
                  <svg viewBox="0 0 24 24" role="img">
                    <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                )}
              </button>
            </div>
          </label>

          {message ? <div className="alert success">{message}</div> : null}
          {error ? <div className="alert error">{String(error)}</div> : null}

          <button type="submit" className="primary-button auth-button" disabled={loading}>
            {loading ? (
              <>
                <span className="button-spinner" />
                Creating...
              </>
            ) : (
              "Register"
            )}
          </button>
        </form>

        <p className="auth-link">
          Already registered? <Link to="/login">Back to login</Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
