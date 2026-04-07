//ollamaService.js

const fetch = require("node-fetch");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

const SYSTEM_PROMPT = `You are FinAssist AI, an intelligent and friendly personal finance assistant for Indian users.
STRICT RULES — follow exactly:
1. You NEVER calculate numbers yourself. All numbers are already provided to you.
2. You ONLY explain and give advice based on the provided data.
3. Respond in friendly, simple language. Avoid jargon unless user asks.
4. Keep responses under 80 words unless user asks for detail.
5. Use Indian currency format (₹) always.
6. RESPOND IN PLAIN TEXT ONLY. Do not use JSON format. Just reply with helpful text.`;

async function callOllama(userPrompt, chatHistory = []) {
  // Build messages string from history
  let historyText = "";
  if (chatHistory.length > 0) {
    historyText = "\n\nCONVERSATION HISTORY (most recent last):\n";
    chatHistory.forEach((msg) => {
      const role = msg.role === "assistant" ? "FinAssist" : "User";
      historyText += `${role}: ${msg.content}\n`;
    });
    historyText += "\nCurrent message:\n";
  }

  function parseOllamaResponse(rawText) {
    // Simply accept the raw text as the reply
    // The response is already in plain text format
    return {
      reply: (rawText || "").trim(),
      action: null,
      actionData: {},
    };
  }

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || "mistral",
        prompt: SYSTEM_PROMPT + historyText + "\n\n" + userPrompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`);
    }

    const data = await response.json();
    const raw = data.response || "";

    const parsed = parseOllamaResponse(raw);
    if (!parsed.reply) {
      return {
        reply: "I'm thinking... please try again.",
        action: null,
        actionData: {},
      };
    }

    return parsed;
  } catch (err) {
    console.error("Ollama error:", err.message);
    return {
      reply:
        "I'm having trouble connecting to my AI brain right now. Your data was saved successfully though!",
      action: null,
      actionData: {},
    };
  }
}

module.exports = { callOllama };
