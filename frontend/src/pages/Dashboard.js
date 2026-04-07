//DAshboard.js

import React, { useEffect, useState } from "react";
import {
  PieChart,
  Pie,
  Cell,
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

const COLORS = [
  "#00e5a0",
  "#a855f7",
  "#ec4899",
  "#f59e0b",
  "#3b82f6",
  "#64748b",
];

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

export default function Dashboard() {
  const userId = localStorage.getItem("userId");
  const name = localStorage.getItem("name") || "User";
  const [summary, setSummary] = useState(null);
  const [monthly, setMonthly] = useState(null);
  const [incexp, setIncexp] = useState(null);
  const [savings, setSavings] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [s, m, ie, sv] = await Promise.all([
          api.get(`/expenses/summary/${userId}`),
          api.get(`/expenses/monthly/${userId}`),
          api.get(`/insights/income-vs-expense/${userId}`),
          api.get(`/savings/list/${userId}`),
        ]);
        setSummary(s.data);
        setMonthly(m.data);
        setIncexp(ie.data);
        setSavings(sv.data);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const pieData = summary?.breakdown
    ? Object.entries(summary.breakdown).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  const barData = monthly
    ? monthly.months.map((m, i) => ({ month: m, spend: monthly.totals[i] }))
    : [];

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
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          height: "60vh",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              fontSize: 32,
              marginBottom: 12,
              animation: "spin 2s linear infinite",
            }}
          >
            ✦
          </div>
          <p style={{ color: "var(--text-muted)" }}>Loading your finances...</p>
        </div>
      </div>
    );

  return (
    <div>
      {/* Header */}
      <div className="page-header fade-up">
        <h1 className="page-title">
          {greeting}, {name.split(" ")[0]} 👋
        </h1>
        <p className="page-subtitle">
          Here's your financial overview for this month
        </p>
      </div>

      {/* Stat cards row */}
      <div className="grid-4 fade-up fade-up-1" style={{ marginBottom: 24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Spent</div>
          <div className="stat-value" style={{ fontSize: 22 }}>
            ₹{(summary?.total || 0).toLocaleString("en-IN")}
          </div>
          <div className="stat-sub">This month</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Saved</div>
          <div className="stat-value stat-green" style={{ fontSize: 22 }}>
            ₹{(savings?.thisMonth || 0).toLocaleString("en-IN")}
          </div>
          <div className="stat-sub">This month</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Saving Streak</div>
          <div className="stat-value stat-purple" style={{ fontSize: 22 }}>
            {savings?.entries?.length > 0 ? "🔥 Active" : "—"}
          </div>
          <div className="stat-sub">Keep it going!</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Top Category</div>
          <div
            className="stat-value"
            style={{ fontSize: 18, textTransform: "capitalize" }}
          >
            {summary?.topCategory || "—"}
          </div>
          <div className="stat-sub">Highest spend</div>
        </div>
      </div>

      {/* Charts row */}
      <div className="grid-2 fade-up fade-up-2" style={{ marginBottom: 24 }}>
        {/* Spending breakdown pie */}
        <div className="card">
          <div className="card-title">Spending Breakdown</div>
          {pieData.length > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <ResponsiveContainer width={160} height={160}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip content={<CustomTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ flex: 1 }}>
                {pieData.map((d, i) => (
                  <div
                    key={d.name}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 8 }}
                    >
                      <div
                        style={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          background: COLORS[i % COLORS.length],
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 13,
                          textTransform: "capitalize",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {d.name}
                      </span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>
                      ₹{d.value.toLocaleString("en-IN")}
                    </span>
                  </div>
                ))}
              </div>
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
              No expenses logged yet.
              <br />
              Start chatting to add expenses!
            </div>
          )}
        </div>

        {/* Monthly bar chart */}
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
                  fill="url(#barGrad)"
                  radius={[6, 6, 0, 0]}
                />
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#00e5a0" />
                    <stop offset="100%" stopColor="#a855f7" stopOpacity={0.6} />
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
      </div>

      {/* Income vs Expense area chart */}
      <div className="card fade-up fade-up-3">
        <div className="card-title">Income vs Expenses</div>
        {areaData.some((d) => d.income > 0 || d.expenses > 0) ? (
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={areaData}>
              <defs>
                <linearGradient id="incomeGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00e5a0" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#00e5a0" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#a855f7" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#a855f7" stopOpacity={0} />
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
                fill="url(#incomeGrad)"
                name="Income"
              />
              <Area
                type="monotone"
                dataKey="expenses"
                stroke="#a855f7"
                strokeWidth={2}
                fill="url(#expGrad)"
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
            Set your income by typing "My salary is ₹35,000" in the chat
          </div>
        )}
      </div>

      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
