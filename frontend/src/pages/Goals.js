// frontend/src/pages/Goals.jsx
import React, { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

export default function Goals() {
  const userId = localStorage.getItem("userId");
  const navigate = useNavigate();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [depositForm, setDepositForm] = useState({}); // { goalId: amount }
  const [depositLoading, setDepositLoading] = useState({});
  const [depositToast, setDepositToast] = useState({});
  const [openDepositId, setOpenDepositId] = useState(null);

  const fetchGoals = useCallback(async () => {
    console.log("[GOALS PAGE] Fetching goals");
    try {
      const res = await api.get(`/goals/${userId}`);
      console.log(`[GOALS PAGE] Got ${res.data.goals?.length} goals`);
      setGoals(res.data.goals || []);
    } catch (err) {
      console.error("[GOALS PAGE] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchGoals();
  }, [fetchGoals]);

  async function handleDeposit(goal) {
    const amount = parseFloat(depositForm[goal._id]);
    if (!amount || amount <= 0) {
      setDepositToast({
        ...depositToast,
        [goal._id]: { msg: "Enter a valid amount", type: "error" },
      });
      return;
    }

    console.log(
      `[GOALS PAGE] Depositing ₹${amount} to goal: ${goal.title} (${goal._id})`,
    );
    setDepositLoading({ ...depositLoading, [goal._id]: true });

    try {
      // Add to savings with goal link; backend also updates goal progress.
      await api.post("/savings/add", {
        userId,
        amount,
        note: `Goal deposit: ${goal.title}`,
        linkedGoalId: goal._id,
        source: "manual",
      });
      console.log(`[GOALS PAGE] Saving added with linkedGoalId=${goal._id}`);

      setDepositToast({
        ...depositToast,
        [goal._id]: { msg: `✓ ₹${amount} added!`, type: "success" },
      });
      setDepositForm({ ...depositForm, [goal._id]: "" });
      setOpenDepositId(null);
      fetchGoals();
      setTimeout(
        () => setDepositToast((t) => ({ ...t, [goal._id]: null })),
        3000,
      );
    } catch (err) {
      console.error(`[GOALS PAGE] Deposit error for goal ${goal._id}:`, err);
      setDepositToast({
        ...depositToast,
        [goal._id]: { msg: "Failed. Try again.", type: "error" },
      });
    } finally {
      setDepositLoading({ ...depositLoading, [goal._id]: false });
    }
  }

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
            Track your savings goals and add money to them directly
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
              "I want to save ₹10,000 for a Goa trip by June"
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
            const toast = depositToast[goal._id];
            const isDepositOpen = openDepositId === goal._id;

            return (
              <div
                key={goal._id}
                className={`card fade-up fade-up-${i + 1}`}
                style={{ position: "relative", overflow: "hidden" }}
              >
                {/* Top glow line */}
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

                {/* Monthly contribution badge */}
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
                      marginBottom: 12,
                    }}
                  >
                    ◈ Save ₹{goal.monthlyContribution?.toLocaleString("en-IN")}
                    /month to stay on track
                  </div>
                )}

                {/* Add Money button + inline form */}
                {!isComplete && (
                  <div style={{ marginTop: 8 }}>
                    {!isDepositOpen ? (
                      <button
                        onClick={() => setOpenDepositId(goal._id)}
                        className="btn-primary"
                        style={{ padding: "8px 20px", fontSize: 13 }}
                      >
                        + Add Money
                      </button>
                    ) : (
                      <div
                        style={{
                          marginTop: 4,
                          padding: 16,
                          borderRadius: 12,
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid var(--border)",
                        }}
                      >
                        <div
                          style={{
                            fontSize: 13,
                            color: "var(--text-muted)",
                            marginBottom: 10,
                          }}
                        >
                          Add money towards{" "}
                          <strong style={{ color: "var(--text-primary)" }}>
                            {goal.title}
                          </strong>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            gap: 10,
                            alignItems: "center",
                          }}
                        >
                          <input
                            className="input"
                            type="number"
                            min="1"
                            placeholder="Amount (₹)"
                            value={depositForm[goal._id] || ""}
                            onChange={(e) =>
                              setDepositForm({
                                ...depositForm,
                                [goal._id]: e.target.value,
                              })
                            }
                            style={{ flex: 1 }}
                          />
                          <button
                            onClick={() => handleDeposit(goal)}
                            className="btn-primary"
                            disabled={depositLoading[goal._id]}
                            style={{ padding: "10px 20px", flexShrink: 0 }}
                          >
                            {depositLoading[goal._id] ? "Saving..." : "Save"}
                          </button>
                          <button
                            onClick={() => setOpenDepositId(null)}
                            style={{
                              padding: "10px 14px",
                              borderRadius: 10,
                              border: "1px solid var(--border)",
                              background: "transparent",
                              color: "var(--text-muted)",
                              cursor: "pointer",
                              fontSize: 13,
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                        {toast && (
                          <div
                            style={{
                              marginTop: 10,
                              padding: "8px 12px",
                              borderRadius: 8,
                              fontSize: 13,
                              background:
                                toast.type === "success"
                                  ? "var(--green-dim)"
                                  : "rgba(239,68,68,0.08)",
                              color:
                                toast.type === "success"
                                  ? "var(--green)"
                                  : "#f87171",
                              border: `1px solid ${toast.type === "success" ? "rgba(0,229,160,0.2)" : "rgba(239,68,68,0.2)"}`,
                            }}
                          >
                            {toast.msg}
                          </div>
                        )}
                      </div>
                    )}
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
