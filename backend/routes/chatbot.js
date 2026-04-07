//chatbot.js

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
    // ── Fetch last 10 messages for session context (INSIDE try block) ──
    const recentHistory = await ChatHistory.find({ userId })
      .sort({ timestamp: -1 })
      .limit(10)
      .lean();

    const chatHistory = recentHistory.reverse().map((h) => ({
      role: h.role === "bot" ? "assistant" : "user",
      content: h.message,
    }));

    // ── Use the full user message for intent detection.
    // Receipt extractions often start with a generic header line,
    // so the first line alone is not reliable.
    const intentMessage = message;

    const detected = detectIntent(intentMessage);
    console.log("INTENT DEBUG:", detected);

    let contextForOllama = "";
    let savedData = null;
    let intent = detected.intent;
    let responseAction = null;
    let responseActionData = null;
    let directReply = null;
    let suggestLog = false;
    let suggestLogType = null;
    let suggestLogAmount = null;

    const profilePeriod =
      detected.period === "explicit"
        ? { period: "explicit", month: detected.month, year: detected.year }
        : detected.period === "last"
          ? { period: "last" }
          : { period: "current" };

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
          source: "chatbot",
        });
        savedData = expense;
        responseAction = "NAVIGATE_EXPENSES";
        const profile = await buildFinancialProfile(userId);
        const category = detected.category || "other";
        directReply = `Logged ₹${detected.amount.toLocaleString("en-IN")} under ${category}. This month total spend is now ₹${profile.monthly_spend.toLocaleString("en-IN")}.`;
      }
    } else if (intent === INTENTS.ADD_SAVING) {
      if (detected.amount) {
        const saving = await Saving.create({
          userId,
          amount: detected.amount,
          note: message,
          source: "chatbot",
        });
        savedData = saving;
        responseAction = "NAVIGATE_SAVINGS";
        const updatedProfile = await buildFinancialProfile(userId);
        directReply = `Saved ₹${detected.amount.toLocaleString("en-IN")}. This month total savings is now ₹${updatedProfile.monthly_saved.toLocaleString("en-IN")}.`;
      }
    } else if (intent === INTENTS.CREATE_GOAL) {
      const profile = await buildFinancialProfile(userId);
      const amount = detected.amount;
      const deadline = detected.date ? new Date(detected.date) : null;

      if (!amount) {
        contextForOllama = `User told the chatbot they want to create a goal but did not give a number. Ask: how much do they want to save, and by when?`;
      } else {
        let actualDeadline = deadline;
        let defaultUsed = false;
        if (!actualDeadline) {
          const d = new Date();
          d.setMonth(d.getMonth() + 6);
          actualDeadline = d;
          defaultUsed = true;
        }

        const monthsAvailable = Math.max(
          1,
          Math.ceil((actualDeadline - new Date()) / (1000 * 60 * 60 * 24 * 30)),
        );
        const requiredMonthly = Math.ceil(amount / monthsAvailable);
        const onTrack = profile.monthly_surplus >= requiredMonthly;

        let title = "Savings Goal";
        const forMatch = message.match(
          /(?:for(?:\s+a)?|save\s+for)\s+([a-zA-Z][a-zA-Z\s]{2,30}?)(?:\s+by|\s*$)/i,
        );
        if (forMatch)
          title = forMatch[1].trim().replace(/\b\w/g, (c) => c.toUpperCase());

        const goal = await Goal.create({
          userId,
          title,
          reason: message,
          targetAmount: amount,
          savedSoFar: 0,
          deadline: actualDeadline,
          monthlyContribution: requiredMonthly,
          onTrack,
          status: "active",
        });

        savedData = goal;
        responseAction = "NAVIGATE_GOALS";
        responseActionData = { goalId: goal._id, title };

        contextForOllama = `IMPORTANT: The goal of ₹${amount} for "${title}" by ${actualDeadline.toLocaleDateString("en-IN", { month: "long", year: "numeric" })} has been created successfully in the database.

Tell the user in a friendly way that their goal has been created. Mention:
- The exact amount: ₹${amount}
- The title: ${title}
- The deadline: ${actualDeadline.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
- Required monthly saving: ₹${requiredMonthly}

DO NOT hallucinate or change the amount. DO NOT change the year. Use EXACTLY ₹${amount}.`;
      }
    } else if (intent === INTENTS.GET_TOP_CATEGORY) {
      const profile = await buildFinancialProfile(userId, profilePeriod);

      let monthLabel;
      if (profilePeriod.period === "explicit") {
        const date = new Date(profilePeriod.year, profilePeriod.month, 1);
        monthLabel = date.toLocaleString("default", {
          month: "long",
          year: "numeric",
        });
      } else if (profilePeriod.period === "last") {
        const lastDate = new Date();
        lastDate.setMonth(lastDate.getMonth() - 1);
        monthLabel = lastDate.toLocaleString("default", {
          month: "long",
          year: "numeric",
        });
      } else {
        monthLabel = new Date().toLocaleString("default", {
          month: "long",
          year: "numeric",
        });
      }

      const topCategory = profile.top_category || "none";
      const replyText =
        topCategory === "none"
          ? `I couldn't find any expenses for ${monthLabel}. Try logging some spending first.`
          : `Your top spending category for ${monthLabel} is ${topCategory}, with ₹${profile.category_breakdown[topCategory] || 0} spent.`;

      // Save to history then return — this was the bug (was returning without saving)
      await ChatHistory.create({ userId, role: "user", message, intent });
      await ChatHistory.create({
        userId,
        role: "bot",
        message: replyText,
        intent,
        action: null,
      });

      return res.json({
        reply: replyText,
        action: null,
        actionData: {},
        intent,
        saved: false,
        suggestLog: false,
        suggestLogType: null,
        suggestLogAmount: null,
      });
    } else if (intent === INTENTS.GET_INSIGHTS) {
      console.log("[DEBUG] Handling GET_INSIGHTS, period:", profilePeriod);
      const profile = await buildFinancialProfile(userId, profilePeriod);

      let monthLabel;
      if (profilePeriod.period === "explicit") {
        const date = new Date(profilePeriod.year, profilePeriod.month, 1);
        monthLabel = date.toLocaleString("default", {
          month: "long",
          year: "numeric",
        });
      } else if (profilePeriod.period === "last") {
        const lastDate = new Date();
        lastDate.setMonth(lastDate.getMonth() - 1);
        monthLabel = lastDate.toLocaleString("default", {
          month: "long",
          year: "numeric",
        });
      } else {
        monthLabel = new Date().toLocaleString("default", {
          month: "long",
          year: "numeric",
        });
      }

      // Call health-check simulation engine for a richer score
      let healthData = null;
      try {
        const healthRes = await fetch(
          `${SIMULATION_URL}/simulate/health-check`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              monthly_income: profile.monthly_income,
              avg_monthly_spend:
                profile.avg_monthly_spend || profile.monthly_spend,
              current_month_spend: profile.monthly_spend,
              current_day_of_month: profile.current_day_of_month,
              total_days_in_month: profile.total_days_in_month,
              monthly_saved: profile.monthly_saved,
              total_monthly_commitments: profile.total_monthly_commitments || 0,
              goals_active: profile.goals_active,
              historical_months: (profile.historical_months || []).map((m) => ({
                totalSpend: m.totalSpend,
                totalIncome: m.totalIncome,
                totalSaved: m.totalSaved,
                label: m.label,
              })),
            }),
          },
        );
        healthData = await healthRes.json();
        console.log("[DEBUG] Health check result:", healthData);
      } catch (err) {
        console.error("[DEBUG] Health check sim error:", err.message);
      }

      const healthLine = healthData
        ? `Financial Health Score: ${healthData.health_score}/100 (${healthData.health_label}). Recommendations: ${healthData.recommendations.join(" | ")}`
        : "";

      contextForOllama = `=== ${monthLabel} USER FINANCIAL PROFILE (pre-calculated) ===
Monthly Income: ₹${profile.monthly_income}
Monthly Spending: ₹${profile.monthly_spend}
Top Category: ${profile.top_category} (${profile.top_percent}% of income)
Savings: ₹${profile.monthly_saved}
Monthly Surplus: ₹${profile.monthly_surplus}
Active Goals: ${profile.goals_active} (${profile.goals_at_risk} at risk)
Category Breakdown: ${JSON.stringify(profile.category_breakdown)}
${healthLine}

User asked: "${message}"
Give a friendly 3-4 sentence summary of how they are doing financially. Include the health score if available.`;
    } else if (intent === INTENTS.SIMULATE_EMI) {
      const profile = await buildFinancialProfile(userId);
      responseAction = null;
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
        if (simResult.safe === true) {
          suggestLog = true;
          suggestLogType = "emi";
          suggestLogAmount = detected.amount || 5000;
        }

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
    } else if (intent === INTENTS.SIMULATE_INVESTMENT) {
      const profile = await buildFinancialProfile(userId);
      const amount = detected.amount || 1000;
      responseAction = null;
      let simResult = null;
      try {
        const simRes = await fetch(`${SIMULATION_URL}/simulate/investment`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            monthly_amount: amount,
            months: 24,
            expected_annual_return: 12.0,
            current_surplus: profile.monthly_surplus,
          }),
        });
        simResult = await simRes.json();
      } catch {
        simResult = null;
      }

      if (simResult) {
        if (simResult.safe === true) {
          suggestLog = true;
          suggestLogType = "sip";
          suggestLogAmount = amount;
        }

        contextForOllama = `FACTS (pre-calculated hypothetical from simulator):
- Proposed SIP: ₹${amount}/month × 24 months at 12% annual return
- Total you would invest: ₹${simResult.total_invested}
- Estimated future value: ₹${simResult.estimated_value}
- Projected total gain: ₹${simResult.gain}
- Affordable? ${simResult.safe ? "YES — within your surplus" : "NO — would exceed surplus"}
- Impact on surplus: ₹${simResult.impact_on_surplus}/month remaining
Explain in 2-3 sentences what WILL happen if they start this SIP. Use only these numbers. Use future tense.`;
      } else {
        contextForOllama = `User asked about SIP investment of ₹${amount}/month. Message: "${message}"
Their current surplus is ₹${profile.monthly_surplus}/month. The simulation engine is not running right now.
Give general advice on whether this SIP amount is feasible based on their surplus.`;
      }
    } else if (intent === INTENTS.SIMULATE_EXPENSE_CUT) {
      const profile = await buildFinancialProfile(userId);
      const cat = detected.category || profile.top_category;
      const catAmount = profile.category_breakdown[cat] || 0;
      responseAction = null;
      let simResult = null;
      try {
        const simRes = await fetch(`${SIMULATION_URL}/simulate/expense-cut`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            category: cat,
            cut_percent: 20,
            current_monthly_spend: profile.monthly_spend,
            category_amount: catAmount,
            monthly_income: profile.monthly_income,
          }),
        });
        simResult = await simRes.json();
      } catch {
        simResult = null;
      }

      if (simResult) {
        contextForOllama = `FACTS (pre-calculated from simulator):
- Category: ${cat}, current spend ₹${catAmount}/month
- Cut by 20%: saves ₹${simResult.monthly_saving}/month
- New monthly surplus: ₹${simResult.new_surplus}/month
- New monthly spend: ₹${simResult.new_monthly_spend}
- Annual saving: ₹${simResult.annual_saving}
Explain in 2 sentences what the impact WILL be. Use only these numbers.`;
      } else {
        contextForOllama = `User asked about cutting ${cat} spending by 20%. Message: "${message}"
Current ${cat} spend: ₹${catAmount}/month. The simulation engine is not running.
Give general advice on the impact of a 20% cut to this category.`;
      }
    } else if (intent === INTENTS.SIMULATE_FD) {
      console.log(
        "[DEBUG] Handling SIMULATE_FD intent, amount:",
        detected.amount,
      );
      const profile = await buildFinancialProfile(userId);
      let simResult = null;
      try {
        const simRes = await fetch(`${SIMULATION_URL}/simulate/fd`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            principal: detected.amount || 10000,
            months: 12,
            annual_rate: 6.5,
            monthly_surplus: profile.monthly_surplus,
          }),
        });
        simResult = await simRes.json();
        console.log("[DEBUG] FD sim result:", simResult);
      } catch (err) {
        console.error("[DEBUG] FD simulation error:", err.message);
      }

      if (simResult && !simResult.error) {
        contextForOllama = `FACTS (FD simulation):
- Principal: ₹${detected.amount || 10000}
- Duration: 12 months at 6.5% annual rate (monthly compounding)
- Maturity amount: ₹${simResult.maturity_amount}
- Total interest earned: ₹${simResult.total_interest}
- Safe to lock this amount: ${simResult.safe ? "YES" : "NO"}
- Recommendation: ${simResult.recommendation}
Explain this in 2-3 simple sentences. Use only these numbers.`;
      } else {
        contextForOllama = `User asked about a Fixed Deposit of ₹${detected.amount}. Message: "${message}"
Their monthly surplus is ₹${profile.monthly_surplus}. The simulation engine is not available.
Give general advice about FDs and whether this amount seems feasible.`;
      }
    } else if (intent === INTENTS.SIMULATE_MUTUAL_FUND) {
      console.log(
        "[DEBUG] Handling SIMULATE_MUTUAL_FUND intent, amount:",
        detected.amount,
      );
      const profile = await buildFinancialProfile(userId);
      let simResult = null;
      try {
        const simRes = await fetch(`${SIMULATION_URL}/simulate/mutual-fund`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            monthly_amount: detected.amount || 1000,
            months: 36,
            expected_annual_return: 14.0,
            fund_type: message.toLowerCase().includes("debt")
              ? "debt"
              : message.toLowerCase().includes("balanced")
                ? "balanced"
                : "equity",
            monthly_surplus: profile.monthly_surplus,
          }),
        });
        simResult = await simRes.json();
        console.log("[DEBUG] MF sim result:", simResult);
      } catch (err) {
        console.error("[DEBUG] Mutual fund simulation error:", err.message);
      }

      if (simResult && !simResult.error) {
        contextForOllama = `FACTS (Mutual Fund SIP simulation):
- Monthly SIP: ₹${detected.amount || 1000} for 36 months
- Expected return: ${simResult.xirr_approx}
- Total invested: ₹${simResult.total_invested}
- Estimated value: ₹${simResult.estimated_value}
- Estimated gain: ₹${simResult.gain}
- Affordable: ${simResult.safe ? "YES — within surplus" : "NO — exceeds surplus"}
- Tax note: ${simResult.tax_note}
Explain this in 2-3 simple sentences. Use only these numbers.`;
      } else {
        contextForOllama = `User asked about a Mutual Fund SIP of ₹${detected.amount}/month. Message: "${message}"
Their surplus is ₹${profile.monthly_surplus}. The simulation engine is not available.
Give general advice about mutual fund SIPs.`;
      }
    } else if (intent === INTENTS.EXPLAIN_CONCEPT) {
      const profile = await buildFinancialProfile(userId);
      responseAction = null;
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
      const profile = await buildFinancialProfile(userId, profilePeriod);

      let monthLabel;
      if (profilePeriod.period === "explicit") {
        const date = new Date(profilePeriod.year, profilePeriod.month, 1);
        monthLabel = date.toLocaleString("default", {
          month: "long",
          year: "numeric",
        });
      } else if (profilePeriod.period === "last") {
        const lastDate = new Date();
        lastDate.setMonth(lastDate.getMonth() - 1);
        monthLabel = lastDate.toLocaleString("default", {
          month: "long",
          year: "numeric",
        });
      } else {
        monthLabel = new Date().toLocaleString("default", {
          month: "long",
          year: "numeric",
        });
      }

      contextForOllama = `User message: "${message}"
Their ${monthLabel} profile: ₹${profile.monthly_income} income, ₹${profile.monthly_spend} spending, ₹${profile.monthly_surplus} surplus.
Respond helpfully. You can help them log expenses, savings, create goals, or answer financial questions.`;
    }

    let ollamaResponse = null;

    // For transactional logging intents, avoid LLM arithmetic hallucinations.
    if (!directReply) {
      ollamaResponse = await callOllama(contextForOllama, chatHistory);
    }

    // SAFETY CHECK: If CREATE_GOAL, verify the reply contains the correct amount
    if (intent === INTENTS.CREATE_GOAL && savedData && ollamaResponse) {
      const correctAmount = savedData.targetAmount;
      const replyHasCorrectAmount = new RegExp(
        `₹${correctAmount}|Rs\\.?\\s*${correctAmount}`,
      ).test(ollamaResponse.reply);
      if (!replyHasCorrectAmount) {
        console.warn(
          `Ollama hallucinated wrong amount in CREATE_GOAL. Correcting response.`,
        );
        const deadline = savedData.deadline.toLocaleDateString("en-IN", {
          month: "long",
          year: "numeric",
        });
        ollamaResponse.reply = `Perfect! I've created your goal to save ₹${correctAmount} for ${savedData.title} by ${deadline}. You need to save ₹${savedData.monthlyContribution} each month to stay on track. Let's get started!`;
      }
    }

    const finalReply = directReply || ollamaResponse?.reply || "Done.";
    const finalAction = responseAction || ollamaResponse?.action || null;
    const finalActionData =
      responseActionData || ollamaResponse?.actionData || null;

    // Save both messages to chat history
    await ChatHistory.create({ userId, role: "user", message, intent });
    await ChatHistory.create({
      userId,
      role: "bot",
      message: finalReply,
      intent,
      action: finalAction,
    });

    res.json({
      reply: finalReply,
      action: finalAction,
      actionData: finalActionData,
      intent,
      saved: !!savedData,
      suggestLog,
      suggestLogType,
      suggestLogAmount,
    });
  } catch (err) {
    console.error("Chatbot error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chatbot/reels
router.post("/reels", async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });

  try {
    const profile = await buildFinancialProfile(userId);

    const prompt = `You are a financial advisor generating personalized "reel" cards for a user.

USER PROFILE (use ONLY these real numbers):
- Monthly income: ₹${profile.monthly_income}
- Monthly spending: ₹${profile.monthly_spend}
- Monthly surplus: ₹${profile.monthly_surplus}
- Top spending category: ${profile.top_category} (${profile.top_percent}% of income)
- Category breakdown: ${JSON.stringify(profile.category_breakdown)}
- Savings this month: ₹${profile.monthly_saved}
- Savings rate: ${profile.savings_rate_percent}%
- Active goals: ${profile.goals_active}
- User type: ${profile.user_type}
- Goals: ${JSON.stringify(profile.goals_list || [])}

Generate exactly 5 personalized financial reel cards. Each must reference their ACTUAL numbers — not generic advice.

Return ONLY a JSON array (no markdown, no explanation):
[
  {
    "id": "r1",
    "category": "food|savings|investment|budgeting|debt|goals|entertainment|shopping|health",
    "title": "Short punchy title (max 8 words)",
    "hook": "One attention-grabbing sentence using their real numbers",
    "insight": "2 sentences of personalized insight using their exact numbers",
    "action": "One specific actionable tip they can do today",
    "stat": "One key number from their data e.g. 42% on food"
  }
]

Rules: every card must mention at least one real number. No generic advice. Vary categories. Friendly tone.`;

    const ollamaResponse = await callOllama(prompt);
    const raw = ollamaResponse.reply || "";
    const match = raw.match(/\[[\s\S]*\]/);
    if (match) {
      try {
        const reels = JSON.parse(match[0]);
        const requiredCategories = new Set([
          "investment",
          "savings",
          "budgeting",
          "goals",
        ]);
        const hasCore = reels.some((r) =>
          requiredCategories.has((r.category || "").toLowerCase()),
        );
        if (Array.isArray(reels) && reels.length >= 5 && hasCore) {
          return res.json({ reels });
        }
      } catch (parseErr) {
        console.error("Ollama JSON parse error:", parseErr);
      }
    }

    // Fallback rule-based reels
    const inc = profile.monthly_income || 0;
    const spend = profile.monthly_spend || 0;
    const surplus = profile.monthly_surplus || 0;
    const saved = profile.monthly_saved || 0;
    const saveRate = profile.savings_rate_percent || 0;
    const top = profile.top_category || "other";
    const topPct = profile.top_percent || 0;
    const topAmt = profile.category_breakdown?.[top] || 0;

    const fallbackReels = [
      {
        id: "f1",
        category: top,
        title: `${topPct}% of your income goes to ${top}`,
        hook: `You spent ₹${topAmt.toLocaleString("en-IN")} on ${top} this month alone.`,
        insight: `The 50/30/20 rule suggests needs should be under 50% of income. Your ${top} spending at ${topPct}% is your biggest opportunity to save more. Even a 20% reduction saves ₹${Math.round(topAmt * 0.2).toLocaleString("en-IN")}/month.`,
        action: `Set a daily ₹${Math.round((topAmt * 0.8) / 30).toLocaleString("en-IN")} budget for ${top} for the next 7 days.`,
        stat: `${topPct}% on ${top}`,
      },
      {
        id: "f2",
        category: "savings",
        title:
          saveRate < 20
            ? "Your savings rate needs work"
            : "Great savings habit!",
        hook: `You saved ${saveRate}% of your income — the recommended minimum is 20%.`,
        insight: `With ₹${inc.toLocaleString("en-IN")} income, 20% savings = ₹${Math.round(inc * 0.2).toLocaleString("en-IN")}/month. You saved ₹${saved.toLocaleString("en-IN")} this month. ${saveRate < 20 ? `That's ₹${Math.round(inc * 0.2 - saved).toLocaleString("en-IN")} short of the target.` : "You are on track!"}`,
        action: `Transfer ₹${Math.round(surplus * 0.3).toLocaleString("en-IN")} (30% of your surplus) to a savings account right now.`,
        stat: `${saveRate}% savings rate`,
      },
      {
        id: "f3",
        category: "investment",
        title: "Your surplus can work harder",
        hook: `₹${surplus.toLocaleString("en-IN")} monthly surplus sitting idle is a missed opportunity.`,
        insight: `Investing ₹${Math.round(surplus * 0.3).toLocaleString("en-IN")}/month (30% of your surplus) in a SIP at 12% annual return gives you ₹${Math.round(Math.round(surplus * 0.3) * 24 * 1.27).toLocaleString("en-IN")} in 2 years — your money growing while you sleep.`,
        action:
          "Open a SIP on Groww or Zerodha Coin today. Start with ₹500/month.",
        stat: `₹${surplus.toLocaleString("en-IN")} surplus/month`,
      },
      {
        id: "f4",
        category: "budgeting",
        title: "The 50/30/20 rule for your money",
        hook: `With ₹${inc.toLocaleString("en-IN")} income, here's what your ideal budget looks like.`,
        insight: `Needs (50%): ₹${Math.round(inc * 0.5).toLocaleString("en-IN")} | Wants (30%): ₹${Math.round(inc * 0.3).toLocaleString("en-IN")} | Savings (20%): ₹${Math.round(inc * 0.2).toLocaleString("en-IN")}. You're currently spending ₹${spend.toLocaleString("en-IN")} total — ${spend > inc * 0.8 ? "above the recommended 80%." : "within a healthy range."}`,
        action: "Categorize every expense this week as Need, Want, or Savings.",
        stat: `₹${inc.toLocaleString("en-IN")} monthly income`,
      },
      {
        id: "f5",
        category: "goals",
        title:
          profile.goals_active > 0
            ? `${profile.goals_active} goals — let's accelerate`
            : "No goals yet — start today",
        hook:
          profile.goals_active > 0
            ? `You have ${profile.goals_active} active goal(s). Your surplus can fund them faster.`
            : "People with written goals are 42% more likely to achieve them.",
        insight:
          profile.goals_active > 0
            ? `With ₹${surplus.toLocaleString("en-IN")} monthly surplus, dedicating 50% (₹${Math.round(surplus * 0.5).toLocaleString("en-IN")}) to your goals means significant progress every month.`
            : `You currently have ₹${surplus.toLocaleString("en-IN")} in monthly surplus with no goal assigned to it. That money has no direction yet.`,
        action:
          profile.goals_active > 0
            ? "Set up an auto-transfer to your goal every month."
            : "Go to Goals and create your first savings goal in 60 seconds.",
        stat:
          profile.goals_active > 0
            ? `${profile.goals_active} active goals`
            : "No goals set",
      },
      {
        id: "f6",
        category: "debt",
        title: "Reduce debt risk and keep options open",
        hook: `If you have existing liabilities, keeping a safe cushion from your ₹${surplus.toLocaleString("en-IN")} surplus shields you from emergencies.`,
        insight: `Even a small portion of your surplus (₹${Math.round(surplus * 0.2).toLocaleString("en-IN")}/month) can reduce your interest burden and improve your credit profile.`,
        action:
          "Review high-interest liabilities and pay down the top 1-2 items first.",
        stat: "Debt safety plan",
      },
    ];

    res.json({ reels: fallbackReels });
  } catch (err) {
    console.error("Reels generation error:", err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chatbot/explain-reel
router.post("/explain-reel", async (req, res) => {
  const { userId, reelTitle, reelInsight, reelCategory, reelAction } = req.body;
  if (!userId) return res.status(400).json({ error: "userId required" });

  try {
    const profile = await buildFinancialProfile(userId);
    const prompt = `The user wants to understand this financial tip in depth:
Title: ${reelTitle}
Category: ${reelCategory}
Insight: ${reelInsight}
Action tip: ${reelAction}

User's financial context:
- Monthly income: ₹${profile.monthly_income}
- Monthly spend: ₹${profile.monthly_spend}
- Recommended surplus for advice: ₹${profile.recommended_surplus_for_advice}
- Top spending category: ${profile.top_category}

Explain this tip in detail in 4-5 sentences. Connect it directly to their actual numbers. Be conversational and friendly.`;

    const response = await callOllama(prompt, []);

    await ChatHistory.create({
      userId,
      role: "user",
      message: `Explain reel: ${reelTitle}`,
      intent: "EXPLAIN_REEL",
    });
    await ChatHistory.create({
      userId,
      role: "bot",
      message: response.reply,
      intent: "EXPLAIN_REEL",
    });

    res.json({ reply: response.reply, action: null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/chatbot/read-image
router.post("/read-image", async (req, res) => {
  const { userId, imageBase64, mimeType } = req.body;
  if (!userId || !imageBase64)
    return res.status(400).json({ error: "Missing data" });

  try {
    const groqApiKey = process.env.GROQ_API_KEY;
    if (!groqApiKey) {
      return res.status(500).json({ error: "GROQ_API_KEY is missing in .env" });
    }

    const response = await fetch(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "image_url",
                  image_url: {
                    url: `data:${mimeType || "image/jpeg"};base64,${imageBase64}`,
                  },
                },
                {
                  type: "text",
                  text: "This is a financial document or receipt. Extract all relevant financial information: amounts, categories, dates, merchant names. Format as: AMOUNT: X, CATEGORY: Y, DATE: Z, NOTE: description.",
                },
              ],
            },
          ],
        }),
      },
    );

    if (!response.ok) {
      const errData = await response.json().catch(() => ({}));
      console.error("Groq Vision error:", errData);
      throw new Error(`Groq API returned ${response.status}`);
    }

    const data = await response.json();
    const extractedText = data.choices[0]?.message?.content || "";

    res.json({ extractedText });
  } catch (err) {
    console.error("Image read error:", err);
    res.status(500).json({ error: "Could not read image" });
  }
});

module.exports = router;
