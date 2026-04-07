//models/index.js

const mongoose = require("mongoose");

// ── User ──────────────────────────────────────────────
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  monthlyIncome: { type: Number, default: 0 },
  userType: {
    type: String,
    enum: ["student", "working", "freelancer"],
    default: "student",
  },
  createdAt: { type: Date, default: Date.now },
  lastActive: { type: Date, default: Date.now },
});

// ── Expense ───────────────────────────────────────────
const expenseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  category: {
    type: String,
    enum: ["food", "transport", "entertainment", "health", "shopping", "other"],
    default: "other",
  },
  description: { type: String, default: "" },
  date: { type: Date, default: Date.now },
  source: { type: String, enum: ["chatbot", "manual"], default: "chatbot" },
});

// ── Saving ────────────────────────────────────────────
const savingSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  amount: { type: Number, required: true },
  note: { type: String, default: "" },
  date: { type: Date, default: Date.now },
  linkedGoalId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Goal",
    default: null,
  },
});

// ── Goal ──────────────────────────────────────────────
const goalSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  reason: { type: String, default: "" },
  targetAmount: { type: Number, required: true },
  savedSoFar: { type: Number, default: 0 },
  deadline: { type: Date },
  monthlyContribution: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ["active", "completed", "paused"],
    default: "active",
  },
  onTrack: { type: Boolean, default: true },
  projectedCompletionDate: { type: Date },
  createdAt: { type: Date, default: Date.now },
});

// ── Chat History ──────────────────────────────────────
const chatHistorySchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  role: { type: String, enum: ["user", "bot"], required: true },
  message: { type: String, required: true },
  intent: { type: String, default: null },
  action: { type: String, default: null },
  timestamp: { type: Date, default: Date.now },
});

module.exports = {
  User: mongoose.model("User", userSchema),
  Expense: mongoose.model("Expense", expenseSchema),
  Saving: mongoose.model("Saving", savingSchema),
  Goal: mongoose.model("Goal", goalSchema),
  ChatHistory: mongoose.model("ChatHistory", chatHistorySchema),
};
