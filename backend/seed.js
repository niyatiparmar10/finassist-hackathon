// Run: node seed.js from the backend folder
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const {
  User,
  Expense,
  Saving,
  Goal,
  ChatHistory,
  FinancialInvestment,
  TodoItem,
} = require("./models");

const DEMO_EMAIL = "niyati@finassist.demo";
const DEMO_PASSWORD = "demo1234";
const DEMO_NAME = "Niyati Parmar";
const INCOME = 38000; // working professional stipend — juicy enough for all simulations

// ── Date helpers ──────────────────────────────────────────────────────────────
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d;
}

function inMonth(monthsBack, dayOfMonth) {
  const d = new Date();
  d.setDate(1); // anchor to 1st to avoid month-overflow bugs
  d.setMonth(d.getMonth() - monthsBack);
  d.setDate(dayOfMonth);
  d.setHours(12, 0, 0, 0);
  return d;
}

// ─────────────────────────────────────────────────────────────────────────────
// EXPENSES — 5 months
// Designed so:
//   Current month  → food is #1 category, visible chatbot insight
//   Last month     → entertainment spike (good for "cut spending" demo)
//   2 months ago   → balanced, healthy month
//   3 months ago   → shopping spike
//   4 months ago   → lowest spend, great health score
// ─────────────────────────────────────────────────────────────────────────────

// CURRENT MONTH (running total ≈ ₹18,400 — food-heavy)
const CURRENT_MONTH = [
  {
    date: daysAgo(0),
    amount: 140,
    category: "food",
    description: "Canteen lunch",
  },
  {
    date: daysAgo(0),
    amount: 55,
    category: "food",
    description: "Chai and vada pav",
  },
  {
    date: daysAgo(1),
    amount: 320,
    category: "food",
    description: "Dinner at FC Road — birthday treat",
  },
  {
    date: daysAgo(1),
    amount: 95,
    category: "transport",
    description: "Ola cab to office",
  },
  {
    date: daysAgo(2),
    amount: 180,
    category: "food",
    description: "Zomato order — biryani",
  },
  {
    date: daysAgo(2),
    amount: 199,
    category: "entertainment",
    description: "Netflix monthly subscription",
  },
  {
    date: daysAgo(3),
    amount: 75,
    category: "food",
    description: "Morning breakfast + coffee",
  },
  {
    date: daysAgo(4),
    amount: 420,
    category: "shopping",
    description: "Amazon — noise-cancelling earbuds",
  },
  {
    date: daysAgo(4),
    amount: 200,
    category: "transport",
    description: "Petrol — Activa top-up",
  },
  {
    date: daysAgo(5),
    amount: 110,
    category: "food",
    description: "Canteen — dal-rice",
  },
  {
    date: daysAgo(5),
    amount: 550,
    category: "entertainment",
    description: "Saturday night out at Koregaon Park",
  },
  {
    date: daysAgo(6),
    amount: 145,
    category: "food",
    description: "Swiggy dinner",
  },
  {
    date: daysAgo(7),
    amount: 90,
    category: "transport",
    description: "Auto rides this week",
  },
  {
    date: daysAgo(7),
    amount: 160,
    category: "food",
    description: "Zomato — Sunday lunch",
  },
  {
    date: daysAgo(8),
    amount: 280,
    category: "health",
    description: "Pharmacy + doctor consultation",
  },
  {
    date: daysAgo(9),
    amount: 480,
    category: "shopping",
    description: "Myntra — kurta set for function",
  },
  { date: daysAgo(10), amount: 120, category: "food", description: "Canteen" },
  {
    date: daysAgo(11),
    amount: 400,
    category: "entertainment",
    description: "Lonavala day trip — petrol + entry + food",
  },
  {
    date: daysAgo(12),
    amount: 130,
    category: "food",
    description: "Lunch with colleagues",
  },
  {
    date: daysAgo(13),
    amount: 650,
    category: "shopping",
    description: "Decathlon — running shoes",
  },
  {
    date: daysAgo(14),
    amount: 150,
    category: "food",
    description: "Zomato — shawarma + drink",
  },
  {
    date: daysAgo(15),
    amount: 380,
    category: "entertainment",
    description: "Friday night with college group",
  },
  {
    date: daysAgo(16),
    amount: 105,
    category: "food",
    description: "Canteen breakfast + lunch",
  },
  {
    date: daysAgo(17),
    amount: 175,
    category: "transport",
    description: "Cab + petrol",
  },
  {
    date: daysAgo(18),
    amount: 220,
    category: "food",
    description: "Barbeque Nation dinner",
  },
  {
    date: daysAgo(19),
    amount: 100,
    category: "health",
    description: "Gym supplement",
  },
  {
    date: daysAgo(20),
    amount: 135,
    category: "food",
    description: "Swiggy lunch",
  },
  {
    date: daysAgo(21),
    amount: 299,
    category: "entertainment",
    description: "Amazon Prime yearly ÷12",
  },
  { date: daysAgo(22), amount: 115, category: "food", description: "Canteen" },
  {
    date: daysAgo(23),
    amount: 800,
    category: "shopping",
    description: "Flipkart — new bedsheet set + organiser",
  },
];

// LAST MONTH — entertainment spike (total ≈ ₹21,500)
const LAST_MONTH = [
  {
    date: inMonth(1, 1),
    amount: 160,
    category: "food",
    description: "Canteen",
  },
  {
    date: inMonth(1, 2),
    amount: 100,
    category: "transport",
    description: "Auto rides",
  },
  {
    date: inMonth(1, 3),
    amount: 230,
    category: "food",
    description: "Dinner with friends",
  },
  {
    date: inMonth(1, 4),
    amount: 199,
    category: "entertainment",
    description: "Netflix",
  },
  {
    date: inMonth(1, 5),
    amount: 1200,
    category: "entertainment",
    description: "Sunburn Festival tickets",
  },
  {
    date: inMonth(1, 6),
    amount: 650,
    category: "shopping",
    description: "Amazon — headphones",
  },
  { date: inMonth(1, 7), amount: 140, category: "food", description: "Zomato" },
  {
    date: inMonth(1, 8),
    amount: 190,
    category: "transport",
    description: "Petrol",
  },
  {
    date: inMonth(1, 10),
    amount: 115,
    category: "food",
    description: "Canteen",
  },
  {
    date: inMonth(1, 11),
    amount: 800,
    category: "entertainment",
    description: "Weekend resort trip — partial",
  },
  {
    date: inMonth(1, 12),
    amount: 300,
    category: "food",
    description: "FC Road outing",
  },
  {
    date: inMonth(1, 14),
    amount: 580,
    category: "shopping",
    description: "Decathlon — sports shoes",
  },
  {
    date: inMonth(1, 15),
    amount: 100,
    category: "food",
    description: "Breakfast",
  },
  {
    date: inMonth(1, 16),
    amount: 180,
    category: "health",
    description: "Gym fee",
  },
  {
    date: inMonth(1, 17),
    amount: 120,
    category: "food",
    description: "Canteen",
  },
  {
    date: inMonth(1, 18),
    amount: 500,
    category: "entertainment",
    description: "Movie + dinner date",
  },
  {
    date: inMonth(1, 19),
    amount: 110,
    category: "food",
    description: "Zomato",
  },
  {
    date: inMonth(1, 21),
    amount: 175,
    category: "transport",
    description: "Ola rides",
  },
  { date: inMonth(1, 22), amount: 145, category: "food", description: "Lunch" },
  {
    date: inMonth(1, 24),
    amount: 750,
    category: "shopping",
    description: "Flipkart sale — clothes",
  },
  {
    date: inMonth(1, 25),
    amount: 900,
    category: "entertainment",
    description: "Trip to Mumbai for concert",
  },
  {
    date: inMonth(1, 26),
    amount: 210,
    category: "food",
    description: "Friends dinner",
  },
  {
    date: inMonth(1, 28),
    amount: 160,
    category: "food",
    description: "Canteen",
  },
  {
    date: inMonth(1, 29),
    amount: 280,
    category: "entertainment",
    description: "Friday night out",
  },
  {
    date: inMonth(1, 30),
    amount: 95,
    category: "transport",
    description: "Auto",
  },
];

// TWO MONTHS AGO — healthy, balanced (total ≈ ₹14,200)
const TWO_MONTHS_AGO = [
  {
    date: inMonth(2, 1),
    amount: 120,
    category: "food",
    description: "Canteen lunch",
  },
  {
    date: inMonth(2, 2),
    amount: 85,
    category: "transport",
    description: "Auto",
  },
  {
    date: inMonth(2, 3),
    amount: 180,
    category: "food",
    description: "Zomato dinner",
  },
  {
    date: inMonth(2, 4),
    amount: 199,
    category: "entertainment",
    description: "Netflix",
  },
  {
    date: inMonth(2, 5),
    amount: 100,
    category: "food",
    description: "Breakfast",
  },
  {
    date: inMonth(2, 7),
    amount: 170,
    category: "transport",
    description: "Petrol",
  },
  {
    date: inMonth(2, 8),
    amount: 130,
    category: "food",
    description: "Canteen",
  },
  {
    date: inMonth(2, 10),
    amount: 320,
    category: "entertainment",
    description: "Weekend outing",
  },
  {
    date: inMonth(2, 12),
    amount: 270,
    category: "food",
    description: "Valentine's dinner",
  },
  {
    date: inMonth(2, 14),
    amount: 450,
    category: "shopping",
    description: "Amazon — books + stationery",
  },
  {
    date: inMonth(2, 15),
    amount: 110,
    category: "food",
    description: "Canteen",
  },
  {
    date: inMonth(2, 16),
    amount: 220,
    category: "health",
    description: "Doctor + medicines",
  },
  {
    date: inMonth(2, 18),
    amount: 145,
    category: "food",
    description: "Zomato",
  },
  {
    date: inMonth(2, 20),
    amount: 300,
    category: "entertainment",
    description: "Night out",
  },
  { date: inMonth(2, 22), amount: 105, category: "food", description: "Lunch" },
  {
    date: inMonth(2, 23),
    amount: 160,
    category: "transport",
    description: "Cab rides",
  },
  {
    date: inMonth(2, 25),
    amount: 400,
    category: "shopping",
    description: "Myntra sale",
  },
  {
    date: inMonth(2, 26),
    amount: 130,
    category: "food",
    description: "Dinner",
  },
  {
    date: inMonth(2, 28),
    amount: 280,
    category: "food",
    description: "End-of-month dinner out",
  },
  {
    date: inMonth(2, 28),
    amount: 180,
    category: "health",
    description: "Gym supplement",
  },
];

// THREE MONTHS AGO — shopping spike (total ≈ ₹19,800)
const THREE_MONTHS_AGO = [
  {
    date: inMonth(3, 1),
    amount: 150,
    category: "food",
    description: "Canteen",
  },
  {
    date: inMonth(3, 2),
    amount: 100,
    category: "transport",
    description: "Auto",
  },
  {
    date: inMonth(3, 3),
    amount: 199,
    category: "entertainment",
    description: "Netflix",
  },
  {
    date: inMonth(3, 5),
    amount: 1800,
    category: "shopping",
    description: "Diwali shopping — clothes & gifts",
  },
  {
    date: inMonth(3, 6),
    amount: 600,
    category: "shopping",
    description: "Amazon — Diwali sale gadgets",
  },
  {
    date: inMonth(3, 7),
    amount: 350,
    category: "food",
    description: "Diwali celebration dinner",
  },
  {
    date: inMonth(3, 8),
    amount: 200,
    category: "transport",
    description: "Petrol",
  },
  {
    date: inMonth(3, 10),
    amount: 125,
    category: "food",
    description: "Canteen",
  },
  {
    date: inMonth(3, 12),
    amount: 900,
    category: "shopping",
    description: "Flipkart Big Billion Day — headset",
  },
  {
    date: inMonth(3, 14),
    amount: 280,
    category: "food",
    description: "Restaurant dinner",
  },
  {
    date: inMonth(3, 15),
    amount: 500,
    category: "entertainment",
    description: "Weekend getaway — partial",
  },
  {
    date: inMonth(3, 17),
    amount: 115,
    category: "food",
    description: "Canteen",
  },
  { date: inMonth(3, 18), amount: 175, category: "health", description: "Gym" },
  {
    date: inMonth(3, 19),
    amount: 140,
    category: "food",
    description: "Zomato",
  },
  {
    date: inMonth(3, 21),
    amount: 1200,
    category: "shopping",
    description: "Myntra — winter jacket + formals",
  },
  {
    date: inMonth(3, 22),
    amount: 165,
    category: "food",
    description: "Lunch with team",
  },
  {
    date: inMonth(3, 24),
    amount: 350,
    category: "entertainment",
    description: "Friday outing",
  },
  {
    date: inMonth(3, 25),
    amount: 120,
    category: "food",
    description: "Canteen",
  },
  {
    date: inMonth(3, 27),
    amount: 180,
    category: "transport",
    description: "Cab rides",
  },
  {
    date: inMonth(3, 28),
    amount: 400,
    category: "shopping",
    description: "Amazon — desk organiser + lamp",
  },
  {
    date: inMonth(3, 29),
    amount: 200,
    category: "food",
    description: "Friends dinner",
  },
];

// FOUR MONTHS AGO — lowest spend, very healthy (total ≈ ₹11,500)
const FOUR_MONTHS_AGO = [
  {
    date: inMonth(4, 2),
    amount: 110,
    category: "food",
    description: "Canteen",
  },
  {
    date: inMonth(4, 3),
    amount: 80,
    category: "transport",
    description: "Auto",
  },
  { date: inMonth(4, 4), amount: 160, category: "food", description: "Zomato" },
  {
    date: inMonth(4, 5),
    amount: 199,
    category: "entertainment",
    description: "Netflix",
  },
  {
    date: inMonth(4, 6),
    amount: 95,
    category: "food",
    description: "Breakfast",
  },
  {
    date: inMonth(4, 8),
    amount: 165,
    category: "transport",
    description: "Petrol",
  },
  {
    date: inMonth(4, 10),
    amount: 120,
    category: "food",
    description: "Canteen",
  },
  {
    date: inMonth(4, 12),
    amount: 280,
    category: "entertainment",
    description: "Weekend movie + dinner",
  },
  {
    date: inMonth(4, 14),
    amount: 230,
    category: "food",
    description: "Birthday dinner",
  },
  {
    date: inMonth(4, 15),
    amount: 350,
    category: "shopping",
    description: "Amazon basics — phone cover + cable",
  },
  {
    date: inMonth(4, 17),
    amount: 105,
    category: "food",
    description: "Canteen",
  },
  {
    date: inMonth(4, 18),
    amount: 200,
    category: "health",
    description: "Doctor",
  },
  {
    date: inMonth(4, 20),
    amount: 135,
    category: "food",
    description: "Zomato",
  },
  {
    date: inMonth(4, 22),
    amount: 280,
    category: "entertainment",
    description: "Night out",
  },
  { date: inMonth(4, 24), amount: 100, category: "food", description: "Lunch" },
  {
    date: inMonth(4, 25),
    amount: 150,
    category: "transport",
    description: "Cab",
  },
  {
    date: inMonth(4, 27),
    amount: 300,
    category: "shopping",
    description: "Flipkart — book bundle",
  },
  {
    date: inMonth(4, 28),
    amount: 120,
    category: "food",
    description: "Dinner",
  },
  {
    date: inMonth(4, 29),
    amount: 110,
    category: "food",
    description: "Canteen",
  },
  {
    date: inMonth(4, 30),
    amount: 210,
    category: "food",
    description: "Month-end dinner",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SAVINGS — across 5 months, including goal-linked deposits
// ─────────────────────────────────────────────────────────────────────────────
// Note: goalIds are set after goals are inserted
const SAVINGS_TEMPLATES = [
  // Current month
  {
    date: daysAgo(2),
    amount: 1000,
    note: "Monthly savings target — first cut",
    goalKey: null,
  },
  {
    date: daysAgo(8),
    amount: 500,
    note: "Saved by cooking at home 3 days",
    goalKey: null,
  },
  {
    date: daysAgo(14),
    amount: 2000,
    note: "Goal deposit — Goa Trip",
    goalKey: "goa",
  },
  // Last month
  {
    date: inMonth(1, 5),
    amount: 800,
    note: "Salary day savings",
    goalKey: null,
  },
  {
    date: inMonth(1, 15),
    amount: 500,
    note: "Skipped weekend outing",
    goalKey: null,
  },
  {
    date: inMonth(1, 25),
    amount: 1500,
    note: "Goal deposit — Emergency Fund",
    goalKey: "emergency",
  },
  // Two months ago
  { date: inMonth(2, 7), amount: 1200, note: "Monthly savings", goalKey: null },
  {
    date: inMonth(2, 20),
    amount: 800,
    note: "Sold old textbooks + freelance gig",
    goalKey: null,
  },
  {
    date: inMonth(2, 28),
    amount: 2000,
    note: "Goal deposit — MacBook fund",
    goalKey: "macbook",
  },
  // Three months ago
  {
    date: inMonth(3, 8),
    amount: 500,
    note: "Tight month — saved whatever I could",
    goalKey: null,
  },
  {
    date: inMonth(3, 22),
    amount: 1000,
    note: "Goal deposit — Goa Trip",
    goalKey: "goa",
  },
  // Four months ago
  {
    date: inMonth(4, 5),
    amount: 2000,
    note: "Productive month — high savings",
    goalKey: null,
  },
  {
    date: inMonth(4, 18),
    amount: 1500,
    note: "Goal deposit — MacBook fund",
    goalKey: "macbook",
  },
  {
    date: inMonth(4, 28),
    amount: 500,
    note: "Goal deposit — Emergency Fund",
    goalKey: "emergency",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// GOALS
// ─────────────────────────────────────────────────────────────────────────────
const GOALS_DATA = {
  goa: {
    title: "Goa Trip",
    reason: "Annual trip with college friends after placement season",
    targetAmount: 15000,
    savedSoFar: 3000, // 2000 + 1000 from savings above
    deadline: new Date(new Date().getFullYear(), 11, 20),
    monthlyContribution: 2000,
    status: "active",
    onTrack: true,
  },
  emergency: {
    title: "Emergency Fund",
    reason: "3 months of expenses as a safety net — ₹38k safety buffer",
    targetAmount: 40000,
    savedSoFar: 2000, // 1500 + 500
    deadline: new Date(new Date().getFullYear() + 1, 5, 30),
    monthlyContribution: 3000,
    status: "active",
    onTrack: false,
  },
  macbook: {
    title: "MacBook Air M3",
    reason: "Upgrading from 5-year-old laptop for work and side projects",
    targetAmount: 90000,
    savedSoFar: 3500, // 2000 + 1500
    deadline: new Date(new Date().getFullYear() + 1, 8, 30),
    monthlyContribution: 7000,
    status: "active",
    onTrack: false,
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// INVESTMENTS — shows off the investments tracker
// ─────────────────────────────────────────────────────────────────────────────
const INVESTMENTS_DATA = [
  {
    type: "sip",
    name: "Nifty 50 Index Fund (Zerodha Coin)",
    monthlyAmount: 1000,
    tenureMonths: 36,
    interestRate: 12,
    startDate: inMonth(3, 5),
    status: "active",
    notes: "Long-term wealth building — staying invested regardless of market",
  },
  {
    type: "emi",
    name: "iPhone 14 EMI (Bajaj Finserv)",
    monthlyAmount: 2499,
    tenureMonths: 12,
    interestRate: 14,
    startDate: inMonth(4, 15),
    status: "active",
    notes: "Zero-cost EMI — ends in 8 months",
  },
  {
    type: "fd",
    name: "SBI Fixed Deposit — Emergency Buffer",
    monthlyAmount: 0,
    totalAmount: 10000,
    tenureMonths: 12,
    interestRate: 7.1,
    startDate: inMonth(2, 1),
    status: "active",
    notes: "Locked for 12 months — do not break unless emergency",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// TODO ITEMS — shows the dashboard My List feature
// ─────────────────────────────────────────────────────────────────────────────
const TODOS_DATA = [
  {
    text: "Pay Rahul back ₹800 for the Lonavala trip fuel",
    type: "pay",
    amount: 800,
    person: "Rahul",
    completed: false,
  },
  {
    text: "Collect ₹1200 from Priya for concert tickets",
    type: "collect",
    amount: 1200,
    person: "Priya",
    completed: false,
  },
  {
    text: "Renew vehicle insurance before 20th",
    type: "reminder",
    amount: null,
    person: "",
    completed: false,
  },
  {
    text: "Transfer ₹2000 to Goa Trip goal this week",
    type: "reminder",
    amount: 2000,
    person: "",
    completed: false,
  },
  {
    text: "File reimbursement claim at office",
    type: "other",
    amount: null,
    person: "",
    completed: false,
  },
  {
    text: "Pay electricity bill",
    type: "pay",
    amount: 1100,
    person: "",
    completed: true,
  },
  {
    text: "Collect money from Sahil for last month dinner",
    type: "collect",
    amount: 600,
    person: "Sahil",
    completed: true,
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// SEED FUNCTION
// ─────────────────────────────────────────────────────────────────────────────
async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✓ Connected to MongoDB\n");

  // Clear old demo data
  const old = await User.findOne({ email: DEMO_EMAIL });
  if (old) {
    await Promise.all([
      Expense.deleteMany({ userId: old._id }),
      Saving.deleteMany({ userId: old._id }),
      Goal.deleteMany({ userId: old._id }),
      ChatHistory.deleteMany({ userId: old._id }),
      FinancialInvestment?.deleteMany({ userId: old._id }).catch(() => {}),
      TodoItem?.deleteMany({ userId: old._id }).catch(() => {}),
      User.deleteOne({ _id: old._id }),
    ]);
    console.log("✓ Cleared old demo user data");
  }

  // Create user
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await User.create({
    name: DEMO_NAME,
    email: DEMO_EMAIL,
    passwordHash,
    monthlyIncome: INCOME,
    userType: "working",
  });
  console.log(`✓ Created user: ${DEMO_NAME} (${DEMO_EMAIL})`);

  // Insert goals first (we need IDs for savings)
  const goalDocs = {};
  for (const [key, g] of Object.entries(GOALS_DATA)) {
    const doc = await Goal.create({ userId: user._id, ...g });
    goalDocs[key] = doc._id;
  }
  console.log(`✓ Inserted ${Object.keys(GOALS_DATA).length} goals`);

  // Insert all expenses
  const allExpenses = [
    ...CURRENT_MONTH,
    ...LAST_MONTH,
    ...TWO_MONTHS_AGO,
    ...THREE_MONTHS_AGO,
    ...FOUR_MONTHS_AGO,
  ];
  for (const e of allExpenses) {
    await Expense.create({
      userId: user._id,
      amount: e.amount,
      category: e.category,
      description: e.description,
      date: e.date,
      source: "chatbot",
    });
  }
  console.log(`✓ Inserted ${allExpenses.length} expenses across 5 months`);

  // Insert savings (resolving goal IDs)
  for (const s of SAVINGS_TEMPLATES) {
    await Saving.create({
      userId: user._id,
      amount: s.amount,
      note: s.note,
      date: s.date,
      linkedGoalId: s.goalKey ? goalDocs[s.goalKey] : null,
      source: "chatbot",
    });
  }
  console.log(`✓ Inserted ${SAVINGS_TEMPLATES.length} savings entries`);

  // Insert investments
  if (FinancialInvestment) {
    for (const inv of INVESTMENTS_DATA) {
      await FinancialInvestment.create({ userId: user._id, ...inv });
    }
    console.log(`✓ Inserted ${INVESTMENTS_DATA.length} investment records`);
  }

  // Insert todos
  if (TodoItem) {
    for (const t of TODOS_DATA) {
      await TodoItem.create({ userId: user._id, ...t });
    }
    console.log(`✓ Inserted ${TODOS_DATA.length} todo items`);
  }

  // Spending totals for reference
  const currentSpend = CURRENT_MONTH.reduce((s, e) => s + e.amount, 0);
  const lastSpend = LAST_MONTH.reduce((s, e) => s + e.amount, 0);
  const twoMonthSpend = TWO_MONTHS_AGO.reduce((s, e) => s + e.amount, 0);
  const threeMonthSpend = THREE_MONTHS_AGO.reduce((s, e) => s + e.amount, 0);
  const fourMonthSpend = FOUR_MONTHS_AGO.reduce((s, e) => s + e.amount, 0);

  console.log(`
═══════════════════════════════════════════════════════════
  FINASSIST DEMO SEED COMPLETE
═══════════════════════════════════════════════════════════
  Login Email:   ${DEMO_EMAIL}
  Password:      ${DEMO_PASSWORD}
  Monthly Income: ₹${INCOME.toLocaleString("en-IN")}

  SPENDING HISTORY:
  ├─ This month:        ₹${currentSpend.toLocaleString("en-IN")}  (food-heavy, entertainment)
  ├─ Last month:        ₹${lastSpend.toLocaleString("en-IN")} (entertainment spike — concerts)
  ├─ 2 months ago:      ₹${twoMonthSpend.toLocaleString("en-IN")} (balanced, healthy)
  ├─ 3 months ago:      ₹${threeMonthSpend.toLocaleString("en-IN")} (shopping spike — Diwali)
  └─ 4 months ago:      ₹${fourMonthSpend.toLocaleString("en-IN")}  (lowest — great health score)

  GOALS: Goa Trip | Emergency Fund | MacBook Air M3
  ACTIVE INVESTMENTS: Nifty 50 SIP | iPhone EMI | SBI FD
═══════════════════════════════════════════════════════════
`);

  console.log(`
───────────────────────────────────────────────────────────
  HACKATHON DEMO SCRIPT — FULL CHATBOT QUESTIONS
───────────────────────────────────────────────────────────

  ── BLOCK 1: EXPENSE LOGGING (show real-time DB write) ──
  "Spent ₹150 on food today"
  "Paid ₹85 for auto to office yesterday"
  "Bought groceries worth ₹420 at DMart"

  ── BLOCK 2: MONTHLY INSIGHTS ──
  "How am I doing this month?"
  "Give me my financial summary for last month"
  "What was my top spending category 3 months ago?"
  "Show me how I spent in November"   [adjust month for live date]

  ── BLOCK 3: GOAL CREATION (watch auto-navigate to Goals) ──
  "I want to save ₹8,000 for Diwali gifts by October"
  "Create a goal to save ₹25,000 for a road trip by March"
  "How is my Goa Trip goal going?"

  ── BLOCK 4: SAVINGS LOGGING ──
  "I saved ₹500 today by cooking at home"
  "Deposited ₹2,000 towards my emergency fund goal"

  ── BLOCK 5: SIMULATORS — What-If Engine ──
  "What if I take a laptop EMI of ₹5,000 per month?"
  "Can I afford an EMI of ₹8,000?"
  "What if I invest ₹2,000 per month in SIP?"
  "What if I start a mutual fund SIP of ₹3,000 monthly?"
  "What if I put ₹20,000 in a fixed deposit?"
  "What if I cut my entertainment spending by 20%?"
  "What if I cut my food expenses?"

  ── BLOCK 6: FINANCIAL EDUCATION (Explain Concept) ──
  "What is CIBIL score and why does it matter?"
  "Explain SIP vs FD for someone my age"
  "What is ELSS and how does it save tax?"
  "Difference between mutual funds and stocks"

  ── BLOCK 7: INCOME UPDATE ──
  "My salary is ₹42,000 from next month"

  ── BLOCK 8: RECEIPT / IMAGE SCANNING ──
  [Upload any receipt image → extracted auto-logged]
  "I just uploaded my Zomato receipt"

  ── BLOCK 9: HISTORICAL CROSS-MONTH QUERIES ──
  "Compare my spending this month vs last month"
  "Was I spending more on entertainment 2 months ago?"
  "What was my highest spending month this year?"

  ── BLOCK 10: CARDS / REELS ──
  Navigate to Cards tab → show personalized + World Finance reels
  Click "Ask Chatbot" on any reel → shows deep-dive modal

───────────────────────────────────────────────────────────
  UI FEATURES TO CLICK THROUGH (non-chat):
  Dashboard   → Spending breakdown pie + Alerts + My List (todos)
  Expenses    → Month switcher (5 months) + bar chart + manual add
  Savings     → General vs Goal savings separated
  Goals       → 3 goals, Add Money button, progress bars
  Investments → SIP + EMI + FD tracked, monthly commitment shown
  Income      → Budget bar, income vs expenses chart, update income
  Cards       → 15 AI reels, scroll snap, World Finance badge
───────────────────────────────────────────────────────────
`);

  await mongoose.disconnect();
  console.log("✓ Disconnected. Seed complete.\n");
}

seed().catch((err) => {
  console.error("Seed error:", err);
  process.exit(1);
});
