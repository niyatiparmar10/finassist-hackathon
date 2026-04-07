// frontend/src/pages/Chat.jsx
// SECTION 6 UPDATE: Shows "Log this investment?" prompt card when chatbot returns suggestLog=true

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import api from "../api";

const SUGGESTIONS = [
  "Spent ₹200 on food today",
  "I saved ₹500 today",
  "My salary is ₹35,000",
  "I want to save ₹10,000 for a trip",
  "What if I take an EMI of ₹5,000?",
  "How am I doing this month?",
];

export default function Chat() {
  const userId = localStorage.getItem("userId");
  const navigate = useNavigate();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [histLoaded, setHistLoaded] = useState(false);
  const bottomRef = useRef(null);

  const [isListening, setIsListening] = useState(false);
  const [imageLoading, setImageLoading] = useState(false);
  const fileInputRef = useRef(null);
  const textareaRef = useRef(null);

  // Load chat history on mount
  useEffect(() => {
    async function loadHistory() {
      console.log("[CHAT] Loading chat history for userId:", userId);
      try {
        const { data } = await api.get(`/chat/history/${userId}`);
        if (data.history?.length > 0) {
          setMessages(
            data.history.map((h) => ({ role: h.role, text: h.message })),
          );
          console.log(
            "[CHAT] History loaded:",
            data.history.length,
            "messages",
          );
        } else {
          setMessages([
            {
              role: "bot",
              text: 'Hi! I\'m FinAssist AI 👋 I can help you track expenses, savings, and goals. Try typing something like "Spent ₹200 on food" or "How am I doing?"',
            },
          ]);
        }
      } catch (err) {
        console.error("[CHAT] History load error:", err.message);
        setMessages([
          {
            role: "bot",
            text: "Hi! I'm FinAssist AI 👋 Start by telling me about your expenses or savings!",
          },
        ]);
      }
      setHistLoaded(true);
    }
    loadHistory();
  }, [userId]);

  // Scroll to bottom on new message
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!textareaRef.current) return;
    textareaRef.current.style.height = "auto";
    textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
  }, [input]);

  async function sendMessage(text) {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    setLoading(true);

    console.log("[CHAT] Sending message:", msg.slice(0, 60));

    try {
      const { data } = await api.post("/chatbot/message", {
        userId,
        message: msg,
      });
      console.log(
        "[CHAT] Response received. intent:",
        data.intent,
        "suggestLog:",
        data.suggestLog,
        "action:",
        data.action,
      );

      // Build bot message with optional suggestLog metadata
      const botMsg = {
        role: "bot",
        text: data.reply,
        action: data.action,
        suggestLog: data.suggestLog || false,
        suggestLogType: data.suggestLogType,
        suggestLogAmount: data.suggestLogAmount,
        suggestLogDismissed: false,
      };

      setMessages((prev) => [...prev, botMsg]);

      // Handle navigation actions
      const navigationActions = [
        "NAVIGATE_GOALS",
        "NAVIGATE_SAVINGS",
        "NAVIGATE_EXPENSES",
        "NAVIGATE_DASHBOARD",
        "NAVIGATE_CARDS",
      ];
      if (navigationActions.includes(data.action)) {
        const lastMessages = [
          { role: "user", text: msg },
          { role: "bot", text: data.reply },
        ];
        localStorage.setItem(
          "finassist_float_chat",
          JSON.stringify({
            userId,
            messages: lastMessages,
            timestamp: Date.now(),
          }),
        );

        const routeMap = {
          NAVIGATE_GOALS: "/goals",
          NAVIGATE_SAVINGS: "/savings",
          NAVIGATE_EXPENSES: "/expenses",
          NAVIGATE_DASHBOARD: "/dashboard",
          NAVIGATE_CARDS: "/cards",
        };
        setTimeout(() => navigate(routeMap[data.action]), 1800);
      }
    } catch (err) {
      console.error("[CHAT] Send error:", err.message);
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          text: "Something went wrong. Make sure the backend is running!",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  // Dismiss a suggestLog prompt on a specific message
  function dismissSuggestLog(msgIdx) {
    console.log("[CHAT] Dismissing suggestLog on message:", msgIdx);
    setMessages((prev) =>
      prev.map((m, i) =>
        i === msgIdx ? { ...m, suggestLogDismissed: true } : m,
      ),
    );
  }

  // Navigate to investments page with pre-fill
  function logInvestment(type, amount, msgIdx) {
    console.log("[CHAT] Navigating to investments with prefill:", {
      type,
      amount,
    });
    dismissSuggestLog(msgIdx);
    navigate(`/investments?prefill=${type}&amount=${amount}`);
  }

  function handleKey(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function startVoice() {
    const SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert("Voice not supported in this browser");
      return;
    }
    const recognition = new SpeechRecognition();
    recognition.lang = "en-IN";
    recognition.continuous = false;
    recognition.interimResults = false;
    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => {
      setIsListening(false);
      alert("Voice not supported in this browser");
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      console.log("[CHAT] Voice transcript:", transcript);
      setInput(transcript);
    };
    recognition.start();
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageLoading(true);
    console.log("[CHAT] Reading image:", file.name);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result.split(",")[1];
      const mimeType = file.type;
      try {
        const { data } = await api.post("/chatbot/read-image", {
          userId,
          imageBase64: base64,
          mimeType,
        });
        setInput(data.extractedText);
        console.log(
          "[CHAT] Image text extracted, length:",
          data.extractedText?.length,
        );
      } catch {
        alert("Could not read image. Try again.");
      } finally {
        setImageLoading(false);
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <div
      style={{
        height: "calc(100vh - 64px)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        className="page-header fade-up"
        style={{ marginBottom: 16, flexShrink: 0 }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background:
                "linear-gradient(135deg, var(--green) 0%, var(--purple) 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 18,
              boxShadow: "0 0 16px var(--green-glow)",
            }}
          >
            ✦
          </div>
          <div>
            <h1
              className="page-title"
              style={{ fontSize: 20, marginBottom: 0 }}
            >
              AI Chat
            </h1>
            <p className="page-subtitle" style={{ fontSize: 12 }}>
              <span
                style={{
                  display: "inline-block",
                  width: 6,
                  height: 6,
                  borderRadius: "50%",
                  background: "var(--green)",
                  marginRight: 6,
                  boxShadow: "0 0 6px var(--green)",
                }}
              />
              Powered by Ollama (Mistral)
            </p>
          </div>
        </div>
      </div>

      {/* Quick suggestions */}
      {histLoaded && messages.length <= 1 && (
        <div
          className="fade-up"
          style={{
            display: "flex",
            gap: 8,
            flexWrap: "wrap",
            marginBottom: 16,
            flexShrink: 0,
          }}
        >
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => sendMessage(s)}
              className="btn-ghost"
              style={{ fontSize: 12, padding: "6px 12px" }}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Messages */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
          padding: "4px 0",
          marginBottom: 16,
        }}
      >
        {messages.map((msg, i) => (
          <div key={i} style={{ width: "100%" }}>
            {msg.role === "user" ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  alignItems: "flex-end",
                  gap: 8,
                  width: "100%",
                }}
              >
                <div className="chat-bubble-user">{msg.text}</div>
              </div>
            ) : (
              <div
                style={{
                  alignSelf: "flex-start",
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 10,
                  maxWidth: "78%",
                }}
              >
                <div
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 10,
                    flexShrink: 0,
                    marginTop: 2,
                    background:
                      "linear-gradient(135deg, var(--green), var(--purple))",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 12,
                    boxShadow: "0 0 10px var(--green-glow)",
                  }}
                >
                  ✦
                </div>
                <div>
                  <div className="chat-bubble-bot">{msg.text}</div>

                  {/* Navigation redirect badge */}
                  {msg.action && msg.action !== "null" && !msg.suggestLog && (
                    <div
                      style={{
                        marginTop: 6,
                        padding: "6px 12px",
                        borderRadius: 8,
                        background: "var(--green-dim)",
                        border: "1px solid rgba(0,229,160,0.2)",
                        fontSize: 12,
                        color: "var(--green)",
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      ↗ Redirecting you...
                    </div>
                  )}

                  {/* [SECTION 6] SuggestLog prompt card */}
                  {msg.suggestLog && !msg.suggestLogDismissed && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: "12px 14px",
                        borderRadius: 12,
                        background: "rgba(168,85,247,0.08)",
                        border: "1px solid rgba(168,85,247,0.25)",
                        maxWidth: 320,
                      }}
                    >
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          marginBottom: 6,
                          color: "#a855f7",
                        }}
                      >
                        📊 Want to track this{" "}
                        {msg.suggestLogType?.toUpperCase()}?
                      </div>
                      <div
                        style={{
                          fontSize: 12,
                          color: "var(--text-secondary)",
                          marginBottom: 10,
                        }}
                      >
                        Log this ₹
                        {Number(msg.suggestLogAmount).toLocaleString("en-IN")}
                        /month {msg.suggestLogType === "sip" ? "SIP" : "EMI"} as
                        an active investment to track it over time.
                      </div>
                      <div style={{ display: "flex", gap: 8 }}>
                        <button
                          onClick={() =>
                            logInvestment(
                              msg.suggestLogType,
                              msg.suggestLogAmount,
                              i,
                            )
                          }
                          style={{
                            flex: 1,
                            fontSize: 12,
                            padding: "7px",
                            borderRadius: 8,
                            background: "rgba(168,85,247,0.15)",
                            border: "1px solid rgba(168,85,247,0.3)",
                            color: "#a855f7",
                            cursor: "pointer",
                            fontWeight: 600,
                          }}
                        >
                          Yes, Log It →
                        </button>
                        <button
                          onClick={() => dismissSuggestLog(i)}
                          style={{
                            fontSize: 12,
                            padding: "7px 12px",
                            borderRadius: 8,
                            background: "transparent",
                            border: "1px solid var(--border)",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                          }}
                        >
                          Not now
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div
            style={{
              alignSelf: "flex-start",
              display: "flex",
              alignItems: "flex-start",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 30,
                height: 30,
                borderRadius: 10,
                flexShrink: 0,
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
            <div
              className="chat-bubble-bot"
              style={{
                display: "flex",
                gap: 4,
                alignItems: "center",
                padding: "14px 18px",
              }}
            >
              {[0, 1, 2].map((i) => (
                <div
                  key={i}
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background: "var(--green)",
                    animation: `bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input bar */}
      <div
        className="fade-up"
        style={{
          flexShrink: 0,
          display: "flex",
          gap: 10,
          alignItems: "flex-end",
          background: "rgba(7,7,15,0.8)",
          backdropFilter: "blur(20px)",
          border: "1px solid var(--border)",
          borderRadius: 20,
          padding: "12px 16px",
        }}
      >
        <textarea
          ref={textareaRef}
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type anything... 'Spent ₹200 on food' or 'I want to save for a trip'"
          rows={4}
          style={{
            resize: "none",
            border: "none",
            background: "transparent",
            padding: 0,
            fontSize: 14,
            lineHeight: 1.5,
            boxShadow: "none",
            flex: 1,
            minHeight: 96,
            maxHeight: 180,
            overflowY: "auto",
          }}
        />

        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleImageUpload}
        />

        <button
          onClick={startVoice}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: isListening ? "rgba(239,68,68,0.2)" : "transparent",
            color: isListening ? "#ef4444" : "var(--text-muted)",
            cursor: "pointer",
            fontSize: 18,
            flexShrink: 0,
            animation: isListening ? "pulse 1s infinite" : "none",
          }}
        >
          🎤
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={imageLoading}
          style={{
            width: 40,
            height: 40,
            borderRadius: 12,
            border: "1px solid var(--border)",
            background: "transparent",
            color: "var(--text-muted)",
            cursor: "pointer",
            fontSize: 18,
            flexShrink: 0,
            opacity: imageLoading ? 0.5 : 1,
          }}
        >
          {imageLoading ? "⏳" : "📷"}
        </button>

        <button
          onClick={() => sendMessage()}
          disabled={loading || !input.trim()}
          className="btn-primary"
          style={{
            padding: "10px 20px",
            flexShrink: 0,
            opacity: !input.trim() || loading ? 0.5 : 1,
          }}
        >
          Send ↗
        </button>
      </div>

      <style>{`
        @keyframes bounce { 0%, 80%, 100% { transform: translateY(0); } 40% { transform: translateY(-6px); } }
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
