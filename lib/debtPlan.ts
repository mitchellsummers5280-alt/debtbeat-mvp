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
// Lifetime constants
// ----------------------------------------------------

const LIFETIME_YEARS = 100;
const MONTHS_IN_YEAR = 12;

// This is ONLY a safety cap to prevent infinite loops in extreme edge cases.
// 1,000 lifetimes = 100,000 years = 1,200,000 months (effectively unlimited).
const MAX_LIFETIMES = 1000;
const MAX_MONTHS = LIFETIME_YEARS * MONTHS_IN_YEAR * MAX_LIFETIMES;

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
// Internal helpers
// ----------------------------------------------------

function parseNum(value: string): number {
  const n = parseFloat(value || "0");
  return Number.isFinite(n) ? n : 0;
}

type NumericDebt = {
  id: number;
  name: string;
  balance: number;
  apr: number;
  minPayment: number;
};

function cloneNumericDebts(input: Debt[]): NumericDebt[] {
  return input
    .map((d) => ({
      id: d.id,
      name: d.name || `Card ${d.id}`,
      balance: Math.max(0, parseNum(d.balance)),
      apr: Math.max(0, parseNum(d.apr)),
      minPayment: Math.max(0, parseNum(d.minPayment)),
    }))
    .filter((d) => d.balance > 0 && d.minPayment > 0);
}

// ----------------------------------------------------
// Core payoff math (matches demo engine behaviour)
// ----------------------------------------------------

// strategy mapping here:
// - warrior: smallest balance first (snowball / motivation)
// - rebel:   highest APR first (avalanche / interest savings)
// - wizard:  interest-optimized (targets biggest interest cost)
export function calculatePlan(
  debtsInput: Debt[],
  monthlyBudgetStr: string,
  strategy: Strategy
): PlanResult | { error: string } {
  const monthlyBudget = parseNum(monthlyBudgetStr);
  if (!Number.isFinite(monthlyBudget) || monthlyBudget <= 0) {
    return { error: "Please enter a positive monthly budget." };
  }

  const debts = cloneNumericDebts(debtsInput);
  if (debts.length === 0) {
    return { error: "Add at least one card with a balance and minimum payment." };
  }

  const totalMin = debts.reduce((sum, d) => sum + d.minPayment, 0);
  if (totalMin > monthlyBudget + 1e-6) {
    return {
      error:
        "Your total minimum payments are higher than your monthly budget. Increase your budget or adjust card data.",
    };
  }

  const workingDebts: NumericDebt[] = debts.map((d) => ({ ...d }));

  const schedule: ScheduleRow[] = [];
  let months = 0;
  let totalInterestAllTime = 0;

  // Safety cap only: effectively unlimited for real-world numbers
  const maxMonths = MAX_MONTHS;

  while (months < maxMonths && workingDebts.some((d) => d.balance > 0.01)) {
    months++;

    const interestByIndex: number[] = new Array(workingDebts.length).fill(0);
    const minDueByIndex: number[] = new Array(workingDebts.length).fill(0);
    const totalPaymentByIndex: number[] = new Array(workingDebts.length).fill(0);
    const extraByIndex: number[] = new Array(workingDebts.length).fill(0);

    let sumMinDue = 0;
    let totalBalanceStart = 0;
    let interestThisMonth = 0;

    // 1) Compute interest + minimum due for each card THIS month
    workingDebts.forEach((d, i) => {
      if (d.balance <= 0.01) {
        interestByIndex[i] = 0;
        minDueByIndex[i] = 0;
        return;
      }

      const r = d.apr / 100 / 12;
      const interest = d.balance * r;
      const minDue = Math.min(d.minPayment, d.balance + interest);

      interestByIndex[i] = interest;
      minDueByIndex[i] = minDue;

      sumMinDue += minDue;
      totalBalanceStart += d.balance;
      interestThisMonth += interest;
    });

    // budget minus this month’s true minimums
    let leftover = Math.max(0, monthlyBudget - sumMinDue);

    // 2) Start with everyone just getting their minimum
    workingDebts.forEach((_, i) => {
      totalPaymentByIndex[i] = minDueByIndex[i];
      extraByIndex[i] = 0;
    });

    // 3) Allocate leftover based on strategy priority
    type PriorityItem = { i: number; balance: number; apr: number; interest: number };

    const priorityList: PriorityItem[] = workingDebts
      .map((d, i) => ({
        i,
        balance: d.balance,
        apr: d.apr,
        interest: (d.apr / 100 / 12) * d.balance || 0,
      }))
      .filter((p) => p.balance > 0.01);

    priorityList.sort((a, b) => {
      switch (strategy) {
        case "warrior":
          // smallest balance first (snowball)
          if (a.balance !== b.balance) return a.balance - b.balance;
          return b.apr - a.apr;
        case "rebel":
          // highest APR first (avalanche)
          if (b.apr !== a.apr) return b.apr - a.apr;
          return b.balance - a.balance;
        case "wizard":
          // interest-optimized: biggest interest cost first
          if (b.interest !== a.interest) return b.interest - a.interest;
          return b.apr - a.apr;
        default:
          return 0;
      }
    });

    while (leftover > 0.01) {
      let allocatedThisPass = 0;

      for (const item of priorityList) {
        const idx = item.i;
        const d = workingDebts[idx];
        if (d.balance <= 0.01 || leftover <= 0.01) continue;

        const interest = interestByIndex[idx] ?? 0;
        const alreadyPaying = totalPaymentByIndex[idx] ?? 0;
        const maxNeeded = d.balance + interest - alreadyPaying;

        if (maxNeeded <= 0.01) continue;

        const extraForThisDebt = Math.min(maxNeeded, leftover);
        if (extraForThisDebt <= 0.001) continue;

        extraByIndex[idx] += extraForThisDebt;
        totalPaymentByIndex[idx] = alreadyPaying + extraForThisDebt;

        leftover -= extraForThisDebt;
        allocatedThisPass += extraForThisDebt;
      }

      if (allocatedThisPass <= 0.001) {
        // couldn't meaningfully allocate leftover; avoid infinite loop
        break;
      }
    }

    // 4) Apply payments and update balances
    let totalBalanceEnd = 0;
    let totalPrincipalThisMonth = 0;

    workingDebts.forEach((d, i) => {
      const startBal = d.balance;
      const interest = interestByIndex[i] ?? 0;
      const totalPay = totalPaymentByIndex[i] ?? 0;

      const principalPaid = Math.max(0, totalPay - interest);
      let newBalance = startBal + interest - totalPay;
      if (newBalance < 0) newBalance = 0;

      d.balance = newBalance;

      totalBalanceEnd += newBalance;
      totalPrincipalThisMonth += principalPaid;
    });

    totalInterestAllTime += interestThisMonth;

    schedule.push({
      month: months,
      totalBalanceEnd,
      interestPaid: interestThisMonth,
      principalPaid: totalPrincipalThisMonth,
    });

    if (totalBalanceEnd <= 0.01) break;
  }

  if (months >= maxMonths) {
  return {
    error: `At this payment level it would take more than ${MAX_LIFETIMES.toLocaleString()} lifetimes to become debt free. Increase your budget.`,
  };
}

  return {
    months,
    totalInterest: totalInterestAllTime,
    schedule,
    strategyUsed: strategy,
  };
}

// ----------------------------------------------------
// Helpers used elsewhere
// ----------------------------------------------------

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
    (sum, d) => sum + (parseNum(d.minPayment) || 0),
    0
  );
  if (!Number.isFinite(minBudget) || minBudget <= 0) return null;

  const maxBudget = minBudget + 2000; // simple cap for search space
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
