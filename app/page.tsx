"use client";

import { useState } from "react";

// ------------------------------------------------------
// TYPES
// ------------------------------------------------------
type Debt = {
  id: number;
  name: string;
  balance: string;     // store as text for smooth typing
  apr: string;         // allows "24.99" while typing
  minPayment: string;  // text -> number only in math
};

type NumericDebt = {
  id: number;
  name: string;
  balance: number;
  apr: number;
  minPayment: number;
};

type Strategy = "warrior" | "rebel" | "wizard";

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

type Recommendation = {
  recommended: Strategy;
  summary: string;
  rationale: string[];
};

// ------------------------------------------------------
// HELPERS
// ------------------------------------------------------
function toNumericDebt(d: Debt): NumericDebt {
  return {
    ...d,
    balance: Number.parseFloat(d.balance) || 0,
    apr: Number.parseFloat(d.apr) || 0,
    minPayment: Number.parseFloat(d.minPayment) || 0,
  };
}

function getStrategyLabel(strategy: Strategy): string {
  switch (strategy) {
    case "warrior":
      return "The Warrior";
    case "rebel":
      return "The Rebel";
    case "wizard":
      return "The Wizard";
  }
}

function getStrategyEmoji(strategy: Strategy): string {
  switch (strategy) {
    case "warrior":
      return "⚔️";
    case "rebel":
      return "🧨";
    case "wizard":
      return "🧙‍♂️";
  }
}

function getStrategyTooltip(strategy: Strategy): string {
  switch (strategy) {
    case "warrior":
      return "The Warrior strikes down your smallest balances first for fast wins.";
    case "rebel":
      return "The Rebel destroys high interest debt to save the most money.";
    case "wizard":
      return "The Wizard blends both approaches for a magical middle ground.";
  }
}

// ------------------------------------------------------
// CALCULATION ENGINE
// ------------------------------------------------------
function calculatePlan(
  debts: Debt[],
  strategy: Strategy,
  monthlyBudget: number
): PlanResult | { error: string } {
  if (debts.length === 0) return { error: "Add at least one card." };

  let working: NumericDebt[] = debts.map(toNumericDebt);
  let schedule: ScheduleRow[] = [];
  let month = 0;
  const maxMonths = 600;
  let totalInterest = 0;

  const stillOwing = () => working.some((d) => d.balance > 0);

  while (stillOwing() && month < maxMonths) {
    month++;

    let ordered = [...working];

    if (strategy === "warrior") {
      ordered.sort((a, b) => a.balance - b.balance);
    } else if (strategy === "rebel") {
      ordered.sort((a, b) => b.apr - a.apr);
    } else if (strategy === "wizard") {
      ordered.sort(
        (a, b) =>
          b.apr / Math.max(b.balance, 1) - a.apr / Math.max(a.balance, 1)
      );
    }

    let budgetLeft = monthlyBudget;
    let monthInterest = 0;
    let monthPrincipal = 0;

    for (let card of ordered) {
      if (card.balance <= 0) continue;

      const interest = (card.balance * card.apr) / 100 / 12;
      monthInterest += interest;

      const required = card.minPayment + interest;
      const payment = Math.min(required, budgetLeft, card.balance + interest);

      budgetLeft -= payment;

      const principal = Math.max(payment - interest, 0);
      monthPrincipal += principal;

      card.balance = Math.max(card.balance + interest - payment, 0);
    }

    totalInterest += monthInterest;

    schedule.push({
      month,
      totalBalanceEnd: working.reduce((sum, d) => sum + d.balance, 0),
      interestPaid: monthInterest,
      principalPaid: monthPrincipal,
    });
  }

  if (month >= maxMonths) {
    return {
      error:
        "At this payment level it would take more than 50 years to become debt free. Increase your budget.",
    };
  }

  return {
    months: month,
    totalInterest,
    strategyUsed: strategy,
    schedule,
  };
}

// ------------------------------------------------------
// RECOMMENDATION LOGIC
// ------------------------------------------------------
function buildRecommendation(
  debts: Debt[],
  monthlyBudget: number,
  warrior: PlanResult,
  rebel: PlanResult,
  wizard: PlanResult
): Recommendation {
  const plans = [
    { strategy: "warrior" as Strategy, months: warrior.months, interest: warrior.totalInterest },
    { strategy: "rebel" as Strategy, months: rebel.months, interest: rebel.totalInterest },
    { strategy: "wizard" as Strategy, months: wizard.months, interest: wizard.totalInterest },
  ];

  const fastest = plans.reduce((best, p) => (p.months < best.months ? p : best), plans[0]);
  const cheapest = plans.reduce((best, p) => (p.interest < best.interest ? p : best), plans[0]);

  const numericDebts = debts.map(toNumericDebt);
  const numCards = numericDebts.length;
  const highestAPR = Math.max(...numericDebts.map((d) => d.apr || 0), 0);
  const smallestBalance = Math.min(
    ...numericDebts.map((d) => (d.balance > 0 ? d.balance : Infinity)),
    Infinity
  );
  const totalMinPayments = numericDebts.reduce(
    (sum, d) => sum + (d.minPayment || 0),
    0
  );

  let recommended: Strategy;
  const rationale: string[] = [];

  const interestGap = Math.abs(fastest.interest - cheapest.interest);
  const monthGap = Math.abs(fastest.months - cheapest.months);

  if (fastest.strategy === cheapest.strategy) {
    recommended = fastest.strategy;
    rationale.push(
      `${getStrategyLabel(recommended)} is both the fastest path and the one that pays the least total interest.`
    );
  } else {
    if (interestGap > 1000 && monthGap <= 12) {
      recommended = cheapest.strategy;
      rationale.push(
        `${getStrategyLabel(cheapest.strategy)} saves about $${interestGap.toFixed(
          0
        )} in interest compared with ${getStrategyLabel(
          fastest.strategy
        )}, without adding a lot of extra time.`
      );
    } else {
      recommended = fastest.strategy;
      rationale.push(
        `${getStrategyLabel(fastest.strategy)} gets you debt-free about ${monthGap} month(s) faster, while the interest difference isn't huge (~$${interestGap.toFixed(
          0
        )}).`
      );
    }
  }

  if (recommended === "warrior") {
    if (numCards > 2 && smallestBalance !== Infinity) {
      rationale.push(
        `You have ${numCards} cards, and at least one smaller balance (~$${smallestBalance.toFixed(
          0
        )}), so quick wins can help keep you motivated.`
      );
    }
  } else if (recommended === "rebel") {
    rationale.push(
      `Your highest APR is about ${highestAPR.toFixed(
        1
      )}%, so focusing your extra money on expensive interest first helps reduce total cost.`
    );
  } else if (recommended === "wizard") {
    rationale.push(
      `The trade-off between speed and interest is fairly balanced, so a blended approach makes sense.`
    );
  }

  if (monthlyBudget < totalMinPayments * 1.2 && totalMinPayments > 0) {
    rationale.push(
      `Your budget ($${monthlyBudget.toFixed(
        0
      )}) is fairly close to the total minimum payments ($${totalMinPayments.toFixed(
        0
      )}), so any extra optimization from strategy choice really matters.`
    );
  } else if (totalMinPayments > 0) {
    rationale.push(
      `You’re paying well above the minimums, which is great — it gives your chosen strategy plenty of power.`
    );
  }

  const summary = `Based on your balances, APRs and budget, I’d lean toward ${getStrategyLabel(
    recommended
  )} for you.`;

  return { recommended, summary, rationale };
}

// ------------------------------------------------------
// COMPONENT
// ------------------------------------------------------
export default function Home() {
  const [debts, setDebts] = useState<Debt[]>([
    { id: 1, name: "Card 1", balance: "", apr: "", minPayment: "" },
  ]);

  const [strategy, setStrategy] = useState<Strategy>("warrior");
  const [hoveredStrategy, setHoveredStrategy] = useState<Strategy | null>(null);
  const [monthlyBudget, setMonthlyBudget] = useState<number>(500);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<Recommendation | null>(
    null
  );
  const [showSchedule, setShowSchedule] = useState<boolean>(false);

  // numeric snapshot for UI stuff (progress bar, etc.)
  const numericDebts = debts.map(toNumericDebt);
  const totalDebt = numericDebts.reduce((sum, d) => sum + d.balance, 0);
  const maxDebtForBar = 20000; // visualization cap
  const debtPercent =
    totalDebt > 0 ? Math.min((totalDebt / maxDebtForBar) * 100, 100) : 0;

  // ----------------------------------------------------
  // handlers
  // ----------------------------------------------------
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
              [field]: value,
            }
          : d
      )
    );
  };

  const addCard = () => {
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

  const deleteCard = (id: number) => {
    setDebts((prev) => prev.filter((d) => d.id !== id));
  };

  const generatePlan = () => {
    const output = calculatePlan(debts, strategy, monthlyBudget);

    if ("error" in output) {
      setError(output.error);
      setResult(null);
      setRecommendation(null);
      setShowSchedule(false);
      return;
    }

    setError(null);
    setResult(output);
    setShowSchedule(false); // collapse details when regenerating

    const warriorOut = calculatePlan(debts, "warrior", monthlyBudget);
    const rebelOut = calculatePlan(debts, "rebel", monthlyBudget);
    const wizardOut = calculatePlan(debts, "wizard", monthlyBudget);

    if (
      "error" in warriorOut ||
      "error" in rebelOut ||
      "error" in wizardOut
    ) {
      setRecommendation(null);
      return;
    }

    const rec = buildRecommendation(
      debts,
      monthlyBudget,
      warriorOut,
      rebelOut,
      wizardOut
    );
    setRecommendation(rec);
  };

  // ------------------------------------------------------
  // RENDER
  // ------------------------------------------------------
  return (
    <div
      style={{
        maxWidth: "900px",
        margin: "0 auto",
        padding: "40px 20px",
        color: "white",
        fontFamily: "sans-serif",
      }}
    >
      <h1 style={{ textAlign: "center", marginBottom: "8px" }}>DebtBeat</h1>
      <p style={{ textAlign: "center", marginBottom: "32px" }}>
        Add your credit cards, choose a strategy, and estimate your path to
        being debt free.
      </p>

      {/* ---------------------- CARDS ---------------------- */}
      <h2 style={{ fontSize: "20px", marginBottom: "16px" }}>Your Cards</h2>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "2fr 1.5fr 1.5fr 1.5fr 60px",
          gap: "8px",
          marginBottom: "16px",
          color: "#aaa",
          fontSize: "14px",
        }}
      >
        <span>Name</span>
        <span>Balance ($)</span>
        <span>APR (%)</span>
        <span>Min Payment ($)</span>
        <span></span>
      </div>

      {debts.map((d) => (
        <div
          key={d.id}
          style={{
            display: "grid",
            gridTemplateColumns: "2fr 1.5fr 1.5fr 1.5fr 60px",
            gap: "8px",
            marginBottom: "12px",
          }}
        >
          <input
            value={d.name}
            onChange={(e) => handleDebtChange(d.id, "name", e.target.value)}
            style={{
              padding: "10px",
              background: "#18181b",
              color: "white",
              border: "1px solid #333",
              borderRadius: "6px",
            }}
          />

          <input
            inputMode="decimal"
            value={d.balance}
            placeholder="0"
            onChange={(e) =>
              handleDebtChange(d.id, "balance", e.target.value)
            }
            style={{
              padding: "10px",
              background: "#18181b",
              color: "white",
              border: "1px solid #333",
              borderRadius: "6px",
            }}
          />

          <input
            inputMode="decimal"
            value={d.apr}
            placeholder="0"
            onChange={(e) => handleDebtChange(d.id, "apr", e.target.value)}
            style={{
              padding: "10px",
              background: "#18181b",
              color: "white",
              border: "1px solid #333",
              borderRadius: "6px",
            }}
          />

          <input
            inputMode="decimal"
            value={d.minPayment}
            placeholder="0"
            onChange={(e) =>
              handleDebtChange(d.id, "minPayment", e.target.value)
            }
            style={{
              padding: "10px",
              background: "#18181b",
              color: "white",
              border: "1px solid #333",
              borderRadius: "6px",
            }}
          />

          <button
            onClick={() => deleteCard(d.id)}
            style={{
              background: "#7f1d1d",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>
      ))}

      <button
        onClick={addCard}
        style={{
          color: "#4ade80",
          border: "1px dashed #4ade80",
          padding: "10px 16px",
          borderRadius: "8px",
          cursor: "pointer",
          marginBottom: "16px",
          background: "transparent",
        }}
      >
        + Add Card
      </button>

      {/* TOTAL REMAINING DEBT PROGRESS BAR */}
      <div style={{ marginBottom: "32px" }}>
        <div
          style={{
            fontSize: "14px",
            marginBottom: "4px",
            color: "#e5e7eb",
          }}
        >
          Total remaining debt: ${totalDebt.toFixed(2)}
        </div>
        <div
          style={{
            position: "relative",
            height: "10px",
            borderRadius: "999px",
            background: "#020617",
            overflow: "hidden",
            border: "1px solid #1f2937",
          }}
        >
          <div
            style={{
              width: `${debtPercent}%`,
              height: "100%",
              background:
                "linear-gradient(90deg,#4ade80,#22c55e,#16a34a)",
              transition: "width 200ms ease-out",
            }}
          />
        </div>
        <div
          style={{
            fontSize: "11px",
            color: "#9ca3af",
            marginTop: "4px",
          }}
        >
          Bar caps at ${maxDebtForBar.toLocaleString()} for visualization.
        </div>
      </div>

      {/* ------------- STRATEGY & BUDGET ------------- */}
      <h2 style={{ fontSize: "20px", marginBottom: "16px" }}>
        Strategy & Budget
      </h2>

      <div style={{ marginBottom: "16px" }}>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "12px" }}>
          {(["warrior", "rebel", "wizard"] as Strategy[]).map((option) => {
            const isActive = strategy === option;
            const isHovered = hoveredStrategy === option;
            const isRecommended =
              recommendation &&
              recommendation.recommended === option;

            return (
              <button
                key={option}
                type="button"
                title={getStrategyTooltip(option)}
                onClick={() => setStrategy(option)}
                onMouseEnter={() => setHoveredStrategy(option)}
                onMouseLeave={() => setHoveredStrategy(null)}
                style={{
                  borderRadius: "999px",
                  padding: "14px 26px",
                  backgroundColor: isActive ? "#4ade80" : "#18181b",
                  color: isActive ? "#0f172a" : "#e5e7eb",
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  cursor: "pointer",
                  fontSize: "18px",
                  fontWeight: 600,
                  border: isActive
                    ? "2px solid #4ade80"
                    : isRecommended
                    ? "1px solid #22c55e"
                    : "1px solid #27272f",
                  boxShadow: isActive
                    ? "0 0 0 1px rgba(34,197,94,0.2), 0 12px 30px rgba(15,23,42,0.8)"
                    : "0 6px 18px rgba(0,0,0,0.4)",
                  transition:
                    "background-color 150ms ease-out, color 150ms ease-out, transform 120ms ease-out, box-shadow 150ms ease-out, border 150ms ease-out",
                  transform:
                    isActive || isHovered
                      ? "translateY(-2px) scale(1.02)"
                      : "translateY(0) scale(1)",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    fontSize: "22px",
                    transition: "transform 150ms ease-out",
                    transform:
                      isActive || isHovered
                        ? "translateY(-2px) scale(1.2)"
                        : "translateY(0) scale(1)",
                  }}
                >
                  {getStrategyEmoji(option)}
                </span>

                <span>{getStrategyLabel(option)}</span>

                {isRecommended && !isActive && (
                  <span
                    style={{
                      marginLeft: "4px",
                      fontSize: "11px",
                      padding: "2px 8px",
                      borderRadius: "999px",
                      background: "rgba(34,197,94,0.1)",
                      color: "#bbf7d0",
                      border: "1px solid rgba(34,197,94,0.4)",
                    }}
                  >
                    Recommended
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      <label style={{ display: "block", marginBottom: "8px" }}>
        Total monthly budget for debt payoff ($):
      </label>
      <input
        inputMode="decimal"
        value={monthlyBudget || ""}
        placeholder="500"
        onChange={(e) => setMonthlyBudget(Number(e.target.value) || 0)}
        style={{
          padding: "14px",
          width: "250px",
          background: "#18181b",
          color: "white",
          border: "1px solid #333",
          borderRadius: "8px",
          marginBottom: "22px",
        }}
      />

      <button
        onClick={generatePlan}
        style={{
          padding: "16px 28px",
          background: "#16a34a",
          color: "#f9fafb",
          fontWeight: "bold",
          fontSize: "18px",
          borderRadius: "10px",
          cursor: "pointer",
          border: "none",
          boxShadow: "0 6px 18px rgba(0,0,0,0.35)",
        }}
      >
        Generate Plan
      </button>

      {/* RESULTS SUMMARY */}
      {error && (
        <p style={{ color: "#f87171", marginTop: "20px" }}>{error}</p>
      )}

      {result && (
        <div style={{ marginTop: "32px" }}>
          <h3>
            🔥 With {getStrategyLabel(result.strategyUsed)}, you could be debt
            free in {result.months} months (~
            {(result.months / 12).toFixed(1)} years). Total interest paid: $
            {result.totalInterest.toFixed(2)}
          </h3>

          {/* COLLAPSIBLE PAYOFF SCHEDULE */}
          <div style={{ marginTop: "16px" }}>
            <button
              onClick={() => setShowSchedule((prev) => !prev)}
              style={{
                padding: "8px 14px",
                fontSize: "14px",
                borderRadius: "999px",
                border: "1px solid #4b5563",
                background: "#020617",
                color: "#e5e7eb",
                cursor: "pointer",
              }}
            >
              {showSchedule
                ? "Hide detailed payoff schedule"
                : "Show detailed payoff schedule"}
            </button>

            {showSchedule && (
              <div
                style={{
                  marginTop: "12px",
                  maxHeight: "280px",
                  overflowY: "auto",
                  borderRadius: "8px",
                  border: "1px solid #1f2933",
                  background: "#020617",
                }}
              >
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "13px",
                  }}
                >
                  <thead>
                    <tr
                      style={{
                        background: "#0b1120",
                        position: "sticky",
                        top: 0,
                      }}
                    >
                      <th
                        style={{
                          textAlign: "left",
                          padding: "8px",
                          borderBottom: "1px solid #1f2937",
                        }}
                      >
                        Month
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: "8px",
                          borderBottom: "1px solid #1f2937",
                        }}
                      >
                        End Balance ($)
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: "8px",
                          borderBottom: "1px solid #1f2937",
                        }}
                      >
                        Interest Paid ($)
                      </th>
                      <th
                        style={{
                          textAlign: "right",
                          padding: "8px",
                          borderBottom: "1px solid #1f2937",
                        }}
                      >
                        Principal Paid ($)
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.schedule.map((row) => (
                      <tr key={row.month}>
                        <td
                          style={{
                            padding: "6px 8px",
                            borderBottom: "1px solid #111827",
                          }}
                        >
                          {row.month}
                        </td>
                        <td
                          style={{
                            padding: "6px 8px",
                            textAlign: "right",
                            borderBottom: "1px solid #111827",
                          }}
                        >
                          {row.totalBalanceEnd.toFixed(2)}
                        </td>
                        <td
                          style={{
                            padding: "6px 8px",
                            textAlign: "right",
                            borderBottom: "1px solid #111827",
                          }}
                        >
                          {row.interestPaid.toFixed(2)}
                        </td>
                        <td
                          style={{
                            padding: "6px 8px",
                            textAlign: "right",
                            borderBottom: "1px solid #111827",
                          }}
                        >
                          {row.principalPaid.toFixed(2)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* RECOMMENDATION MODE */}
      {recommendation && (
        <div
          style={{
            marginTop: "24px",
            padding: "18px 20px",
            borderRadius: "12px",
            background: "#020617",
            border: "1px solid #1e293b",
          }}
        >
          <h3 style={{ marginBottom: "8px" }}>🤖 Recommendation Mode</h3>
          <p style={{ marginBottom: "8px" }}>{recommendation.summary}</p>
          <ul style={{ paddingLeft: "20px", marginBottom: "8px" }}>
            {recommendation.rationale.map((line, i) => (
              <li key={i} style={{ marginBottom: "4px" }}>
                {line}
              </li>
            ))}
          </ul>
          {strategy !== recommendation.recommended && (
            <p style={{ fontSize: "14px", color: "#9ca3af" }}>
              You’re currently using{" "}
              <strong>{getStrategyLabel(strategy)}</strong>. You can click{" "}
              <strong>{getStrategyLabel(recommendation.recommended)}</strong>{" "}
              above and hit <em>Generate Plan</em> again to see how it
              compares.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
