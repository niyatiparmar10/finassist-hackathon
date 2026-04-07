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
  SIMULATE_EXPENSE_CUT: "SIMULATE_EXPENSE_CUT",
  UPDATE_INCOME: "UPDATE_INCOME",
  GET_GOAL_STATUS: "GET_GOAL_STATUS",
  GET_TOP_CATEGORY: "GET_TOP_CATEGORY",
  EXPLAIN_CONCEPT: "EXPLAIN_CONCEPT",
  GET_REELS: "GET_REELS",
  UNKNOWN: "UNKNOWN",
};

// Extract a rupee amount from text like "200", "₹200", "rs 200", "rupees 200"
function extractAmount(text) {
  const match = text.match(
    /(?:rs\.?|₹|rupees?)?\s*(\d+(?:,\d{3})*(?:\.\d+)?)/i,
  );
  if (!match) return null;
  return parseFloat(match[1].replace(/,/g, ""));
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

// Extract a date (today / yesterday / specific)
function extractDate(text) {
  const lower = text.toLowerCase();
  if (lower.includes("yesterday")) {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d;
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
    /my salary is|i earn|income is|my income|salary is|i get paid/i.test(lower)
  ) {
    return {
      intent: INTENTS.UPDATE_INCOME,
      amount: extractAmount(message),
      ...periodData,
    };
  }

  // ADD_SAVING
  if (
    /saved|put aside|kept aside|saving of|i save|saved ₹|saved rs/i.test(lower)
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

  // SIMULATE_INVESTMENT (Check BEFORE ADD_EXPENSE to avoid amount matching)
  if (
    /if i invest|sip of|invest ₹|invest rs|put.*in mutual|what if i invest|what.*invest/i.test(
      lower,
    )
  ) {
    return {
      intent: INTENTS.SIMULATE_INVESTMENT,
      amount: extractAmount(message),
      ...periodData,
    };
  }

  // ADD_EXPENSE
  if (
    /spent|paid|bought|cost me|expense of|bill of|spend(?!ing)|paying/i.test(
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

  // SIMULATE_EMI
  if (
    /emi|loan|installment|can i afford|if i take a loan|if i buy.*emi/i.test(
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

  // CREATE_GOAL
  if (
    /want to save|goal|save for|saving for|save ₹.*by|save rs.*by/i.test(lower)
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
    /top spending category|top spend(ing)?|highest spend(ing)?|biggest expense|most spent/i.test(
      lower,
    )
  ) {
    return { intent: INTENTS.GET_TOP_CATEGORY, ...periodData };
  }

  // GET_INSIGHTS
  if (
    /how am i doing|show.*spending|my spending|analysis|financial report|how.*money|my finances/i.test(
      lower,
    )
  ) {
    return { intent: INTENTS.GET_INSIGHTS, ...periodData };
  }

  // EXPLAIN_CONCEPT
  if (
    /what is|explain|how does.*work|what.*means|define|tell me about (emi|sip|cibil|mutual fund|fd|ppf)/i.test(
      lower,
    )
  ) {
    return {
      intent: INTENTS.EXPLAIN_CONCEPT,
      rawMessage: message,
      ...periodData,
    };
  }

  // GET_REELS
  if (
    /show.*tips|give.*advice|what should i know|financial tips|money tips/i.test(
      lower,
    )
  ) {
    return { intent: INTENTS.GET_REELS, ...periodData };
  }

  return { intent: INTENTS.UNKNOWN, rawMessage: message, ...periodData };
}

module.exports = { detectIntent, INTENTS };
