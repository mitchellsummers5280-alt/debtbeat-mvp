"use client";

import React, { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import AIRecommendationCard from "../src/components/AIRecommendationCard";
import {
  generateAiRecommendation,
  type AiRecommendation,
} from "../aiRecommendations";

// ----------------------------------------------------
// Types
// ----------------------------------------------------

type Strategy = "warrior" | "rebel" | "wizard";

type Debt = {
  id: number;
  name: string;
  // we store as string while typing, convert to number for math
  balance: string;
  apr: string;
  minPayment: string;
};

type ScheduleRow = {
  month: number;
  totalBalanceEnd: number;
  interestPaid: number;
  principalPaid: number;
};

type PlanResult = {
  months: number;
  totalInterest: number;
  strategyUsed: Strategy;
  schedule: ScheduleRow[];
};

type ComparisonSummary = {
  altStrategy: Strategy;
  interestDiff: number; // positive = chosen saves interest
  monthsDiff: number; // positive = chosen is faster
};

type WhatIfSummary = {
  extraAmount: number;
  newMonths: number;
  interestSaved: number;
  monthsSaved: number;
};

// ----------------------------------------------------
// Helper functions
// ----------------------------------------------------

function getStrategyLabel(strategy: Strategy): string {
  if (strategy === "warrior") return "The Warrior";
  if (strategy === "rebel") return "The Rebel";
  return "The Wizard";
}

function getAltStrategy(strategy: Strategy): Strategy {
  if (strategy === "warrior") return "rebel";
  if (strategy === "rebel") return "warrior";
  // for wizard, compare vs highest APR style by default
  return "rebel";
}

function formatCurrency(n: number): string {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

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

function calculatePlan(
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

// safe wrapper so our comparison helpers don't need to deal with error union
function runPlanSafe(
  debts: Debt[],
  budget: number,
  strategy: Strategy
): PlanResult | null {
  const res = calculatePlan(debts, budget.toString(), strategy);
  if ("error" in res) return null;
  return res;
}

function findIdealBudgetSimple(
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

// ----------------------------------------------------
// Chart component
// ----------------------------------------------------

type BalanceChartProps = {
  schedule: ScheduleRow[];
};

const BalanceChart: React.FC<BalanceChartProps> = ({ schedule }) => {
  if (!schedule.length) return null;

  const data = schedule.map((row) => ({
    month: row.month,
    balance: row.totalBalanceEnd,
  }));

  const yTickFormatter = (value: number) =>
    value >= 1000 ? `${(value / 1000).toFixed(0)}k` : value.toFixed(0);

  return (
    <div
      style={{
        width: "100%",
        height: 260,
        background: "#020617",
        borderRadius: "12px",
        padding: "8px 8px 4px",
        border: "1px solid #111827",
      }}
    >
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis
            dataKey="month"
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            stroke="#4b5563"
          />
          <YAxis
            tick={{ fontSize: 10, fill: "#9ca3af" }}
            stroke="#4b5563"
            tickFormatter={yTickFormatter}
          />
          <Tooltip
            cursor={{ stroke: "#4b5563", strokeWidth: 1 }}
            contentStyle={{
              backgroundColor: "#020617",
              border: "1px solid #374151",
              borderRadius: "8px",
              fontSize: "11px",
            }}
            formatter={(value: any) => [formatCurrency(value as number), "Balance"]}
            labelFormatter={(label) => `Month ${label}`}
          />
          <Line
            type="monotone"
            dataKey="balance"
            stroke="#22c55e"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

// ----------------------------------------------------
// UI components
// ----------------------------------------------------

type StrategyButtonProps = {
  label: string;
  icon: string;
  strategy: Strategy;
  active: boolean;
  onClick: () => void;
};

const StrategyButton: React.FC<StrategyButtonProps> = ({
  label,
  icon,
  strategy, // unused but kept for clarity / future
  active,
  onClick,
}) => {
  return (
    <button
      onClick={onClick}
      type="button"
      style={{
        borderRadius: "999px",
        padding: "14px 24px",
        border: active ? "2px solid #22c55e" : "2px solid #333",
        background: active ? "#22c55e" : "#111",
        color: active ? "#000" : "#eee",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        cursor: "pointer",
        minWidth: 0,
        transition:
          "background 0.2s ease, transform 0.2s ease, box-shadow 0.2s ease",
        boxShadow: active ? "0 0 18px rgba(34,197,94,0.7)" : "none",
      }}
    >
      <span
        aria-hidden="true"
        style={{
          fontSize: "20px",
          display: "inline-block",
          transform: active ? "translateY(-1px) scale(1.1)" : "none",
          transition: "transform 0.2s ease",
        }}
      >
        {icon}
      </span>
      <span
        style={{
          fontWeight: 600,
          whiteSpace: "nowrap",
        }}
      >
        {label}
      </span>
    </button>
  );
};

// ----------------------------------------------------
// Main page component
// ----------------------------------------------------

export default function Home() {
  // debts start with empty numeric fields so no leading 0s
  const [debts, setDebts] = useState<Debt[]>([
    { id: 1, name: "Card 1", balance: "", apr: "", minPayment: "" },
  ]);

  const [strategy, setStrategy] = useState<Strategy>("warrior");
  const [monthlyBudget, setMonthlyBudget] = useState<string>("500");
  const [result, setResult] = useState<PlanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [recommendationNote, setRecommendationNote] = useState<string | null>(
    null
  );
  const [aiRec, setAiRec] = useState<AiRecommendation | null>(null);

  // saved snapshot for comparisons (debts + budget used)
  const [savedDebts, setSavedDebts] = useState<Debt[] | null>(null);
  const [lastBudgetUsed, setLastBudgetUsed] = useState<number | null>(null);

  // what-if slider
  const [extraPerMonth, setExtraPerMonth] = useState<number>(0);

  const totalRemaining = useMemo(
    () =>
      debts.reduce(
        (sum, d) => sum + (parseFloat(d.balance || "0") || 0),
        0
      ),
    [debts]
  );

  // --------------------------------------------------
  // Derived insights (comparison, what-if, ideal budget)
  // --------------------------------------------------

  const comparisonSummary: ComparisonSummary | null = useMemo(() => {
    if (!result || !savedDebts || lastBudgetUsed == null) return null;

    const alt = getAltStrategy(result.strategyUsed);
    const basePlan = runPlanSafe(savedDebts, lastBudgetUsed, result.strategyUsed);
    const altPlan = runPlanSafe(savedDebts, lastBudgetUsed, alt);
    if (!basePlan || !altPlan) return null;

    const interestDiff = altPlan.totalInterest - basePlan.totalInterest;
    const monthsDiff = altPlan.months - basePlan.months;

    return {
      altStrategy: alt,
      interestDiff, // positive means chosen saves interest
      monthsDiff, // positive means chosen is faster
    };
  }, [result, savedDebts, lastBudgetUsed]);

  const whatIfSummary: WhatIfSummary | null = useMemo(() => {
    if (!result || !savedDebts || lastBudgetUsed == null) return null;
    if (extraPerMonth <= 0) return null;

    const basePlan = runPlanSafe(savedDebts, lastBudgetUsed, result.strategyUsed);
    const extraPlan = runPlanSafe(
      savedDebts,
      lastBudgetUsed + extraPerMonth,
      result.strategyUsed
    );
    if (!basePlan || !extraPlan) return null;

    return {
      extraAmount: extraPerMonth,
      newMonths: extraPlan.months,
      interestSaved: basePlan.totalInterest - extraPlan.totalInterest,
      monthsSaved: basePlan.months - extraPlan.months,
    };
  }, [result, savedDebts, lastBudgetUsed, extraPerMonth]);

  const idealBudget = useMemo(() => {
    if (!result || !savedDebts) return null;
    // target ≈ 36 months (3 years)
    return findIdealBudgetSimple(savedDebts, result.strategyUsed, 36);
  }, [result, savedDebts]);

  const scheduleToShow: ScheduleRow[] = useMemo(
    () => (result ? result.schedule.slice(0, 24) : []),
    [result]
  );

  const hasMoreMonths = result ? result.schedule.length > 24 : false;

  // progress bar width (cap at $20k for visual)
  const progressRatio = Math.min(totalRemaining / 20000, 1);

  // --------------------------------------------------
  // Handlers
  // --------------------------------------------------

  const handleDebtChange = (
    id: number,
    field: keyof Omit<Debt, "id">,
    value: string
  ) => {
    setDebts((prev) =>
      prev.map((d) =>
        d.id === id
          ? {
              ...d,
              [field]: value, // keep as raw string, no auto "0"
            }
          : d
      )
    );
  };

  const handleAddCard = () => {
    setDebts((prev) => [
      ...prev,
      {
        id: Date.now(),
        name: `Card ${prev.length + 1}`,
        balance: "",
        apr: "",
        minPayment: "",
      },
    ]);
  };

  const handleRemoveCard = (id: number) => {
    setDebts((prev) => prev.filter((d) => d.id !== id));
  };

  const handleGeneratePlan = () => {
    setError(null);
    setResult(null);
    setShowSchedule(false);
    setRecommendationNote(null);
    setAiRec(null);

    const nonEmpty = debts.filter(
      (d) =>
        parseFloat(d.balance || "0") > 0 &&
        !isNaN(parseFloat(d.balance || "0"))
    );

    if (nonEmpty.length === 0) {
      setError("Please enter at least one card with a positive balance.");
      return;
    }

    const plan = calculatePlan(nonEmpty, monthlyBudget, strategy);
    if ("error" in plan) {
      setError(plan.error);
      return;
    }

    setResult(plan);
    setSavedDebts(nonEmpty);
    setLastBudgetUsed(parseFloat(monthlyBudget || "0") || 0);
    setExtraPerMonth(0); // reset what-if slider on new run

    // build AI recommendation for this result
    const rec = generateAiRecommendation(
      strategy,
      nonEmpty.length,
      plan.months,
      plan.totalInterest
    );
    setAiRec(rec);
  };

  const handleRecommend = () => {
    // very simple heuristic "AI-like" explanation
    const balances = debts.map((d) => parseFloat(d.balance || "0"));
    const aprs = debts.map((d) => parseFloat(d.apr || "0"));

    const maxApr = Math.max(...aprs.filter((a) => !isNaN(a)), 0);
    const minBalance = Math.min(
      ...balances.filter((b) => !isNaN(b) && b > 0),
      Infinity
    );
    const totalDebt = balances.reduce((s, v) => s + (isNaN(v) ? 0 : v), 0);

    let chosen: Strategy = "warrior";
    let note = "";

    if (maxApr >= 25) {
      chosen = "rebel";
      note =
        "Based on your high interest rates, The Rebel (highest APR first) should save you more interest over time.";
    } else if (totalDebt / Math.max(minBalance, 1) > 8) {
      chosen = "warrior";
      note =
        "You have a mix of debts where a quick win on the smallest balances can keep you motivated. The Warrior fits best.";
    } else {
      chosen = "wizard";
      note =
        "Your debts are fairly balanced. The Wizard’s blended approach is a solid middle ground between motivation and interest savings.";
    }

    setStrategy(chosen);
    setRecommendationNote(note);
  };

  const formattedSummary = () => {
    if (!result) return "";
    const years = result.months / 12;
    const label = getStrategyLabel(result.strategyUsed);

    return `🔥 With ${label} strategy, you could be debt free in ${result.months.toFixed(
      0
    )} months (~${years.toFixed(1)} years). Estimated total interest paid: ${formatCurrency(
      result.totalInterest
    )}.`;
  };

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#000",
        color: "#f9fafb",
        fontFamily:
          '-apple-system, system-ui, BlinkMacSystemFont, "SF Pro Text", sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: "960px",
          margin: "0 auto",
          padding: "24px 16px 48px",
        }}
      >
        {/* HEADER */}
        <header style={{ textAlign: "center", marginBottom: "32px" }}>
          <h1
            style={{
              fontSize: "36px",
              fontWeight: 800,
              marginBottom: "8px",
            }}
          >
            DebtBeat
          </h1>
          <p
            style={{
              color: "#9ca3af",
              maxWidth: "520px",
              margin: "0 auto",
              fontSize: "14px",
            }}
          >
            Add your credit cards, choose a strategy, and estimate your path to
            being debt free.
          </p>
        </header>

        {/* CARDS SECTION */}
        <section
          style={{
            background: "#050816",
            borderRadius: "16px",
            padding: "20px 16px",
            marginBottom: "24px",
            border: "1px solid #1f2937",
          }}
        >
          <h2
            style={{
              fontSize: "20px",
              marginBottom: "8px",
              fontWeight: 600,
            }}
          >
            Your Cards
          </h2>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              marginBottom: "8px",
              fontSize: "12px",
              color: "#9ca3af",
            }}
          >
            <span>Total remaining debt:</span>
            <span>{formatCurrency(totalRemaining)}</span>
          </div>

          {/* Progress bar */}
          <div
            style={{
              width: "100%",
              height: "6px",
              borderRadius: "999px",
              background: "#111827",
              overflow: "hidden",
              marginBottom: "4px",
            }}
          >
            <div
              style={{
                width: `${progressRatio * 100}%`,
                height: "100%",
                background:
                  "linear-gradient(90deg, #22c55e, #16a34a, #84cc16)",
                transition: "width 0.3s ease",
              }}
            />
          </div>
          <div
            style={{
              fontSize: "11px",
              color: "#6b7280",
              marginBottom: "16px",
            }}
          >
            Bar caps at $20,000 for visualization.
          </div>

          {/* column labels for desktop */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1.3fr 1fr 1fr 1fr 60px",
              gap: "8px",
              fontSize: "11px",
              color: "#9ca3af",
              marginBottom: "4px",
            }}
          >
            <span>Name</span>
            <span>Balance ($)</span>
            <span>APR (%)</span>
            <span>Min Payment ($)</span>
            <span />
          </div>

          {debts.map((d) => (
            <div
              key={d.id}
              style={{
                display: "grid",
                gridTemplateColumns: "1.3fr 1fr 1fr 1fr 60px",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <input
                type="text"
                value={d.name}
                onChange={(e) =>
                  handleDebtChange(d.id, "name", e.target.value)
                }
                style={{
                  borderRadius: "8px",
                  border: "1px solid #374151",
                  background: "#020617",
                  padding: "8px 10px",
                  color: "#f9fafb",
                  fontSize: "13px",
                  minWidth: 0,
                }}
              />

              <input
                type="number"
                inputMode="decimal"
                placeholder="e.g. 5000"
                value={d.balance}
                onChange={(e) =>
                  handleDebtChange(d.id, "balance", e.target.value)
                }
                style={{
                  borderRadius: "8px",
                  border: "1px solid #374151",
                  background: "#020617",
                  padding: "8px 10px",
                  color: "#f9fafb",
                  fontSize: "13px",
                  minWidth: 0,
                }}
              />

              <input
                type="number"
                inputMode="decimal"
                step="0.01"
                placeholder="e.g. 24.99"
                value={d.apr}
                onChange={(e) =>
                  handleDebtChange(d.id, "apr", e.target.value)
                }
                style={{
                  borderRadius: "8px",
                  border: "1px solid #374151",
                  background: "#020617",
                  padding: "8px 10px",
                  color: "#f9fafb",
                  fontSize: "13px",
                  minWidth: 0,
                }}
              />

              <input
                type="number"
                inputMode="decimal"
                placeholder="e.g. 75"
                value={d.minPayment}
                onChange={(e) =>
                  handleDebtChange(d.id, "minPayment", e.target.value)
                }
                style={{
                  borderRadius: "8px",
                  border: "1px solid #374151",
                  background: "#020617",
                  padding: "8px 10px",
                  color: "#f9fafb",
                  fontSize: "13px",
                  minWidth: 0,
                }}
              />

              <button
                type="button"
                onClick={() => handleRemoveCard(d.id)}
                style={{
                  borderRadius: "8px",
                  border: "none",
                  background: "#7f1d1d",
                  color: "#fee2e2",
                  fontSize: "12px",
                  cursor: "pointer",
                }}
              >
                ✕
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={handleAddCard}
            style={{
              marginTop: "10px",
              borderRadius: "999px",
              padding: "10px 16px",
              border: "1px dashed #22c55e",
              background: "transparent",
              color: "#bbf7d0",
              fontSize: "13px",
              cursor: "pointer",
            }}
          >
            + Add Card
          </button>
        </section>

        {/* STRATEGY & BUDGET */}
        <section
          style={{
            background: "#050816",
            borderRadius: "16px",
            padding: "20px 16px",
            marginBottom: "24px",
            border: "1px solid #1f2937",
          }}
        >
          <h2
            style={{
              fontSize: "20px",
              marginBottom: "16px",
              fontWeight: 600,
            }}
          >
            Strategy & Budget
          </h2>

          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "12px",
              marginBottom: "12px",
            }}
          >
            <StrategyButton
              label="The Warrior"
              icon="⚔️"
              strategy="warrior"
              active={strategy === "warrior"}
              onClick={() => setStrategy("warrior")}
            />
            <StrategyButton
              label="The Rebel"
              icon="🧨"
              strategy="rebel"
              active={strategy === "rebel"}
              onClick={() => setStrategy("rebel")}
            />
            <StrategyButton
              label="The Wizard"
              icon="🧙‍♂️"
              strategy="wizard"
              active={strategy === "wizard"}
              onClick={() => setStrategy("wizard")}
            />
          </div>

          <div
            style={{
              fontSize: "12px",
              color: "#9ca3af",
              marginBottom: "12px",
            }}
          >
            <div>
              ⚔️ <strong>Warrior</strong>: smallest balances first (motivation).
            </div>
            <div>
              🧨 <strong>Rebel</strong>: highest APR first (interest savings).
            </div>
            <div>
              🧙‍♂️ <strong>Wizard</strong>: smart blend of both.
            </div>
          </div>

          <button
            type="button"
            onClick={handleRecommend}
            style={{
              borderRadius: "999px",
              padding: "8px 14px",
              border: "1px solid #38bdf8",
              background: "rgba(15,23,42,0.9)",
              color: "#e0f2fe",
              fontSize: "13px",
              cursor: "pointer",
              marginBottom: "10px",
            }}
          >
            💡 Let DebtBeat recommend a strategy
          </button>

          {recommendationNote && (
            <p
              style={{
                fontSize: "12px",
                color: "#e5e7eb",
                marginBottom: "10px",
              }}
            >
              {recommendationNote}
            </p>
          )}

          <label
            style={{
              display: "block",
              marginTop: "8px",
              marginBottom: "6px",
              fontSize: "14px",
            }}
          >
            Total monthly budget for debt payoff ($):
          </label>
          <input
            type="number"
            inputMode="decimal"
            value={monthlyBudget}
            onChange={(e) => setMonthlyBudget(e.target.value)}
            style={{
              borderRadius: "8px",
              border: "1px solid #374151",
              background: "#020617",
              padding: "10px 12px",
              color: "#f9fafb",
              fontSize: "14px",
              width: "100%",
              maxWidth: "260px",
              marginBottom: "16px",
            }}
          />

          {/* What-if slider */}
          <div
            style={{
              marginTop: "4px",
              marginBottom: "16px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontSize: "12px",
                marginBottom: "4px",
                color: "#9ca3af",
              }}
            >
              <span>“What if I add extra each month?”</span>
              <span style={{ color: "#bbf7d0" }}>
                +${extraPerMonth.toFixed(0)}/mo
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={500}
              step={25}
              value={extraPerMonth}
              onChange={(e) => setExtraPerMonth(Number(e.target.value))}
              style={{ width: "100%" }}
            />
            <div
              style={{
                fontSize: "11px",
                color: "#6b7280",
                marginTop: "2px",
              }}
            >
              Adjust this after generating a plan to see time & interest saved.
            </div>
          </div>

          <button
            type="button"
            onClick={handleGeneratePlan}
            style={{
              borderRadius: "999px",
              padding: "12px 22px",
              border: "none",
              background: "#22c55e",
              color: "#022c22",
              fontWeight: 600,
              fontSize: "15px",
              cursor: "pointer",
              boxShadow: "0 0 18px rgba(34,197,94,0.6)",
            }}
          >
            Generate Plan
          </button>
        </section>

        {/* ERROR */}
        {error && (
          <div
            style={{
              background: "#7f1d1d",
              borderRadius: "12px",
              padding: "10px 14px",
              marginBottom: "16px",
              color: "#fee2e2",
              fontSize: "13px",
            }}
          >
            {error}
          </div>
        )}

        {/* PLAN SUMMARY */}
        {result && (
          <section
            style={{
              background: "#050816",
              borderRadius: "16px",
              padding: "20px 16px",
              marginBottom: "24px",
              border: "1px solid #1f2937",
            }}
          >
            <h2
              style={{
                fontSize: "20px",
                marginBottom: "12px",
                fontWeight: 600,
              }}
            >
              Plan Summary
            </h2>
            <p
              style={{
                fontSize: "14px",
                color: "#e5e7eb",
                marginBottom: "12px",
              }}
            >
              {formattedSummary()}
            </p>

            {/* AI Recommendation Card */}
            {aiRec && (
              <div
                style={{
                  marginBottom: "16px",
                }}
              >
                <AIRecommendationCard recommendation={aiRec} />
              </div>
            )}

            {/* Interest/time comparison vs other strategy */}
            {comparisonSummary && (
              <div
                style={{
                  marginBottom: "12px",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  background: "#020617",
                  border: "1px solid #1f2937",
                  fontSize: "13px",
                  color: "#d1d5db",
                }}
              >
                {comparisonSummary.interestDiff > 0 ? (
                  <p>
                    ✅ Compared to{" "}
                    <strong>
                      {getStrategyLabel(comparisonSummary.altStrategy)}
                    </strong>
                    , your chosen strategy is projected to{" "}
                    <strong>
                      save {formatCurrency(comparisonSummary.interestDiff)} in
                      interest
                    </strong>{" "}
                    and pay off{" "}
                    <strong>
                      {comparisonSummary.monthsDiff.toFixed(0)} months faster
                    </strong>
                    .
                  </p>
                ) : (
                  <p>
                    ⚠️{" "}
                    <strong>
                      {getStrategyLabel(comparisonSummary.altStrategy)}
                    </strong>{" "}
                    might save you more. It could reduce interest by{" "}
                    <strong>
                      {formatCurrency(
                        Math.abs(comparisonSummary.interestDiff)
                      )}
                    </strong>{" "}
                    and change payoff time by{" "}
                    <strong>
                      {Math.abs(comparisonSummary.monthsDiff).toFixed(0)} months
                    </strong>
                    .
                  </p>
                )}
              </div>
            )}

            {/* What-if section */}
            {whatIfSummary && (
              <div
                style={{
                  marginBottom: "12px",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  background: "#022c22",
                  border: "1px solid #16a34a",
                  fontSize: "13px",
                  color: "#dcfce7",
                }}
              >
                <p>
                  If you add{" "}
                  <strong>
                    {formatCurrency(whatIfSummary.extraAmount)}
                  </strong>{" "}
                  each month, you could be debt free in{" "}
                  <strong>{whatIfSummary.newMonths.toFixed(0)} months</strong>{" "}
                  instead of{" "}
                  <strong>{result.months.toFixed(0)} months</strong>, saving
                  about{" "}
                  <strong>
                    {formatCurrency(whatIfSummary.interestSaved)}
                  </strong>{" "}
                  in interest.
                </p>
              </div>
            )}

            {/* Ideal budget */}
            {idealBudget && lastBudgetUsed != null && (
              <div
                style={{
                  marginBottom: "12px",
                  padding: "10px 12px",
                  borderRadius: "12px",
                  background: "#020617",
                  border: "1px dashed #4b5563",
                  fontSize: "13px",
                  color: "#e5e7eb",
                }}
              >
                <p>
                  To be debt free in about <strong>3 years</strong>, you&apos;d
                  need roughly{" "}
                  <strong>{formatCurrency(idealBudget)}</strong> per month.
                  You&apos;re currently modeling{" "}
                  <strong>{formatCurrency(lastBudgetUsed)}</strong> per month.
                </p>
              </div>
            )}

            {/* Balance over time chart */}
            <div
              style={{
                marginTop: "16px",
                marginBottom: "16px",
              }}
            >
              <h3
                style={{
                  fontSize: "14px",
                  marginBottom: "8px",
                  fontWeight: 500,
                  color: "#e5e7eb",
                }}
              >
                Balance over time
              </h3>
              <BalanceChart schedule={result.schedule} />
            </div>

            <button
              type="button"
              onClick={() => setShowSchedule((s) => !s)}
              style={{
                borderRadius: "999px",
                padding: "10px 16px",
                border: "1px solid #4b5563",
                background: "#020617",
                color: "#e5e7eb",
                fontSize: "13px",
                cursor: "pointer",
                marginBottom: showSchedule ? "12px" : 0,
              }}
            >
              {showSchedule
                ? "Hide payoff schedule"
                : "Show payoff schedule (first 24 months)"}
            </button>

            {showSchedule && (
              <div
                style={{
                  marginTop: "12px",
                  overflowX: "auto",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "12px",
                    minWidth: "480px",
                  }}
                >
                  <thead>
                    <tr style={{ background: "#020617" }}>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "6px",
                          borderBottom: "1px solid #1f2937",
                        }}
                      >
                        Month
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "6px",
                          borderBottom: "1px solid #1f2937",
                        }}
                      >
                        Ending balance
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "6px",
                          borderBottom: "1px solid #1f2937",
                        }}
                      >
                        Interest paid
                      </th>
                      <th
                        style={{
                          textAlign: "left",
                          padding: "6px",
                          borderBottom: "1px solid #1f2937",
                        }}
                      >
                        Principal paid
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {scheduleToShow.map((row) => (
                      <tr key={row.month}>
                        <td
                          style={{
                            padding: "6px",
                            borderBottom: "1px solid #111827",
                          }}
                        >
                          {row.month}
                        </td>
                        <td
                          style={{
                            padding: "6px",
                            borderBottom: "1px solid #111827",
                          }}
                        >
                          {formatCurrency(row.totalBalanceEnd)}
                        </td>
                        <td
                          style={{
                            padding: "6px",
                            borderBottom: "1px solid #111827",
                          }}
                        >
                          {formatCurrency(row.interestPaid)}
                        </td>
                        <td
                          style={{
                            padding: "6px",
                            borderBottom: "1px solid #111827",
                          }}
                        >
                          {formatCurrency(row.principalPaid)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {hasMoreMonths && (
                  <div
                    style={{
                      marginTop: "6px",
                      fontSize: "11px",
                      color: "#9ca3af",
                    }}
                  >
                    Showing first 24 months only.
                  </div>
                )}
              </div>
            )}
          </section>
        )}

        {/* DISCLAIMER */}
        <p
          style={{
            fontSize: "11px",
            color: "#6b7280",
            textAlign: "center",
            marginTop: "12px",
          }}
        >
          This is an educational planner only. It does not move money or provide
          financial advice.
        </p>
      </div>
    </main>
  );
}
