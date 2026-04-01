const express = require("express");
const router = express.Router();
const { Goal, User, Expense } = require("../models");

// POST /api/goals/create
router.post("/create", async (req, res) => {
  try {
    const {
      userId,
      title,
      targetAmount,
      deadline,
      reason,
      monthlyContribution,
    } = req.body;

    // Feasibility check
    const user = await User.findById(userId);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const expenses = await Expense.find({
      userId,
      date: { $gte: startOfMonth },
    });
    const monthlySpend = expenses.reduce((sum, e) => sum + e.amount, 0);
    const surplus = (user?.monthlyIncome || 0) - monthlySpend;

    const deadlineDate = deadline ? new Date(deadline) : null;
    const monthsAvailable = deadlineDate
      ? Math.max(
          1,
          Math.ceil((deadlineDate - new Date()) / (1000 * 60 * 60 * 24 * 30)),
        )
      : 12;
    const requiredMonthly = Math.ceil(targetAmount / monthsAvailable);
    const feasible = surplus >= requiredMonthly;

    const goal = await Goal.create({
      userId,
      title,
      reason: reason || "",
      targetAmount,
      deadline: deadlineDate,
      monthlyContribution: monthlyContribution || requiredMonthly,
    });

    res.json({
      success: true,
      goal,
      feasibility: {
        feasible,
        requiredMonthly,
        currentSurplus: surplus,
        monthsNeeded: monthsAvailable,
      },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/goals/:userId
router.get("/:userId", async (req, res) => {
  try {
    const goals = await Goal.find({ userId: req.params.userId }).sort({
      createdAt: -1,
    });
    const enriched = goals.map((g) => ({
      ...g._doc,
      progress: Math.round((g.savedSoFar / g.targetAmount) * 100),
      monthsRemaining: g.deadline
        ? Math.max(
            0,
            Math.ceil(
              (new Date(g.deadline) - new Date()) / (1000 * 60 * 60 * 24 * 30),
            ),
          )
        : null,
    }));
    res.json({ goals: enriched });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/goals/update-progress/:goalId
router.put("/update-progress/:goalId", async (req, res) => {
  try {
    const { amount } = req.body;
    const goal = await Goal.findById(req.params.goalId);
    if (!goal) return res.status(404).json({ error: "Goal not found" });

    goal.savedSoFar += amount;
    if (goal.savedSoFar >= goal.targetAmount) goal.status = "completed";
    await goal.save();

    res.json({
      success: true,
      newProgress: goal.savedSoFar,
      progressPercent: Math.round((goal.savedSoFar / goal.targetAmount) * 100),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/goals/analyze
router.post("/analyze", async (req, res) => {
  try {
    const { userId, targetAmount, monthsAvailable } = req.body;
    const user = await User.findById(userId);
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const expenses = await Expense.find({
      userId,
      date: { $gte: startOfMonth },
    });
    const monthlySpend = expenses.reduce((sum, e) => sum + e.amount, 0);
    const surplus = (user?.monthlyIncome || 0) - monthlySpend;
    const requiredMonthly = Math.ceil(targetAmount / (monthsAvailable || 12));

    res.json({
      achievable: surplus >= requiredMonthly,
      requiredMonthly,
      currentSurplus: surplus,
      buffer: surplus - requiredMonthly,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
