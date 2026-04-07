// Run: node seed.js from the backend folder
require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const { User, Expense, Saving, Goal, ChatHistory } = require("./models");

const DEMO_EMAIL = "niyati@example.com";
const DEMO_PASSWORD = "1234";
const DEMO_NAME = "Arjun Mehta";
const INCOME = 35000;

// Helper: date N days ago
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

// Helper: date in a specific past month (0=current, 1=last, 2=two months ago)
function inMonth(monthsBack, dayOfMonth) {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsBack);
  d.setDate(dayOfMonth);
  d.setHours(12, 0, 0, 0);
  return d;
}

// ── 3 months of expenses ─────────────────────────────────────
// Current month (realistic student in Pune — 22 entries)
const CURRENT_MONTH = [
  {
    date: daysAgo(0),
    amount: 120,
    category: "food",
    description: "Canteen lunch",
  },
  {
    date: daysAgo(0),
    amount: 45,
    category: "food",
    description: "Chai and vada pav",
  },
  {
    date: daysAgo(1),
    amount: 280,
    category: "food",
    description: "Dinner at FC Road with friends",
  },
  {
    date: daysAgo(1),
    amount: 85,
    category: "transport",
    description: "Ola to college",
  },
  {
    date: daysAgo(2),
    amount: 150,
    category: "food",
    description: "Zomato order — biryani",
  },
  {
    date: daysAgo(3),
    amount: 199,
    category: "entertainment",
    description: "Netflix monthly",
  },
  {
    date: daysAgo(3),
    amount: 60,
    category: "food",
    description: "Morning breakfast",
  },
  {
    date: daysAgo(4),
    amount: 350,
    category: "shopping",
    description: "T-shirt from Decathlon",
  },
  {
    date: daysAgo(5),
    amount: 180,
    category: "transport",
    description: "Petrol top up",
  },
  { date: daysAgo(5), amount: 95, category: "food", description: "Canteen" },
  {
    date: daysAgo(6),
    amount: 480,
    category: "entertainment",
    description: "Saturday night out at MG Road",
  },
  { date: daysAgo(7), amount: 125, category: "food", description: "Lunch" },
  {
    date: daysAgo(8),
    amount: 75,
    category: "transport",
    description: "Auto to market",
  },
  {
    date: daysAgo(8),
    amount: 140,
    category: "food",
    description: "Zomato — dinner",
  },
  {
    date: daysAgo(9),
    amount: 250,
    category: "health",
    description: "Pharmacy — cold meds",
  },
  {
    date: daysAgo(10),
    amount: 420,
    category: "shopping",
    description: "Amazon — study books",
  },
  { date: daysAgo(11), amount: 100, category: "food", description: "Canteen" },
  {
    date: daysAgo(12),
    amount: 350,
    category: "entertainment",
    description: "Lonavala day trip — entry + food",
  },
  { date: daysAgo(13), amount: 110, category: "food", description: "Lunch" },
  {
    date: daysAgo(14),
    amount: 600,
    category: "shopping",
    description: "Myntra — jeans",
  },
  {
    date: daysAgo(15),
    amount: 130,
    category: "food",
    description: "Zomato — lunch",
  },
  {
    date: daysAgo(16),
    amount: 300,
    category: "entertainment",
    description: "Friday night with college group",
  },
];

// Last month (slightly different pattern — 20 entries)
const LAST_MONTH = [
  {
    date: inMonth(1, 1),
    amount: 140,
    category: "food",
    description: "Canteen",
  },
  {
    date: inMonth(1, 2),
    amount: 90,
    category: "transport",
    description: "Auto rides",
  },
  {
    date: inMonth(1, 3),
    amount: 200,
    category: "food",
    description: "Dinner out",
  },
  {
    date: inMonth(1, 5),
    amount: 199,
    category: "entertainment",
    description: "Netflix",
  },
  {
    date: inMonth(1, 6),
    amount: 550,
    category: "shopping",
    description: "Amazon — headphones",
  },
  { date: inMonth(1, 7), amount: 120, category: "food", description: "Zomato" },
  {
    date: inMonth(1, 9),
    amount: 175,
    category: "transport",
    description: "Petrol",
  },
  {
    date: inMonth(1, 10),
    amount: 100,
    category: "food",
    description: "Canteen",
  },
  {
    date: inMonth(1, 12),
    amount: 420,
    category: "entertainment",
    description: "Weekend outing",
  },
  {
    date: inMonth(1, 14),
    amount: 280,
    category: "food",
    description: "FC Road dinner",
  },
  {
    date: inMonth(1, 15),
    amount: 500,
    category: "shopping",
    description: "Decathlon — sports shoes",
  },
  {
    date: inMonth(1, 16),
    amount: 85,
    category: "food",
    description: "Breakfast",
  },
  {
    date: inMonth(1, 18),
    amount: 150,
    category: "health",
    description: "Gym fee",
  },
  {
    date: inMonth(1, 19),
    amount: 110,
    category: "food",
    description: "Canteen",
  },
  {
    date: inMonth(1, 21),
    amount: 300,
    category: "entertainment",
    description: "Movie + dinner Saturday",
  },
  { date: inMonth(1, 22), amount: 95, category: "food", description: "Zomato" },
  {
    date: inMonth(1, 24),
    amount: 180,
    category: "transport",
    description: "Ola rides",
  },
  { date: inMonth(1, 26), amount: 130, category: "food", description: "Lunch" },
  {
    date: inMonth(1, 28),
    amount: 700,
    category: "shopping",
    description: "Flipkart sale — clothes",
  },
  {
    date: inMonth(1, 29),
    amount: 200,
    category: "food",
    description: "Friends dinner",
  },
];

// Two months ago (lowest spending — 18 entries)
const TWO_MONTHS_AGO = [
  {
    date: inMonth(2, 2),
    amount: 110,
    category: "food",
    description: "Canteen lunch",
  },
  {
    date: inMonth(2, 3),
    amount: 80,
    category: "transport",
    description: "Auto",
  },
  { date: inMonth(2, 4), amount: 160, category: "food", description: "Zomato" },
  {
    date: inMonth(2, 5),
    amount: 199,
    category: "entertainment",
    description: "Netflix",
  },
  {
    date: inMonth(2, 7),
    amount: 90,
    category: "food",
    description: "Breakfast",
  },
  {
    date: inMonth(2, 9),
    amount: 170,
    category: "transport",
    description: "Petrol",
  },
  {
    date: inMonth(2, 10),
    amount: 115,
    category: "food",
    description: "Canteen",
  },
  {
    date: inMonth(2, 12),
    amount: 300,
    category: "entertainment",
    description: "Weekend outing",
  },
  {
    date: inMonth(2, 14),
    amount: 250,
    category: "food",
    description: "Valentine's dinner",
  },
  {
    date: inMonth(2, 15),
    amount: 400,
    category: "shopping",
    description: "Amazon",
  },
  {
    date: inMonth(2, 17),
    amount: 100,
    category: "food",
    description: "Canteen",
  },
  {
    date: inMonth(2, 18),
    amount: 200,
    category: "health",
    description: "Doctor visit",
  },
  {
    date: inMonth(2, 20),
    amount: 130,
    category: "food",
    description: "Zomato",
  },
  {
    date: inMonth(2, 22),
    amount: 280,
    category: "entertainment",
    description: "Night out",
  },
  { date: inMonth(2, 24), amount: 95, category: "food", description: "Lunch" },
  {
    date: inMonth(2, 26),
    amount: 150,
    category: "transport",
    description: "Cab rides",
  },
  {
    date: inMonth(2, 27),
    amount: 350,
    category: "shopping",
    description: "Myntra",
  },
  {
    date: inMonth(2, 28),
    amount: 120,
    category: "food",
    description: "Dinner",
  },
];

// ── Savings (across 3 months) ────────────────────────────────
const SAVINGS = [
  { date: daysAgo(2), amount: 500, note: "Saved by skipping cab, took bus" },
  {
    date: daysAgo(7),
    amount: 1000,
    note: "Monthly savings target — first installment",
  },
  { date: daysAgo(15), amount: 300, note: "Cooked at home instead of Zomato" },
  { date: inMonth(1, 5), amount: 800, note: "Salary day savings" },
  { date: inMonth(1, 18), amount: 400, note: "Skipped weekend outing" },
  { date: inMonth(1, 28), amount: 500, note: "End of month savings" },
  { date: inMonth(2, 8), amount: 600, note: "Monthly savings" },
  { date: inMonth(2, 22), amount: 350, note: "Sold old textbooks" },
];

// ── Goals ─────────────────────────────────────────────────────
const GOALS = [
  {
    title: "Goa Trip",
    reason: "Annual trip with college friends after final exams",
    targetAmount: 12000,
    savedSoFar: 3200,
    deadline: new Date(new Date().getFullYear(), 11, 15),
    monthlyContribution: 1500,
    status: "active",
    onTrack: true,
  },
  {
    title: "Emergency Fund",
    reason: "3 months of expenses as a safety net",
    targetAmount: 30000,
    savedSoFar: 4500,
    deadline: new Date(new Date().getFullYear() + 1, 5, 30),
    monthlyContribution: 2000,
    status: "active",
    onTrack: false,
  },
  {
    title: "New Laptop",
    reason: "Need an upgrade for final year placement projects",
    targetAmount: 55000,
    savedSoFar: 9500,
    deadline: new Date(new Date().getFullYear() + 1, 2, 31),
    monthlyContribution: 4000,
    status: "active",
    onTrack: true,
  },
];

async function seed() {
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("✓ Connected to MongoDB");

  // Clear old demo user
  const old = await User.findOne({ email: DEMO_EMAIL });
  if (old) {
    await Promise.all([
      Expense.deleteMany({ userId: old._id }),
      Saving.deleteMany({ userId: old._id }),
      Goal.deleteMany({ userId: old._id }),
      ChatHistory.deleteMany({ userId: old._id }),
      User.deleteOne({ _id: old._id }),
    ]);
    console.log("✓ Removed old demo user");
  }

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  const user = await User.create({
    name: DEMO_NAME,
    email: DEMO_EMAIL,
    passwordHash,
    monthlyIncome: INCOME,
    userType: "student",
  });
  console.log(`✓ Created user: ${DEMO_NAME}`);

  // Insert all expenses
  const allExpenses = [...CURRENT_MONTH, ...LAST_MONTH, ...TWO_MONTHS_AGO];
  for (const e of allExpenses) {
    await Expense.create({
      userId: user._id,
      amount: e.amount,
      category: e.category,
      description: e.description,
      date: e.date,
    });
  }
  console.log(`✓ Inserted ${allExpenses.length} expenses (3 months)`);

  for (const s of SAVINGS) {
    await Saving.create({
      userId: user._id,
      amount: s.amount,
      note: s.note,
      date: s.date,
    });
  }
  console.log(`✓ Inserted ${SAVINGS.length} savings`);

  for (const g of GOALS) {
    await Goal.create({ userId: user._id, ...g });
  }
  console.log(`✓ Inserted ${GOALS.length} goals`);

  // Calculate totals for display
  const currentSpend = CURRENT_MONTH.reduce((s, e) => s + e.amount, 0);
  const lastSpend = LAST_MONTH.reduce((s, e) => s + e.amount, 0);
  const twoMonthsSpend = TWO_MONTHS_AGO.reduce((s, e) => s + e.amount, 0);

  console.log("\n═══════════════════════════════════");
  console.log("          SEED COMPLETE");
  console.log("═══════════════════════════════════");
  console.log(`Login:     ${DEMO_EMAIL}`);
  console.log(`Password:  ${DEMO_PASSWORD}`);
  console.log(`Income:    ₹${INCOME.toLocaleString("en-IN")}/month`);
  console.log(
    `Spending:  ₹${currentSpend.toLocaleString("en-IN")} (this month)`,
  );
  console.log(`           ₹${lastSpend.toLocaleString("en-IN")} (last month)`);
  console.log(
    `           ₹${twoMonthsSpend.toLocaleString("en-IN")} (2 months ago)`,
  );
  console.log(`Goals:     ${GOALS.map((g) => g.title).join(", ")}`);
  console.log("\n─── DEMO QUESTIONS FOR JUDGES ───────");
  console.log("Show personalization:");
  console.log('  → "How am I doing this month?"');
  console.log('  → "What was my financial status last month?"');
  console.log('  → "What was my top spending category in February?"');
  console.log("\nShow simulators:");
  console.log('  → "What if I take a laptop EMI of ₹4,500 per month?"');
  console.log('  → "What if I cut my food spending by 20%?"');
  console.log('  → "What if I invest ₹2,000 per month in SIP?"');
  console.log("\nShow goal creation (live demo):");
  console.log('  → "I want to save ₹8,000 for Diwali gifts by October"');
  console.log("  (watch browser navigate to Goals page automatically)");
  console.log("\nShow knowledge:");
  console.log('  → "What is CIBIL score and how does it affect me?"');
  console.log('  → "Explain SIP vs FD for a student like me"');
  console.log('  → "How is my Goa Trip goal going?"');
  console.log("═══════════════════════════════════\n");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
