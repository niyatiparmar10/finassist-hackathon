// backend/routes/investments.js
// SECTION 6: Financial Investments CRUD API
// Handles SIP, EMI, FD, Mutual Fund, Recurring Deposit tracking

const express = require("express");
const router = express.Router();
const { FinancialInvestment, User } = require("../models");

// ── DEBUG helper ──────────────────────────────────────────────────────────────
function dbg(label, data) {
  console.log(`[INVESTMENTS] ${label}:`, JSON.stringify(data, null, 2));
}

// POST /api/investments/add
// Creates a new investment record
router.post("/add", async (req, res) => {
  try {
    const {
      userId,
      type,
      name,
      monthlyAmount,
      totalAmount,
      startDate,
      endDate,
      tenureMonths,
      interestRate,
      notes,
    } = req.body;

    dbg("POST /add body", { userId, type, name, monthlyAmount });

    if (!userId || !type || !name || !monthlyAmount) {
      console.warn("[INVESTMENTS] Missing required fields in /add");
      return res
        .status(400)
        .json({ error: "userId, type, name, and monthlyAmount are required" });
    }

    // Calculate endDate from tenureMonths if not provided but tenure given
    let computedEndDate = endDate ? new Date(endDate) : null;
    if (!computedEndDate && tenureMonths && startDate) {
      const sd = new Date(startDate);
      sd.setMonth(sd.getMonth() + parseInt(tenureMonths));
      computedEndDate = sd;
      dbg("Computed endDate from tenure", { tenureMonths, computedEndDate });
    }

    const investment = await FinancialInvestment.create({
      userId,
      type: type.toLowerCase(),
      name,
      monthlyAmount: parseFloat(monthlyAmount),
      totalAmount: totalAmount ? parseFloat(totalAmount) : null,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: computedEndDate,
      tenureMonths: tenureMonths ? parseInt(tenureMonths) : null,
      interestRate: interestRate ? parseFloat(interestRate) : null,
      notes: notes || "",
      status: "active",
    });

    dbg("Investment created", investment._id);
    res.json({ success: true, investment });
  } catch (err) {
    console.error("[INVESTMENTS] POST /add error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/investments/:userId
// Returns all investments for a user with computed fields
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    dbg("GET /:userId", userId);

    const investments = await FinancialInvestment.find({ userId }).sort({
      createdAt: -1,
    });

    // Enrich each investment with months remaining, projected value etc.
    const now = new Date();
    const enriched = investments.map((inv) => {
      const plain = inv.toObject();

      // Months elapsed since start
      const startMs = new Date(inv.startDate).getTime();
      const monthsElapsed = Math.floor(
        (now - startMs) / (1000 * 60 * 60 * 24 * 30),
      );

      // Months remaining if endDate exists
      let monthsRemaining = null;
      if (inv.endDate) {
        const diff = new Date(inv.endDate) - now;
        monthsRemaining = Math.max(
          0,
          Math.ceil(diff / (1000 * 60 * 60 * 24 * 30)),
        );
      } else if (inv.tenureMonths) {
        monthsRemaining = Math.max(0, inv.tenureMonths - monthsElapsed);
      }

      // Estimated value for SIP (simple SIP future value formula)
      let estimatedValue = null;
      if (inv.type === "sip" && inv.tenureMonths && inv.interestRate) {
        const r = inv.interestRate / 12 / 100;
        const n = inv.tenureMonths;
        estimatedValue = Math.round(
          inv.monthlyAmount * (((1 + r) ** n - 1) / r) * (1 + r),
        );
      }

      return { ...plain, monthsElapsed, monthsRemaining, estimatedValue };
    });

    // Summary stats
    const activeInvestments = enriched.filter((i) => i.status === "active");
    const totalMonthlyCommitment = activeInvestments.reduce(
      (sum, i) => sum + i.monthlyAmount,
      0,
    );

    // Get user income for available surplus calc
    const user = await User.findById(userId).lean();
    const availableSurplus =
      (user?.monthlyIncome || 0) - totalMonthlyCommitment;

    dbg("GET /:userId result", {
      count: enriched.length,
      totalMonthlyCommitment,
    });

    res.json({
      investments: enriched,
      summary: {
        totalCount: enriched.length,
        activeCount: activeInvestments.length,
        totalMonthlyCommitment,
        availableSurplus,
        monthlyIncome: user?.monthlyIncome || 0,
      },
    });
  } catch (err) {
    console.error("[INVESTMENTS] GET /:userId error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/investments/update/:id
// Update status or notes on an investment
router.put("/update/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, name, monthlyAmount } = req.body;

    dbg("PUT /update/:id", { id, status, notes });

    const updateFields = {};
    if (status) updateFields.status = status;
    if (notes !== undefined) updateFields.notes = notes;
    if (name) updateFields.name = name;
    if (monthlyAmount) updateFields.monthlyAmount = parseFloat(monthlyAmount);

    const updated = await FinancialInvestment.findByIdAndUpdate(
      id,
      updateFields,
      { new: true },
    );

    if (!updated) {
      console.warn("[INVESTMENTS] Investment not found:", id);
      return res.status(404).json({ error: "Investment not found" });
    }

    dbg("Investment updated", updated._id);
    res.json({ success: true, investment: updated });
  } catch (err) {
    console.error("[INVESTMENTS] PUT /update error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/investments/:id
// Deletes an investment record
router.delete("/:id", async (req, res) => {
  try {
    const { id } = req.params;
    dbg("DELETE /:id", id);

    const deleted = await FinancialInvestment.findByIdAndDelete(id);
    if (!deleted) {
      console.warn("[INVESTMENTS] Investment not found for delete:", id);
      return res.status(404).json({ error: "Investment not found" });
    }

    dbg("Investment deleted", id);
    res.json({ success: true, deletedId: id });
  } catch (err) {
    console.error("[INVESTMENTS] DELETE /:id error:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
