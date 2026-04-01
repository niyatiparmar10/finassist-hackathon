const express = require("express");
const router = express.Router();
const { detectIntent, INTENTS } = require("../services/intentDetector");
const { callOllama } = require("../services/ollamaService");
const { buildFinancialProfile } = require("../services/profileBuilder");
const { User, Expense, Saving, Goal, ChatHistory } = require("../models");
const fetch = require("node-fetch");

const SIMULATION_URL = process.env.SIMULATION_URL || "http://localhost:8000";

// POST /api/chatbot/message
router.post("/message", async (req, res) => {
  const { userId, message } = req.body;
  if (!userId || !message)
    return res.status(400).json({ error: "userId and message required" });

  try {
    const detected = detectIntent(message);
    let contextForOllama = "";
    let savedData = null;
    let intent = detected.intent;

    // ── Route to handler based on intent ──────────────────────────

    if (intent === INTENTS.UPDATE_INCOME) {
      if (detected.amount) {
        await User.findByIdAndUpdate(userId, {
          monthlyIncome: detected.amount,
        });
        contextForOllama = `User updated their monthly income to ₹${detected.amount}.`;
      }
    } else if (intent === INTENTS.ADD_EXPENSE) {
      if (detected.amount) {
        const expense = await Expense.create({
          userId,
          amount: detected.amount,
          category: detected.category || "other",
          description: detected.description || message,
          date: detected.date || new Date(),
        });
        savedData = expense;
        const profile = await buildFinancialProfile(userId);
        contextForOllama = `User logged ₹${detected.amount} expense under ${detected.category || "other"}.
Current month total spending: ₹${profile.monthly_spend}.
Top category: ${profile.top_category} (${profile.top_percent}% of income).
Monthly income: ₹${profile.monthly_income}. Monthly surplus: ₹${profile.monthly_surplus}.`;
      }
    } else if (intent === INTENTS.ADD_SAVING) {
      if (detected.amount) {
        const saving = await Saving.create({
          userId,
          amount: detected.amount,
          note: message,
        });
        savedData = saving;
        contextForOllama = `User saved ₹${detected.amount}. Note: "${message}". Encourage them briefly.`;
      }
    } else if (intent === INTENTS.CREATE_GOAL) {
      const profile = await buildFinancialProfile(userId);
      contextForOllama = `User wants to create a savings goal. Message: "${message}"
Their financial profile: monthly income ₹${profile.monthly_income}, monthly spend ₹${profile.monthly_spend}, surplus ₹${profile.monthly_surplus}.
Ask them: what is the target amount, what is the deadline, and why do they want this goal.
If the goal seems achievable with their surplus, tell them so with the numbers. Include action NAVIGATE_GOALS.`;
    } else if (intent === INTENTS.GET_INSIGHTS) {
      const profile = await buildFinancialProfile(userId);
      contextForOllama = `=== USER FINANCIAL PROFILE (pre-calculated) ===
Monthly Income: ₹${profile.monthly_income}
Monthly Spending: ₹${profile.monthly_spend}
Top Category: ${profile.top_category} (${profile.top_percent}% of income)
Savings This Month: ₹${profile.monthly_saved}
Monthly Surplus: ₹${profile.monthly_surplus}
Active Goals: ${profile.goals_active} (${profile.goals_at_risk} at risk)
Category Breakdown: ${JSON.stringify(profile.category_breakdown)}

User asked: "${message}"
Give a friendly 3-4 sentence summary of how they are doing financially.`;
    } else if (intent === INTENTS.SIMULATE_EMI) {
      const profile = await buildFinancialProfile(userId);
      let simResult = null;
      try {
        const simRes = await fetch(`${SIMULATION_URL}/simulate/emi`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            emi_amount: detected.amount || 5000,
            months: 12,
            monthly_income: profile.monthly_income,
            current_monthly_spend: profile.monthly_spend,
          }),
        });
        simResult = await simRes.json();
      } catch {
        simResult = null;
      }

      if (simResult) {
        contextForOllama = `=== SIMULATION RESULT (pre-calculated) ===
EMI Amount: ₹${detected.amount}/month
New Monthly Surplus After EMI: ₹${simResult.monthly_surplus_after_emi}
Safe: ${simResult.safe}
Risk Level: ${simResult.risk_level}
Recommendation: ${simResult.recommendation}

User message: "${message}"
Explain this simulation result in simple, friendly language. Be direct about whether they can afford it.`;
      } else {
        contextForOllama = `User asked about taking an EMI. Message: "${message}"
Their surplus is ₹${profile.monthly_surplus}/month. The simulation engine is not running right now.
Give general advice about whether they should take an EMI based on their surplus.`;
      }
    } else if (intent === INTENTS.EXPLAIN_CONCEPT) {
      const profile = await buildFinancialProfile(userId);
      contextForOllama = `User asked: "${message}"
User type: ${profile.user_type}. Monthly income: ₹${profile.monthly_income}.
Explain the concept in simple terms relevant to their financial situation.`;
    } else if (intent === INTENTS.GET_GOAL_STATUS) {
      const goals = await Goal.find({ userId, status: "active" });
      const summary = goals
        .map(
          (g) =>
            `${g.title}: ₹${g.savedSoFar} of ₹${g.targetAmount} (${Math.round((g.savedSoFar / g.targetAmount) * 100)}%)`,
        )
        .join(", ");
      contextForOllama = `User's active goals: ${summary || "No active goals"}.
User asked: "${message}". Summarize their goal progress briefly.`;
    } else if (intent === INTENTS.GET_REELS) {
      contextForOllama = `User wants financial tips. Tell them to check the Cards section for personalized tips. Include action NAVIGATE_CARDS.`;
    } else {
      // UNKNOWN intent — still give a helpful response
      const profile = await buildFinancialProfile(userId);
      contextForOllama = `User message: "${message}"
Their profile: ₹${profile.monthly_income} income, ₹${profile.monthly_spend} spending, ₹${profile.monthly_surplus} surplus.
Respond helpfully. You can help them log expenses, savings, create goals, or answer financial questions.`;
    }

    // Call Ollama
    const ollamaResponse = await callOllama(contextForOllama);

    // Save both messages to chat history
    await ChatHistory.create({ userId, role: "user", message, intent });
    await ChatHistory.create({
      userId,
      role: "bot",
      message: ollamaResponse.reply,
      intent,
      action: ollamaResponse.action,
    });

    res.json({
      reply: ollamaResponse.reply,
      action: ollamaResponse.action,
      actionData: ollamaResponse.actionData,
      intent,
      saved: !!savedData,
    });
  } catch (err) {
    console.error("Chatbot error:", err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
