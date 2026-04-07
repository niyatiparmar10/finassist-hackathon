//ollamaService.js

const fetch = require("node-fetch");

const OLLAMA_URL = process.env.OLLAMA_URL || "http://localhost:11434";

const SYSTEM_PROMPT = `You are FinMind AI, a personal finance assistant for Indian users.
STRICT RULES — follow exactly:
1. You NEVER calculate numbers yourself. All numbers are already provided to you.
2. You ONLY explain and give advice based on the provided data.
3. Respond in friendly, simple language. Avoid jargon unless user asks.
4. Keep responses under 80 words unless user asks for detail.
5. Use Indian currency format (₹) always.
6. Always respond in this exact JSON format (no extra text, no markdown):
{
  "reply": "your message here",
  "action": "NAVIGATE_GOALS | NAVIGATE_SAVINGS | NAVIGATE_DASHBOARD | NAVIGATE_CARDS | null",
  "actionData": {} 
}`;

async function callOllama(userPrompt) {
  function parseOllamaJson(rawText) {
    if (!rawText || typeof rawText !== "string") return null;

    // allow response with extra text around JSON and also strict JSON body
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    const candidate = jsonMatch ? jsonMatch[0] : rawText.trim();

    try {
      const parsed = JSON.parse(candidate);
      if (typeof parsed !== "object" || parsed === null) return null;
      return parsed;
    } catch (parseErr) {
      return null;
    }
  }

  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: process.env.OLLAMA_MODEL || "mistral",
        prompt: SYSTEM_PROMPT + "\n\n" + userPrompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`);
    }

    const data = await response.json();
    const raw = data.response || "";

    const parsed = parseOllamaJson(raw);
    if (!parsed || !parsed.reply) {
      console.warn(
        "Ollama returned malformed JSON, falling back to plain text reply:",
        raw,
      );
      return {
        reply:
          raw.trim() ||
          "Sorry, I could not interpret the assistant response. Please try again.",
        action: null,
        actionData: {},
      };
    }

    return {
      reply: parsed.reply || "",
      action: parsed.action || null,
      actionData: parsed.actionData || {},
    };
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
