//savings.js
import React, { useEffect, useState } from "react";
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
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    api
      .get(`/savings/list/${userId}`)
      .then((r) => setData(r.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

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
            Log savings by telling the AI — "I saved ₹500 today"
          </p>
        </div>
        <button className="btn-primary" onClick={() => navigate("/chat")}>
          + Log via Chat
        </button>
      </div>

      {/* Stat row */}
      <div className="grid-3 fade-up fade-up-1" style={{ marginBottom: 24 }}>
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
          <div className="stat-label">Total Entries</div>
          <div className="stat-value">{data?.entries?.length || 0}</div>
          <div className="stat-sub">Savings logged</div>
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

      {/* Entries list */}
      <div className="card fade-up fade-up-3">
        <div className="card-title">Savings Log</div>
        {data?.entries?.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
            {data.entries.slice(0, 20).map((entry, i) => (
              <div
                key={entry._id}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "13px 0",
                  borderBottom:
                    i < data.entries.length - 1
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
                    ◇
                  </div>
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {entry.note || "Savings"}
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
              padding: "32px 0",
              color: "var(--text-muted)",
              fontSize: 14,
            }}
          >
            No savings logged yet.
            <br />
            Tell the AI "I saved ₹500 today" to get started.
          </div>
        )}
      </div>
    </div>
  );
}
