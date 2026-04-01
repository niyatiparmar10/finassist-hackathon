// Intent detection — rule-based, no AI needed here.
// Returns a structured intent object from a raw user message.

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

function detectIntent(message) {
  const lower = message.toLowerCase();

  // UPDATE_INCOME
  if (
    /my salary is|i earn|income is|my income|salary is|i get paid/i.test(lower)
  ) {
    return { intent: INTENTS.UPDATE_INCOME, amount: extractAmount(message) };
  }

  // ADD_SAVING
  if (
    /saved|put aside|kept aside|saving of|i save|saved ₹|saved rs/i.test(lower)
  ) {
    return {
      intent: INTENTS.ADD_SAVING,
      amount: extractAmount(message),
      note: message,
    };
  }

  // ADD_EXPENSE
  if (
    /spent|paid|bought|cost me|expense of|bill of|spend|paying/i.test(lower)
  ) {
    return {
      intent: INTENTS.ADD_EXPENSE,
      amount: extractAmount(message),
      category: extractCategory(message),
      description: message,
      date: extractDate(message),
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
    };
  }

  // SIMULATE_INVESTMENT
  if (
    /if i invest|sip of|invest ₹|invest rs|put.*in mutual|what if i invest/i.test(
      lower,
    )
  ) {
    return {
      intent: INTENTS.SIMULATE_INVESTMENT,
      amount: extractAmount(message),
    };
  }

  // SIMULATE_EXPENSE_CUT
  if (
    /if i cut|if i reduce|if i stop spending|what if i cut|reduce.*spending/i.test(
      lower,
    )
  ) {
    return {
      intent: INTENTS.SIMULATE_EXPENSE_CUT,
      category: extractCategory(message),
      rawMessage: message,
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
    };
  }

  // GET_GOAL_STATUS
  if (/how is my goal|goal progress|am i on track|goal status/i.test(lower)) {
    return { intent: INTENTS.GET_GOAL_STATUS };
  }

  // GET_INSIGHTS
  if (
    /how am i doing|show.*spending|my spending|analysis|financial report|how.*money|my finances/i.test(
      lower,
    )
  ) {
    return { intent: INTENTS.GET_INSIGHTS };
  }

  // EXPLAIN_CONCEPT
  if (
    /what is|explain|how does.*work|what.*means|define|tell me about (emi|sip|cibil|mutual fund|fd|ppf)/i.test(
      lower,
    )
  ) {
    return { intent: INTENTS.EXPLAIN_CONCEPT, rawMessage: message };
  }

  // GET_REELS
  if (
    /show.*tips|give.*advice|what should i know|financial tips|money tips/i.test(
      lower,
    )
  ) {
    return { intent: INTENTS.GET_REELS };
  }

  return { intent: INTENTS.UNKNOWN, rawMessage: message };
}

module.exports = { detectIntent, INTENTS };
