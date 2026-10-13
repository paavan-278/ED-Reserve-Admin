import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAppContext } from "../context/AppContext";
import api from "../services/api";
import { formatErrorMessage } from "../utils/errorMessages";

const decodeRole = (token) => {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload?.role === "client" ? "student" : payload?.role;
  } catch {
    return null;
  }
};

const homeFor = (role) => (role === "admin" ? "/admin" : "/");

const Login = () => {
  const navigate = useNavigate();
  const { preloadAfterLogin } = useAppContext();
  const [mode, setMode] = useState("login");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [form, setForm] = useState({
    username: "",
    password: "",
    identifier: "",
    otp: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    const role = token ? decodeRole(token) : null;
    if (role) {
      navigate(homeFor(role), { replace: true });
    }
  }, [navigate]);

  const update = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const submitLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      const response = await api.post("/auth/login", {
        username: form.username.trim(),
        password: form.password,
      });
      const token = response.data?.access_token;
      const role = decodeRole(token);
      if (!token || !role) {
        throw new Error("Invalid login response");
      }
      localStorage.setItem("token", token);
      localStorage.setItem("user", JSON.stringify(response.data.user || { username: form.username, role }));
      navigate(homeFor(role), { replace: true });
      setTimeout(() => preloadAfterLogin?.(role), 0);
    } catch (error) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      setMessage(formatErrorMessage(error.response?.data?.detail, "Login failed"));
    } finally {
      setLoading(false);
    }
  };

  const submitForgot = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");
    try {
      if (mode === "forgot") {
        await api.post("/auth/forgot-password", { identifier: form.identifier.trim() });
        setMode("verify");
        setMessage("OTP sent. Check the email linked to this account.");
      } else if (mode === "verify") {
        await api.post("/auth/verify-otp", { identifier: form.identifier.trim(), otp: form.otp.trim() });
        setMode("reset");
        setMessage("OTP verified. Set a new password.");
      } else {
        await api.post("/auth/reset-password", {
          identifier: form.identifier.trim(),
          otp: form.otp.trim(),
          password: form.newPassword,
          confirm_password: form.confirmPassword,
        });
        setMode("login");
        setMessage("Password updated. You can log in now.");
      }
    } catch (error) {
      setMessage(formatErrorMessage(error.response?.data?.detail, "Password reset failed"));
    } finally {
      setLoading(false);
    }
  };

  const resetFlow = () => {
    setMode("login");
    setMessage("");
  };

  return (
    <main className="login-page">
      <section className="login-visual">
        <div className="brand-lockup">
          <span className="brand-mark">CBS</span>
          <strong>CAMPUS BOOKING SYSTEM</strong>
        </div>
        <div className="login-copy">
          <p className="eyebrow">Resource Scheduling</p>
          <h1>CAMPUS BOOKING SYSTEM</h1>
          <p>One secure workspace for HOD approvals, teacher requests, student bookings, and campus resource visibility.</p>
        </div>
      </section>

      <section className="login-card glass-panel">
        <div className="panel-heading">
          <span className="panel-icon">{mode === "login" ? ">" : "*"}</span>
          <div>
            <h2>{mode === "login" ? "Sign in" : mode === "forgot" ? "Forgot password" : mode === "verify" ? "Verify OTP" : "Reset password"}</h2>
            <p>{mode === "login" ? "Use your admin, teacher, or student credentials." : "OTP verification is sent through configured SMTP email."}</p>
          </div>
        </div>

        {message ? <div className={`notice ${message.toLowerCase().includes("failed") || message.toLowerCase().includes("invalid") ? "danger" : "info"}`}>{message}</div> : null}

        {mode === "login" ? (
          <form className="modern-form" onSubmit={submitLogin}>
            <label>
              <span>Email / Username / UID</span>
              <input name="username" value={form.username} onChange={update} autoComplete="username" required />
            </label>
            <label>
              <span>Password</span>
              <div className="input-action">
                <input name="password" type={showPassword ? "text" : "password"} value={form.password} onChange={update} autoComplete="current-password" required />
                <button type="button" onClick={() => setShowPassword((prev) => !prev)}>{showPassword ? "Hide" : "Show"}</button>
              </div>
            </label>
            <button className="primary-action" disabled={loading}>{loading ? "Signing in..." : "Login"}</button>
            <button className="text-action" type="button" onClick={() => { setMode("forgot"); setMessage(""); }}>Forgot Password?</button>
          </form>
        ) : (
          <form className="modern-form" onSubmit={submitForgot}>
            <label>
              <span>Email / Username</span>
              <input name="identifier" value={form.identifier} onChange={update} required readOnly={mode !== "forgot"} />
            </label>
            {mode !== "forgot" ? (
              <label>
                <span>OTP</span>
                <input name="otp" value={form.otp} onChange={update} inputMode="numeric" required readOnly={mode === "reset"} />
              </label>
            ) : null}
            {mode === "reset" ? (
              <>
                <label>
                  <span>New Password</span>
                  <input name="newPassword" type="password" value={form.newPassword} onChange={update} required minLength={6} />
                </label>
                <label>
                  <span>Confirm Password</span>
                  <input name="confirmPassword" type="password" value={form.confirmPassword} onChange={update} required minLength={6} />
                </label>
              </>
            ) : null}
            <button className="primary-action" disabled={loading}>
              {loading ? "Please wait..." : mode === "forgot" ? "Send OTP" : mode === "verify" ? "Verify OTP" : "Update Password"}
            </button>
            {mode === "verify" ? <button className="text-action" type="button" onClick={submitForgot} disabled={loading}>Resend OTP</button> : null}
            <button className="text-action" type="button" onClick={resetFlow}>Back to Login</button>
          </form>
        )}
      </section>
    </main>
  );
};

export default Login;
