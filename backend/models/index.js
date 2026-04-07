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
  source: { type: String, enum: ["chatbot", "manual"], default: "chatbot" },
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

const monthlyProfileSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  year: { type: Number, required: true },
  month: { type: Number, required: true }, // 0-indexed: 0=Jan, 11=Dec
  totalDaysInMonth: { type: Number },
  daysRecorded: { type: Number }, // partial month awareness
  totalIncome: { type: Number, default: 0 },
  totalSpend: { type: Number, default: 0 },
  totalSaved: { type: Number, default: 0 },
  categoryBreakdown: { type: Object, default: {} },
  surplus: { type: Number, default: 0 },
  isComplete: { type: Boolean, default: false }, // true only after month ends
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});
monthlyProfileSchema.index({ userId: 1, year: 1, month: 1 }, { unique: true });

// ── [NEW SECTION 6] Financial Investment ──────────────
// Tracks active SIPs, EMIs, FDs, mutual funds, RDs
const financialInvestmentSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: {
    type: String,
    enum: ["sip", "emi", "fd", "mutual_fund", "rd"],
    required: true,
  },
  name: { type: String, required: true }, // e.g. "Nifty 50 Index Fund SIP"
  monthlyAmount: { type: Number, required: true }, // monthly commitment
  totalAmount: { type: Number }, // for FD/lump sum
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date }, // optional, for EMI with fixed tenure
  tenureMonths: { type: Number }, // how many months total
  interestRate: { type: Number }, // annual rate for FD/EMI
  status: {
    type: String,
    enum: ["active", "completed", "paused"],
    default: "active",
  },
  notes: { type: String, default: "" },
  createdAt: { type: Date, default: Date.now },
});

// ── [NEW SECTION 6] Todo Item ─────────────────────────
// Personal to-do list items per user (pay someone, collect money, reminders)
const todoItemSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  text: { type: String, required: true }, // the task description
  type: {
    type: String,
    enum: ["pay", "collect", "reminder", "other"],
    default: "other",
  }, // tag for color-coding
  amount: { type: Number, default: null }, // optional amount if money-related
  person: { type: String, default: "" }, // optional person name
  completed: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

module.exports = {
  User: mongoose.model("User", userSchema),
  Expense: mongoose.model("Expense", expenseSchema),
  Saving: mongoose.model("Saving", savingSchema),
  Goal: mongoose.model("Goal", goalSchema),
  ChatHistory: mongoose.model("ChatHistory", chatHistorySchema),
  MonthlyProfile: mongoose.model("MonthlyProfile", monthlyProfileSchema),
  FinancialInvestment: mongoose.model(
    "FinancialInvestment",
    financialInvestmentSchema,
  ),
  TodoItem: mongoose.model("TodoItem", todoItemSchema),
};
