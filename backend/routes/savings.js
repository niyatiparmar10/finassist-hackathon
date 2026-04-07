//savings.js

const express = require("express");
const router = express.Router();
const { Saving } = require("../models");

// POST /api/savings/add
router.post("/add", async (req, res) => {
  try {
    const { userId, amount, note, linkedGoalId, source } = req.body;
    const saving = await Saving.create({
      userId,
      amount,
      note,
      linkedGoalId: linkedGoalId || null,
      source: source || "chatbot",
    });

    // If linked to a goal, update goal's savedSoFar
    if (linkedGoalId) {
      const { Goal } = require("../models");
      const goal = await Goal.findById(linkedGoalId);
      if (goal) {
        goal.savedSoFar += amount;
        goal.onTrack = goal.savedSoFar < goal.targetAmount;
        await goal.save();
      }
    }

    // Calculate streak
    const allSavings = await Saving.find({ userId }).sort({
      date: -1,
      _id: -1,
    });
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const day = new Date(today);
      day.setDate(today.getDate() - i);
      const dayStr = day.toDateString();
      const found = allSavings.find(
        (s) => new Date(s.date).toDateString() === dayStr,
      );
      if (found) streak++;
      else if (i > 0) break;
    }

    const totalSavings = allSavings.reduce((sum, s) => sum + s.amount, 0);
    res.json({ success: true, totalSavings, streak });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/savings/list/:userId
router.get("/list/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const entries = await Saving.find({ userId }).sort({ date: -1, _id: -1 });
    const totalSaved = entries.reduce((sum, s) => sum + s.amount, 0);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = entries
      .filter((s) => new Date(s.date) >= startOfMonth)
      .reduce((sum, s) => sum + s.amount, 0);

    // Monthly history (last 6 months)
    const monthlyHistory = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      const start = new Date(d.getFullYear(), d.getMonth(), 1);
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59);
      const total = entries
        .filter((s) => new Date(s.date) >= start && new Date(s.date) <= end)
        .reduce((sum, s) => sum + s.amount, 0);
      monthlyHistory.push(total);
    }

    res.json({ entries, totalSaved, thisMonth, monthlyHistory });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
