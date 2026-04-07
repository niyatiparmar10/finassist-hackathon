// frontend/src/pages/Cards.jsx
// SECTION 7: 15 reels, session cache, Ask Chatbot button, World Finance badge

import React, { useEffect, useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

const CATEGORY_STYLE = {
  food: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: "🍽" },
  savings: { color: "#00e5a0", bg: "rgba(0,229,160,0.12)", icon: "💰" },
  investment: { color: "#a855f7", bg: "rgba(168,85,247,0.12)", icon: "📈" },
  budgeting: { color: "#3b82f6", bg: "rgba(59,130,246,0.12)", icon: "📊" },
  debt: { color: "#ec4899", bg: "rgba(236,72,153,0.12)", icon: "⚠" },
  goals: { color: "#00e5a0", bg: "rgba(0,229,160,0.12)", icon: "🎯" },
  transport: { color: "#64748b", bg: "rgba(100,116,139,0.12)", icon: "🚗" },
  entertainment: { color: "#f43f5e", bg: "rgba(244,63,94,0.12)", icon: "🎬" },
  shopping: { color: "#f59e0b", bg: "rgba(245,158,11,0.12)", icon: "🛍" },
  health: { color: "#10b981", bg: "rgba(16,185,129,0.12)", icon: "💊" },
  markets: { color: "#06b6d4", bg: "rgba(6,182,212,0.12)", icon: "📉" },
  crypto: { color: "#f97316", bg: "rgba(249,115,22,0.12)", icon: "₿" },
  general: { color: "#8b5cf6", bg: "rgba(139,92,246,0.12)", icon: "🌐" },
  default: { color: "#a855f7", bg: "rgba(168,85,247,0.12)", icon: "✦" },
};

const SESSION_REELS_KEY = "finmind_reels";
const SESSION_HASH_KEY = "finmind_reels_hash";

function getStyle(category) {
  return CATEGORY_STYLE[category?.toLowerCase()] || CATEGORY_STYLE.default;
}

function ReelCard({ reel, onAskChatbot }) {
  const style = getStyle(reel.category);
  const [asking, setAsking] = useState(false);

  async function handleAsk() {
    console.log("[REEL-ASK] Asking chatbot about reel:", reel.id, reel.title);
    setAsking(true);
    try {
      await onAskChatbot(reel);
    } finally {
      setAsking(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-start",
        padding: "32px 32px 28px",
        position: "relative",
        overflow: "hidden",
        height: "100%",
      }}
    >
      {/* Background glow */}
      <div
        style={{
          position: "absolute",
          top: "-15%",
          right: "-5%",
          width: 350,
          height: 350,
          borderRadius: "50%",
          background: `radial-gradient(circle, ${style.color}15 0%, transparent 70%)`,
          pointerEvents: "none",
        }}
      />

      {/* World Finance badge */}
      {reel.isWorldNews && (
        <div
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            padding: "4px 10px",
            borderRadius: 99,
            background: "rgba(6,182,212,0.15)",
            border: "1px solid rgba(6,182,212,0.3)",
            color: "#06b6d4",
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: "0.06em",
            display: "flex",
            alignItems: "center",
            gap: 4,
          }}
        >
          🌐 World Finance
        </div>
      )}

      {/* Category badge */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 24,
          marginTop: reel.isWorldNews ? 28 : 0,
        }}
      >
        <div
          style={{
            width: 42,
            height: 42,
            borderRadius: 12,
            background: style.bg,
            border: `1px solid ${style.color}40`,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: 20,
          }}
        >
          {style.icon}
        </div>
        <span
          style={{
            padding: "4px 12px",
            borderRadius: 99,
            fontSize: 11,
            fontWeight: 600,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            background: style.bg,
            color: style.color,
            border: `1px solid ${style.color}40`,
          }}
        >
          {reel.category}
        </span>
      </div>

      {/* Stat badge */}
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          marginBottom: 16,
          padding: "6px 14px",
          borderRadius: 99,
          width: "fit-content",
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.1)",
          fontSize: 14,
          fontWeight: 700,
          color: style.color,
        }}
      >
        {reel.stat}
      </div>

      {/* Title */}
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 26,
          fontWeight: 800,
          lineHeight: 1.2,
          marginBottom: 14,
          color: "var(--text-primary)",
        }}
      >
        {reel.title}
      </h2>

      {/* Hook */}
      <p
        style={{
          fontSize: 15,
          fontWeight: 500,
          color: style.color,
          marginBottom: 14,
          lineHeight: 1.5,
        }}
      >
        {reel.hook}
      </p>

      {/* Insight */}
      <p
        style={{
          fontSize: 14,
          color: "rgba(240,240,248,0.7)",
          lineHeight: 1.7,
          marginBottom: 24,
        }}
      >
        {reel.insight}
      </p>

      {/* Divider */}
      <div
        style={{
          height: 1,
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
          marginBottom: 20,
        }}
      />

      {/* Action tip */}
      <div
        style={{
          padding: "16px 18px",
          borderRadius: 14,
          background: style.bg,
          border: `1px solid ${style.color}25`,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            color: style.color,
            marginBottom: 6,
          }}
        >
          Action tip
        </div>
        <p
          style={{
            fontSize: 13,
            color: "rgba(240,240,248,0.85)",
            lineHeight: 1.6,
            margin: 0,
          }}
        >
          {reel.action}
        </p>
      </div>

      {/* Ask Chatbot button */}
      <button
        onClick={handleAsk}
        disabled={asking}
        style={{
          alignSelf: "flex-start",
          display: "flex",
          alignItems: "center",
          gap: 7,
          padding: "8px 16px",
          borderRadius: 10,
          border: `1px solid ${style.color}40`,
          background: "rgba(255,255,255,0.04)",
          color: style.color,
          fontSize: 12,
          fontWeight: 600,
          cursor: asking ? "wait" : "pointer",
          opacity: asking ? 0.7 : 1,
          transition: "all 0.2s",
        }}
      >
        {asking ? (
          <>
            <span
              style={{
                animation: "spin 1s linear infinite",
                display: "inline-block",
              }}
            >
              ◈
            </span>
            Asking...
          </>
        ) : (
          <>
            <span>💬</span>
            Ask Chatbot
          </>
        )}
      </button>
    </div>
  );
}

// Modal that slides up from the bottom
function ExplainModal({ data, onClose, onGoToChat }) {
  if (!data) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 2000,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "rgba(0,0,0,0.65)",
        backdropFilter: "blur(6px)",
        padding: 16,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 600,
          background: "var(--bg-card)",
          border: "1px solid var(--border)",
          borderRadius: "20px 20px 0 0",
          padding: "28px 28px 32px",
          animation: "slideUp 0.3s ease",
          maxHeight: "70vh",
          overflowY: "auto",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            marginBottom: 20,
          }}
        >
          <div style={{ flex: 1, paddingRight: 12 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--green)",
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                marginBottom: 6,
              }}
            >
              ✦ FinAssist AI explains
            </div>
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 18,
                fontWeight: 700,
                margin: 0,
              }}
            >
              {data.title}
            </h3>
          </div>
          <button
            onClick={onClose}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid var(--border)",
              background: "transparent",
              color: "var(--text-muted)",
              cursor: "pointer",
              fontSize: 14,
              flexShrink: 0,
            }}
          >
            ✕
          </button>
        </div>

        {/* Bot reply */}
        <div
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid var(--border)",
            borderRadius: 14,
            padding: "16px 18px",
            fontSize: 14,
            lineHeight: 1.7,
            color: "rgba(240,240,248,0.85)",
            marginBottom: 20,
          }}
        >
          {data.reply}
        </div>

        {/* Go to Chat */}
        <button
          onClick={onGoToChat}
          className="btn-primary"
          style={{ width: "100%", padding: "12px" }}
        >
          Continue in Chat →
        </button>
      </div>

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function Cards() {
  const userId = localStorage.getItem("userId");
  const navigate = useNavigate();
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [usingAI, setUsingAI] = useState(false);
  const [modal, setModal] = useState(null); // { title, reply }
  const containerRef = useRef(null);
  const cardRefs = useRef([]);

  useEffect(() => {
    loadReels();
  }, [userId]);

  async function loadReels(forceRefresh = false) {
    console.log("[CARDS] loadReels called. forceRefresh:", forceRefresh);
    setLoading(true);

    try {
      if (!forceRefresh) {
        // Check session cache
        const cachedReels = sessionStorage.getItem(SESSION_REELS_KEY);
        const cachedHash = sessionStorage.getItem(SESSION_HASH_KEY);

        if (cachedReels && cachedHash) {
          console.log(
            "[CARDS] Cache found. Fetching current hash to validate...",
          );
          try {
            const { data } = await api.get(`/chatbot/reels-hash/${userId}`);
            const currentHash = data.dataHash;
            console.log(
              "[CARDS] Cached hash:",
              cachedHash,
              "| Current hash:",
              currentHash,
            );

            if (cachedHash === currentHash) {
              console.log("[CARDS] Cache is valid! Using cached reels.");
              setReels(JSON.parse(cachedReels));
              setUsingAI(true);
              setLoading(false);
              return;
            } else {
              console.log(
                "[CARDS] Hash mismatch — data changed. Clearing cache and regenerating.",
              );
              sessionStorage.removeItem(SESSION_REELS_KEY);
              sessionStorage.removeItem(SESSION_HASH_KEY);
            }
          } catch (hashErr) {
            console.warn(
              "[CARDS] Hash check failed, proceeding with fresh fetch:",
              hashErr.message,
            );
          }
        } else {
          console.log("[CARDS] No cache found. Fetching fresh reels.");
        }
      } else {
        console.log("[CARDS] Force refresh — clearing cache.");
        sessionStorage.removeItem(SESSION_REELS_KEY);
        sessionStorage.removeItem(SESSION_HASH_KEY);
      }

      // Fetch fresh reels
      console.log("[CARDS] Calling POST /chatbot/reels...");
      const response = await api.post("/chatbot/reels", { userId });
      const { reels: freshReels, dataHash } = response.data;

      console.log(
        "[CARDS] Got",
        freshReels?.length,
        "reels. DataHash:",
        dataHash,
      );

      if (freshReels?.length > 0) {
        setReels(freshReels);
        setUsingAI(true);

        // Cache in sessionStorage
        sessionStorage.setItem(SESSION_REELS_KEY, JSON.stringify(freshReels));
        if (dataHash) {
          sessionStorage.setItem(SESSION_HASH_KEY, dataHash);
          console.log("[CARDS] Reels cached in sessionStorage.");
        }
      }
    } catch (err) {
      console.error("[CARDS] Failed to load reels:", err.message);
    } finally {
      setLoading(false);
    }
  }

  // IntersectionObserver for active reel index
  useEffect(() => {
    if (!containerRef.current || reels.length === 0) return;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            const i = cardRefs.current.indexOf(e.target);
            if (i !== -1) setActiveIdx(i);
          }
        }),
      { root: containerRef.current, threshold: 0.6 },
    );
    cardRefs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [reels]);

  async function handleAskChatbot(reel) {
    console.log("[CARDS] Asking chatbot to explain reel:", reel.id);
    try {
      const { data } = await api.post("/chatbot/explain-reel", {
        userId,
        reelId: reel.id,
        reelTitle: reel.title,
        reelInsight: reel.insight,
        reelCategory: reel.category,
        reelAction: reel.action,
      });
      console.log(
        "[CARDS] Chatbot reply received, length:",
        data.reply?.length,
      );
      setModal({ title: reel.title, reply: data.reply });
    } catch (err) {
      console.error("[CARDS] Ask chatbot error:", err.message);
      setModal({
        title: reel.title,
        reply: "Sorry, I couldn't explain this right now. Try again!",
      });
    }
  }

  const worldCount = reels.filter((r) => r.isWorldNews).length;
  const personalCount = reels.filter((r) => !r.isWorldNews).length;

  if (loading)
    return (
      <div
        style={{
          height: "calc(100vh - 64px)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "column",
          gap: 16,
        }}
      >
        <div style={{ fontSize: 36, animation: "spin 2s linear infinite" }}>
          ✦
        </div>
        <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
          Generating your personalized reels...
        </p>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );

  return (
    <div
      style={{
        height: "calc(100vh - 64px)",
        position: "relative",
        minHeight: 0,
      }}
    >
      {/* Header */}
      <div
        className="page-header fade-up"
        style={{
          position: "absolute",
          top: 20,
          left: 0,
          right: 0,
          zIndex: 2,
          marginBottom: 0,
          padding: "0 0 12px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <div>
            <h1 className="page-title">Financial Reels</h1>
            <p className="page-subtitle">
              Scroll for insights &nbsp;·&nbsp;
              <span style={{ color: "var(--green)", fontSize: 12 }}>
                {usingAI ? "✦ AI-generated" : "Based on your data"}
              </span>
              {reels.length > 0 && (
                <span
                  style={{
                    color: "var(--text-muted)",
                    fontSize: 11,
                    marginLeft: 8,
                  }}
                >
                  {personalCount} personalized · {worldCount} world finance
                </span>
              )}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
            {/* Refresh button */}
            <button
              onClick={() => loadReels(true)}
              className="btn-ghost"
              style={{
                fontSize: 12,
                padding: "6px 14px",
                display: "flex",
                alignItems: "center",
                gap: 6,
                marginTop: "-6px",
              }}
            >
              <span>↻</span> Refresh
            </button>
            {/* Dot indicators */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 5,
                alignItems: "center",
              }}
            >
              {reels.map((_, i) => (
                <button
                  key={i}
                  onClick={() =>
                    cardRefs.current[i]?.scrollIntoView({
                      behavior: "smooth",
                      block: "start",
                    })
                  }
                  style={{
                    width: 6,
                    height: activeIdx === i ? 22 : 6,
                    borderRadius: 99,
                    border: "none",
                    cursor: "pointer",
                    background:
                      activeIdx === i
                        ? "var(--green)"
                        : "rgba(255,255,255,0.2)",
                    transition: "all 0.3s",
                    boxShadow:
                      activeIdx === i ? "0 0 8px var(--green-glow)" : "none",
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Reel container */}
      <div
        ref={containerRef}
        style={{
          position: "absolute",
          top: 108,
          bottom: 0,
          left: 0,
          right: 0,
          minHeight: 0,
          overflowY: "auto",
          scrollSnapType: "y mandatory",
          borderRadius: 20,
          border: "1px solid var(--border)",
          background: "var(--bg-card)",
          backdropFilter: "blur(12px)",
        }}
      >
        {reels.map((reel, i) => (
          <div
            key={reel.id}
            ref={(el) => (cardRefs.current[i] = el)}
            style={{
              scrollSnapAlign: "start",
              minHeight: "100%",
              position: "relative",
            }}
          >
            <ReelCard reel={reel} onAskChatbot={handleAskChatbot} />
            <div
              style={{
                position: "absolute",
                bottom: 20,
                right: 20,
                fontSize: 11,
                color: "var(--text-muted)",
                background: "rgba(7,7,15,0.7)",
                padding: "3px 10px",
                borderRadius: 99,
              }}
            >
              {i + 1} / {reels.length}
            </div>
            {i === 0 && activeIdx === 0 && (
              <div
                style={{
                  position: "absolute",
                  bottom: 20,
                  left: "50%",
                  transform: "translateX(-50%)",
                  fontSize: 12,
                  color: "var(--text-muted)",
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  animation: "bounce 2s ease-in-out infinite",
                }}
              >
                ↓ Scroll for more
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Explain modal */}
      {modal && (
        <ExplainModal
          data={modal}
          onClose={() => setModal(null)}
          onGoToChat={() => {
            setModal(null);
            navigate("/chat");
          }}
        />
      )}

      <style>{`
        @keyframes bounce { 0%, 100% { transform: translateX(-50%) translateY(0); } 50% { transform: translateX(-50%) translateY(-6px); } }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
