// frontend/src/pages/Income.jsx
import React, { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
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
      {label && (
        <div style={{ color: "var(--text-muted)", marginBottom: 4 }}>
          {label}
        </div>
      )}
      {payload.map((p, i) => (
        <div key={i} style={{ color: p.color }}>
          {p.name}: ₹{p.value?.toLocaleString("en-IN")}
        </div>
      ))}
    </div>
  );
};

export default function Income() {
  const userId = localStorage.getItem("userId");
  const [summary, setSummary] = useState(null);
  const [incexp, setIncexp] = useState(null);
  const [loading, setLoading] = useState(true);
  const [incomeInput, setIncomeInput] = useState("");
  const [updating, setUpdating] = useState(false);
  const [toast, setToast] = useState("");

  async function fetchData() {
    console.log("[INCOME PAGE] Fetching data for userId:", userId);
    try {
      const [s, ie] = await Promise.all([
        api.get(`/expenses/summary/${userId}`),
        api.get(`/insights/income-vs-expense/${userId}`),
      ]);
      console.log("[INCOME PAGE] Summary:", s.data);
      setSummary(s.data);
      setIncexp(ie.data);
    } catch (err) {
      console.error("[INCOME PAGE] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchData();
  }, [userId]);

  async function handleUpdateIncome(e) {
    e.preventDefault();
    if (!incomeInput || parseFloat(incomeInput) <= 0) return;
    setUpdating(true);
    console.log(`[INCOME PAGE] Updating income to ₹${incomeInput}`);
    try {
      await api.put(`/user/update-income/${userId}`, {
        monthlyIncome: parseFloat(incomeInput),
      });
      console.log("[INCOME PAGE] Income updated successfully");
      setToast("✓ Income updated!");
      setIncomeInput("");
      fetchData();
      setTimeout(() => setToast(""), 3000);
    } catch (err) {
      console.error("[INCOME PAGE] Update income error:", err);
      setToast("Failed to update income.");
    } finally {
      setUpdating(false);
    }
  }

  const income = incexp?.income?.[5] || 0;
  const spent = summary?.total || 0;
  const remaining = income - spent;
  const spentPct =
    income > 0 ? Math.min(100, Math.round((spent / income) * 100)) : 0;
  const savingsRate =
    income > 0 ? Math.max(0, Math.round(((income - spent) / income) * 100)) : 0;

  const areaData = incexp
    ? incexp.months.map((m, i) => ({
        month: m,
        income: incexp.income[i],
        expenses: incexp.expenses[i],
      }))
    : [];

  if (loading)
    return (
      <div
        style={{ color: "var(--text-muted)", padding: 40, textAlign: "center" }}
      >
        Loading income data...
      </div>
    );

  return (
    <div>
      <div className="page-header fade-up">
        <h1 className="page-title">Income</h1>
        <p className="page-subtitle">
          Track your income, spending and remaining budget
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid-4 fade-up fade-up-1" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Monthly Income</div>
          <div className="stat-value stat-green" style={{ fontSize: 20 }}>
            ₹{income.toLocaleString("en-IN")}
          </div>
          <div className="stat-sub">This month</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Spent</div>
          <div
            className="stat-value"
            style={{ fontSize: 20, color: "#ef4444" }}
          >
            ₹{spent.toLocaleString("en-IN")}
          </div>
          <div className="stat-sub">{spentPct}% of income</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Remaining</div>
          <div
            className="stat-value"
            style={{
              fontSize: 20,
              color: remaining >= 0 ? "var(--green)" : "#ef4444",
            }}
          >
            ₹{Math.abs(remaining).toLocaleString("en-IN")}
          </div>
          <div
            className="stat-sub"
            style={{ color: remaining >= 0 ? "var(--green)" : "#ef4444" }}
          >
            {remaining >= 0 ? "available" : "over budget!"}
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Savings Rate</div>
          <div className="stat-value stat-purple" style={{ fontSize: 20 }}>
            {savingsRate}%
          </div>
          <div className="stat-sub">
            {savingsRate >= 20 ? "✓ On target" : "Target: 20%"}
          </div>
        </div>
      </div>

      {/* Budget Bar */}
      <div className="card fade-up fade-up-2" style={{ marginBottom: 24 }}>
        <div className="card-title">Budget Used This Month</div>
        <div
          style={{
            marginBottom: 8,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 13,
            color: "var(--text-muted)",
          }}
        >
          <span>₹{spent.toLocaleString("en-IN")} spent</span>
          <span>{spentPct}%</span>
        </div>
        <div
          style={{
            height: 16,
            borderRadius: 8,
            background: "var(--border)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              height: "100%",
              width: `${spentPct}%`,
              borderRadius: 8,
              background:
                spentPct > 90
                  ? "linear-gradient(90deg, #ef4444, #dc2626)"
                  : spentPct > 70
                    ? "linear-gradient(90deg, #f59e0b, #d97706)"
                    : "linear-gradient(90deg, var(--green), var(--purple))",
              transition: "width 0.5s ease",
            }}
          />
        </div>
        <div
          style={{
            marginTop: 8,
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: "var(--text-muted)",
          }}
        >
          <span>₹0</span>
          <span style={{ color: remaining >= 0 ? "var(--green)" : "#ef4444" }}>
            {remaining >= 0
              ? `₹${remaining.toLocaleString("en-IN")} remaining`
              : `₹${Math.abs(remaining).toLocaleString("en-IN")} over budget`}
          </span>
          <span>₹{income.toLocaleString("en-IN")}</span>
        </div>
      </div>

      {/* Update Income Form */}
      <div className="card fade-up fade-up-3" style={{ marginBottom: 24 }}>
        <div className="card-title">Update Monthly Income</div>
        <form
          onSubmit={handleUpdateIncome}
          style={{ display: "flex", gap: 12, alignItems: "flex-end" }}
        >
          <div style={{ flex: 1 }}>
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
              New Monthly Income (₹)
            </label>
            <input
              className="input"
              type="number"
              min="1"
              placeholder="e.g. 35000"
              value={incomeInput}
              onChange={(e) => setIncomeInput(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="btn-primary"
            disabled={updating}
            style={{ padding: "12px 24px", flexShrink: 0 }}
          >
            {updating ? "Saving..." : "Update"}
          </button>
        </form>
        {toast && (
          <div
            style={{
              marginTop: 12,
              padding: "10px 14px",
              borderRadius: 8,
              background: "var(--green-dim)",
              border: "1px solid rgba(0,229,160,0.2)",
              fontSize: 13,
              color: "var(--green)",
            }}
          >
            {toast}
          </div>
        )}
      </div>

      {/* Income vs Expenses Chart */}
      <div className="card fade-up fade-up-4">
        <div className="card-title">Income vs Expenses (6 months)</div>
        {areaData.some((d) => d.income > 0 || d.expenses > 0) ? (
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="incGrad2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00e5a0" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00e5a0" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expGrad2" x1="0" y1="0" x2="0" y2="1">
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
                fill="url(#incGrad2)"
                name="Income"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#ef4444"
                strokeWidth={2}
                fill="url(#expGrad2)"
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
            Set your income in the chatbot: "My salary is ₹35,000"
          </div>
        )}
      </div>
    </div>
  );
}
