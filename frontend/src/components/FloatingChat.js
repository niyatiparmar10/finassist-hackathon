//FloatingChat.js - A floating chat preview component that shows recent messages and prompts user to open full chat. It stores messages in localStorage and auto-dismisses after 5 minutes or when user visits the /chat page.

import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function FloatingChat() {
  const [messages, setMessages] = useState(null);
  const [dismissed, setDismissed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const currentUserId = localStorage.getItem("userId");
    if (location.pathname === "/chat") {
      setDismissed(true);
      setMessages(null);
    } else {
      try {
        const stored = localStorage.getItem("finassist_float_chat");
        if (stored) {
          const parsed = JSON.parse(stored);
          if (
            parsed.userId === currentUserId &&
            Date.now() - parsed.timestamp < 5 * 60 * 1000
          ) {
            setMessages(parsed.messages);
            setDismissed(false);
          } else {
            localStorage.removeItem("finassist_float_chat");
            setMessages(null);
          }
        }
      } catch {
        localStorage.removeItem("finassist_float_chat");
        setMessages(null);
      }
    }
  }, [location.pathname]);

  function dismiss() {
    setDismissed(true);
    localStorage.removeItem("finassist_float_chat");
  }

  if (!messages || dismissed || location.pathname === "/chat") return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: 24,
        right: 24,
        width: 320,
        zIndex: 1000,
        background: "var(--bg-card)",
        border: "1px solid var(--border)",
        borderRadius: 20,
        padding: 16,
        boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
        animation: "slideUp 0.3s ease",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 28,
              height: 28,
              borderRadius: 8,
              background:
                "linear-gradient(135deg, var(--green), var(--purple))",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 12,
            }}
          >
            ✦
          </div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>FinAssist AI</span>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            onClick={() => {
              navigate("/chat");
              dismiss();
            }}
            style={{
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 8,
              background: "var(--green-dim)",
              color: "var(--green)",
              border: "1px solid rgba(0,229,160,0.2)",
              cursor: "pointer",
            }}
          >
            Open Chat
          </button>
          <button
            onClick={dismiss}
            style={{
              width: 24,
              height: 24,
              borderRadius: 6,
              background: "transparent",
              border: "1px solid var(--border)",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 12,
            }}
          >
            ✕
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              alignSelf: msg.role === "user" ? "flex-end" : "flex-start",
              background:
                msg.role === "user"
                  ? "var(--green-dim)"
                  : "rgba(255,255,255,0.05)",
              border: `1px solid ${msg.role === "user" ? "rgba(0,229,160,0.2)" : "var(--border)"}`,
              borderRadius: 12,
              padding: "8px 12px",
              fontSize: 13,
              maxWidth: "90%",
              color:
                msg.role === "user" ? "var(--green)" : "var(--text-primary)",
            }}
          >
            {msg.text}
          </div>
        ))}
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
