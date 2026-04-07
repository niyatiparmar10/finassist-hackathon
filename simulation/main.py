#main.py

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional

app = FastAPI(title="FinMind Simulation Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request models ──────────────────────────────────────

class EMIRequest(BaseModel):
    emi_amount: float
    months: int = 12
    monthly_income: float
    current_monthly_spend: float


class InvestmentRequest(BaseModel):
    monthly_amount: float
    months: int = 24
    expected_annual_return: float = 12.0
    current_surplus: float


class ExpenseCutRequest(BaseModel):
    category: str
    cut_percent: float
    current_monthly_spend: float
    category_amount: float
    monthly_income: float


# ── Endpoints ───────────────────────────────────────────

@app.get("/")
def root():
    return {"status": "FinMind simulation engine running"}


@app.post("/simulate/emi")
def simulate_emi(req: EMIRequest):
    surplus_after_emi = req.monthly_income - req.current_monthly_spend - req.emi_amount
    safe = surplus_after_emi >= 0

    risk_level = "safe"
    if surplus_after_emi < 0:
        risk_level = "danger"
    elif surplus_after_emi < req.monthly_income * 0.1:
        risk_level = "warning"

    # Project 6-month balance
    projected_balance = []
    balance = 0
    for _ in range(6):
        balance += surplus_after_emi
        projected_balance.append(round(balance))

    recommendation = ""
    if safe:
        recommendation = f"You can afford this EMI. You'll have ₹{int(surplus_after_emi):,} remaining each month."
    else:
        shortfall = abs(surplus_after_emi)
        recommendation = f"This EMI creates a monthly deficit of ₹{int(shortfall):,}. You need to cut expenses or increase income first."

    return {
        "monthly_surplus_after_emi": round(surplus_after_emi),
        "safe": safe,
        "risk_level": risk_level,
        "projected_balance": projected_balance,
        "recommendation": recommendation,
    }


@app.post("/simulate/investment")
def simulate_investment(req: InvestmentRequest):
    monthly_rate = req.expected_annual_return / 12 / 100
    total_invested = req.monthly_amount * req.months

    # SIP future value formula
    if monthly_rate > 0:
        future_value = req.monthly_amount * (((1 + monthly_rate) ** req.months - 1) / monthly_rate) * (1 + monthly_rate)
    else:
        future_value = total_invested

    gain = future_value - total_invested
    safe = req.monthly_amount <= req.current_surplus

    return {
        "total_invested": round(total_invested),
        "estimated_value": round(future_value),
        "gain": round(gain),
        "safe": safe,
        "impact_on_surplus": round(req.current_surplus - req.monthly_amount),
    }


@app.post("/simulate/expense-cut")
def simulate_expense_cut(req: ExpenseCutRequest):
    monthly_saving = round(req.category_amount * req.cut_percent / 100)
    new_spend = req.current_monthly_spend - monthly_saving
    new_surplus = req.monthly_income - new_spend
    annual_saving = monthly_saving * 12

    return {
        "monthly_saving": monthly_saving,
        "new_surplus": round(new_surplus),
        "annual_saving": annual_saving,
        "new_monthly_spend": round(new_spend),
    }