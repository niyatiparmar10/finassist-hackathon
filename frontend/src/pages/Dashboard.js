// frontend/src/pages/Dashboard.jsx

import React, { useEffect, useState, useCallback } from "react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
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

const TODO_TYPE = {
  pay: {
    label: "Pay",
    color: "#ec4899",
    icon: "↑",
    bg: "rgba(236,72,153,0.1)",
  },
  collect: {
    label: "Collect",
    color: "#00e5a0",
    icon: "↓",
    bg: "rgba(0,229,160,0.1)",
  },
  reminder: {
    label: "Reminder",
    color: "#f59e0b",
    icon: "⏰",
    bg: "rgba(245,158,11,0.1)",
  },
  other: {
    label: "Other",
    color: "#a855f7",
    icon: "◈",
    bg: "rgba(168,85,247,0.1)",
  },
};

const NOTIF_COLORS = {
  warning: { border: "#f59e0b", icon: "⚠", bg: "rgba(245,158,11,0.08)" },
  danger: { border: "#ef4444", icon: "🚨", bg: "rgba(239,68,68,0.08)" },
  info: { border: "#3b82f6", icon: "ℹ", bg: "rgba(59,130,246,0.08)" },
  positive: { border: "#00e5a0", icon: "✓", bg: "rgba(0,229,160,0.08)" },
};

function isOnSpendingSpree(summary, income, dayOfMonth) {
  if (!income || income === 0 || !summary?.total) return false;
  const halfMonthBudget = income * 0.4;
  if (dayOfMonth <= 15 && summary.total >= halfMonthBudget) return true;
  return false;
}

export default function Dashboard() {
  const userId = localStorage.getItem("userId");
  const name = localStorage.getItem("name") || "User";

  const [summary, setSummary] = useState(null);
  const [savings, setSavings] = useState(null);
  const [goals, setGoals] = useState([]);
  const [investments, setInvestments] = useState(null);
  const [userIncome, setUserIncome] = useState(0);
  const [loading, setLoading] = useState(true);

  const [notifications, setNotifications] = useState([]);
  const [dismissedNotifs, setDismissedNotifs] = useState(() => {
    try {
      return JSON.parse(sessionStorage.getItem("dismissed_notifs") || "[]");
    } catch {
      return [];
    }
  });

  const [todos, setTodos] = useState([]);
  const [todoInput, setTodoInput] = useState("");
  const [todoType, setTodoType] = useState("other");
  const [todoAmount, setTodoAmount] = useState("");
  const [todoPerson, setTodoPerson] = useState("");
  const [todoFormOpen, setTodoFormOpen] = useState(false);
  const [editingTodo, setEditingTodo] = useState(null);
  const [todoLoading, setTodoLoading] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const [s, sv, g, inv, userProfile] = await Promise.all([
          api.get(`/expenses/summary/${userId}`),
          api.get(`/savings/list/${userId}`),
          api.get(`/goals/${userId}`),
          api.get(`/investments/${userId}`).catch(() => ({ data: null })),
          api
            .get(`/user/financial-profile/${userId}`)
            .catch(() => ({ data: null })),
        ]);

        setSummary(s.data);
        setSavings(sv.data);
        setGoals(g.data?.goals || []);
        setInvestments(inv.data);

        const income = userProfile.data?.monthly_income || 0;
        setUserIncome(income);
      } catch (e) {
        console.error("[DASHBOARD] Load error:", e.message);
      } finally {
        setLoading(false);
      }
    }
    load();
    loadTodos();
  }, [userId]);

  useEffect(() => {
    if (loading) return;
    const notifs = [];
    const today = new Date();
    const dayOfMonth = today.getDate();

    goals.forEach((g) => {
      if (
        g.monthsRemaining !== null &&
        g.monthsRemaining <= 2 &&
        g.progress < 80
      ) {
        notifs.push({
          id: `goal-${g._id}`,
          type: "warning",
          msg: `"${g.title}" is due in ${g.monthsRemaining} month${g.monthsRemaining !== 1 ? "s" : ""} but only ${g.progress}% done. Add money now!`,
        });
      }
    });

    if ((savings?.thisMonth || 0) === 0 && dayOfMonth > 10) {
      notifs.push({
        id: "no-savings",
        type: "warning",
        msg: `You haven't saved anything this month yet. Even ₹100 counts — start now!`,
      });
    }

    if (
      summary?.total > 0 &&
      userIncome > 0 &&
      summary.total / userIncome > 0.8
    ) {
      notifs.push({
        id: "high-spend",
        type: "danger",
        msg: `You've spent ₹${summary.total.toLocaleString("en-IN")} — over 80% of your ₹${userIncome.toLocaleString("en-IN")} income. Consider pausing non-essential spending.`,
      });
    }

    if (isOnSpendingSpree(summary, userIncome, dayOfMonth)) {
      notifs.push({
        id: "spending-spree",
        type: "danger",
        msg: `Spending spree alert! You've spent ₹${summary.total.toLocaleString("en-IN")} in just ${dayOfMonth} days — that's ${Math.round((summary.total / userIncome) * 100)}% of your income already.`,
      });
    }

    if (investments?.summary?.activeCount > 0) {
      notifs.push({
        id: "investments-info",
        type: "info",
        msg: `You have ${investments.summary.activeCount} active investment(s) with ₹${investments.summary.totalMonthlyCommitment.toLocaleString("en-IN")}/month committed. Free surplus: ₹${investments.summary.availableSurplus.toLocaleString("en-IN")}/month.`,
      });
    }

    if (
      savings?.thisMonth > 0 &&
      userIncome > 0 &&
      savings.thisMonth / userIncome >= 0.2
    ) {
      notifs.push({
        id: "good-savings",
        type: "positive",
        msg: `Great job! You've saved ₹${savings.thisMonth.toLocaleString("en-IN")} this month — that's ${Math.round((savings.thisMonth / userIncome) * 100)}% of your income. You're hitting the 20% target! 🎉`,
      });
    }

    setNotifications(notifs);
  }, [loading, summary, savings, goals, investments, userIncome]);

  function dismissNotif(id) {
    const updated = [...dismissedNotifs, id];
    setDismissedNotifs(updated);
    sessionStorage.setItem("dismissed_notifs", JSON.stringify(updated));
  }

  async function loadTodos() {
    try {
      const { data } = await api.get(`/todos/${userId}`);
      setTodos(data.todos || []);
    } catch (err) {
      console.error("[TODOS] Fetch error:", err.message);
    }
  }

  async function addTodo(e) {
    e.preventDefault();
    if (!todoInput.trim()) return;
    setTodoLoading(true);
    try {
      await api.post("/todos/add", {
        userId,
        text: todoInput,
        type: todoType,
        amount: todoAmount || null,
        person: todoPerson || "",
      });
      setTodoInput("");
      setTodoAmount("");
      setTodoPerson("");
      setTodoType("other");
      setTodoFormOpen(false);
      await loadTodos();
    } catch (err) {
      console.error("[TODOS] Add error:", err.message);
    } finally {
      setTodoLoading(false);
    }
  }

  async function toggleTodo(id) {
    try {
      await api.put(`/todos/toggle/${id}`);
      await loadTodos();
    } catch (err) {
      console.error("[TODOS] Toggle error:", err.message);
    }
  }

  async function deleteTodo(id) {
    try {
      await api.delete(`/todos/${id}`);
      await loadTodos();
    } catch (err) {
      console.error("[TODOS] Delete error:", err.message);
    }
  }

  async function saveEditTodo() {
    if (!editingTodo) return;
    try {
      await api.put(`/todos/edit/${editingTodo.id}`, {
        text: editingTodo.text,
        type: editingTodo.type,
        amount: editingTodo.amount || null,
        person: editingTodo.person || "",
      });
      setEditingTodo(null);
      await loadTodos();
    } catch (err) {
      console.error("[TODOS] Edit error:", err.message);
    }
  }

  async function clearCompleted() {
    try {
      await api.delete(`/todos/clear-completed/${userId}`);
      await loadTodos();
    } catch (err) {
      console.error("[TODOS] Clear completed error:", err.message);
    }
  }

  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  const pieData = summary?.breakdown
    ? Object.entries(summary.breakdown).map(([name, value]) => ({
        name,
        value,
      }))
    : [];

  const visibleNotifs = notifications.filter(
    (n) => !dismissedNotifs.includes(n.id),
  );
  const completedTodos = todos.filter((t) => t.completed);
  const incompleteTodos = todos.filter((t) => !t.completed);

  if (loading) {
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
  }

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

      {/* Notifications */}
      {visibleNotifs.length > 0 && (
        <div className="fade-up" style={{ marginBottom: 24 }}>
          <div
            style={{
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
              color: "var(--text-muted)",
              marginBottom: 10,
            }}
          >
            Alerts & Insights
          </div>
          <div
            style={{
              display: "flex",
              gap: 12,
              overflowX: "auto",
              paddingBottom: 4,
            }}
          >
            {visibleNotifs.map((notif) => {
              const cfg = NOTIF_COLORS[notif.type] || NOTIF_COLORS.info;
              return (
                <div
                  key={notif.id}
                  style={{
                    minWidth: 280,
                    maxWidth: 340,
                    flexShrink: 0,
                    background: cfg.bg,
                    border: `1px solid ${cfg.border}40`,
                    borderLeft: `3px solid ${cfg.border}`,
                    borderRadius: 12,
                    padding: "12px 14px",
                    display: "flex",
                    gap: 10,
                    alignItems: "flex-start",
                  }}
                >
                  <span style={{ fontSize: 16, flexShrink: 0 }}>
                    {cfg.icon}
                  </span>
                  <p
                    style={{
                      fontSize: 13,
                      color: "rgba(240,240,248,0.85)",
                      lineHeight: 1.5,
                      flex: 1,
                      margin: 0,
                    }}
                  >
                    {notif.msg}
                  </p>
                  <button
                    onClick={() => dismissNotif(notif.id)}
                    style={{
                      background: "transparent",
                      border: "none",
                      color: "var(--text-muted)",
                      cursor: "pointer",
                      fontSize: 14,
                      flexShrink: 0,
                      lineHeight: 1,
                    }}
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Stat cards */}
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

      {/* Main: Spending Breakdown (left) + Todo (right) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 24,
          alignItems: "start",
        }}
      >
        {/* Spending Breakdown pie */}
        <div className="card fade-up fade-up-2">
          <div className="card-title">Spending Breakdown</div>
          {pieData.length > 0 ? (
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <ResponsiveContainer width={200} height={200}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={85}
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
                      marginBottom: 12,
                    }}
                  >
                    <div
                      style={{ display: "flex", alignItems: "center", gap: 10 }}
                    >
                      <div
                        style={{
                          width: 10,
                          height: 10,
                          borderRadius: "50%",
                          background: COLORS[i % COLORS.length],
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          fontSize: 14,
                          textTransform: "capitalize",
                          color: "var(--text-secondary)",
                        }}
                      >
                        {d.name}
                      </span>
                    </div>
                    <span style={{ fontSize: 14, fontWeight: 600 }}>
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
                padding: "48px 0",
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

        {/* To-Do List */}
        <div
          className="card fade-up fade-up-2"
          style={{
            position: "sticky",
            top: 20,
            maxHeight: "80vh",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginBottom: 16,
            }}
          >
            <div className="card-title" style={{ marginBottom: 0 }}>
              My List
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              {completedTodos.length > 0 && (
                <button
                  onClick={clearCompleted}
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    background: "transparent",
                    border: "1px solid var(--border)",
                    borderRadius: 6,
                    padding: "3px 8px",
                    cursor: "pointer",
                  }}
                >
                  Clear done
                </button>
              )}
              <button
                onClick={() => setTodoFormOpen((v) => !v)}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 8,
                  background: "var(--green-dim)",
                  border: "1px solid rgba(0,229,160,0.25)",
                  color: "var(--green)",
                  fontSize: 18,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {todoFormOpen ? "−" : "+"}
              </button>
            </div>
          </div>

          {todoFormOpen && (
            <form
              onSubmit={addTodo}
              style={{
                marginBottom: 14,
                padding: 12,
                background: "rgba(255,255,255,0.03)",
                borderRadius: 10,
                border: "1px solid var(--border)",
              }}
            >
              <input
                className="input"
                placeholder="What do you need to do?"
                value={todoInput}
                onChange={(e) => setTodoInput(e.target.value)}
                style={{ marginBottom: 8, fontSize: 13 }}
                required
              />
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 8,
                  marginBottom: 8,
                }}
              >
                <select
                  className="input"
                  value={todoType}
                  onChange={(e) => setTodoType(e.target.value)}
                  style={{
                    fontSize: 12,
                    padding: "8px 10px",
                    appearance: "none",
                  }}
                >
                  <option value="pay">↑ Pay someone</option>
                  <option value="collect">↓ Collect money</option>
                  <option value="reminder">⏰ Reminder</option>
                  <option value="other">◈ Other</option>
                </select>
                <input
                  className="input"
                  type="number"
                  placeholder="Amount (opt.)"
                  value={todoAmount}
                  onChange={(e) => setTodoAmount(e.target.value)}
                  style={{ fontSize: 12 }}
                />
              </div>
              <input
                className="input"
                placeholder="Person (optional)"
                value={todoPerson}
                onChange={(e) => setTodoPerson(e.target.value)}
                style={{ marginBottom: 8, fontSize: 12 }}
              />
              <button
                type="submit"
                className="btn-primary"
                disabled={todoLoading}
                style={{ width: "100%", padding: "9px", fontSize: 13 }}
              >
                {todoLoading ? "Adding..." : "Add to list"}
              </button>
            </form>
          )}

          <div
            style={{
              flex: 1,
              overflowY: "auto",
              display: "flex",
              flexDirection: "column",
              gap: 0,
            }}
          >
            {todos.length === 0 && (
              <div
                style={{
                  textAlign: "center",
                  padding: "32px 0",
                  color: "var(--text-muted)",
                  fontSize: 13,
                }}
              >
                <div style={{ fontSize: 28, marginBottom: 8 }}>📋</div>
                Nothing here yet.
                <br />
                Press + to add a task.
              </div>
            )}

            {incompleteTodos.map((todo) => {
              const cfg = TODO_TYPE[todo.type] || TODO_TYPE.other;
              const isEditing = editingTodo?.id === todo._id;
              return (
                <div
                  key={todo._id}
                  style={{
                    padding: "11px 0",
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  {isEditing ? (
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: 6,
                      }}
                    >
                      <input
                        className="input"
                        value={editingTodo.text}
                        style={{ fontSize: 13 }}
                        onChange={(e) =>
                          setEditingTodo({
                            ...editingTodo,
                            text: e.target.value,
                          })
                        }
                      />
                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: 6,
                        }}
                      >
                        <select
                          className="input"
                          value={editingTodo.type}
                          style={{ fontSize: 12, appearance: "none" }}
                          onChange={(e) =>
                            setEditingTodo({
                              ...editingTodo,
                              type: e.target.value,
                            })
                          }
                        >
                          <option value="pay">↑ Pay</option>
                          <option value="collect">↓ Collect</option>
                          <option value="reminder">⏰ Reminder</option>
                          <option value="other">◈ Other</option>
                        </select>
                        <input
                          className="input"
                          type="number"
                          placeholder="Amount"
                          style={{ fontSize: 12 }}
                          value={editingTodo.amount || ""}
                          onChange={(e) =>
                            setEditingTodo({
                              ...editingTodo,
                              amount: e.target.value,
                            })
                          }
                        />
                      </div>
                      <input
                        className="input"
                        placeholder="Person"
                        style={{ fontSize: 12 }}
                        value={editingTodo.person || ""}
                        onChange={(e) =>
                          setEditingTodo({
                            ...editingTodo,
                            person: e.target.value,
                          })
                        }
                      />
                      <div style={{ display: "flex", gap: 6 }}>
                        <button
                          onClick={saveEditTodo}
                          style={{
                            flex: 1,
                            fontSize: 12,
                            padding: "6px",
                            borderRadius: 7,
                            border: "none",
                            background: "var(--green-dim)",
                            color: "var(--green)",
                            cursor: "pointer",
                          }}
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingTodo(null)}
                          style={{
                            fontSize: 12,
                            padding: "6px 10px",
                            borderRadius: 7,
                            border: "1px solid var(--border)",
                            background: "transparent",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                          }}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "flex-start",
                        gap: 10,
                      }}
                    >
                      <button
                        onClick={() => toggleTodo(todo._id)}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 6,
                          border: `2px solid ${cfg.color}60`,
                          background: "transparent",
                          cursor: "pointer",
                          flexShrink: 0,
                          marginTop: 2,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 6,
                            marginBottom: 2,
                          }}
                        >
                          <span
                            style={{
                              fontSize: 10,
                              fontWeight: 700,
                              padding: "1px 6px",
                              borderRadius: 99,
                              background: cfg.bg,
                              color: cfg.color,
                              letterSpacing: "0.06em",
                            }}
                          >
                            {cfg.icon} {cfg.label}
                          </span>
                          {todo.amount && (
                            <span
                              style={{
                                fontSize: 11,
                                color: cfg.color,
                                fontWeight: 600,
                              }}
                            >
                              ₹{Number(todo.amount).toLocaleString("en-IN")}
                            </span>
                          )}
                        </div>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: 500,
                            wordBreak: "break-word",
                          }}
                        >
                          {todo.text}
                        </div>
                        {todo.person && (
                          <div
                            style={{
                              fontSize: 11,
                              color: "var(--text-muted)",
                              marginTop: 2,
                            }}
                          >
                            with {todo.person}
                          </div>
                        )}
                      </div>
                      <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                        <button
                          onClick={() =>
                            setEditingTodo({
                              id: todo._id,
                              text: todo.text,
                              type: todo.type,
                              amount: todo.amount,
                              person: todo.person,
                            })
                          }
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            border: "1px solid var(--border)",
                            background: "transparent",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          ✏
                        </button>
                        <button
                          onClick={() => deleteTodo(todo._id)}
                          style={{
                            width: 24,
                            height: 24,
                            borderRadius: 6,
                            border: "1px solid rgba(239,68,68,0.3)",
                            background: "transparent",
                            color: "#ef4444",
                            cursor: "pointer",
                            fontSize: 12,
                          }}
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {completedTodos.length > 0 && (
              <div style={{ marginTop: 8 }}>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--text-muted)",
                    marginBottom: 6,
                  }}
                >
                  Done ({completedTodos.length})
                </div>
                {completedTodos.map((todo) => {
                  const cfg = TODO_TYPE[todo.type] || TODO_TYPE.other;
                  return (
                    <div
                      key={todo._id}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        padding: "8px 0",
                        borderBottom: "1px solid var(--border)",
                        opacity: 0.5,
                      }}
                    >
                      <button
                        onClick={() => toggleTodo(todo._id)}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 6,
                          border: "none",
                          background: cfg.color,
                          cursor: "pointer",
                          flexShrink: 0,
                          fontSize: 10,
                          color: "#000",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        ✓
                      </button>
                      <span
                        style={{
                          fontSize: 13,
                          textDecoration: "line-through",
                          flex: 1,
                          wordBreak: "break-word",
                        }}
                      >
                        {todo.text}
                      </span>
                      <button
                        onClick={() => deleteTodo(todo._id)}
                        style={{
                          width: 20,
                          height: 20,
                          borderRadius: 5,
                          border: "none",
                          background: "transparent",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
