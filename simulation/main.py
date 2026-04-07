# simulation/main.py
# Section 4: Enhanced Python Simulation Engine
# Handles EMI, SIP, FD, Mutual Fund, and Financial Health Check

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, validator
from typing import Optional, List
import logging
import math

# ── Debug logging setup ─────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("finassist-sim")

app = FastAPI(title="FinAssist Simulation Engine v2")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

logger.info("✅ FinAssist Simulation Engine starting up...")


# ── Request Models ───────────────────────────────────────────────────────────

class EMIRequest(BaseModel):
    emi_amount: float
    months: int = 12
    monthly_income: float
    current_monthly_spend: float
    # NEW fields for accuracy
    avg_monthly_surplus: Optional[float] = None       # 3-month average surplus
    total_monthly_commitments: Optional[float] = 0.0  # existing EMI/SIP total
    current_day_of_month: Optional[int] = 15
    total_days_in_month: Optional[int] = 30

    @validator('emi_amount', 'monthly_income', 'current_monthly_spend')
    def must_be_positive(cls, v):
        if v < 0:
            raise ValueError('Amount cannot be negative')
        return v


class InvestmentRequest(BaseModel):
    monthly_amount: float
    months: int = 24
    expected_annual_return: float = 12.0
    current_surplus: float
    # NEW fields
    avg_monthly_surplus: Optional[float] = None
    total_monthly_commitments: Optional[float] = 0.0

    @validator('monthly_amount', 'current_surplus')
    def must_be_positive(cls, v):
        if v < 0:
            raise ValueError('Amount cannot be negative')
        return v


class ExpenseCutRequest(BaseModel):
    category: str
    cut_percent: float
    current_monthly_spend: float
    category_amount: float
    monthly_income: float

    @validator('cut_percent')
    def valid_percent(cls, v):
        if v < 0 or v > 100:
            raise ValueError('cut_percent must be between 0 and 100')
        return v


# NEW models
class FDRequest(BaseModel):
    principal: float
    months: int = 12
    annual_rate: float = 6.5
    monthly_surplus: float

    @validator('principal', 'monthly_surplus')
    def must_be_positive(cls, v):
        if v < 0:
            raise ValueError('Amount cannot be negative')
        return v

    @validator('annual_rate')
    def valid_rate(cls, v):
        if v <= 0 or v > 50:
            raise ValueError('annual_rate must be between 0 and 50')
        return v


class MutualFundRequest(BaseModel):
    monthly_amount: float
    months: int = 36
    expected_annual_return: float = 14.0
    fund_type: str = "equity"   # equity, debt, balanced
    monthly_surplus: float

    @validator('monthly_amount', 'monthly_surplus')
    def must_be_positive(cls, v):
        if v < 0:
            raise ValueError('Amount cannot be negative')
        return v


class HistoricalMonth(BaseModel):
    totalSpend: float = 0
    totalIncome: float = 0
    totalSaved: float = 0
    label: Optional[str] = None


class FinancialHealthRequest(BaseModel):
    monthly_income: float
    avg_monthly_spend: float       # 3-month average
    current_month_spend: float
    current_day_of_month: int
    total_days_in_month: int
    monthly_saved: float
    total_monthly_commitments: float
    goals_active: int
    historical_months: List[HistoricalMonth] = []

    @validator('monthly_income', 'avg_monthly_spend', 'current_month_spend')
    def must_be_non_negative(cls, v):
        if v < 0:
            raise ValueError('Amount cannot be negative')
        return v


# ── Utility ──────────────────────────────────────────────────────────────────

def sip_future_value(monthly_amount: float, months: int, annual_return: float) -> float:
    """Standard SIP future value formula."""
    r = annual_return / 12 / 100
    if r == 0:
        return monthly_amount * months
    fv = monthly_amount * (((1 + r) ** months - 1) / r) * (1 + r)
    return fv


# ── Endpoints ────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    logger.debug("GET / called")
    return {"status": "FinAssist simulation engine v2 running"}


@app.get("/health")
def health_check():
    """Returns status and list of all available endpoints."""
    logger.debug("GET /health called")
    endpoints = [
        "GET  /",
        "GET  /health",
        "POST /simulate/emi",
        "POST /simulate/investment",
        "POST /simulate/expense-cut",
        "POST /simulate/fd",
        "POST /simulate/mutual-fund",
        "POST /simulate/health-check",
    ]
    return {"status": "ok", "endpoints": endpoints}


@app.post("/simulate/emi")
def simulate_emi(req: EMIRequest):
    logger.debug(f"POST /simulate/emi — payload: {req.dict()}")

    if req.emi_amount <= 0:
        logger.warning("EMI amount is zero or negative")
        raise HTTPException(status_code=400, detail="emi_amount must be greater than 0")

    # Use avg_monthly_surplus if available (more accurate than current month)
    # Fall back to: income - current_spend if not provided
    effective_surplus = req.avg_monthly_surplus if req.avg_monthly_surplus is not None \
        else (req.monthly_income - req.current_monthly_spend)

    logger.debug(f"  effective_surplus (before EMI) = {effective_surplus}")

    surplus_after_emi = effective_surplus - req.emi_amount - (req.total_monthly_commitments or 0)
    logger.debug(f"  surplus_after_emi = {surplus_after_emi}")

    safe = surplus_after_emi >= 0
    debt_to_income_ratio = round((req.emi_amount / req.monthly_income) * 100, 1) if req.monthly_income > 0 else 0

    risk_level = "safe"
    if surplus_after_emi < 0:
        risk_level = "danger"
    elif surplus_after_emi < req.monthly_income * 0.1:
        risk_level = "warning"

    logger.debug(f"  risk_level={risk_level}, dti={debt_to_income_ratio}%")

    # Project 6-month balance
    projected_balance = []
    balance = 0
    for month in range(1, 7):
        balance += surplus_after_emi
        projected_balance.append(round(balance))
    logger.debug(f"  projected_balance (6mo) = {projected_balance}")

    if safe:
        recommendation = f"You can afford this EMI. You'll have ₹{int(surplus_after_emi):,} remaining each month after all commitments."
        affordability_verdict = "AFFORDABLE"
    else:
        shortfall = abs(surplus_after_emi)
        recommendation = f"This EMI creates a monthly deficit of ₹{int(shortfall):,}. You need to cut expenses or increase income first."
        affordability_verdict = "NOT AFFORDABLE"

    result = {
        "monthly_surplus_after_emi": round(surplus_after_emi),
        "safe": safe,
        "risk_level": risk_level,
        "projected_balance": projected_balance,
        "recommendation": recommendation,
        "debt_to_income_ratio": debt_to_income_ratio,
        "affordability_verdict": affordability_verdict,
    }
    logger.info(f"EMI simulation result: {result}")
    return result


@app.post("/simulate/investment")
def simulate_investment(req: InvestmentRequest):
    logger.debug(f"POST /simulate/investment — payload: {req.dict()}")

    if req.monthly_amount <= 0:
        raise HTTPException(status_code=400, detail="monthly_amount must be greater than 0")

    total_invested = req.monthly_amount * req.months
    future_value = sip_future_value(req.monthly_amount, req.months, req.expected_annual_return)
    gain = future_value - total_invested

    # Use avg surplus if provided for a safer affordability check
    effective_surplus = req.avg_monthly_surplus if req.avg_monthly_surplus is not None \
        else req.current_surplus
    effective_free_surplus = effective_surplus - (req.total_monthly_commitments or 0)

    # SIP should not eat more than 50% of effective free surplus
    safe = req.monthly_amount <= effective_free_surplus * 0.5
    recommended_max_sip = round(effective_free_surplus * 0.5)

    impact_on_surplus = round(effective_free_surplus - req.monthly_amount)

    logger.debug(f"  total_invested={total_invested}, fv={future_value:.0f}, gain={gain:.0f}")
    logger.debug(f"  safe={safe}, recommended_max_sip={recommended_max_sip}")

    result = {
        "total_invested": round(total_invested),
        "estimated_value": round(future_value),
        "gain": round(gain),
        "safe": safe,
        "impact_on_surplus": impact_on_surplus,
        "recommended_max_sip": recommended_max_sip,
    }
    logger.info(f"Investment simulation result: {result}")
    return result


@app.post("/simulate/expense-cut")
def simulate_expense_cut(req: ExpenseCutRequest):
    logger.debug(f"POST /simulate/expense-cut — payload: {req.dict()}")

    if req.category_amount < 0 or req.current_monthly_spend < 0:
        raise HTTPException(status_code=400, detail="Amounts cannot be negative")

    monthly_saving = round(req.category_amount * req.cut_percent / 100)
    new_spend = req.current_monthly_spend - monthly_saving
    new_surplus = req.monthly_income - new_spend
    annual_saving = monthly_saving * 12

    logger.debug(f"  monthly_saving={monthly_saving}, new_surplus={new_surplus}, annual={annual_saving}")

    result = {
        "monthly_saving": monthly_saving,
        "new_surplus": round(new_surplus),
        "annual_saving": annual_saving,
        "new_monthly_spend": round(new_spend),
    }
    logger.info(f"Expense cut result: {result}")
    return result


# ── NEW ENDPOINT: FD Calculator ──────────────────────────────────────────────

@app.post("/simulate/fd")
def simulate_fd(req: FDRequest):
    logger.debug(f"POST /simulate/fd — payload: {req.dict()}")

    if req.principal <= 0:
        raise HTTPException(status_code=400, detail="principal must be greater than 0")
    if req.months <= 0:
        raise HTTPException(status_code=400, detail="months must be greater than 0")

    # Compound interest: A = P * (1 + r/n)^(n*t)
    # n = 12 (monthly compounding), t = months/12
    r = req.annual_rate / 100
    n = 12
    t = req.months / 12

    maturity_amount = req.principal * (1 + r / n) ** (n * t)
    total_interest = maturity_amount - req.principal
    monthly_rate = req.annual_rate / 12

    # Safe if you can lock away the principal (it's within 3 months of surplus)
    safe = req.principal <= req.monthly_surplus * 3

    if safe:
        recommendation = f"This FD is within your budget. You'll earn ₹{int(total_interest):,} in interest over {req.months} months."
    else:
        recommendation = f"Locking ₹{int(req.principal):,} may strain your monthly cash flow. Consider a smaller amount."

    logger.debug(f"  maturity={maturity_amount:.2f}, interest={total_interest:.2f}, safe={safe}")

    result = {
        "maturity_amount": round(maturity_amount, 2),
        "total_interest": round(total_interest, 2),
        "monthly_rate": round(monthly_rate, 3),
        "safe": safe,
        "recommendation": recommendation,
    }
    logger.info(f"FD simulation result: {result}")
    return result


# ── NEW ENDPOINT: Mutual Fund SIP ────────────────────────────────────────────

@app.post("/simulate/mutual-fund")
def simulate_mutual_fund(req: MutualFundRequest):
    logger.debug(f"POST /simulate/mutual-fund — payload: {req.dict()}")

    if req.monthly_amount <= 0:
        raise HTTPException(status_code=400, detail="monthly_amount must be greater than 0")
    if req.months <= 0:
        raise HTTPException(status_code=400, detail="months must be greater than 0")

    # Adjust return by fund type
    fund_type = req.fund_type.lower()
    if fund_type == "debt":
        effective_return = 7.0
        logger.debug(f"  Fund type: debt → using 7% return")
    elif fund_type == "balanced":
        effective_return = 11.0
        logger.debug(f"  Fund type: balanced → using 11% return")
    else:
        # equity (default)
        effective_return = req.expected_annual_return
        logger.debug(f"  Fund type: equity → using {effective_return}% return")

    total_invested = req.monthly_amount * req.months
    estimated_value = sip_future_value(req.monthly_amount, req.months, effective_return)
    gain = estimated_value - total_invested
    xirr_approx = f"{effective_return}%"

    # Tax notes
    if fund_type == "equity":
        if req.months > 12:
            tax_note = "LTCG tax 10% on gains above ₹1 lakh (Long Term Capital Gains)."
        else:
            tax_note = "STCG tax 15% applies (Short Term Capital Gains — held under 12 months)."
    else:
        tax_note = "Gains taxed at your income slab rate (debt funds)."

    safe = req.monthly_amount <= req.monthly_surplus

    logger.debug(f"  total_invested={total_invested}, fv={estimated_value:.0f}, gain={gain:.0f}")
    logger.debug(f"  tax_note={tax_note}, safe={safe}")

    result = {
        "total_invested": round(total_invested),
        "estimated_value": round(estimated_value),
        "gain": round(gain),
        "xirr_approx": xirr_approx,
        "safe": safe,
        "tax_note": tax_note,
    }
    logger.info(f"Mutual fund simulation result: {result}")
    return result


# ── NEW ENDPOINT: Financial Health Check ─────────────────────────────────────

@app.post("/simulate/health-check")
def simulate_health_check(req: FinancialHealthRequest):
    logger.debug(f"POST /simulate/health-check — payload: {req.dict()}")

    if req.monthly_income <= 0:
        raise HTTPException(status_code=400, detail="monthly_income must be greater than 0")
    if req.current_day_of_month <= 0 or req.total_days_in_month <= 0:
        raise HTTPException(status_code=400, detail="day fields must be positive")

    # 1. Projected monthly spend
    daily_rate = req.current_month_spend / req.current_day_of_month if req.current_day_of_month > 0 else 0
    projected_monthly_spend = daily_rate * req.total_days_in_month
    logger.debug(f"  daily_rate={daily_rate:.2f}, projected_spend={projected_monthly_spend:.2f}")

    # 2. Projected surplus
    projected_surplus = req.monthly_income - projected_monthly_spend - req.total_monthly_commitments
    logger.debug(f"  projected_surplus={projected_surplus:.2f}")

    # 3. Average 3-month surplus from historical data
    avg_surplus_3m = 0.0
    if req.historical_months:
        surpluses = []
        for m in req.historical_months:
            s = m.totalIncome - m.totalSpend
            surpluses.append(s)
            logger.debug(f"  historical month '{m.label}': income={m.totalIncome}, spend={m.totalSpend}, surplus={s}")
        avg_surplus_3m = sum(surpluses) / len(surpluses)
    else:
        logger.debug("  No historical months provided, avg_surplus_3m = 0")
    logger.debug(f"  avg_surplus_3m={avg_surplus_3m:.2f}")

    # 4. Health score calculation
    savings_rate = req.monthly_saved / req.monthly_income if req.monthly_income > 0 else 0
    logger.debug(f"  savings_rate={savings_rate:.2%}")

    score = 50  # baseline
    reasons = []

    if savings_rate >= 0.2:
        score += 10
        logger.debug("  +10: savings_rate >= 20%")
        reasons.append("savings_rate_ok")
    else:
        logger.debug(f"  savings_rate {savings_rate:.1%} < 20%, no bonus")

    if avg_surplus_3m > 0:
        score += 10
        logger.debug("  +10: avg_surplus_3m > 0")
        reasons.append("avg_surplus_positive")

    if req.goals_active > 0:
        score += 10
        logger.debug(f"  +10: {req.goals_active} active goals")
        reasons.append("has_goals")

    if projected_surplus > req.monthly_income * 0.1:
        score += 10
        logger.debug("  +10: projected_surplus > 10% of income")
        reasons.append("projected_surplus_healthy")

    if req.total_monthly_commitments > req.monthly_income * 0.4:
        score -= 15
        logger.debug("  -15: commitments > 40% of income")
        reasons.append("high_commitments")

    if req.avg_monthly_spend > req.monthly_income * 0.9:
        score -= 10
        logger.debug("  -10: avg_spend > 90% of income")
        reasons.append("high_avg_spend")

    score = max(0, min(100, score))
    logger.debug(f"  final health_score={score}, reasons={reasons}")

    # 5. Label
    if score >= 80:
        health_label = "Excellent"
    elif score >= 60:
        health_label = "Good"
    elif score >= 40:
        health_label = "Fair"
    else:
        health_label = "Needs Work"

    # 6. Recommendations (up to 3)
    recommendations = []
    if savings_rate < 0.2:
        gap = round((0.2 * req.monthly_income) - req.monthly_saved)
        recommendations.append(
            f"Increase monthly savings by ₹{gap:,} to reach the recommended 20% savings rate."
        )
    if req.total_monthly_commitments > req.monthly_income * 0.4:
        recommendations.append(
            "Your EMI/SIP commitments exceed 40% of income — consider paying off high-interest loans first."
        )
    if req.goals_active == 0:
        recommendations.append(
            "Set a savings goal to give your surplus a direction — even ₹500/month towards a goal helps."
        )
    if projected_surplus < req.monthly_income * 0.1 and len(recommendations) < 3:
        recommendations.append(
            f"Your projected monthly surplus is low. Try cutting your top spending category by 15-20%."
        )
    if avg_surplus_3m < 0 and len(recommendations) < 3:
        recommendations.append(
            "Your 3-month average shows you're spending more than you earn. Review recurring expenses."
        )

    recommendations = recommendations[:3]
    logger.debug(f"  recommendations={recommendations}")

    result = {
        "projected_monthly_spend": round(projected_monthly_spend),
        "projected_surplus": round(projected_surplus),
        "avg_surplus_3m": round(avg_surplus_3m),
        "health_score": score,
        "health_label": health_label,
        "recommendations": recommendations,
        "savings_rate_percent": round(savings_rate * 100, 1),
    }
    logger.info(f"Health check result: {result}")
    return result