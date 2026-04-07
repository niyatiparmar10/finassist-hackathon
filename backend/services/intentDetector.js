// Intent detection — rule-based, no AI needed here.
// Returns a structured intent object from a raw user message.
//intentDetector.js

const INTENTS = {
  ADD_EXPENSE: "ADD_EXPENSE",
  ADD_SAVING: "ADD_SAVING",
  CREATE_GOAL: "CREATE_GOAL",
  GET_INSIGHTS: "GET_INSIGHTS",
  SIMULATE_EMI: "SIMULATE_EMI",
  SIMULATE_INVESTMENT: "SIMULATE_INVESTMENT",
  SIMULATE_FD: "SIMULATE_FD",
  SIMULATE_MUTUAL_FUND: "SIMULATE_MUTUAL_FUND",
  SIMULATE_EXPENSE_CUT: "SIMULATE_EXPENSE_CUT",
  UPDATE_INCOME: "UPDATE_INCOME",
  GET_GOAL_STATUS: "GET_GOAL_STATUS",
  GET_TOP_CATEGORY: "GET_TOP_CATEGORY",
  EXPLAIN_CONCEPT: "EXPLAIN_CONCEPT",
  GET_REELS: "GET_REELS",
  SET_GOAL_DEPOSIT: "SET_GOAL_DEPOSIT",
  UNKNOWN_FINANCE: "UNKNOWN_FINANCE",
  UNKNOWN: "UNKNOWN",
};

// Extract a rupee amount from text like "200", "₹200", "rs 200", "rupees 200", "2k", "2.5k", "2 lakh", "5000/-"
function extractAmount(text) {
  const patterns = [
    /(?:rs\.?|₹|rupees?)\s*(\d+(?:,\d{3})*(?:\.\d+)?)/i,
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*(?:rs\.?|₹|rupees?)/i,
    /(\d+(?:,\d{3})*(?:\.\d+)?)\s*\/-?/i,
    /(\d+(?:\.\d+)?)\s*k\b/i, // 2k = 2000
    /(\d+(?:\.\d+)?)\s*lakh/i, // 2 lakh = 200000
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      let amount = parseFloat(match[1].replace(/,/g, ""));
      if (pattern.source.includes("k")) {
        amount *= 1000;
      } else if (pattern.source.includes("lakh")) {
        amount *= 100000;
      }
      return amount;
    }
  }
  return null;
}

// Extract a category keyword
function extractCategory(text) {
  const map = {
    food: [
      "food",
      "lunch",
      "dinner",
      "breakfast",
      "meal",
      "eat",
      "restaurant",
      "cafe",
      "coffee",
      "bhaaji",
      "sabzi",
      "veg",
      "snack",
      "chai",
      "tea",
      "pizza",
      "biryani",
    ],
    transport: [
      "transport",
      "petrol",
      "fuel",
      "auto",
      "uber",
      "ola",
      "cab",
      "bus",
      "train",
      "metro",
      "travel",
      "commute",
      "rickshaw",
    ],
    entertainment: [
      "entertainment",
      "movie",
      "film",
      "game",
      "netflix",
      "amazon prime",
      "hotstar",
      "outing",
      "party",
      "club",
      "concert",
      "pub",
    ],
    health: [
      "health",
      "medicine",
      "doctor",
      "hospital",
      "pharmacy",
      "gym",
      "fitness",
      "medical",
    ],
    shopping: [
      "shopping",
      "clothes",
      "amazon",
      "flipkart",
      "purchase",
      "bought",
      "shirt",
      "shoes",
      "apparel",
      "myntra",
    ],
  };
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(map)) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }
  return "other";
}

// Extract a date (today / yesterday / day before yesterday / last monday / on the 5th / this morning)
function extractDate(text) {
  const lower = text.toLowerCase();
  const now = new Date();

  if (lower.includes("yesterday")) {
    const d = new Date(now);
    d.setDate(now.getDate() - 1);
    return d;
  }
  if (lower.includes("day before yesterday")) {
    const d = new Date(now);
    d.setDate(now.getDate() - 2);
    return d;
  }
  if (lower.includes("this morning") || lower.includes("today")) {
    return now;
  }

  // Last weekday
  const weekdays = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  for (let i = 0; i < weekdays.length; i++) {
    if (lower.includes(`last ${weekdays[i]}`)) {
      const d = new Date(now);
      const currentDay = now.getDay();
      const targetDay = i;
      let diff = currentDay - targetDay;
      if (diff <= 0) diff += 7;
      d.setDate(now.getDate() - diff);
      return d;
    }
  }

  // On the 5th, 5th of this month
  const dayMatch = lower.match(
    /on the (\d{1,2})(?:th|st|nd|rd)?|(\d{1,2})(?:th|st|nd|rd) of this month/i,
  );
  if (dayMatch) {
    const day = parseInt(dayMatch[1] || dayMatch[2], 10);
    if (day >= 1 && day <= 31) {
      const d = new Date(now.getFullYear(), now.getMonth(), day);
      return d;
    }
  }

  return new Date(); // default: today
}

const MONTHS = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

function extractExplicitMonth(text) {
  const lower = text.toLowerCase();
  for (const [name, month] of Object.entries(MONTHS)) {
    const regex = new RegExp(`\\b${name}\\b`, "i");
    if (regex.test(lower)) {
      const yearMatch = lower.match(/(20\d{2})/); // e.g. 2024
      const year = yearMatch
        ? parseInt(yearMatch[1], 10)
        : new Date().getFullYear();
      // if requested month is in future relative to current month, assume previous year
      const now = new Date();
      if (month > now.getMonth() && year === now.getFullYear()) {
        return { period: "explicit", month, year: year - 1 };
      }
      return { period: "explicit", month, year };
    }
  }
  return null;
}

function extractTimeframe(text) {
  const lower = text.toLowerCase();

  // if both appear, prefer explicit current month reference
  const hasCurrent = /this month|current month/i.test(lower);
  const hasLast = /last month|previous month|past month/i.test(lower);

  if (hasCurrent) return "current";
  if (hasLast) return "last";
  return null;
}

function detectIntent(message) {
  const lower = message.toLowerCase();
  const explicitMonth = extractExplicitMonth(message);
  const timeframe = extractTimeframe(message);
  const requestedPeriod =
    explicitMonth ||
    (timeframe ? { period: timeframe } : { period: "current" });

  const periodData = {
    period: requestedPeriod.period,
    ...(requestedPeriod.month !== undefined
      ? { month: requestedPeriod.month }
      : {}),
    ...(requestedPeriod.year !== undefined
      ? { year: requestedPeriod.year }
      : {}),
  };

  // UPDATE_INCOME
  if (
    /my salary is|i earn|income is|my income|salary is|i get paid|monthly income|annual salary/i.test(
      lower,
    )
  ) {
    return {
      intent: INTENTS.UPDATE_INCOME,
      amount: extractAmount(message),
      ...periodData,
    };
  }

  // EXPLAIN_CONCEPT — must be before all SIMULATE checks
  if (
    /what is|explain|how does.*work|tell me about|define|what are|difference between|how to calculate|what do you mean by|basics of/i.test(lower)
  ) {
    return {
      intent: INTENTS.EXPLAIN_CONCEPT,
      rawMessage: message,
      ...periodData,
    };
  }

  // SET_GOAL_DEPOSIT
  if (
    /added to goal|towards my goal|for my goal|goal deposit|contribution to goal|put towards/i.test(
      lower,
    )
  ) {
    return {
      intent: INTENTS.SET_GOAL_DEPOSIT,
      amount: extractAmount(message),
      rawMessage: message,
      ...periodData,
    };
  }

  // ADD_SAVING
  if (
    /\b(saved|i saved|just saved|put aside|kept aside|deposited|transferred to savings)\b/i.test(
      lower,
    ) &&
    !/for my goal|towards goal|for goal|goal deposit/i.test(lower)
  ) {
    return {
      intent: INTENTS.ADD_SAVING,
      amount: extractAmount(message),
      note: message,
      ...periodData,
    };
  }

  // SIMULATE_EXPENSE_CUT (Check BEFORE ADD_EXPENSE to avoid "spending" keyword collision)
  if (
    /if i cut|if i reduce|if i stop spending|what if i cut|reduce.*spending|cut.*spending/i.test(
      lower,
    )
  ) {
    return {
      intent: INTENTS.SIMULATE_EXPENSE_CUT,
      category: extractCategory(message),
      rawMessage: message,
      ...periodData,
    };
  }

  // SIMULATE_MUTUAL_FUND
  if (
    /mutual fund|\bmf\b|elss|nifty|index fund|equity fund|debt fund|balanced fund/i.test(
      lower,
    )
  ) {
    return {
      intent: INTENTS.SIMULATE_MUTUAL_FUND,
      amount: extractAmount(message),
      rawMessage: message,
      ...periodData,
    };
  }

  // SIMULATE_FD
  if (
    /\bfd\b|fixed deposit|bank deposit|put in fd|book an fd|fd returns|fd interest/i.test(
      lower,
    )
  ) {
    return {
      intent: INTENTS.SIMULATE_FD,
      amount: extractAmount(message),
      rawMessage: message,
      ...periodData,
    };
  }

  // SIMULATE_INVESTMENT
  if (
    /\bsip\b|invest|start investing|put money in|systematic investment|should i invest|can i invest|how much can i invest|want to invest/i.test(
      lower,
    )
  ) {
    return {
      intent: INTENTS.SIMULATE_INVESTMENT,
      amount: extractAmount(message),
      ...periodData,
    };
  }

  // SIMULATE_EMI
  if (
    /emi|loan|installment|can i afford|take a loan|buy on emi|monthly payment|equated monthly/i.test(
      lower,
    )
  ) {
    return {
      intent: INTENTS.SIMULATE_EMI,
      amount: extractAmount(message),
      rawMessage: message,
      ...periodData,
    };
  }

  // ADD_EXPENSE
  if (
    /spent|paid|bought|ordered|purchased|cost me|expense of|\bbill\b|charged|deducted|used|paid for/i.test(
      lower,
    )
  ) {
    return {
      intent: INTENTS.ADD_EXPENSE,
      amount: extractAmount(message),
      category: extractCategory(message),
      description: message,
      date: extractDate(message),
      ...periodData,
    };
  }

  // CREATE_GOAL
  if (
    /want to save for|goal for|saving for a|save for|planning to buy|target of/i.test(
      lower,
    )
  ) {
    return {
      intent: INTENTS.CREATE_GOAL,
      amount: extractAmount(message),
      rawMessage: message,
      ...periodData,
    };
  }

  // GET_GOAL_STATUS
  if (/how is my goal|goal progress|am i on track|goal status/i.test(lower)) {
    return { intent: INTENTS.GET_GOAL_STATUS, ...periodData };
  }

  // GET_TOP_CATEGORY
  if (
    /top spending category|top spend|highest spend|biggest expense|most spent/i.test(
      lower,
    )
  ) {
    return { intent: INTENTS.GET_TOP_CATEGORY, ...periodData };
  }

  // GET_INSIGHTS
  if (
    /how am i doing|how did i do|show me|my spending|financial summary|spending report|my finances|breakdown|where did my money go|how have i been spending|tell me about my money/i.test(
      lower,
    )
  ) {
    return { intent: INTENTS.GET_INSIGHTS, ...periodData };
  }

  // GET_REELS
  if (
    /show.*tips|give.*advice|what should i know|financial tips|money tips/i.test(
      lower,
    )
  ) {
    return { intent: INTENTS.GET_REELS, ...periodData };
  }

  // UNKNOWN_FINANCE
  if (
    /finance|money|budget|investment|savings|expense|income|salary|emi|sip|fd|mutual fund|loan|debt|credit/i.test(
      lower,
    )
  ) {
    return {
      intent: INTENTS.UNKNOWN_FINANCE,
      rawMessage: message,
      ...periodData,
    };
  }

  // If has amount and financial verb, default to ADD_EXPENSE
  if (
    extractAmount(message) &&
    /spend|pay|buy|cost|expense|save|invest/i.test(lower)
  ) {
    return {
      intent: INTENTS.ADD_EXPENSE,
      amount: extractAmount(message),
      category: extractCategory(message),
      description: message,
      date: extractDate(message),
      lowConfidence: true,
      ...periodData,
    };
  }

  return { intent: INTENTS.UNKNOWN, rawMessage: message, ...periodData };
}

module.exports = { detectIntent, INTENTS };
