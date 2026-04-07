//Login.js

import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function Login() {
  const [isRegister, setIsRegister] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    userType: "student",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  function handleChange(e) {
    setForm({ ...form, [e.target.name]: e.target.value });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      const endpoint = isRegister ? "/auth/register" : "/auth/login";
      const { data } = await api.post(endpoint, form);
      localStorage.setItem("userId", data.userId);
      localStorage.setItem("token", data.token);
      localStorage.setItem("name", data.name);
      localStorage.setItem("utype", form.userType);
      navigate("/dashboard");
    } catch (err) {
      setError(err.response?.data?.error || "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Mesh background */}
      <div className="mesh-bg">
        <div className="mesh-blob" />
      </div>

      {/* Grid pattern overlay */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
          backgroundImage:
            "linear-gradient(rgba(0,229,160,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,229,160,0.03) 1px, transparent 1px)",
          backgroundSize: "40px 40px",
        }}
      />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: "100%",
          maxWidth: 440,
          padding: "0 24px",
        }}
      >
        {/* Logo */}
        <div
          className="fade-up"
          style={{ textAlign: "center", marginBottom: 40 }}
        >
          <div
            style={{
              width: 52,
              height: 52,
              borderRadius: 16,
              background:
                "linear-gradient(135deg, var(--green) 0%, var(--purple) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 24,
              margin: "0 auto 16px",
              boxShadow: "0 0 30px var(--green-glow)",
            }}
          >
            ✦
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 32,
              fontWeight: 800,
              marginBottom: 8,
              background: "linear-gradient(90deg, var(--green), var(--purple))",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text",
            }}
          >
            FinAssist
          </h1>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Your intelligent finance companion
          </p>
        </div>

        {/* Card */}
        <div className="card fade-up fade-up-1" style={{ padding: "32px" }}>
          {/* Toggle */}
          <div
            style={{
              display: "flex",
              background: "rgba(255,255,255,0.04)",
              borderRadius: 10,
              padding: 4,
              marginBottom: 28,
              border: "1px solid var(--border)",
            }}
          >
            {["Login", "Register"].map((label, i) => (
              <button
                key={label}
                onClick={() => {
                  setIsRegister(i === 1);
                  setError("");
                }}
                style={{
                  flex: 1,
                  padding: "9px",
                  borderRadius: 8,
                  border: "none",
                  fontSize: 14,
                  fontWeight: 500,
                  background:
                    isRegister === (i === 1)
                      ? "var(--green-dim)"
                      : "transparent",
                  color:
                    isRegister === (i === 1)
                      ? "var(--green)"
                      : "var(--text-muted)",
                  transition: "all 0.2s",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit}>
            {isRegister && (
              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginBottom: 6,
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  Full Name
                </label>
                <input
                  className="input"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Atharva Kulkarni"
                  required
                />
              </div>
            )}

            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginBottom: 6,
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Email
              </label>
              <input
                className="input"
                name="email"
                type="email"
                value={form.email}
                onChange={handleChange}
                placeholder="you@example.com"
                required
              />
            </div>

            <div style={{ marginBottom: 14 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginBottom: 6,
                  fontWeight: 500,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Password
              </label>
              <input
                className="input"
                name="password"
                type="password"
                value={form.password}
                onChange={handleChange}
                placeholder="••••••••"
                required
              />
            </div>

            {isRegister && (
              <div style={{ marginBottom: 14 }}>
                <label
                  style={{
                    display: "block",
                    fontSize: 12,
                    color: "var(--text-muted)",
                    marginBottom: 6,
                    fontWeight: 500,
                    letterSpacing: "0.06em",
                    textTransform: "uppercase",
                  }}
                >
                  I am a
                </label>
                <select
                  className="input"
                  name="userType"
                  value={form.userType}
                  onChange={handleChange}
                  style={{ appearance: "none" }}
                >
                  <option value="student">Student</option>
                  <option value="working">Working Professional</option>
                  <option value="freelancer">Freelancer</option>
                </select>
              </div>
            )}

            {error && (
              <div
                style={{
                  background: "rgba(239,68,68,0.08)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: 8,
                  padding: "10px 14px",
                  fontSize: 13,
                  color: "#f87171",
                  marginBottom: 16,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              className="btn-primary"
              disabled={loading}
              style={{
                width: "100%",
                marginTop: 8,
                padding: "14px",
                fontSize: 15,
              }}
            >
              {loading
                ? "Please wait..."
                : isRegister
                  ? "Create Account"
                  : "Sign In"}
            </button>
          </form>
        </div>

        <p
          className="fade-up fade-up-2"
          style={{
            textAlign: "center",
            marginTop: 20,
            fontSize: 13,
            color: "var(--text-muted)",
          }}
        >
          100% free · Powered by Ollama · No paid APIs
        </p>
      </div>
    </div>
  );
}
