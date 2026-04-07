// frontend/src/pages/Investments.jsx
// SECTION 6: Financial Investments Tracker
// Tracks SIPs, EMIs, FDs, Mutual Funds, Recurring Deposits
// Supports pre-fill from chatbot redirect (?prefill=sip&amount=X)

import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import api from "../api";

const TYPE_CONFIG = {
  sip: {
    label: "SIP",
    color: "#a855f7",
    bg: "rgba(168,85,247,0.12)",
    icon: "📈",
  },
  emi: {
    label: "EMI",
    color: "#ec4899",
    bg: "rgba(236,72,153,0.12)",
    icon: "🏦",
  },
  fd: {
    label: "Fixed Deposit",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.12)",
    icon: "💰",
  },
  mutual_fund: {
    label: "Mutual Fund",
    color: "#00e5a0",
    bg: "rgba(0,229,160,0.12)",
    icon: "📊",
  },
  rd: {
    label: "Recurring Deposit",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.12)",
    icon: "🔄",
  },
};

const STATUS_CONFIG = {
  active: { label: "Active", color: "#00e5a0" },
  completed: { label: "Completed", color: "#a855f7" },
  paused: { label: "Paused", color: "#f59e0b" },
};

const EMPTY_FORM = {
  type: "sip",
  name: "",
  monthlyAmount: "",
  tenureMonths: "",
  interestRate: "",
  startDate: new Date().toISOString().split("T")[0],
  notes: "",
};

export default function Investments() {
  const userId = localStorage.getItem("userId");
  const location = useLocation();
  const navigate = useNavigate();

  const [investments, setInvestments] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formVisible, setFormVisible] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null); // { msg, color }

  // ── On mount: check for ?prefill query params from chatbot ──────────────────
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const prefillType = params.get("prefill");
    const prefillAmount = params.get("amount");

    if (prefillType && prefillAmount) {
      console.log("[INVESTMENTS] Pre-filling form from chatbot:", {
        prefillType,
        prefillAmount,
      });
      setForm((prev) => ({
        ...prev,
        type: prefillType,
        monthlyAmount: prefillAmount,
        name:
          prefillType === "sip"
            ? "New SIP Investment"
            : prefillType === "emi"
              ? "New EMI"
              : "",
      }));
      setFormVisible(true);
      // Clean the URL so refresh doesn't re-trigger
      navigate("/investments", { replace: true });
    }
  }, [location.search, navigate]);

  // ── Fetch investments ───────────────────────────────────────────────────────
  async function loadInvestments() {
    console.log("[INVESTMENTS] Loading investments for userId:", userId);
    try {
      const { data } = await api.get(`/investments/${userId}`);
      console.log(
        "[INVESTMENTS] Fetched:",
        data.investments?.length,
        "records. Summary:",
        data.summary,
      );
      setInvestments(data.investments || []);
      setSummary(data.summary || null);
    } catch (err) {
      console.error("[INVESTMENTS] Fetch error:", err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadInvestments();
  }, [userId]);

  // ── Show toast notification ─────────────────────────────────────────────────
  function showToast(msg, color = "var(--green)") {
    setToast({ msg, color });
    setTimeout(() => setToast(null), 3000);
  }

  // ── Handle form submit ──────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.name || !form.monthlyAmount) {
      showToast("Name and monthly amount are required", "#ef4444");
      return;
    }
    setSubmitting(true);
    console.log("[INVESTMENTS] Submitting form:", form);
    try {
      await api.post("/investments/add", { userId, ...form });
      showToast("Investment logged!");
      setForm(EMPTY_FORM);
      setFormVisible(false);
      await loadInvestments();
    } catch (err) {
      console.error("[INVESTMENTS] Submit error:", err.message);
      showToast("Failed to save. Try again.", "#ef4444");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Mark complete / delete ──────────────────────────────────────────────────
  async function markComplete(id) {
    console.log("[INVESTMENTS] Marking complete:", id);
    try {
      await api.put(`/investments/update/${id}`, { status: "completed" });
      showToast("Marked as completed!");
      await loadInvestments();
    } catch (err) {
      console.error("[INVESTMENTS] Mark complete error:", err.message);
    }
  }

  async function deleteInvestment(id) {
    if (!window.confirm("Delete this investment record?")) return;
    console.log("[INVESTMENTS] Deleting:", id);
    try {
      await api.delete(`/investments/${id}`);
      showToast("Deleted.");
      await loadInvestments();
    } catch (err) {
      console.error("[INVESTMENTS] Delete error:", err.message);
    }
  }

  if (loading) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ fontSize: 32, animation: "spin 2s linear infinite" }}>
          ◈
        </div>
        <p style={{ color: "var(--text-muted)" }}>Loading investments...</p>
        <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  const activeInvestments = investments.filter((i) => i.status === "active");

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 80,
            right: 24,
            zIndex: 9999,
            background: "var(--bg-card)",
            border: `1px solid ${toast.color}`,
            borderRadius: 12,
            padding: "12px 20px",
            fontSize: 14,
            color: toast.color,
            boxShadow: "0 4px 20px rgba(0,0,0,0.4)",
            animation: "slideDown 0.3s ease",
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <div
        className="page-header fade-up"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1 className="page-title">Investments</h1>
          <p className="page-subtitle">
            Track your SIPs, EMIs, FDs and monthly commitments
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => setFormVisible((v) => !v)}
          style={{ flexShrink: 0 }}
        >
          {formVisible ? "✕ Cancel" : "+ Add Investment"}
        </button>
      </div>

      {/* Summary stat row */}
      {summary && (
        <div className="grid-3 fade-up fade-up-1" style={{ marginBottom: 24 }}>
          <div className="stat-card">
            <div className="stat-label">Active Investments</div>
            <div className="stat-value stat-purple">{summary.activeCount}</div>
            <div className="stat-sub">Running commitments</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Monthly Commitment</div>
            <div
              className="stat-value"
              style={{ color: "#ec4899", fontSize: 22 }}
            >
              ₹{(summary.totalMonthlyCommitment || 0).toLocaleString("en-IN")}
            </div>
            <div className="stat-sub">Goes out every month</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Free Surplus</div>
            <div
              className={`stat-value ${(summary.availableSurplus || 0) >= 0 ? "stat-green" : ""}`}
              style={{
                fontSize: 22,
                color:
                  (summary.availableSurplus || 0) < 0 ? "#ef4444" : undefined,
              }}
            >
              ₹{(summary.availableSurplus || 0).toLocaleString("en-IN")}
            </div>
            <div className="stat-sub">After investments</div>
          </div>
        </div>
      )}

      {/* Add Investment Form */}
      {formVisible && (
        <div className="card fade-up" style={{ marginBottom: 24 }}>
          <div className="card-title" style={{ marginBottom: 20 }}>
            Log New Investment
          </div>
          <form onSubmit={handleSubmit}>
            <div className="grid-2" style={{ gap: 14, marginBottom: 14 }}>
              {/* Type */}
              <div>
                <label style={labelStyle}>Type</label>
                <select
                  className="input"
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  style={{ appearance: "none" }}
                >
                  <option value="sip">SIP (Systematic Investment Plan)</option>
                  <option value="emi">EMI (Loan Instalment)</option>
                  <option value="fd">Fixed Deposit</option>
                  <option value="mutual_fund">Mutual Fund</option>
                  <option value="rd">Recurring Deposit</option>
                </select>
              </div>
              {/* Name */}
              <div>
                <label style={labelStyle}>Name / Description</label>
                <input
                  className="input"
                  placeholder='e.g. "Nifty 50 Index Fund"'
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                />
              </div>
              {/* Monthly Amount */}
              <div>
                <label style={labelStyle}>Monthly Amount (₹)</label>
                <input
                  className="input"
                  type="number"
                  placeholder="e.g. 1000"
                  value={form.monthlyAmount}
                  onChange={(e) =>
                    setForm({ ...form, monthlyAmount: e.target.value })
                  }
                  required
                />
              </div>
              {/* Tenure */}
              <div>
                <label style={labelStyle}>Tenure (months) — optional</label>
                <input
                  className="input"
                  type="number"
                  placeholder="e.g. 24"
                  value={form.tenureMonths}
                  onChange={(e) =>
                    setForm({ ...form, tenureMonths: e.target.value })
                  }
                />
              </div>
              {/* Interest Rate */}
              <div>
                <label style={labelStyle}>
                  Expected Return / Interest Rate % — optional
                </label>
                <input
                  className="input"
                  type="number"
                  step="0.1"
                  placeholder="e.g. 12"
                  value={form.interestRate}
                  onChange={(e) =>
                    setForm({ ...form, interestRate: e.target.value })
                  }
                />
              </div>
              {/* Start Date */}
              <div>
                <label style={labelStyle}>Start Date</label>
                <input
                  className="input"
                  type="date"
                  value={form.startDate}
                  onChange={(e) =>
                    setForm({ ...form, startDate: e.target.value })
                  }
                />
              </div>
            </div>
            {/* Notes */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Notes — optional</label>
              <input
                className="input"
                placeholder="Any notes about this investment..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
              />
            </div>
            <button
              type="submit"
              className="btn-primary"
              disabled={submitting}
              style={{ width: "100%", padding: "13px" }}
            >
              {submitting ? "Saving..." : "Save Investment"}
            </button>
          </form>
        </div>
      )}

      {/* Investment List */}
      {investments.length === 0 ? (
        <div
          className="card fade-up"
          style={{ textAlign: "center", padding: "60px 24px" }}
        >
          <div style={{ fontSize: 40, marginBottom: 16 }}>◈</div>
          <h3 style={{ fontFamily: "var(--font-display)", marginBottom: 8 }}>
            No investments tracked yet
          </h3>
          <p
            style={{
              color: "var(--text-secondary)",
              marginBottom: 24,
              fontSize: 14,
            }}
          >
            Ask the AI "What if I start a SIP of ₹1000?" and it will suggest
            logging it here.
            <br />
            Or click <em style={{ color: "var(--green)" }}>
              + Add Investment
            </em>{" "}
            above.
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {investments.map((inv, idx) => {
            const cfg = TYPE_CONFIG[inv.type] || TYPE_CONFIG.sip;
            const statusCfg = STATUS_CONFIG[inv.status] || STATUS_CONFIG.active;

            return (
              <div
                key={inv._id}
                className={`card fade-up fade-up-${idx + 1}`}
                style={{ position: "relative", overflow: "hidden" }}
              >
                {/* Color bar top */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: cfg.color,
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 14,
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div
                      style={{
                        width: 42,
                        height: 42,
                        borderRadius: 12,
                        background: cfg.bg,
                        border: `1px solid ${cfg.color}40`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 20,
                        flexShrink: 0,
                      }}
                    >
                      {cfg.icon}
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 16,
                          marginBottom: 2,
                        }}
                      >
                        {inv.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        Started{" "}
                        {new Date(inv.startDate).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {inv.monthsRemaining !== null &&
                          ` · ${inv.monthsRemaining} months left`}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "flex-end",
                      gap: 6,
                    }}
                  >
                    <span
                      style={{
                        padding: "3px 10px",
                        borderRadius: 99,
                        fontSize: 11,
                        fontWeight: 600,
                        background: cfg.bg,
                        color: cfg.color,
                        border: `1px solid ${cfg.color}30`,
                      }}
                    >
                      {cfg.label}
                    </span>
                    <span
                      style={{
                        fontSize: 11,
                        color: statusCfg.color,
                        fontWeight: 600,
                      }}
                    >
                      ● {statusCfg.label}
                    </span>
                  </div>
                </div>

                {/* Amount row */}
                <div
                  style={{
                    display: "flex",
                    gap: 20,
                    marginBottom: 14,
                    flexWrap: "wrap",
                  }}
                >
                  <div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-muted)",
                        marginBottom: 2,
                      }}
                    >
                      Monthly Amount
                    </div>
                    <div
                      style={{
                        fontSize: 20,
                        fontWeight: 700,
                        color: cfg.color,
                      }}
                    >
                      ₹{inv.monthlyAmount.toLocaleString("en-IN")}
                    </div>
                  </div>
                  {inv.tenureMonths && (
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          marginBottom: 2,
                        }}
                      >
                        Tenure
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>
                        {inv.tenureMonths} months
                      </div>
                    </div>
                  )}
                  {inv.interestRate && (
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          marginBottom: 2,
                        }}
                      >
                        Rate
                      </div>
                      <div style={{ fontSize: 16, fontWeight: 600 }}>
                        {inv.interestRate}% p.a.
                      </div>
                    </div>
                  )}
                  {inv.estimatedValue && (
                    <div>
                      <div
                        style={{
                          fontSize: 11,
                          color: "var(--text-muted)",
                          marginBottom: 2,
                        }}
                      >
                        Est. Value at maturity
                      </div>
                      <div
                        style={{
                          fontSize: 16,
                          fontWeight: 600,
                          color: "var(--green)",
                        }}
                      >
                        ₹{inv.estimatedValue.toLocaleString("en-IN")}
                      </div>
                    </div>
                  )}
                </div>

                {/* Notes */}
                {inv.notes && (
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--text-muted)",
                      marginBottom: 14,
                    }}
                  >
                    📝 {inv.notes}
                  </div>
                )}

                {/* Action buttons — only for active */}
                {inv.status === "active" && (
                  <div style={{ display: "flex", gap: 10 }}>
                    <button
                      onClick={() => markComplete(inv._id)}
                      style={actionBtnStyle(
                        "var(--green-dim)",
                        "var(--green)",
                        "rgba(0,229,160,0.2)",
                      )}
                    >
                      ✓ Mark Complete
                    </button>
                    <button
                      onClick={() => deleteInvestment(inv._id)}
                      style={actionBtnStyle(
                        "rgba(239,68,68,0.08)",
                        "#ef4444",
                        "rgba(239,68,68,0.2)",
                      )}
                    >
                      ✕ Delete
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <style>{`
        @keyframes slideDown { from { transform: translateY(-10px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
        @keyframes spin { from { transform: rotate(0); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}

// ── Style helpers ─────────────────────────────────────────────────────────────
const labelStyle = {
  display: "block",
  fontSize: 11,
  color: "var(--text-muted)",
  marginBottom: 6,
  fontWeight: 600,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

function actionBtnStyle(bg, color, border) {
  return {
    fontSize: 12,
    padding: "7px 14px",
    borderRadius: 8,
    border: `1px solid ${border}`,
    background: bg,
    color,
    cursor: "pointer",
    fontWeight: 600,
  };
}
