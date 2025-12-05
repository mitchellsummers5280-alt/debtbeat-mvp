// lib/debtPlan.ts

// ----------------------------------------------------
// Types
// ----------------------------------------------------

export type Strategy = "warrior" | "rebel" | "wizard";

export type Debt = {
  id: number;
  name: string;
  // stored as strings while typing, converted to numbers for math
  balance: string;
  apr: string;
  minPayment: string;
};

export type ScheduleRow = {
  month: number;
  totalBalanceEnd: number;
  interestPaid: number;
  principalPaid: number;
};

export type PlanResult = {
  months: number;
  totalInterest: number;
  strategyUsed: Strategy;
  schedule: ScheduleRow[];
};

// ----------------------------------------------------
// Formatting helpers
// ----------------------------------------------------

export function getStrategyLabel(strategy: Strategy): string {
  if (strategy === "warrior") return "The Warrior";
  if (strategy === "rebel") return "The Rebel";
  return "The Wizard";
}

export function formatCurrency(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

// ----------------------------------------------------
// Core payoff math
// ----------------------------------------------------

function pickNextDebtIndex(
  debts: { balance: number; apr: number }[],
  strategy: Strategy
): number | null {
  // Pick index of debt to target with extra payments
  const alive = debts
    .map((d, i) => ({ ...d, i }))
    .filter((d) => d.balance > 0);

  if (alive.length === 0) return null;

  if (strategy === "warrior") {
    // smallest balance first
    return alive.sort((a, b) => a.balance - b.balance)[0].i;
  }
  if (strategy === "rebel") {
    // highest APR first
    return alive.sort((a, b) => b.apr - a.apr)[0].i;
  }

  // wizard: blend of both (score = apr * 2 + balance weight)
  return alive
    .map((d) => ({
      ...d,
      score: d.apr * 2 + d.balance / 1000,
    }))
    .sort((a, b) => b.score - a.score)[0].i;
}

export function calculatePlan(
  debtsInput: Debt[],
  monthlyBudgetStr: string,
  strategy: Strategy
): PlanResult | { error: string } {
  const monthlyBudget = parseFloat(monthlyBudgetStr || "0");
  if (!Number.isFinite(monthlyBudget) || monthlyBudget <= 0) {
    return { error: "Please enter a positive monthly budget." };
  }

  const balances = debtsInput.map((d) => parseFloat(d.balance || "0"));
  const aprs = debtsInput.map((d) => parseFloat(d.apr || "0"));
  const mins = debtsInput.map((d) => parseFloat(d.minPayment || "0"));

  const totalMin = mins.reduce((s, v) => s + (isNaN(v) ? 0 : v), 0);
  if (totalMin > monthlyBudget + 1e-6) {
    return {
      error:
        "Your total minimum payments are higher than your monthly budget. Increase your budget or adjust card data.",
    };
  }

  const schedule: ScheduleRow[] = [];
  let months = 0;
  let totalInterest = 0;

  // copy mutable balances
  const bal = balances.map((v) => (isNaN(v) ? 0 : v));

  const maxMonths = 600; // 50 years cap

  while (months < maxMonths && bal.some((b) => b > 0.01)) {
    months++;

    // Compute base interest and min payments
    let interestThisMonth = 0;
    mins.forEach((min, i) => {
      const apr = aprs[i] || 0;
      const r = apr / 100 / 12;
      const interest = bal[i] * r;
      interestThisMonth += interest;
      const minPay = Math.max(0, isNaN(min) ? 0 : min);

      // first cover interest, then principal
      const principal = Math.max(
        0,
        Math.min(bal[i] + interest, minPay) - interest
      );
      bal[i] = Math.max(0, bal[i] + interest - principal);
    });

    totalInterest += interestThisMonth;

    // Remaining budget for extra payments
    let remainingBudget =
      monthlyBudget -
      mins.reduce((s, v) => s + (isNaN(v) ? 0 : v), 0);

    // Apply extra to a single targeted debt each month
    while (remainingBudget > 0.01 && bal.some((b) => b > 0.01)) {
      const idx = pickNextDebtIndex(
        bal.map((b, i) => ({ balance: b, apr: aprs[i] || 0 })),
        strategy
      );
      if (idx === null) break;

      const extra = Math.min(remainingBudget, bal[idx]);
      bal[idx] -= extra;
      remainingBudget -= extra;
    }

    const totalBalanceEnd = bal.reduce((s, v) => s + v, 0);

    schedule.push({
      month: months,
      totalBalanceEnd,
      interestPaid: interestThisMonth,
      principalPaid: monthlyBudget - interestThisMonth,
    });

    if (totalBalanceEnd <= 0.01) break;
  }

  if (months >= maxMonths) {
    return {
      error:
        "At this payment level it would take more than 50 years to become debt free. Increase your budget.",
    };
  }

  return {
    months,
    totalInterest,
    schedule,
    strategyUsed: strategy,
  };
}

// safe wrapper so other helpers don't need to deal with error union
export function runPlanSafe(
  debts: Debt[],
  budget: number,
  strategy: Strategy
): PlanResult | null {
  const res = calculatePlan(debts, budget.toString(), strategy);
  if ("error" in res) return null;
  return res;
}

// Simple search for the budget to hit a target payoff time
export function findIdealBudgetSimple(
  debts: Debt[],
  strategy: Strategy,
  targetMonths: number
): number | null {
  if (!debts.length) return null;

  const minBudget = debts.reduce(
    (sum, d) => sum + (parseFloat(d.minPayment || "0") || 0),
    0
  );
  if (!Number.isFinite(minBudget) || minBudget <= 0) return null;

  const maxBudget = minBudget + 2000; // simple cap
  let best: number | null = null;

  for (let budget = minBudget; budget <= maxBudget; budget += 25) {
    const plan = runPlanSafe(debts, budget, strategy);
    if (!plan) break;
    if (plan.months <= targetMonths) {
      best = budget;
      break;
    }
  }

  return best;
}
