//profileBuilder.js

const { Expense, Saving, Goal, User } = require("../models");

// Builds a lightweight financial profile for a user.
// This is what gets sent to Ollama — backend calculates, Ollama only explains.
async function buildFinancialProfile(userId, options = {}) {
  const user = await User.findById(userId);
  const now = new Date();
  let startDate;
  let endDate = now;

  if (options.period === "explicit" && typeof options.month === "number") {
    const year = options.year || now.getFullYear();
    startDate = new Date(year, options.month, 1);
    endDate = new Date(year, options.month + 1, 1);
  } else if (options.period === "last") {
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    startDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth(), 1);
    endDate = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 1);
  } else {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  }

  // Interval expenses and savings
  const expenses = await Expense.find({
    userId,
    date: { $gte: startDate, $lt: endDate },
  });
  const savings = await Saving.find({
    userId,
    date: { $gte: startDate, $lt: endDate },
  });
  const goals = await Goal.find({ userId, status: "active" });

  const monthlySpend = expenses.reduce((sum, e) => sum + e.amount, 0);
  const monthlySaved = savings.reduce((sum, s) => sum + s.amount, 0);
  const monthlyIncome = user?.monthlyIncome || 0;
  const surplus = monthlyIncome - monthlySpend;

  // Category breakdown
  const breakdown = {};
  for (const e of expenses) {
    breakdown[e.category] = (breakdown[e.category] || 0) + e.amount;
  }
  const topCategory =
    Object.entries(breakdown).sort((a, b) => b[1] - a[1])[0]?.[0] || "none";
  const topPercent =
    monthlyIncome > 0
      ? Math.round((breakdown[topCategory] / monthlyIncome) * 100)
      : 0;

  // Goals summary
  const goalsAtRisk = goals.filter((g) => !g.onTrack).length;

  return {
    monthly_income: monthlyIncome,
    monthly_spend: monthlySpend,
    monthly_surplus: surplus,
    monthly_saved: monthlySaved,
    savings_rate_percent:
      monthlyIncome > 0 ? Math.round((monthlySaved / monthlyIncome) * 100) : 0,
    top_category: topCategory,
    top_percent: topPercent,
    category_breakdown: breakdown,
    user_type: user?.userType || "student",
    goals_active: goals.length,
    goals_at_risk: goalsAtRisk,
    goals_list: goals.map((g) => ({
      title: g.title,
      progress: Math.round((g.savedSoFar / g.targetAmount) * 100),
    })),
  };
}

module.exports = { buildFinancialProfile };
