// frontend/src/pages/Expenses.jsx
import React, { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  AreaChart,
  Area,
} from "recharts";
import api from "../api";

const CATEGORY_EMOJI = {
  food: "🍽",
  transport: "🚗",
  entertainment: "🎬",
  health: "💊",
  shopping: "🛍",
  other: "📦",
};

const CATEGORIES = [
  "food",
  "transport",
  "entertainment",
  "health",
  "shopping",
  "other",
];

function getLastSixMonths() {
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setDate(1);
    d.setMonth(d.getMonth() - i);
    months.push({
      label: d.toLocaleString("default", { month: "short", year: "2-digit" }),
      year: d.getFullYear(),
      month: d.getMonth(),
    });
  }
  return months;
}

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
      {label && (
        <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>
          {label}
        </div>
      )}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color || "var(--green)" }}>
          ₹{p.value?.toLocaleString("en-IN")}
        </div>
      ))}
    </div>
  );
};

export default function Expenses() {
  const userId = localStorage.getItem("userId");
  const months = getLastSixMonths();

  const [selectedIdx, setSelectedIdx] = useState(5); // current month
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [incexp, setIncexp] = useState(null);
  const [monthlyBar, setMonthlyBar] = useState(null);
  const [expandedRows, setExpandedRows] = useState({});

  // Manual entry form state
  const [form, setForm] = useState({
    amount: "",
    category: "food",
    description: "",
    date: new Date().toISOString().split("T")[0],
  });
  const [formLoading, setFormLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");

  const selected = months[selectedIdx];

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    console.log(
      `[EXPENSES PAGE] Fetching: year=${selected.year} month=${selected.month}`,
    );
    try {
      const res = await api.get(`/expenses/by-month/${userId}`, {
        params: { year: selected.year, month: selected.month },
      });
      const sortedExpenses = [...(res.data.expenses || [])].sort((a, b) =>
        String(b._id || "").localeCompare(String(a._id || "")),
      );
      console.log(
        `[EXPENSES PAGE] Got ${sortedExpenses.length} expenses, total=₹${res.data.total}`,
      );
      setData({ ...res.data, expenses: sortedExpenses });
    } catch (err) {
      console.error("[EXPENSES PAGE] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId, selected.year, selected.month]);

  // Fetch charts data (income vs expense, monthly bar)
  useEffect(() => {
    async function fetchCharts() {
      try {
        const [ie, mb] = await Promise.all([
          api.get(`/insights/income-vs-expense/${userId}`),
          api.get(`/expenses/monthly/${userId}`),
        ]);
        setIncexp(ie.data);
        setMonthlyBar(mb.data);
        console.log("[EXPENSES PAGE] Charts loaded");
      } catch (err) {
        console.error("[EXPENSES PAGE] Charts error:", err);
      }
    }
    fetchCharts();
  }, [userId]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  async function handleAddExpense(e) {
    e.preventDefault();
    if (!form.amount || parseFloat(form.amount) <= 0) {
      setErrorMsg("Please enter a valid amount.");
      return;
    }
    setFormLoading(true);
    setSuccessMsg("");
    setErrorMsg("");

    console.log(
      `[EXPENSES PAGE] Adding expense: amount=${form.amount} category=${form.category}`,
    );

    try {
      const res = await api.post("/expenses/add", {
        userId,
        amount: parseFloat(form.amount),
        category: form.category,
        description: form.description || form.category,
        date: form.date,
        source: "manual",
      });
      console.log("[EXPENSES PAGE] Expense added:", res.data);
      setSuccessMsg(`✓ ₹${form.amount} added to ${form.category}`);
      setForm({
        amount: "",
        category: "food",
        description: "",
        date: new Date().toISOString().split("T")[0],
      });
      fetchExpenses();
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      console.error("[EXPENSES PAGE] Add expense error:", err);
      setErrorMsg("Failed to add expense. Try again.");
    } finally {
      setFormLoading(false);
    }
  }

  const areaData = incexp
    ? incexp.months.map((m, i) => ({
        month: m,
        income: incexp.income[i],
        expenses: incexp.expenses[i],
      }))
    : [];

  const barData = monthlyBar
    ? monthlyBar.months.map((m, i) => ({
        month: m,
        spend: monthlyBar.totals[i],
      }))
    : [];

  const pieData = data?.breakdown
    ? Object.entries(data.breakdown).map(([name, value]) => ({ name, value }))
    : [];

  function isLongDescription(text) {
    if (!text) return false;
    return text.length > 90 || text.includes("\n") || text.includes("**");
  }

  function getPreviewText(text) {
    if (!text) return "";
    const compact = text.replace(/\s+/g, " ").trim();
    return compact.length > 90 ? `${compact.slice(0, 90)}...` : compact;
  }

  return (
    <div>
      {/* Header */}
      <div className="page-header fade-up">
        <h1 className="page-title">Expenses</h1>
        <p className="page-subtitle">
          Track, log and analyse your spending month by month
        </p>
      </div>

      {/* Month Switcher */}
      <div
        className="fade-up"
        style={{ display: "flex", gap: 8, marginBottom: 24, flexWrap: "wrap" }}
      >
        {months.map((m, i) => (
          <button
            key={i}
            onClick={() => setSelectedIdx(i)}
            style={{
              padding: "8px 16px",
              borderRadius: 10,
              border: `1px solid ${selectedIdx === i ? "var(--green)" : "var(--border)"}`,
              background:
                selectedIdx === i ? "var(--green-dim)" : "transparent",
              color: selectedIdx === i ? "var(--green)" : "var(--text-muted)",
              cursor: "pointer",
              fontSize: 13,
              fontWeight: selectedIdx === i ? 600 : 400,
              transition: "all 0.2s",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>

      {/* Summary Stats */}
      <div className="grid-3 fade-up fade-up-1" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Spent</div>
          <div
            className="stat-value"
            style={{ color: "#ef4444", fontSize: 22 }}
          >
            ₹{(data?.total || 0).toLocaleString("en-IN")}
          </div>
          <div className="stat-sub">{selected.label}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Top Category</div>
          <div
            className="stat-value"
            style={{ fontSize: 18, textTransform: "capitalize" }}
          >
            {CATEGORY_EMOJI[data?.topCategory] || "📦"}{" "}
            {data?.topCategory || "—"}
          </div>
          <div className="stat-sub">
            {data?.topAmount
              ? `₹${data.topAmount.toLocaleString("en-IN")}`
              : "No data"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Transactions</div>
          <div className="stat-value" style={{ fontSize: 22 }}>
            {data?.expenses?.length || 0}
          </div>
          <div className="stat-sub">This month</div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid-2 fade-up fade-up-2" style={{ marginBottom: 24 }}>
        {/* Monthly Spending Bar */}
        <div className="card">
          <div className="card-title">Monthly Spending (6 months)</div>
          {barData.some((d) => d.spend > 0) ? (
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={barData} barSize={28}>
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
                  dataKey="spend"
                  fill="url(#expGrad)"
                  radius={[6, 6, 0, 0]}
                />
                <defs>
                  <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0.3} />
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
              No data yet
            </div>
          )}
        </div>

        {/* Spending Breakdown */}
        <div className="card">
          <div className="card-title">
            Category Breakdown — {selected.label}
          </div>
          {pieData.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {pieData.map(({ name, value }, i) => {
                const pct =
                  data?.total > 0 ? Math.round((value / data.total) * 100) : 0;
                return (
                  <div key={name}>
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        marginBottom: 4,
                        fontSize: 13,
                      }}
                    >
                      <span
                        style={{
                          textTransform: "capitalize",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {CATEGORY_EMOJI[name]} {name}
                      </span>
                      <span style={{ fontWeight: 600 }}>
                        ₹{value.toLocaleString("en-IN")} ({pct}%)
                      </span>
                    </div>
                    <div
                      style={{
                        height: 6,
                        borderRadius: 3,
                        background: "var(--border)",
                      }}
                    >
                      <div
                        style={{
                          height: 6,
                          borderRadius: 3,
                          width: `${pct}%`,
                          background:
                            "linear-gradient(90deg, var(--green), var(--purple))",
                          transition: "width 0.5s ease",
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "32px 0",
                color: "var(--text-muted)",
                fontSize: 14,
              }}
            >
              No expenses for {selected.label}
            </div>
          )}
        </div>
      </div>

      {/* Income vs Expenses Chart */}
      <div className="card fade-up fade-up-3" style={{ marginBottom: 24 }}>
        <div className="card-title">Income vs Expenses (6 months)</div>
        {areaData.some((d) => d.income > 0 || d.expenses > 0) ? (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="incGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00e5a0" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00e5a0" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                </linearGradient>
              </defs>
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
              <Tooltip content={<CustomTooltip />} />
              <Area
                type="monotone"
                dataKey="income"
                stroke="#00e5a0"
                strokeWidth={2}
                fill="url(#incGrad)"
                name="Income"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#expAreaGrad)"
                name="Expenses"
              />
            </AreaChart>
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
            Set your income in chat: "My salary is ₹35,000"
          </div>
        )}
      </div>

      {/* Manual Add Expense Form */}
      <div className="card fade-up fade-up-4" style={{ marginBottom: 24 }}>
        <div className="card-title">Add Expense Manually</div>
        <form onSubmit={handleAddExpense}>
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
                placeholder="e.g. 250"
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
                Category *
              </label>
              <select
                className="input"
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
                style={{ appearance: "none" }}
              >
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_EMOJI[c]} {c.charAt(0).toUpperCase() + c.slice(1)}
                  </option>
                ))}
              </select>
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
                Description
              </label>
              <input
                className="input"
                type="text"
                placeholder="e.g. Zomato lunch"
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
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
                Date
              </label>
              <input
                className="input"
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
          </div>

          {successMsg && (
            <div
              style={{
                background: "var(--green-dim)",
                border: "1px solid rgba(0,229,160,0.2)",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 13,
                color: "var(--green)",
                marginBottom: 12,
              }}
            >
              {successMsg}
            </div>
          )}
          {errorMsg && (
            <div
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1px solid rgba(239,68,68,0.2)",
                borderRadius: 8,
                padding: "10px 14px",
                fontSize: 13,
                color: "#f87171",
                marginBottom: 12,
              }}
            >
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            className="btn-primary"
            disabled={formLoading}
            style={{ width: "100%", padding: 14 }}
          >
            {formLoading ? "Adding..." : "+ Add Expense"}
          </button>
        </form>
      </div>

      {/* Expense Log */}
      <div className="card fade-up fade-up-5">
        <div className="card-title">Expense Log — {selected.label}</div>
        {loading ? (
          <div
            style={{
              textAlign: "center",
              padding: "32px 0",
              color: "var(--text-muted)",
            }}
          >
            Loading...
          </div>
        ) : data?.expenses?.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            {data.expenses.map((exp, i) => (
              <div
                key={exp._id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "13px 0",
                  borderBottom:
                    i < data.expenses.length - 1
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
                      background: "rgba(239,68,68,0.1)",
                      border: "1px solid rgba(239,68,68,0.2)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 16,
                    }}
                  >
                    {CATEGORY_EMOJI[exp.category] || "📦"}
                  </div>
                  <div>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                      }}
                    >
                      {expandedRows[exp._id]
                        ? exp.description || exp.category
                        : getPreviewText(exp.description || exp.category)}
                      {exp.source === "manual" ? (
                        <span
                          style={{
                            marginLeft: 8,
                            fontSize: 10,
                            padding: "2px 6px",
                            borderRadius: 4,
                            background: "var(--purple-dim)",
                            color: "var(--purple)",
                            border: "1px solid rgba(168,85,247,0.2)",
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
                    {isLongDescription(exp.description) && (
                      <>
                        <button
                          onClick={() =>
                            setExpandedRows((prev) => ({
                              ...prev,
                              [exp._id]: !prev[exp._id],
                            }))
                          }
                          style={{
                            marginTop: 4,
                            padding: 0,
                            border: "none",
                            background: "transparent",
                            color: "var(--green)",
                            fontSize: 12,
                            cursor: "pointer",
                          }}
                        >
                          {expandedRows[exp._id]
                            ? "Hide details"
                            : "Show details"}
                        </button>
                        {expandedRows[exp._id] && (
                          <div
                            style={{
                              marginTop: 6,
                              maxHeight: 72,
                              overflowY: "auto",
                              padding: "8px 10px",
                              borderRadius: 8,
                              background: "rgba(255,255,255,0.03)",
                              border: "1px solid var(--border)",
                              fontSize: 12,
                              color: "var(--text-secondary)",
                              lineHeight: 1.45,
                            }}
                          >
                            {exp.description}
                          </div>
                        )}
                      </>
                    )}
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      {new Date(exp.date).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                      {" · "}
                      {exp.category}
                    </div>
                  </div>
                </div>
                <div
                  style={{ fontSize: 16, fontWeight: 700, color: "#ef4444" }}
                >
                  −₹{exp.amount?.toLocaleString("en-IN")}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div
            style={{
              textAlign: "center",
              padding: "32px 0",
              color: "var(--text-muted)",
              fontSize: 14,
            }}
          >
            No expenses for {selected.label}.<br />
            Add one above or tell the chatbot!
          </div>
        )}
      </div>
    </div>
  );
}
