//Cards.js

import React, { useEffect, useState, useRef } from "react";
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
  default: { color: "#a855f7", bg: "rgba(168,85,247,0.12)", icon: "✦" },
};

function getStyle(category) {
  return CATEGORY_STYLE[category?.toLowerCase()] || CATEGORY_STYLE.default;
}

async function generateReelScripts(userId) {
  try {
    const response = await api.post("/chatbot/reels", { userId });
    return response.data.reels;
  } catch (err) {
    console.error("Backend reels error:", err);
    return null;
  }
}

function ReelCard({ reel }) {
  const style = getStyle(reel.category);
  return (
    <div
      style={{
        minHeight: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "36px 32px",
        position: "relative",
        overflow: "hidden",
      }}
    >
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

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 24,
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

      <div
        style={{
          height: 1,
          background:
            "linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent)",
          marginBottom: 20,
        }}
      />

      <div
        style={{
          padding: "16px 18px",
          borderRadius: 14,
          background: style.bg,
          border: `1px solid ${style.color}25`,
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
    </div>
  );
}

export default function Cards() {
  const userId = localStorage.getItem("userId");
  const [reels, setReels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIdx, setActiveIdx] = useState(0);
  const [usingAI, setUsingAI] = useState(false);
  const containerRef = useRef(null);
  const cardRefs = useRef([]);

  useEffect(() => {
    async function load() {
      try {
        const aiReels = await generateReelScripts(userId);
        if (aiReels?.length > 0) {
          setReels(aiReels);
          setUsingAI(true);
        }
      } catch (err) {
        console.error("Failed to load reels:", err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);

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
          Generating personalized reels...
        </p>
        <style>{`@keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}`}</style>
      </div>
    );

  return (
    <div
      style={{
        height: "calc(100vh - 64px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      <div
        className="page-header fade-up"
        style={{ flexShrink: 0, marginBottom: 16 }}
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
              Scroll for personalized insights &nbsp;·&nbsp;
              <span
                style={{
                  color: usingAI ? "var(--green)" : "var(--text-muted)",
                  fontSize: 12,
                }}
              >
                {usingAI
                  ? "✦ AI-generated from your data"
                  : "Based on your spending patterns"}
              </span>
            </p>
          </div>
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
                    activeIdx === i ? "var(--green)" : "rgba(255,255,255,0.2)",
                  transition: "all 0.3s",
                  boxShadow:
                    activeIdx === i ? "0 0 8px var(--green-glow)" : "none",
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div
        ref={containerRef}
        style={{
          flex: 1,
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
            <ReelCard reel={reel} />
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

      <style>{`
        @keyframes bounce{0%,100%{transform:translateX(-50%) translateY(0)}50%{transform:translateX(-50%) translateY(-6px)}}
        @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
      `}</style>
    </div>
  );
}
