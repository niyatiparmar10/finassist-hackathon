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
  try {
    const response = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral",
        prompt: SYSTEM_PROMPT + "\n\n" + userPrompt,
        stream: false,
      }),
    });

    if (!response.ok) {
      throw new Error(`Ollama returned ${response.status}`);
    }

    const data = await response.json();
    const raw = data.response || "";

    // Parse JSON from Ollama's response
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return { reply: raw.trim(), action: null, actionData: null };
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return {
      reply: parsed.reply || raw,
      action: parsed.action || null,
      actionData: parsed.actionData || null,
    };
  } catch (err) {
    console.error("Ollama error:", err.message);
    // Fallback so the app doesn't break if Ollama is down
    return {
      reply:
        "I'm having trouble connecting to my AI brain right now. Your data was saved successfully though!",
      action: null,
      actionData: null,
    };
  }
}

module.exports = { callOllama };
