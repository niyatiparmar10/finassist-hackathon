const express = require("express");
const router = express.Router();
const { User } = require("../models");
const { buildFinancialProfile } = require("../services/profileBuilder");

// GET /api/user/financial-profile/:userId
router.get("/financial-profile/:userId", async (req, res) => {
  try {
    const profile = await buildFinancialProfile(req.params.userId);
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/user/update-income/:userId
router.put("/update-income/:userId", async (req, res) => {
  try {
    const { monthlyIncome, userType } = req.body;
    const user = await User.findByIdAndUpdate(
      req.params.userId,
      { monthlyIncome, userType },
      { new: true },
    );
    res.json({ success: true, user });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
