//profileBuilder.js

const { Expense, Saving, Goal, User } = require("../models");

// Builds a comprehensive financial profile for a user.
// Includes current month, historical data, projections, and averages.
async function buildFinancialProfile(userId, options = {}) {
  const user = await User.findById(userId);
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed
  const currentDayOfMonth = now.getDate();

  // Handle options.period for explicit month or last month queries
  let currentMonthStart,
    currentMonthEnd,
    isHistoricalQuery = false;
  if (options.period === "explicit" && typeof options.month === "number") {
    const y = options.year || currentYear;
    currentMonthStart = new Date(y, options.month, 1);
    currentMonthEnd = new Date(y, options.month + 1, 1);
    isHistoricalQuery = true;
  } else if (options.period === "last") {
    const lm = currentMonth === 0 ? 11 : currentMonth - 1;
    const ly = currentMonth === 0 ? currentYear - 1 : currentYear;
    currentMonthStart = new Date(ly, lm, 1);
    currentMonthEnd = new Date(ly, lm + 1, 1);
    isHistoricalQuery = true;
  } else {
    currentMonthStart = new Date(currentYear, currentMonth, 1);
    currentMonthEnd = new Date(currentYear, currentMonth + 1, 1);
  }

  const totalDaysInMonth = new Date(
    currentMonthStart.getFullYear(),
    currentMonthStart.getMonth() + 1,
    0,
  ).getDate();
  const daysRemainingInMonth = isHistoricalQuery
    ? 0
    : totalDaysInMonth - currentDayOfMonth;
  const currentExpenses = await Expense.find({
    userId,
    date: { $gte: currentMonthStart, $lt: currentMonthEnd },
  });
  const currentSavings = await Saving.find({
    userId,
    date: { $gte: currentMonthStart, $lt: currentMonthEnd },
  });
  const goals = await Goal.find({ userId, status: "active" });

  const monthlySpend = currentExpenses.reduce((sum, e) => sum + e.amount, 0);
  const monthlySaved = currentSavings.reduce((sum, s) => sum + s.amount, 0);
  const monthlyIncome = user?.monthlyIncome || 0;
  const surplus = monthlyIncome - monthlySpend;

  // Separate general and goal savings
  const generalSavings = currentSavings.filter((s) => !s.linkedGoalId);
  const goalSavings = currentSavings.filter((s) => s.linkedGoalId);
  const monthlyGeneralSaved = generalSavings.reduce(
    (sum, s) => sum + s.amount,
    0,
  );
  const monthlyGoalSaved = goalSavings.reduce((sum, s) => sum + s.amount, 0);

  // Category breakdown
  const categoryBreakdown = {};
  for (const e of currentExpenses) {
    categoryBreakdown[e.category] =
      (categoryBreakdown[e.category] || 0) + e.amount;
  }
  const topCategory =
    Object.entries(categoryBreakdown).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "none";
  const topPercent =
    monthlyIncome > 0
      ? Math.round((categoryBreakdown[topCategory] / monthlyIncome) * 100)
      : 0;

  // Step B: Load last 3 completed months
  const historicalMonths = [];
  for (let i = 1; i <= 3; i++) {
    const histMonth = currentMonth - i;
    const histYear = histMonth < 0 ? currentYear - 1 : currentYear;
    const adjustedMonth = histMonth < 0 ? histMonth + 12 : histMonth;
    const histStart = new Date(histYear, adjustedMonth, 1);
    const histEnd = new Date(histYear, adjustedMonth + 1, 1);
    const histDaysInMonth = new Date(histYear, adjustedMonth + 1, 0).getDate();

    const histExpenses = await Expense.find({
      userId,
      date: { $gte: histStart, $lt: histEnd },
    });
    const histSavings = await Saving.find({
      userId,
      date: { $gte: histStart, $lt: histEnd },
    });

    const histTotalSpend = histExpenses.reduce((sum, e) => sum + e.amount, 0);
    const histTotalSaved = histSavings.reduce((sum, s) => sum + s.amount, 0);
    const histTotalIncome = monthlyIncome; // Assume same income
    const histSurplus = histTotalIncome - histTotalSpend;

    const histBreakdown = {};
    for (const e of histExpenses) {
      histBreakdown[e.category] = (histBreakdown[e.category] || 0) + e.amount;
    }

    const monthName = new Date(histYear, adjustedMonth, 1).toLocaleString(
      "default",
      { month: "long" },
    );
    historicalMonths.push({
      label: `${monthName} ${histYear}`,
      month: adjustedMonth,
      year: histYear,
      totalSpend: histTotalSpend,
      totalIncome: histTotalIncome,
      totalSaved: histTotalSaved,
      categoryBreakdown: histBreakdown,
      surplus: histSurplus,
      daysInMonth: histDaysInMonth,
      isComplete: true,
    });
  }

  // Step D: 3-month averages
  const avgMonthlySpend =
    historicalMonths.reduce((sum, m) => sum + m.totalSpend, 0) / 3;
  const avgMonthlySurplus =
    historicalMonths.reduce((sum, m) => sum + m.surplus, 0) / 3;
  const avgMonthlySaved =
    historicalMonths.reduce((sum, m) => sum + m.totalSaved, 0) / 3;

  const avgCategoryBreakdown = {};
  const categories = new Set();
  historicalMonths.forEach((m) =>
    Object.keys(m.categoryBreakdown).forEach((c) => categories.add(c)),
  );
  for (const cat of categories) {
    const amounts = historicalMonths.map((m) => m.categoryBreakdown[cat] || 0);
    avgCategoryBreakdown[cat] = amounts.reduce((sum, a) => sum + a, 0) / 3;
  }

  // Step C: Projected monthly spend
  const dailySpendRate =
    currentDayOfMonth > 0 ? monthlySpend / currentDayOfMonth : 0;
  const hasHistory = historicalMonths.some((m) => m.totalSpend > 0);
  const projectedMonthlySpend =
    !isHistoricalQuery && hasHistory
      ? dailySpendRate * totalDaysInMonth * 0.4 + avgMonthlySpend * 0.6
      : !isHistoricalQuery
        ? dailySpendRate * totalDaysInMonth
        : monthlySpend;
  const projectedSurplus = monthlyIncome - projectedMonthlySpend;

  // Step E: Already done above

  // Step F: Active investments (placeholder, model doesn't exist yet)
  let activeInvestments = [];
  let totalMonthlyCommitments = 0;
  try {
    const { FinancialInvestment } = require("../models");
    if (FinancialInvestment) {
      activeInvestments = await FinancialInvestment.find({
        userId,
        status: "active",
      });
      totalMonthlyCommitments = activeInvestments.reduce(
        (sum, inv) => sum + (inv.monthlyCommitment || 0),
        0,
      );
    }
  } catch (e) {
    // Model not found, skip
  }
  const effectiveSurplus = projectedSurplus - totalMonthlyCommitments;

  // Goals summary
  const goalsAtRisk = goals.filter((g) => !g.onTrack).length;

  return {
    monthly_income: monthlyIncome,
    monthly_spend: monthlySpend,
    monthly_surplus: surplus,
    projected_monthly_spend: projectedMonthlySpend,
    projected_surplus: projectedSurplus,
    effective_surplus: effectiveSurplus,
    current_day_of_month: currentDayOfMonth,
    total_days_in_month: totalDaysInMonth,
    days_remaining_in_month: daysRemainingInMonth,
    monthly_general_saved: monthlyGeneralSaved,
    monthly_goal_saved: monthlyGoalSaved,
    monthly_saved: monthlySaved,
    savings_rate_percent:
      monthlyIncome > 0 ? Math.round((monthlySaved / monthlyIncome) * 100) : 0,
    top_category: topCategory,
    top_percent: topPercent,
    category_breakdown: categoryBreakdown,
    user_type: user?.userType || "student",
    goals_active: goals.length,
    goals_at_risk: goalsAtRisk,
    goals_list: goals.map((g) => ({
      title: g.title,
      progress: Math.round((g.savedSoFar / g.targetAmount) * 100),
    })),
    historical_months: historicalMonths,
    avg_monthly_spend: avgMonthlySpend,
    avg_monthly_surplus: avgMonthlySurplus,
    avg_monthly_saved: avgMonthlySaved,
    avg_category_breakdown: avgCategoryBreakdown,
    active_investments: activeInvestments,
    total_monthly_commitments: totalMonthlyCommitments,
    recommended_surplus_for_advice: historicalMonths.some(
      (m) => m.totalSpend > 0,
    )
      ? avgMonthlySurplus
      : projectedSurplus,
    advice_basis: historicalMonths.some((m) => m.totalSpend > 0)
      ? "3_month_average"
      : "projection",
  };
}

module.exports = { buildFinancialProfile };
