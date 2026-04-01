const express = require("express");
const router = express.Router();
const { Expense } = require("../models");

// POST /api/expenses/add
router.post("/add", async (req, res) => {
  try {
    const { userId, amount, category, description, date } = req.body;
    const expense = await Expense.create({
      userId,
      amount,
      category,
      description,
      date: date || new Date(),
    });

    // Return updated category totals for this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const monthExpenses = await Expense.find({
      userId,
      date: { $gte: startOfMonth },
    });
    const totals = {};
    let total = 0;
    for (const e of monthExpenses) {
      totals[e.category] = (totals[e.category] || 0) + e.amount;
      total += e.amount;
    }

    res.json({ success: true, expense, updatedTotals: { ...totals, total } });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/expenses/summary/:userId
router.get("/summary/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);

    const expenses = await Expense.find({
      userId,
      date: { $gte: startOfMonth },
    });
    const breakdown = {};
    let total = 0;
    for (const e of expenses) {
      breakdown[e.category] = (breakdown[e.category] || 0) + e.amount;
      total += e.amount;
    }

    const topCategory = Object.entries(breakdown).sort(
      (a, b) => b[1] - a[1],
    )[0];

    res.json({
      total,
      breakdown,
      topCategory: topCategory?.[0] || "none",
      topAmount: topCategory?.[1] || 0,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/expenses/monthly/:userId  — last 6 months
router.get("/monthly/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const months = [];
    const totals = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const expenses = await Expense.find({
        userId,
        date: { $gte: start, $lte: end },
      });
      const total = expenses.reduce((sum, e) => sum + e.amount, 0);
      months.push(start.toLocaleString("default", { month: "short" }));
      totals.push(total);
    }

    res.json({ months, totals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/expenses/all/:userId
router.get("/all/:userId", async (req, res) => {
  try {
    const expenses = await Expense.find({ userId: req.params.userId })
      .sort({ date: -1 })
      .limit(50);
    res.json({ expenses });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
