"use client";

import React, { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

// ----------------------------------------------------
// Types
// ----------------------------------------------------

type Strategy = "warrior" | "rebel" | "wizard";

type EditableDebt = {
  id: number;
  name: string;
  balance: string; // as typed by user
  apr: string; // %
  minPayment: string;
};

type Debt = {
  id: number;
  name: string;
  balance: number;
  apr: number;
  minPayment: number;
};

type MonthlyDebtPayment = {
  debtId: number;
  name: string;
  balanceStart: number;
  interestCharged: number;
  minPayment: number;
  extraPayment: number;
  totalPayment: number;
  principalPaid: number;
  balanceEnd: number;
};

type ScheduleMonth = {
  monthIndex: number; // 1-based
  totalPayment: number;
  totalInterest: number;
  totalPrincipal: number;
  totalBalanceStart: number;
  totalBalanceEnd: number;
  payments: MonthlyDebtPayment[];
};

type PlanSnapshot = {
  debts: EditableDebt[];
  strategy: Strategy;
  // NOTE: this is actually TOTAL monthly budget now, name kept for backwards compat
  extraPerMonth: string;
};

// ----------------------------------------------------
// Helpers
// ----------------------------------------------------

const STRATEGY_ICONS: Record<Strategy, string> = {
  warrior: "⚔️",
  rebel: "🔥",
  wizard: "🪄",
};

function parseNumber(value: string): number {
  const n = parseFloat((value || "").replace(/,/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function cloneDebts(editableDebts: EditableDebt[]): Debt[] {
  return editableDebts
    .map((d) => ({
      id: d.id,
      name: d.name || `Card ${d.id}`,
      balance: Math.max(0, parseNumber(d.balance)),
      apr: Math.max(0, parseNumber(d.apr)),
      minPayment: Math.max(0, parseNumber(d.minPayment)),
    }))
    .filter((d) => d.balance > 0 && d.minPayment > 0);
}

// Core payoff schedule — semantics MATCH lib/debtPlan
function buildSchedule(
  inputDebts: EditableDebt[],
  strategy: Strategy,
  monthlyBudgetRaw: string
): ScheduleMonth[] {
  const monthlyBudget = Math.max(0, parseNumber(monthlyBudgetRaw));
  const debts = cloneDebts(inputDebts);
  if (debts.length === 0 || monthlyBudget <= 0) return [];

  const baseMinSum = debts.reduce((sum, d) => sum + d.minPayment, 0);
  if (baseMinSum > monthlyBudget + 1e-6) return [];

  const workingDebts: Debt[] = debts.map((d) => ({ ...d }));
  const schedule: ScheduleMonth[] = [];
  const maxMonths = 600;

  for (let month = 1; month <= maxMonths; month++) {
    const activeDebts = workingDebts.filter((d) => d.balance > 0.01);
    if (activeDebts.length === 0) break;

    // 1) Interest + mins this month
    const interestById = new Map<number, number>();
    const minDueById = new Map<number, number>();

    let sumMinDue = 0;
    let totalBalanceStart = 0;

    for (const d of workingDebts) {
      if (d.balance <= 0.01) {
        interestById.set(d.id, 0);
        minDueById.set(d.id, 0);
        continue;
      }

      const monthlyRate = d.apr / 100 / 12;
      const interest = d.balance * monthlyRate;
      const minDue = Math.min(d.minPayment, d.balance + interest);

      interestById.set(d.id, interest);
      minDueById.set(d.id, minDue);

      sumMinDue += minDue;
      totalBalanceStart += d.balance;
    }

    if (sumMinDue > monthlyBudget + 1e-6) {
      break;
    }

    let leftover = Math.max(0, monthlyBudget - sumMinDue);

    // 2) everyone gets their min
    const extraById = new Map<number, number>();
    const totalPaymentById = new Map<number, number>();

    for (const d of workingDebts) {
      const minDue = minDueById.get(d.id) ?? 0;
      extraById.set(d.id, 0);
      totalPaymentById.set(d.id, minDue);
    }

    // 3) allocate leftover using same mapping as lib/debtPlan
    type PriorityItem = {
      id: number;
      balance: number;
      apr: number;
      interest: number;
    };

    const priorityList: PriorityItem[] = workingDebts
      .filter((d) => d.balance > 0.01)
      .map((d) => ({
        id: d.id,
        balance: d.balance,
        apr: d.apr,
        interest: (d.apr / 100 / 12) * d.balance || 0,
      }));

    priorityList.sort((a, b) => {
      switch (strategy) {
        case "warrior":
          // Smallest balance first (snowball / motivation)
          if (a.balance !== b.balance) return a.balance - b.balance;
          return b.apr - a.apr;
        case "rebel":
          // Highest APR first (avalanche / interest savings)
          if (b.apr !== a.apr) return b.apr - a.apr;
          return b.balance - a.balance;
        case "wizard":
          // Interest-optimized: biggest interest cost first
          if (b.interest !== a.interest) return b.interest - a.interest;
          return b.apr - a.apr;
        default:
          return 0;
      }
    });

    while (leftover > 0.01) {
      let allocatedThisPass = 0;

      for (const p of priorityList) {
        if (leftover <= 0.01) break;

        const d = workingDebts.find((wd) => wd.id === p.id);
        if (!d || d.balance <= 0.01) continue;

        const interest = interestById.get(d.id) ?? 0;
        const alreadyPaying = totalPaymentById.get(d.id) ?? 0;
        const maxNeeded = d.balance + interest - alreadyPaying;
        if (maxNeeded <= 0.01) continue;

        const extraForThisDebt = Math.min(maxNeeded, leftover);
        if (extraForThisDebt <= 0.001) continue;

        extraById.set(d.id, (extraById.get(d.id) ?? 0) + extraForThisDebt);
        totalPaymentById.set(d.id, alreadyPaying + extraForThisDebt);

        leftover -= extraForThisDebt;
        allocatedThisPass += extraForThisDebt;
      }

      if (allocatedThisPass <= 0.001) break;
    }

    // 4) finalize month
    let totalPayment = 0;
    let totalInterest = 0;
    let totalPrincipal = 0;
    let totalBalanceEnd = 0;
    const payments: MonthlyDebtPayment[] = [];

    for (const d of workingDebts) {
      const startBal = d.balance;
      const interest = interestById.get(d.id) ?? 0;
      const minPayment = minDueById.get(d.id) ?? 0;
      const extraPayment = extraById.get(d.id) ?? 0;
      const totalPay = totalPaymentById.get(d.id) ?? 0;

      const principalPaid = Math.max(0, totalPay - interest);
      let newBalance = startBal + interest - totalPay;
      if (newBalance < 0) newBalance = 0;

      d.balance = newBalance;

      totalPayment += totalPay;
      totalInterest += interest;
      totalPrincipal += principalPaid;
      totalBalanceEnd += newBalance;

      payments.push({
        debtId: d.id,
        name: d.name,
        balanceStart: startBal,
        interestCharged: interest,
        minPayment,
        extraPayment,
        totalPayment: totalPay,
        principalPaid,
        balanceEnd: newBalance,
      });
    }

    schedule.push({
      monthIndex: month,
      totalPayment,
      totalInterest,
      totalPrincipal,
      totalBalanceStart,
      totalBalanceEnd,
      payments,
    });

    if (totalBalanceEnd <= 0.01) break;
  }

  return schedule;
}

function getStrategyLabel(strategy: Strategy): string {
  switch (strategy) {
    case "warrior":
      return "Warrior (Smallest Balance First)";
    case "rebel":
      return "Rebel (Highest APR First)";
    case "wizard":
      return "Wizard (Interest-Optimized)";
    default:
      return strategy;
  }
}

function getStrategyShortInstructions(strategy: Strategy): string[] {
  switch (strategy) {
    case "warrior":
      return [
        "Always pay at least the minimum on every card.",
        "Use all extra money to attack the card with the smallest balance.",
        "When that card is gone, roll its old minimum payment into the next smallest balance.",
      ];
    case "rebel":
      return [
        "Always pay at least the minimum on every card.",
        "Use all extra money to attack the card with the highest APR.",
        "When a card is paid off, its old minimum rolls into the next highest-APR card.",
      ];
    case "wizard":
      return [
        "Always pay at least the minimum on every card.",
        "Your extra money is directed to the cards costing you the most interest right now.",
        "This keeps your total interest paid as low as possible over time.",
      ];
    default:
      return [];
  }
}

// ----------------------------------------------------
// Main Component
// ----------------------------------------------------

const initialDebts: EditableDebt[] = [
  { id: 1, name: "Discover", balance: "2500", apr: "23.99", minPayment: "75" },
  { id: 2, name: "Capital One", balance: "1800", apr: "19.99", minPayment: "55" },
  { id: 3, name: "Chase", balance: "3200", apr: "21.49", minPayment: "95" },
];

const STORAGE_KEY = "debtbeat-demo-plan";

export default function DebtPayoffPlannerDemoPage() {
  const [debts, setDebts] = useState<EditableDebt[]>(() => {
    if (typeof window === "undefined") return initialDebts;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return initialDebts;
      const parsed = JSON.parse(raw) as PlanSnapshot;
      return parsed.debts && parsed.debts.length > 0 ? parsed.debts : initialDebts;
    } catch {
      return initialDebts;
    }
  });

  const [strategy, setStrategy] = useState<Strategy>(() => {
    if (typeof window === "undefined") return "warrior";
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return "warrior";
      const parsed = JSON.parse(raw) as PlanSnapshot;
      return parsed.strategy ?? "warrior";
    } catch {
      return "warrior";
    }
  });

  // NOTE: this is TOTAL monthly budget now
  const [extraPerMonth, setExtraPerMonth] = useState<string>(() => {
    if (typeof window === "undefined") return "300";
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return "300";
      const parsed = JSON.parse(raw) as PlanSnapshot;
      return parsed.extraPerMonth ?? "300";
    } catch {
      return "300";
    }
  });

  const schedule = useMemo(
    () => buildSchedule(debts, strategy, extraPerMonth),
    [debts, strategy, extraPerMonth]
  );

  const nextMonth = schedule[0] ?? null;
  const payoffMonths =
    schedule.length > 0 ? schedule[schedule.length - 1].monthIndex : null;

  const totalInterestPaid = schedule.reduce(
    (sum, m) => sum + m.totalInterest,
    0
  );

  const totalBalanceStart =
    schedule.length > 0 ? schedule[0].totalBalanceStart : 0;

  const chartData = schedule.map((m) => ({
    monthLabel: `Month ${m.monthIndex}`,
    totalBalance: Number(m.totalBalanceEnd.toFixed(2)),
  }));

  useEffect(() => {
    if (typeof window === "undefined") return;
    const snapshot: PlanSnapshot = {
      debts,
      strategy,
      extraPerMonth,
    };
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  }, [debts, strategy, extraPerMonth]);

  const handleDebtChange = (
    id: number,
    field: keyof EditableDebt,
    value: string
  ) => {
    setDebts((prev) =>
      prev.map((d) => (d.id === id ? { ...d, [field]: value } : d))
    );
  };

  const handleAddDebt = () => {
    setDebts((prev) => {
      const maxId = prev.reduce((max, d) => Math.max(max, d.id), 0);
      return [
        ...prev,
        {
          id: maxId + 1,
          name: "",
          balance: "",
          apr: "",
          minPayment: "",
        },
      ];
    });
  };

  const handleRemoveDebt = (id: number) => {
    setDebts((prev) => prev.filter((d) => d.id !== id));
  };

  // ----------------------------------------------------
  // Render
  // ----------------------------------------------------

  return (
    <div className="w-full flex justify-center px-4 py-10 text-slate-100">
      <div className="w-full max-w-5xl flex flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col gap-3 text-center items-center">
          <div className="inline-flex items-center gap-2 w-fit rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-200">
            <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
            Demo mode · Try DebtBeat without signing in
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            DebtBeat Payoff Planner
          </h1>

          <p className="max-w-2xl text-sm text-slate-300">
            Enter a few sample cards, choose a strategy, and see a
            month-by-month breakdown of exactly how much to pay toward each card
            using your{" "}
            <span className="font-semibold text-emerald-300">
              total monthly budget for debt payoff
            </span>
            .
          </p>

          <p className="text-xs text-slate-400">
            Ready for the full experience?{" "}
            <Link
              href="/"
              className="font-semibold text-emerald-300 hover:text-emerald-200"
            >
              Go back to the main planner
            </Link>
            .
          </p>
        </header>

        {/* STEP 1: Cards & Budget */}
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Step 1 · Set up your cards & budget
          </p>

          <div className="grid gap-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg md:grid-cols-[2.1fr,1.1fr]">
            {/* Debts table */}
            <div className="overflow-x-auto">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Your Debts
                </h2>
                <button
                  type="button"
                  onClick={handleAddDebt}
                  className="rounded-md border border-slate-600 px-3 py-1 text-xs font-medium text-slate-100 hover:bg-slate-800"
                >
                  + Add Card
                </button>
              </div>

              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Balance</th>
                    <th className="py-2 pr-3">APR %</th>
                    <th className="py-2 pr-3">Min Payment</th>
                    <th className="py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {debts.map((d) => (
                    <tr key={d.id} className="border-b border-slate-800 last:border-0">
                      <td className="py-2 pr-3">
                        <input
                          className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                          value={d.name}
                          placeholder="Card name"
                          onChange={(e) =>
                            handleDebtChange(d.id, "name", e.target.value)
                          }
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                          value={d.balance}
                          placeholder="0"
                          inputMode="decimal"
                          onChange={(e) =>
                            handleDebtChange(d.id, "balance", e.target.value)
                          }
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                          value={d.apr}
                          placeholder="0"
                          inputMode="decimal"
                          onChange={(e) =>
                            handleDebtChange(d.id, "apr", e.target.value)
                          }
                        />
                      </td>
                      <td className="py-2 pr-3">
                        <input
                          className="w-full rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                          value={d.minPayment}
                          placeholder="0"
                          inputMode="decimal"
                          onChange={(e) =>
                            handleDebtChange(d.id, "minPayment", e.target.value)
                          }
                        />
                      </td>
                      <td className="py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveDebt(d.id)}
                          className="text-xs font-medium text-rose-400 hover:text-rose-300"
                        >
                          Remove
                        </button>
                      </td>
                    </tr>
                  ))}
                  {debts.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-4 text-center text-xs text-slate-500"
                      >
                        Add at least one card to get started.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Strategy + budget */}
            <div className="flex flex-col gap-5 border-t border-slate-800 pt-4 md:border-l md:border-t-0 md:pl-4">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Strategy
                </h2>

                {/* Icon-only selector */}
                <div className="mt-3 flex items-center justify-center gap-6">
                  {(["warrior", "rebel", "wizard"] as Strategy[]).map((s) => {
                    const selected = strategy === s;
                    return (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setStrategy(s)}
                        className={`flex h-12 w-12 items-center justify-center rounded-full border text-2xl transition-all ${
                          selected
                            ? "border-emerald-400 bg-emerald-500/10 scale-110 shadow-[0_0_0_1px_rgba(16,185,129,0.4)]"
                            : "border-slate-700 bg-slate-900/80 opacity-60 hover:opacity-90"
                        }`}
                        aria-label={s}
                      >
                        {STRATEGY_ICONS[s]}
                      </button>
                    );
                  })}
                </div>
                <p className="mt-2 text-[11px] text-center text-slate-400">
                  Tap an icon to switch strategies.
                </p>
              </div>

              <div>
                <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Total monthly budget for debt payoff
                </h2>
                <div className="mt-3 flex items-center gap-2">
                  <span className="text-sm text-slate-300">$</span>
                  <input
                    className="w-28 rounded-md border border-slate-700 bg-slate-900 px-2 py-1 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-400 focus:outline-none"
                    value={extraPerMonth}
                    inputMode="decimal"
                    onChange={(e) => setExtraPerMonth(e.target.value)}
                  />
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  This is the total amount you can put toward your credit cards
                  each month, including minimum payments and anything extra.
                </p>
              </div>

              <div className="mt-1 rounded-lg border border-dashed border-slate-700 bg-slate-900/80 p-3 text-xs text-slate-300">
                <p className="mb-1 font-semibold text-slate-100">
                  What this planner is telling you:
                </p>
                <p>
                  Each month, you commit to one{" "}
                  <span className="font-semibold text-emerald-300">
                    total budget
                  </span>{" "}
                  for all your cards. DebtBeat uses that budget to cover your
                  minimums first, then automatically pours every freed-up dollar
                  into extra payments on the highest-priority card.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* STEP 2: Results & chart */}
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Step 2 · See your payoff projection
          </p>

          <div className="grid gap-5 md:grid-cols-[2.1fr,1.1fr]">
            {/* Chart + summary */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
              <div className="mb-4 flex items-center justify-between gap-2">
                <div>
                  <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                    Payoff Projection
                  </h2>
                  <p className="mt-1 text-xs text-slate-300">
                    Total remaining balance over time using{" "}
                    <span className="font-semibold text-emerald-300">
                      {getStrategyLabel(strategy)}
                    </span>
                    .
                  </p>
                </div>
                {payoffMonths && (
                  <div className="text-right text-xs text-slate-300">
                    <div>
                      <span className="font-semibold text-emerald-300">
                        {payoffMonths} month
                        {payoffMonths === 1 ? "" : "s"}
                      </span>{" "}
                      to debt-free
                    </div>
                    <div>
                      Interest paid:{" "}
                      <span className="font-semibold text-emerald-300">
                        ${totalInterestPaid.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="h-64 rounded-xl border border-slate-800 bg-slate-950/60 p-2">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
                      <XAxis
                        dataKey="monthLabel"
                        stroke="#9ca3af"
                        tick={{ fontSize: 11 }}
                      />
                      <YAxis stroke="#9ca3af" tick={{ fontSize: 11 }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#020617",
                          borderColor: "#1e293b",
                          borderRadius: 8,
                          fontSize: 12,
                        }}
                      />
                      <Legend />
                      <Line
                        type="monotone"
                        dataKey="totalBalance"
                        name="Total Balance"
                        stroke="#38bdf8"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex h-full items-center justify-center text-xs text-slate-500">
                    Add debts and a monthly budget to see your payoff projection.
                  </div>
                )}
              </div>
            </div>

            {/* Next payment + strategy explanation */}
            <div className="flex flex-col gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Next Payment Breakdown (This Month)
                </h2>
                {nextMonth ? (
                  <>
                    <p className="mb-3 text-xs text-slate-300">
                      If you follow{" "}
                      <span className="font-semibold text-emerald-300">
                        {getStrategyLabel(strategy)}
                      </span>
                      , here&apos;s exactly what to pay toward each card this
                      month:
                    </p>
                    <ul className="mb-3 space-y-1.5 text-sm">
                      {nextMonth.payments
                        .filter((p) => p.balanceStart > 0.01)
                        .map((p) => (
                          <li
                            key={p.debtId}
                            className="flex items-center justify-between text-slate-100"
                          >
                            <span>{p.name}</span>
                            <span className="font-semibold text-emerald-300">
                              ${p.totalPayment.toFixed(2)}
                            </span>
                          </li>
                        ))}
                    </ul>
                    <div className="flex items-center justify-between border-t border-slate-800 pt-2 text-xs text-slate-300">
                      <span>Total this month</span>
                      <span className="font-semibold text-emerald-300">
                        ${nextMonth.totalPayment.toFixed(2)}
                      </span>
                    </div>
                  </>
                ) : (
                  <p className="text-xs text-slate-500">
                    Once you add at least one card and a positive budget,
                    we&apos;ll show a detailed breakdown of your next payment
                    here.
                  </p>
                )}
              </div>

              <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
                <h2 className="mb-2 text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  What You Should Do Each Month
                </h2>
                <p className="mb-2 text-xs text-slate-300">
                  Based on{" "}
                  <span className="font-semibold text-emerald-300">
                    {getStrategyLabel(strategy)}
                  </span>
                  , here is the game plan in plain language:
                </p>
                <ul className="list-disc space-y-1.5 pl-5 text-xs text-slate-200">
                  {getStrategyShortInstructions(strategy).map((line, idx) => (
                    <li key={idx}>{line}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* STEP 3: Month-by-month table */}
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Step 3 · Follow the month-by-month plan
          </p>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
            <div className="mb-4 flex flex-col gap-1 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Month-By-Month Payment Instructions
                </h2>
                <p className="mt-1 text-xs text-slate-300">
                  Exactly how much to pay toward each card every month — split
                  into minimum vs extra.
                </p>
              </div>
              {schedule.length > 0 && (
                <div className="text-xs text-slate-300">
                  Starting total balance:{" "}
                    <span className="font-semibold text-emerald-300">
                    ${totalBalanceStart.toFixed(2)}
                  </span>
                  <br />
                  Months to payoff:{" "}
                  <span className="font-semibold text-emerald-300">
                    {payoffMonths} month
                    {payoffMonths === 1 ? "" : "s"}
                  </span>
                </div>
              )}
            </div>

            {schedule.length === 0 ? (
              <p className="text-xs text-slate-500">
                Once you have at least one valid debt and a payment plan, your
                month-by-month instructions will show up here.
              </p>
            ) : (
              <div className="max-h-[480px] overflow-auto rounded-xl border border-slate-800 bg-slate-950/50">
                <table className="min-w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-slate-950 text-[11px] uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="py-2 px-3">Month</th>
                      <th className="py-2 px-3">Card</th>
                      <th className="py-2 px-3 text-right">Start Balance</th>
                      <th className="py-2 px-3 text-right">Min Payment</th>
                      <th className="py-2 px-3 text-right">Extra Payment</th>
                      <th className="py-2 px-3 text-right">Total Payment</th>
                      <th className="py-2 px-3 text-right">End Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((m) =>
                      m.payments.map((p) => (
                        <tr
                          key={`${m.monthIndex}-${p.debtId}`}
                          className="border-t border-slate-900/70 odd:bg-slate-900/40 even:bg-slate-900/60 hover:bg-slate-800/80"
                        >
                          <td className="py-1.5 px-3 align-middle text-slate-200">
                            Month {m.monthIndex}
                          </td>
                          <td className="py-1.5 px-3 align-middle text-slate-200">
                            {p.name}
                          </td>
                          <td className="py-1.5 px-3 align-middle text-right text-slate-200">
                            ${p.balanceStart.toFixed(2)}
                          </td>
                          <td className="py-1.5 px-3 align-middle text-right text-slate-200">
                            ${p.minPayment.toFixed(2)}
                          </td>
                          <td className="py-1.5 px-3 align-middle text-right">
                            {p.extraPayment > 0 ? (
                              <span className="font-semibold text-emerald-300">
                                +${p.extraPayment.toFixed(2)}
                              </span>
                            ) : (
                              <span className="text-slate-300">$0.00</span>
                            )}
                          </td>
                          <td className="py-1.5 px-3 align-middle text-right text-slate-200">
                            ${p.totalPayment.toFixed(2)}
                          </td>
                          <td className="py-1.5 px-3 align-middle text-right text-slate-200">
                            ${p.balanceEnd.toFixed(2)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}

            {schedule.length > 0 && (
              <p className="mt-2 text-[11px] text-slate-400">
                Tip: You don&apos;t have to memorize this whole table. Just
                follow the{" "}
                <span className="font-semibold text-emerald-300">
                  Next Payment Breakdown
                </span>{" "}
                each month — the pattern continues automatically.
              </p>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
