import React from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
  useNavigate,
  Navigate,
} from "react-router-dom";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Chat from "./pages/Chat";
import Goals from "./pages/Goals";
import Savings from "./pages/Savings";
import Cards from "./pages/Cards";
import FloatingChat from "./components/FloatingChat";
import Expenses from "./pages/Expenses";
import Income from "./pages/Income";

// ── Nav items ────────────────────────────────────────────────

const NAV = [
  { to: "/dashboard", icon: "⬡", label: "Dashboard" },
  { to: "/chat", icon: "◈", label: "AI Chat" },
  { to: "/expenses", icon: "◉", label: "Expenses" },
  { to: "/goals", icon: "◎", label: "Goals" },
  { to: "/savings", icon: "◇", label: "Savings" },
  { to: "/income", icon: "◈", label: "Income" },
  { to: "/cards", icon: "▣", label: "Cards" },
];

function Sidebar() {
  const navigate = useNavigate();
  const name = localStorage.getItem("name") || "User";
  const utype = localStorage.getItem("utype") || "student";

  function handleLogout() {
    localStorage.clear();
    navigate("/");
  }

  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <div className="logo-icon">✦</div>
        <span className="logo-text">FinAssist</span>
      </div>

      <span className="nav-section-label">Menu</span>
      {NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => `nav-item${isActive ? " active" : ""}`}
        >
          <span className="nav-icon">{item.icon}</span>
          {item.label}
        </NavLink>
      ))}

      <div className="sidebar-bottom">
        <div className="user-pill">
          <div className="user-avatar">{name.charAt(0).toUpperCase()}</div>
          <div className="user-info">
            <div className="user-name">{name}</div>
            <div className="user-type">{utype}</div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="nav-item"
          style={{ marginTop: 8, color: "var(--text-muted)" }}
        >
          <span className="nav-icon">⇤</span>
          Logout
        </button>
      </div>
    </aside>
  );
}

function AppShell({ children }) {
  return (
    <>
      <div className="mesh-bg">
        <div className="mesh-blob" />
      </div>
      <div className="app-shell">
        <Sidebar />
        <main className="main-content">{children}</main>
      </div>
      <FloatingChat />
    </>
  );
}

function PrivateRoute({ children }) {
  const userId = localStorage.getItem("userId");
  return userId ? children : <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route
          path="/dashboard"
          element={
            <PrivateRoute>
              <AppShell>
                <Dashboard />
              </AppShell>
            </PrivateRoute>
          }
        />
        <Route
          path="/chat"
          element={
            <PrivateRoute>
              <AppShell>
                <Chat />
              </AppShell>
            </PrivateRoute>
          }
        />
        <Route
          path="/goals"
          element={
            <PrivateRoute>
              <AppShell>
                <Goals />
              </AppShell>
            </PrivateRoute>
          }
        />
        <Route
          path="/savings"
          element={
            <PrivateRoute>
              <AppShell>
                <Savings />
              </AppShell>
            </PrivateRoute>
          }
        />
        <Route
          path="/cards"
          element={
            <PrivateRoute>
              <AppShell>
                <Cards />
              </AppShell>
            </PrivateRoute>
          }
        />
        <Route
          path="/expenses"
          element={
            <PrivateRoute>
              <AppShell>
                <Expenses />
              </AppShell>
            </PrivateRoute>
          }
        />
        <Route
          path="/income"
          element={
            <PrivateRoute>
              <AppShell>
                <Income />
              </AppShell>
            </PrivateRoute>
          }
        />
      </Routes>
    </BrowserRouter>
  );
}
