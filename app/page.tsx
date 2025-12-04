"use client";

import React, { useEffect, useMemo, useState } from "react";

// ---------- Types ----------
type Strategy = "warrior" | "rebel" | "wizard";

type Debt = {
  id: number;
  name: string;
  balance: number;
  apr: number; // percent
  minPayment: number;
};

type ScheduleRow = {
  month: number;
  totalBalanceEnd: number;
  interestPaid: number;
  principalPaid: number;
};

type PlanResult =
  | {
      ok: true;
      months: number;
      totalInterest: number;
      strategyUsed: Strategy;
      schedule: ScheduleRow[];
    }
  | {
      ok: false;
      error: string;
    };

// ---------- Helpers ----------

function formatMoney(n: number): string {
  if (!isFinite(n)) return "$0";
  return `$${n.toLocaleString(undefined, {
    maximumFractionDigits: 2,
    minimumFractionDigits: 2,
  })}`;
}

function calcMonthlyRate(apr: number): number {
  return apr <= 0 ? 0 : apr / 100 / 12;
}

function allPaidOff(debts: Debt[]): boolean {
  return debts.every((d) => d.balance <= 0.01);
}

function cloneDebts(debts: Debt[]): Debt[] {
  return debts.map((d) => ({ ...d }));
}

// Basic payoff engine
function calculatePlan(
  debtsInput: Debt[],
  strategy: Strategy,
  monthlyBudget: number
): PlanResult {
  const maxMonths = 600; // 50 years
  if (debtsInput.length === 0) {
    return { ok: false, error: "Add at least one card to see a plan." };
  }

  const debts = cloneDebts(debtsInput).filter((d) => d.balance > 0);
  if (debts.length === 0) {
    return { ok: false, error: "All your card balances are zero." };
  }

  const minTotal = debts.reduce((sum, d) => sum + d.minPayment, 0);
  if (monthlyBudget < minTotal - 0.01) {
    return {
      ok: false,
      error: `Your budget (${formatMoney(
        monthlyBudget
      )}) is less than your total minimum payments (${formatMoney(
        minTotal
      )}). Increase your budget.`,
    };
  }

  let months = 0;
  let totalInterest = 0;
  const schedule: ScheduleRow[] = [];

  while (!allPaidOff(debts) && months < maxMonths) {
    months += 1;

    // Choose ordering based on strategy
    const ordered = [...debts].sort((a, b) => {
      if (strategy === "warrior") {
        return a.balance - b.balance; // smallest balance first
      }
      if (strategy === "rebel") {
        return b.apr - a.apr; // highest APR first
      }
      // wizard – gentle hybrid: sort by APR, then balance
      const aprDiff = b.apr - a.apr;
      if (Math.abs(aprDiff) > 0.5) return aprDiff;
      return a.balance - b.balance;
    });

    let remainingBudget = monthlyBudget;
    let monthInterest = 0;
    let monthPrincipal = 0;

    // First, pay minimums
    for (const d of ordered) {
      if (d.balance <= 0) continue;
      const rate = calcMonthlyRate(d.apr);
      const interest = d.balance * rate;
      const min = Math.min(d.minPayment, d.balance + interest);

      if (remainingBudget < min - 0.01) {
        // budget too low — debt grows forever
        return {
          ok: false,
          error:
            "At this budget, your debt would grow or never be paid off. Increase your monthly budget.",
        };
      }

      const applied = Math.min(min, remainingBudget);
      const principal = applied - interest;

      d.balance = Math.max(d.balance - principal, 0);
      remainingBudget -= applied;
      monthInterest += interest;
      monthPrincipal += principal;
    }

    // Then throw all remaining budget at the highest-priority debt
    for (const d of ordered) {
      if (remainingBudget <= 0.01) break;
      if (d.balance <= 0) continue;

      const rate = calcMonthlyRate(d.apr);
      const interest = d.balance * rate;
      const payoffNeeded = d.balance + interest;

      const applied = Math.min(payoffNeeded, remainingBudget);
      const principal = applied - interest;

      d.balance = Math.max(d.balance - principal, 0);
      remainingBudget -= applied;
      monthInterest += interest;
      monthPrincipal += principal;
      break; // only top-priority card gets snowball/avalanche extra
    }

    const totalBalanceEnd = debts.reduce((sum, d) => sum + d.balance, 0);
    totalInterest += monthInterest;

    schedule.push({
      month: months,
      totalBalanceEnd,
      interestPaid: monthInterest,
      principalPaid: monthPrincipal,
    });

    if (months >= maxMonths) {
      return {
        ok: false,
        error:
          "At this payment level it would take more than 50 years to become debt free. Increase your budget.",
      };
    }
  }

  return {
    ok: true,
    months,
    totalInterest,
    strategyUsed: strategy,
    schedule,
  };
}

// Super simple "AI-ish" recommendation
function pickRecommendedStrategy(
  debts: Debt[],
  monthlyBudget: number
): { strategy: Strategy; reason: string } {
  if (debts.length === 0) {
    return {
      strategy: "warrior",
      reason: "Add your cards first, then we’ll help you choose a strategy.",
    };
  }

  const highestApr = Math.max(...debts.map((d) => d.apr));
  const smallestBalance = Math.min(...debts.map((d) => d.balance));
  const totalBalance = debts.reduce((s, d) => s + d.balance, 0);
  const payoffRatio = monthlyBudget / (totalBalance || 1);

  // Very high APR anywhere? blast interest first
  if (highestApr >= 24) {
    return {
      strategy: "rebel",
      reason:
        "One of your cards has a very high APR. The Rebel focuses on killing expensive interest first.",
    };
  }

  // Lots of small debts & decent payoff ratio? snowball wins motivation
  if (smallestBalance < 1500 && payoffRatio >= 0.03) {
    return {
      strategy: "warrior",
      reason:
        "You have some smaller balances and a solid budget. The Warrior snowballs wins quickly for motivation.",
    };
  }

  // Otherwise, balanced hybrid
  return {
    strategy: "wizard",
    reason:
      "Your debts are more balanced. The Wizard blends interest savings with steady psychological wins.",
  };
}

// ---------- Component ----------

export default function Home() {
  const [debts, setDebts] = useState<Debt[]>([
    { id: 1, name: "Card 1", balance: 0, apr: 0, minPayment: 0 },
  ]);

  const [strategy, setStrategy] = useState<Strategy>("warrior");
  const [monthlyBudget, setMonthlyBudget] = useState<number>(500);
  const [result, setResult] = useState<PlanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recommendation, setRecommendation] = useState<string | null>(null);
  const [hoveredStrategy, setHoveredStrategy] = useState<Strategy | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);

  // --- Local storage for cards & budget ---
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const stored = window.localStorage.getItem("debtbeat_state_v1");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.debts) setDebts(parsed.debts);
        if (parsed.monthlyBudget) setMonthlyBudget(parsed.monthlyBudget);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(
        "debtbeat_state_v1",
        JSON.stringify({ debts, monthlyBudget })
      );
    } catch {
      // ignore
    }
  }, [debts, monthlyBudget]);

  // --- Derived values ---
  const totalRemainingDebt = useMemo(
    () => debts.reduce((sum, d) => sum + (d.balance || 0), 0),
    [debts]
  );
  const progressCap = 20000;
  const debtProgress =
    totalRemainingDebt <= 0
      ? 0
      : Math.min(totalRemainingDebt / progressCap, 1);

  // --- Handlers ---
  const addDebt = () => {
    const nextId = debts.length ? Math.max(...debts.map((d) => d.id)) + 1 : 1;
    setDebts((prev) => [
      ...prev,
      { id: nextId, name: `Card ${nextId}`, balance: 0, apr: 0, minPayment: 0 },
    ]);
  };

  const removeDebt = (id: number) => {
    setDebts((prev) => prev.filter((d) => d.id !== id));
  };

  const handleDebtChange = (
    id: number,
    field: keyof Omit<Debt, "id">,
    value: string
  ) => {
    setDebts((prev) =>
      prev.map((d) => {
        if (d.id !== id) return d;
        if (field === "name") return { ...d, name: value };
        const num = value === "" ? 0 : Number.parseFloat(value);
        return {
          ...d,
          [field]: Number.isNaN(num) ? 0 : num,
        };
      })
    );
  };

  const handleGenerate = () => {
    setError(null);
    setResult(null);
    setRecommendation(null);
    const plan = calculatePlan(debts, strategy, monthlyBudget);
    if (!plan.ok) {
      setError(plan.error);
      setResult(plan);
      return;
    }
    setResult(plan);
  };

  const handleRecommend = () => {
    const rec = pickRecommendedStrategy(debts, monthlyBudget);
    setStrategy(rec.strategy);
    setRecommendation(rec.reason);

    // Also immediately recalc
    const plan = calculatePlan(debts, rec.strategy, monthlyBudget);
    setResult(plan);
    if (!plan.ok) {
      setError(plan.error);
    } else {
      setError(null);
    }
  };

  // --- Small validation helper for highlighting fields ---
  const fieldHasError = (d: Debt, field: keyof Omit<Debt, "id">): boolean => {
    if (field === "name") return d.name.trim() === "";
    if (field === "balance") return d.balance <= 0;
    if (field === "apr") return d.apr < 0;
    if (field === "minPayment") return d.minPayment < 0;
    return false;
  };

  const monthsToYears = (months: number) => months / 12;

  // ---------- Render ----------

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#050505",
        color: "white",
        padding: "24px 16px 40px",
        fontFamily: "-apple-system, system-ui, sans-serif",
        maxWidth: "820px",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <header
        style={{
          textAlign: "center",
          marginBottom: "24px",
        }}
      >
        <h1
          style={{
            fontSize: "32px",
            fontWeight: 800,
            marginBottom: "12px",
          }}
        >
          DebtBeat
        </h1>
        <p
          style={{
            color: "#bbb",
            fontSize: "15px",
            lineHeight: 1.4,
          }}
        >
          Add your credit cards, choose a strategy, and estimate your path to
          being debt free.
        </p>
      </header>

      {/* Cards section */}
      <section
        style={{
          background: "#090909",
          padding: "16px",
          borderRadius: "16px",
          border: "1px solid #222",
          marginBottom: "20px",
        }}
      >
        <h2
          style={{
            fontSize: "20px",
            marginBottom: "12px",
          }}
        >
          Your Cards
        </h2>

        {/* Total debt + progress */}
        <div style={{ marginBottom: "14px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: "6px",
              fontSize: "14px",
            }}
          >
            <span>Total remaining debt:</span>
            <strong>{formatMoney(totalRemainingDebt)}</strong>
          </div>
          <div
            style={{
              position: "relative",
              height: "8px",
              borderRadius: "999px",
              overflow: "hidden",
              background: "#151515",
            }}
          >
            <div
              style={{
                width: `${debtProgress * 100}%`,
                height: "100%",
                background:
                  debtProgress < 0.5
                    ? "linear-gradient(90deg,#4ade80,#22c55e)"
                    : "linear-gradient(90deg,#f97316,#ef4444)",
                transition: "width 0.3s ease-out",
              }}
            />
          </div>
          <div
            style={{
              fontSize: "11px",
              marginTop: "4px",
              color: "#777",
            }}
          >
            Bar caps at {formatMoney(progressCap)} for visualization.
          </div>
        </div>

        {/* Card forms */}
        <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
          {debts.map((d) => (
            <div
              key={d.id}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                padding: "12px",
                borderRadius: "12px",
                background: "#101010",
                border: "1px solid #262626",
              }}
            >
              {/* Name */}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    color: "#999",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Name
                </label>
                <input
                  type="text"
                  value={d.name}
                  onChange={(e) =>
                    handleDebtChange(d.id, "name", e.target.value)
                  }
                  placeholder="Card name"
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: fieldHasError(d, "name")
                      ? "1px solid #ef4444"
                      : "1px solid #333",
                    background: "#181818",
                    color: "white",
                    fontSize: "14px",
                  }}
                />
              </div>

              {/* Balance */}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    color: "#999",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Balance ($)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={d.balance === 0 ? "" : d.balance}
                  onChange={(e) =>
                    handleDebtChange(d.id, "balance", e.target.value)
                  }
                  placeholder="0.00"
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: fieldHasError(d, "balance")
                      ? "1px solid #ef4444"
                      : "1px solid #333",
                    background: "#181818",
                    color: "white",
                    fontSize: "14px",
                  }}
                />
              </div>

              {/* APR */}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    color: "#999",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  APR (%)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={d.apr === 0 ? "" : d.apr}
                  onChange={(e) =>
                    handleDebtChange(d.id, "apr", e.target.value)
                  }
                  placeholder="e.g. 24.99"
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: fieldHasError(d, "apr")
                      ? "1px solid #ef4444"
                      : "1px solid #333",
                    background: "#181818",
                    color: "white",
                    fontSize: "14px",
                  }}
                />
              </div>

              {/* Min payment */}
              <div>
                <label
                  style={{
                    fontSize: "12px",
                    color: "#999",
                    display: "block",
                    marginBottom: "4px",
                  }}
                >
                  Min payment ($)
                </label>
                <input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  value={d.minPayment === 0 ? "" : d.minPayment}
                  onChange={(e) =>
                    handleDebtChange(d.id, "minPayment", e.target.value)
                  }
                  placeholder="0.00"
                  style={{
                    width: "100%",
                    padding: "10px",
                    borderRadius: "8px",
                    border: fieldHasError(d, "minPayment")
                      ? "1px solid #ef4444"
                      : "1px solid #333",
                    background: "#181818",
                    color: "white",
                    fontSize: "14px",
                  }}
                />
              </div>

              {/* Delete button */}
              {debts.length > 1 && (
                <button
                  onClick={() => removeDebt(d.id)}
                  style={{
                    alignSelf: "flex-end",
                    marginTop: "2px",
                    padding: "6px 10px",
                    borderRadius: "999px",
                    border: "none",
                    background: "#3f1d1d",
                    color: "#fca5a5",
                    fontSize: "12px",
                  }}
                >
                  Remove card
                </button>
              )}
            </div>
          ))}
        </div>

        {/* Add card button */}
        <button
          onClick={addDebt}
          style={{
            marginTop: "12px",
            padding: "10px 14px",
            borderRadius: "10px",
            border: "1px dashed #4ade80",
            background: "transparent",
            color: "#4ade80",
            fontSize: "14px",
          }}
        >
          + Add Card
        </button>
      </section>

      {/* Strategy & Budget */}
      <section
        style={{
          background: "#090909",
          padding: "16px",
          borderRadius: "16px",
          border: "1px solid #222",
          marginBottom: "20px",
        }}
      >
        <h2
          style={{
            fontSize: "20px",
            marginBottom: "12px",
          }}
        >
          Strategy &amp; Budget
        </h2>

        {/* Strategy pill buttons */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "10px",
            marginBottom: "14px",
          }}
        >
          {(
            [
              { key: "warrior", label: "The Warrior", icon: "⚔️" },
              { key: "rebel", label: "The Rebel", icon: "🧨" },
              { key: "wizard", label: "The Wizard", icon: "🧙‍♂️" },
            ] as { key: Strategy; label: string; icon: string }[]
          ).map((opt) => {
            const active = strategy === opt.key;
            const hovered = hoveredStrategy === opt.key;
            return (
              <button
                key={opt.key}
                onClick={() => setStrategy(opt.key)}
                onMouseEnter={() => setHoveredStrategy(opt.key)}
                onMouseLeave={() => setHoveredStrategy(null)}
                style={{
                  flex: "1 1 30%",
                  minWidth: "0",
                  padding: "10px 14px",
                  borderRadius: "999px",
                  border: active ? "1px solid #4ade80" : "1px solid #333",
                  background: active ? "#22c55e" : "#141414",
                  color: active ? "#052e16" : "#e5e5e5",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: "8px",
                  fontSize: "14px",
                  fontWeight: 600,
                  transform: hovered ? "translateY(-2px) scale(1.02)" : "none",
                  boxShadow: active
                    ? "0 0 0 1px #22c55e, 0 12px 30px rgba(34,197,94,0.35)"
                    : "none",
                  transition:
                    "background 0.15s ease, transform 0.15s ease, box-shadow 0.15s ease",
                }}
              >
                <span
                  style={{
                    display: "inline-block",
                    animation:
                      active && hovered ? "pulse-icon 0.8s infinite" : "none",
                  }}
                >
                  {opt.icon}
                </span>
                <span>{opt.label}</span>
              </button>
            );
          })}
        </div>

        {/* Simple explanation */}
        <p style={{ fontSize: "12px", color: "#9ca3af", marginBottom: "10px" }}>
          ⚔️ <b>Warrior</b>: smallest balances first (motivation).{" "}
          <br />
          🧨 <b>Rebel</b>: highest APR first (interest savings).{" "}
          <br />
          🧙‍♂️ <b>Wizard</b>: smart blend of both.
        </p>

        {/* Recommendation button */}
        <button
          onClick={handleRecommend}
          style={{
            marginTop: "4px",
            marginBottom: "10px",
            padding: "8px 10px",
            borderRadius: "999px",
            border: "1px solid #38bdf8",
            background: "rgba(8,47,73,0.8)",
            color: "#e0f2fe",
            fontSize: "12px",
          }}
        >
          💡 Let DebtBeat recommend a strategy
        </button>

        {recommendation && (
          <p
            style={{
              fontSize: "12px",
              color: "#e5e7eb",
              background: "#111827",
              padding: "8px 10px",
              borderRadius: "8px",
              marginBottom: "10px",
            }}
          >
            <b>Recommendation:</b> {recommendation}
          </p>
        )}

        {/* Budget */}
        <div style={{ marginTop: "8px" }}>
          <label
            style={{
              fontSize: "14px",
              marginBottom: "6px",
              display: "block",
            }}
          >
            Total monthly budget for debt payoff ($):
          </label>
          <input
            type="number"
            inputMode="decimal"
            step="0.01"
            value={monthlyBudget}
            onChange={(e) => {
              const v = e.target.value === "" ? 0 : Number.parseFloat(e.target.value);
              setMonthlyBudget(Number.isNaN(v) ? 0 : v);
            }}
            style={{
              width: "100%",
              maxWidth: "260px",
              padding: "10px",
              borderRadius: "10px",
              border: "1px solid #333",
              background: "#181818",
              color: "white",
              fontSize: "15px",
            }}
          />
        </div>

        {/* Generate plan button */}
        <button
          onClick={handleGenerate}
          style={{
            marginTop: "16px",
            padding: "12px 18px",
            borderRadius: "999px",
            border: "none",
            background:
              "linear-gradient(120deg, #22c55e, #16a34a, #22c55e)",
            backgroundSize: "200% 200%",
            color: "#022c22",
            fontSize: "15px",
            fontWeight: 700,
            boxShadow: "0 12px 30px rgba(34,197,94,0.5)",
          }}
        >
          Generate Plan
        </button>

        {error && (
          <p
            style={{
              marginTop: "12px",
              fontSize: "13px",
              color: "#fecaca",
              background: "#450a0a",
              padding: "8px 10px",
              borderRadius: "8px",
            }}
          >
            ⚠️ {error}
          </p>
        )}
      </section>

      {/* Results */}
      {result && result.ok && (
        <section
          style={{
            background: "#090909",
            padding: "16px",
            borderRadius: "16px",
            border: "1px solid #222",
            marginBottom: "16px",
          }}
        >
          <h2
            style={{
              fontSize: "20px",
              marginBottom: "10px",
            }}
          >
            Plan Summary
          </h2>
          <p style={{ fontSize: "14px", marginBottom: "4px" }}>
            🔥 With{" "}
            <b>
              {strategy === "warrior"
                ? "The Warrior"
                : strategy === "rebel"
                ? "The Rebel"
                : "The Wizard"}
            </b>{" "}
            strategy, you could be debt free in{" "}
            <b>{result.months}</b> months (
            <b>{monthsToYears(result.months).toFixed(1)} years</b>).
          </p>
          <p style={{ fontSize: "14px" }}>
            Estimated total interest paid:{" "}
            <b>{formatMoney(result.totalInterest)}</b>.
          </p>

          {/* Toggle schedule */}
          <button
            onClick={() => setShowSchedule((s) => !s)}
            style={{
              marginTop: "10px",
              fontSize: "12px",
              padding: "6px 10px",
              borderRadius: "999px",
              border: "1px solid #374151",
              background: "#111827",
              color: "#e5e7eb",
            }}
          >
            {showSchedule ? "Hide" : "Show"} payoff schedule (first 24 months)
          </button>

          {showSchedule && (
            <div
              style={{
                marginTop: "10px",
                maxHeight: "260px",
                overflow: "auto",
                borderRadius: "8px",
                border: "1px solid #1f2937",
              }}
            >
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "12px",
                }}
              >
                <thead>
                  <tr
                    style={{
                      background: "#111827",
                      position: "sticky",
                      top: 0,
                    }}
                  >
                    <th
                      style={{
                        textAlign: "left",
                        padding: "6px 8px",
                        borderBottom: "1px solid #1f2937",
                      }}
                    >
                      Month
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "6px 8px",
                        borderBottom: "1px solid #1f2937",
                      }}
                    >
                      Balance
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "6px 8px",
                        borderBottom: "1px solid #1f2937",
                      }}
                    >
                      Interest
                    </th>
                    <th
                      style={{
                        textAlign: "right",
                        padding: "6px 8px",
                        borderBottom: "1px solid #1f2937",
                      }}
                    >
                      Principal
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.schedule.slice(0, 24).map((row) => (
                    <tr
                      key={row.month}
                      style={{
                        background: row.month % 2 === 0 ? "#020617" : "#030712",
                      }}
                    >
                      <td style={{ padding: "6px 8px" }}>{row.month}</td>
                      <td
                        style={{
                          padding: "6px 8px",
                          textAlign: "right",
                        }}
                      >
                        {formatMoney(row.totalBalanceEnd)}
                      </td>
                      <td
                        style={{
                          padding: "6px 8px",
                          textAlign: "right",
                        }}
                      >
                        {formatMoney(row.interestPaid)}
                      </td>
                      <td
                        style={{
                          padding: "6px 8px",
                          textAlign: "right",
                        }}
                      >
                        {formatMoney(row.principalPaid)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {/* Footer disclaimer */}
      <footer
        style={{
          fontSize: "11px",
          color: "#6b7280",
          marginTop: "12px",
          textAlign: "center",
        }}
      >
        This is an educational planner only. It does not move money or provide
        financial advice.
      </footer>
    </div>
  );
}
