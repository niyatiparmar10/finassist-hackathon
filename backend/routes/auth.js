//auth.js

const express = require("express");
const router = express.Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const rateLimit = require("express-rate-limit");
const { User } = require("../models");

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    res.status(429).json({
      error: "Too many requests. Please try again after 15 minutes.",
    });
  },
});

// POST /api/auth/register
router.post("/register", authLimiter, async (req, res) => {
  try {
    const { name, email, password, userType } = req.body;
    const existing = await User.findOne({ email });
    if (existing)
      return res.status(400).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      userType: userType || "student",
    });
    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });

    res.json({ token, userId: user._id, name: user.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/login
router.post("/login", authLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: "User not found" });

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return res.status(400).json({ error: "Wrong password" });

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {
      expiresIn: "30d",
    });
    res.json({ token, userId: user._id, name: user.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/auth/refresh
router.post("/refresh", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: "Token required" });

    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const decoded = jwt.decode(token);
    const expiresAt = decoded?.exp;
    const now = Math.floor(Date.now() / 1000);
    const timeRemaining = expiresAt ? expiresAt - now : 0;

    if (timeRemaining <= 0) {
      return res
        .status(401)
        .json({ error: "Token expired. Please login again." });
    }

    if (timeRemaining < 7 * 24 * 60 * 60) {
      const newToken = jwt.sign(
        { userId: payload.userId },
        process.env.JWT_SECRET,
        {
          expiresIn: "30d",
        },
      );
      return res.json({ token: newToken });
    }

    return res.json({ token });
  } catch (err) {
    return res
      .status(401)
      .json({ error: "Token expired. Please login again." });
  }
});

module.exports = router;
