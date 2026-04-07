//Goals.js
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function Goals() {
  const userId = localStorage.getItem("userId");
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get(`/goals/${userId}`)
      .then((r) => setGoals(r.data.goals || []))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading)
    return (
      <div
        style={{ color: "var(--text-muted)", padding: 40, textAlign: "center" }}
      >
        Loading goals...
      </div>
    );

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
          <h1 className="page-title">Goals</h1>
          <p className="page-subtitle">
            Track your savings goals — create them by chatting with FinMind AI
          </p>
        </div>
        <button
          className="btn-primary"
          onClick={() => navigate("/chat")}
          style={{ flexShrink: 0 }}
        >
          + New Goal via Chat
        </button>
      </div>

      {goals.length === 0 ? (
        <div
          className="card fade-up"
          style={{ textAlign: "center", padding: "60px 24px" }}
        >
          <div style={{ fontSize: 40, marginBottom: 16 }}>◎</div>
          <h3 style={{ fontFamily: "var(--font-display)", marginBottom: 8 }}>
            No goals yet
          </h3>
          <p
            style={{
              color: "var(--text-secondary)",
              marginBottom: 24,
              fontSize: 14,
            }}
          >
            Go to AI Chat and type something like
            <br />
            <em style={{ color: "var(--green)" }}>
              "I want to save ₹10,000 for a Goa trip by December"
            </em>
          </p>
          <button className="btn-primary" onClick={() => navigate("/chat")}>
            Open Chat →
          </button>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {goals.map((goal, i) => {
            const pct = Math.min(100, goal.progress || 0);
            const isComplete = goal.status === "completed";
            return (
              <div
                key={goal._id}
                className={`card fade-up fade-up-${i + 1}`}
                style={{ position: "relative", overflow: "hidden" }}
              >
                {/* Glow line top */}
                <div
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    right: 0,
                    height: 2,
                    background: isComplete
                      ? "linear-gradient(90deg, var(--green), #00b8d4)"
                      : "linear-gradient(90deg, var(--purple), var(--pink))",
                  }}
                />

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    marginBottom: 16,
                  }}
                >
                  <div>
                    <h3
                      style={{
                        fontFamily: "var(--font-display)",
                        fontSize: 18,
                        fontWeight: 700,
                        marginBottom: 4,
                      }}
                    >
                      {goal.title}
                    </h3>
                    {goal.reason && (
                      <p
                        style={{ color: "var(--text-secondary)", fontSize: 13 }}
                      >
                        {goal.reason}
                      </p>
                    )}
                  </div>
                  <span
                    className={`badge ${isComplete ? "badge-green" : goal.onTrack ? "badge-purple" : "badge-red"}`}
                  >
                    {isComplete
                      ? "✓ Complete"
                      : goal.onTrack
                        ? "On Track"
                        : "At Risk"}
                  </span>
                </div>

                {/* Progress */}
                <div style={{ marginBottom: 16 }}>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{ fontSize: 13, color: "var(--text-secondary)" }}
                    >
                      ₹{(goal.savedSoFar || 0).toLocaleString("en-IN")} saved
                    </span>
                    <span
                      style={{
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--green)",
                      }}
                    >
                      {pct}%
                    </span>
                  </div>
                  <div className="progress-track">
                    <div
                      className="progress-fill"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      marginTop: 8,
                    }}
                  >
                    <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Target: ₹{goal.targetAmount?.toLocaleString("en-IN")}
                    </span>
                    {goal.monthsRemaining !== null && (
                      <span
                        style={{ fontSize: 12, color: "var(--text-muted)" }}
                      >
                        {goal.monthsRemaining} months left
                      </span>
                    )}
                  </div>
                </div>

                {/* Monthly contribution */}
                {goal.monthlyContribution > 0 && (
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 8,
                      background: "var(--purple-dim)",
                      border: "1px solid rgba(168,85,247,0.2)",
                      borderRadius: 8,
                      padding: "6px 12px",
                      fontSize: 13,
                      color: "var(--purple)",
                    }}
                  >
                    ◈ Save ₹{goal.monthlyContribution?.toLocaleString("en-IN")}
                    /month to stay on track
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
