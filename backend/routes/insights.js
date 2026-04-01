const express = require("express");
const router = express.Router();
const { buildFinancialProfile } = require("../services/profileBuilder");

// GET /api/insights/reels/:userId
router.get("/reels/:userId", async (req, res) => {
  try {
    const profile = await buildFinancialProfile(req.params.userId);
    const reels = [];

    // Rule-based card generation from spending behaviour
    if (profile.top_percent > 35) {
      reels.push({
        id: "r1",
        type: "warning",
        title: `You spent ${profile.top_percent}% on ${profile.top_category} this month`,
        message: `The 50/30/20 rule suggests needs should be max 50% of income. Your ${profile.top_category} alone is ${profile.top_percent}% (₹${(profile.category_breakdown[profile.top_category] || 0).toLocaleString("en-IN")}). Try capping daily ${profile.top_category} spend.`,
        tip: `Track each ${profile.top_category} expense this week to spot patterns.`,
        category: profile.top_category,
      });
    }

    if (profile.monthly_surplus < profile.monthly_income * 0.1) {
      reels.push({
        id: "r2",
        type: "education",
        title: "Your savings rate is below 10%",
        message: `You're saving ${profile.savings_rate_percent}% of your income. Financial experts recommend at least 20%. Even ₹500/month invested at age 22 beats ₹5,000/month at age 32 due to compounding.`,
        tip: "Try the 'pay yourself first' rule — save before you spend.",
        category: "savings",
      });
    }

    if (profile.goals_active > 0) {
      reels.push({
        id: "r3",
        type: "tip",
        title: "SIP vs lump sum for your goals",
        message: `You have ${profile.goals_active} active goal(s). For goals under 2 years, a recurring monthly transfer works better than waiting to save a lump sum. Automate ₹${Math.round(profile.monthly_surplus * 0.5).toLocaleString("en-IN")}/month.`,
        tip: "Set a monthly calendar reminder to transfer to your goal.",
        category: "goals",
      });
    }

    // Always add a general tip
    reels.push({
      id: "r4",
      type: "education",
      title: "The 50/30/20 rule explained with your numbers",
      message: `With ₹${profile.monthly_income.toLocaleString("en-IN")} income: ₹${Math.round(profile.monthly_income * 0.5).toLocaleString("en-IN")} for needs, ₹${Math.round(profile.monthly_income * 0.3).toLocaleString("en-IN")} for wants, ₹${Math.round(profile.monthly_income * 0.2).toLocaleString("en-IN")} for savings/investments.`,
      tip:
        "You're spending ₹" +
        profile.monthly_spend.toLocaleString("en-IN") +
        " total this month.",
      category: "budgeting",
    });

    res.json({ reels });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/insights/income-vs-expense/:userId
router.get("/income-vs-expense/:userId", async (req, res) => {
  try {
    const { Expense, User } = require("../models");
    const { userId } = req.params;
    const user = await User.findById(userId);
    const months = [];
    const income = [];
    const expenses_data = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const exps = await Expense.find({
        userId,
        date: { $gte: start, $lte: end },
      });
      const total = exps.reduce((sum, e) => sum + e.amount, 0);
      months.push(start.toLocaleString("default", { month: "short" }));
      income.push(user?.monthlyIncome || 0);
      expenses_data.push(total);
    }

    res.json({ months, income, expenses: expenses_data });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
