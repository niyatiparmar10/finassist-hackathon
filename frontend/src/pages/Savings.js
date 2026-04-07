// frontend/src/pages/Savings.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { useNavigate } from "react-router-dom";
import api from "../api";

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: "rgba(7,7,15,0.95)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 10,
        padding: "10px 14px",
        fontSize: 13,
      }}
    >
      <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>{label}</div>
      <div style={{ color: "var(--green)" }}>
        ₹{payload[0]?.value?.toLocaleString("en-IN")}
      </div>
    </div>
  );
};

export default function Savings() {
  const userId = localStorage.getItem("userId");
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  // Manual entry form
  const [form, setForm] = useState({ amount: "", note: "", linkedGoalId: "" });
  const [formLoading, setFormLoading] = useState(false);
  const [toast, setToast] = useState("");
  const [toastType, setToastType] = useState("success");

  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const fetchData = useCallback(async () => {
    console.log("[SAVINGS PAGE] Fetching savings data");
    try {
      const [savRes, goalRes] = await Promise.all([
        api.get(`/savings/list/${userId}`),
        api.get(`/goals/${userId}`),
      ]);
      console.log(
        `[SAVINGS PAGE] Got ${savRes.data.entries?.length} entries, goals: ${goalRes.data.goals?.length}`,
      );
      setData(savRes.data);
      setGoals(goalRes.data.goals || []);
    } catch (err) {
      console.error("[SAVINGS PAGE] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  async function handleAddSaving(e) {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setToast("Please enter a valid amount.");
      setToastType("error");
      return;
    }

    const isGoalSaving = !!form.linkedGoalId;
    console.log(
      `[SAVINGS PAGE] Adding saving: amount=${form.amount} linkedGoalId=${form.linkedGoalId || "none"} isGoalSaving=${isGoalSaving}`,
    );

    setFormLoading(true);
    setToast("");
    try {
      // Step 1: Add to savings
      const savRes = await api.post("/savings/add", {
        userId,
        amount: parseFloat(form.amount),
        note: form.note || (isGoalSaving ? "Goal deposit" : "Manual saving"),
        linkedGoalId: form.linkedGoalId || null,
        source: "manual",
      });
      console.log("[SAVINGS PAGE] Saving added:", savRes.data);

      setToast(
        isGoalSaving
          ? `✓ ₹${form.amount} added to goal!`
          : `✓ ₹${form.amount} saved!`,
      );
      setToastType("success");
      setForm({ amount: "", note: "", linkedGoalId: "" });
      fetchData();
      setTimeout(() => setToast(""), 3000);
    } catch (err) {
      console.error("[SAVINGS PAGE] Add saving error:", err);
      setToast("Failed to save. Try again.");
      setToastType("error");
    } finally {
      setFormLoading(false);
    }
  }

  if (loading)
    return (
      <div
        style={{ color: "var(--text-muted)", padding: 40, textAlign: "center" }}
      >
        Loading savings...
      </div>
    );

  const barData = (data?.monthlyHistory || []).map((v, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return { month: months[d.getMonth()], amount: v };
  });

  // Separate general vs goal savings
  const generalEntries = (data?.entries || []).filter((e) => !e.linkedGoalId);
  const goalEntries = (data?.entries || []).filter((e) => e.linkedGoalId);
  const generalTotal = generalEntries.reduce((sum, e) => sum + e.amount, 0);
  const goalTotal = goalEntries.reduce((sum, e) => sum + e.amount, 0);

  console.log(
    `[SAVINGS PAGE] generalEntries=${generalEntries.length}, goalEntries=${goalEntries.length}`,
  );

  const activeGoals = goals.filter((g) => g.status === "active");

  return (
    <div>
      <div
        className="page-header fade-up"
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <h1 className="page-title">Savings</h1>
          <p className="page-subtitle">
            Track general savings and goal-linked savings separately
          </p>
        </div>
        <button className="btn-primary" onClick={() => navigate("/chat")}>
          + Log via Chat
        </button>
      </div>

      {/* Manual Add Saving Form */}
      <div className="card fade-up" style={{ marginBottom: 24 }}>
        <div className="card-title">Add Saving Manually</div>
        <form onSubmit={handleAddSaving}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
              marginBottom: 12,
            }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Amount (₹) *
              </label>
              <input
                className="input"
                type="number"
                min="1"
                placeholder="e.g. 500"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
                required
              />
            </div>
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  marginBottom: 6,
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                Link to Goal (optional)
              </label>
              <select
                className="input"
                value={form.linkedGoalId}
                onChange={(e) =>
                  setForm({ ...form, linkedGoalId: e.target.value })
                }
                style={{ appearance: "none" }}
              >
                <option value="">Not linked to a goal (general saving)</option>
                {activeGoals.map((g) => (
                  <option key={g._id} value={g._id}>
                    {g.title} — ₹{g.savedSoFar}/{g.targetAmount}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div style={{ marginBottom: 12 }}>
            <label
              style={{
                display: "block",
                fontSize: 12,
                color: "var(--text-muted)",
                marginBottom: 6,
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Note (optional)
            </label>
            <input
              className="input"
              type="text"
              placeholder="e.g. Put aside from salary"
              value={form.note}
              onChange={(e) => setForm({ ...form, note: e.target.value })}
            />
          </div>
          {toast && (
            <div
              style={{
                background:
                  toastType === "success"
                    ? "var(--green-dim)"
                    : "rgba(239,68,68,0.08)",
                border: `1px solid ${toastType === "success" ? "rgba(0,229,160,0.2)" : "rgba(239,68,68,0.2)"}`,
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 13,
                color: toastType === "success" ? "var(--green)" : "#f87171",
                marginBottom: 12,
              }}
            >
              {toast}
            </div>
          )}
          <button
            type="submit"
            className="btn-primary"
            disabled={formLoading}
            style={{ width: "100%", padding: 14 }}
          >
            {formLoading
              ? "Saving..."
              : form.linkedGoalId
                ? "Add to Goal"
                : "+ Save Money"}
          </button>
        </form>
      </div>

      {/* Stat Cards — separated */}
      <div className="grid-4 fade-up fade-up-1" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Saved</div>
          <div className="stat-value stat-green">
            ₹{(data?.totalSaved || 0).toLocaleString("en-IN")}
          </div>
          <div className="stat-sub">All time</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">This Month</div>
          <div className="stat-value stat-purple">
            ₹{(data?.thisMonth || 0).toLocaleString("en-IN")}
          </div>
          <div className="stat-sub">Current month</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">General Savings</div>
          <div className="stat-value stat-green">
            ₹{generalTotal.toLocaleString("en-IN")}
          </div>
          <div className="stat-sub">{generalEntries.length} entries</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Goal Savings</div>
          <div className="stat-value stat-purple">
            ₹{goalTotal.toLocaleString("en-IN")}
          </div>
          <div className="stat-sub">{goalEntries.length} entries</div>
        </div>
      </div>

      {/* Bar chart */}
      <div className="card fade-up fade-up-2" style={{ marginBottom: 24 }}>
        <div className="card-title">Monthly Savings (6 months)</div>
        {barData.some((d) => d.amount > 0) ? (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={barData} barSize={32}>
              <XAxis
                dataKey="month"
                tick={{ fill: "var(--text-muted)", fontSize: 12 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: "var(--text-muted)", fontSize: 11 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: "rgba(255,255,255,0.03)" }}
              />
              <Bar
                dataKey="amount"
                fill="url(#savGrad)"
                radius={[6, 6, 0, 0]}
              />
              <defs>
                <linearGradient id="savGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#00e5a0" />
                  <stop offset="100%" stopColor="#00e5a0" stopOpacity={0.3} />
                </linearGradient>
              </defs>
            </BarChart>
          </ResponsiveContainer>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "32px 0",
              color: "var(--text-muted)",
              fontSize: 14,
            }}
          >
            No savings yet. Start saving!
          </div>
        )}
      </div>

      {/* General Savings Log */}
      <div className="card fade-up fade-up-3" style={{ marginBottom: 24 }}>
        <div className="card-title">💰 General Savings</div>
        {generalEntries.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {generalEntries.slice(0, 15).map((entry, i) => (
              <div
                key={entry._id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "13px 0",
                  borderBottom:
                    i < generalEntries.length - 1
                      ? "1px solid var(--border)"
                      : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 10,
                      background: "var(--green-dim)",
                      border: "1px solid rgba(0,229,160,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                    }}
                  >
                    💰
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {entry.note || "Saving"}
                      {entry.source === "manual" ? (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 10,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "var(--purple-dim)",
                            color: "var(--purple)",
                          }}
                        >
                          manual
                        </span>
                      ) : (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 10,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "var(--green-dim)",
                            color: "var(--green)",
                            border: "1px solid rgba(0,229,160,0.2)",
                          }}
                        >
                          chat
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {new Date(entry.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--green)",
                  }}
                >
                  +₹{entry.amount?.toLocaleString("en-IN")}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "24px 0",
              color: "var(--text-muted)",
              fontSize: 14,
            }}
          >
            No general savings yet. Add above or tell the chatbot "I saved ₹500"
          </div>
        )}
      </div>

      {/* Goal Savings Log */}
      <div className="card fade-up fade-up-4">
        <div className="card-title">🎯 Goal Savings</div>
        {goalEntries.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {goalEntries.slice(0, 15).map((entry, i) => {
              const linkedGoal = goals.find(
                (g) =>
                  g._id === entry.linkedGoalId?.toString() ||
                  g._id === entry.linkedGoalId,
              );
              return (
                <div
                  key={entry._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "13px 0",
                    borderBottom:
                      i < goalEntries.length - 1
                        ? "1px solid var(--border)"
                        : "none",
                  }}
                >
                  <div
                    style={{ display: "flex", alignItems: "center", gap: 12 }}
                  >
                    <div
                      style={{
                        width: 36,
                        height: 36,
                        borderRadius: 10,
                        background: "var(--purple-dim)",
                        border: "1px solid rgba(168,85,247,0.2)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 16,
                      }}
                    >
                      🎯
                    </div>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 500 }}>
                        {entry.note || "Goal deposit"}
                        {entry.source === "manual" ? (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 10,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: "var(--purple-dim)",
                              color: "var(--purple)",
                            }}
                          >
                            manual
                          </span>
                        ) : (
                          <span
                            style={{
                              marginLeft: 8,
                              fontSize: 10,
                              padding: "2px 6px",
                              borderRadius: 4,
                              background: "var(--green-dim)",
                              color: "var(--green)",
                              border: "1px solid rgba(0,229,160,0.2)",
                            }}
                          >
                            chat
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                        {linkedGoal ? `→ ${linkedGoal.title}` : "Goal deposit"}{" "}
                        ·{" "}
                        {new Date(entry.date).toLocaleDateString("en-IN", {
                          day: "numeric",
                          month: "short",
                        })}
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      fontSize: 16,
                      fontWeight: 700,
                      color: "var(--purple)",
                    }}
                  >
                    +₹{entry.amount?.toLocaleString("en-IN")}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "24px 0",
              color: "var(--text-muted)",
              fontSize: 14,
            }}
          >
            No goal savings yet. Link a saving to a goal above!
          </div>
        )}
      </div>
    </div>
  );
}
