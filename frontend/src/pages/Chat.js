//Chat.js
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

  // Load chat history on mount
  useEffect(() => {
    async function loadHistory() {
      try {
        const { data } = await api.get(`/chat/history/${userId}`);
        if (data.history?.length > 0) {
          setMessages(
            data.history.map((h) => ({ role: h.role, text: h.message })),
          );
        } else {
          setMessages([
            {
              role: "bot",
              text: 'Hi! I\'m FinAssist AI 👋 I can help you track expenses, savings, and goals. Try typing something like "Spent ₹200 on food" or "How am I doing?"',
            },
          ]);
        }
      } catch {
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

  async function sendMessage(text) {
    const msg = text || input.trim();
    if (!msg || loading) return;
    setInput("");
    setMessages((prev) => [...prev, { role: "user", text: msg }]);
    setLoading(true);

    try {
      const { data } = await api.post("/chatbot/message", {
        userId,
        message: msg,
      });
      setMessages((prev) => [
        ...prev,
        { role: "bot", text: data.reply, action: data.action },
      ]);

      // Handle navigation actions
      const navigationActions = [
        "NAVIGATE_GOALS",
        "NAVIGATE_SAVINGS",
        "NAVIGATE_EXPENSES",
        "NAVIGATE_DASHBOARD",
        "NAVIGATE_CARDS",
      ];

      if (navigationActions.includes(data.action)) {
        // Store last 2 messages for floating chat
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
      setInput(transcript);
    };
    recognition.start();
  }

  async function handleImageUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    setImageLoading(true);

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
          <div key={i} style={{ display: "flex", flexDirection: "column" }}>
            {msg.role === "user" ? (
              <div
                style={{
                  alignSelf: "flex-end",
                  display: "flex",
                  alignItems: "flex-end",
                  gap: 8,
                  maxWidth: "70%",
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
                  {msg.action && msg.action !== "null" && (
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
          className="input"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Type anything... 'Spent ₹200 on food' or 'I want to save for a trip'"
          rows={1}
          style={{
            resize: "none",
            border: "none",
            background: "transparent",
            padding: 0,
            fontSize: 14,
            lineHeight: 1.5,
            boxShadow: "none",
            flex: 1,
          }}
        />

        {/* Hidden file input */}
        <input
          type="file"
          accept="image/*"
          ref={fileInputRef}
          style={{ display: "none" }}
          onChange={handleImageUpload}
        />

        {/* Mic button */}
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

        {/* Camera button */}
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
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
