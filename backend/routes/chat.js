//chat.js

const express = require("express");
const router = express.Router();
const { ChatHistory } = require("../models");

// POST /api/chat/save
router.post("/save", async (req, res) => {
  try {
    const { userId, role, message, intent, action } = req.body;
    const entry = await ChatHistory.create({
      userId,
      role,
      message,
      intent,
      action,
    });
    res.json({ success: true, messageId: entry._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/chat/history/:userId
router.get("/history/:userId", async (req, res) => {
  try {
    const history = await ChatHistory.find({ userId: req.params.userId })
      .sort({ timestamp: 1 })
      .limit(100);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/chat/history/:userId
router.delete("/history/:userId", async (req, res) => {
  try {
    const result = await ChatHistory.deleteMany({ userId: req.params.userId });
    res.json({ success: true, deleted: result.deletedCount });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
