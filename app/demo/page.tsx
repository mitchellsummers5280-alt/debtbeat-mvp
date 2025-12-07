"use client";

import { useMemo } from "react";
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

import { useDebtStore, Strategy, EditableDebt } from "@/lib/debtStore";

// ----------------------------------------------------
// Types (local)
// ----------------------------------------------------

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
  monthIndex: number;
  totalPayment: number;
  totalInterest: number;
  totalPrincipal: number;
  totalBalanceStart: number;
  totalBalanceEnd: number;
  payments: MonthlyDebtPayment[];
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

// Core payoff schedule (same logic as lib/debtPlan)
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

    if (sumMinDue > monthlyBudget + 1e-6) break;

    let leftover = Math.max(0, monthlyBudget - sumMinDue);

    const extraById = new Map<number, number>();
    const totalPaymentById = new Map<number, number>();

    for (const d of workingDebts) {
      const minDue = minDueById.get(d.id) ?? 0;
      extraById.set(d.id, 0);
      totalPaymentById.set(d.id, minDue);
    }

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
          if (a.balance !== b.balance) return a.balance - b.balance;
          return b.apr - a.apr;
        case "rebel":
          if (b.apr !== a.apr) return b.apr - a.apr;
          return b.balance - a.balance;
        case "wizard":
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
// Main Component – read-only mirror of Home
// ----------------------------------------------------

export default function DebtPayoffPlannerDemoPage() {
  const { state } = useDebtStore();
  const debts = state.debts;
  const strategy = state.strategy;
  const monthlyBudgetRaw =
    state.extraBudget && state.extraBudget > 0
      ? state.extraBudget.toString()
      : "0";

  const schedule = useMemo(
    () => buildSchedule(debts, strategy, monthlyBudgetRaw),
    [debts, strategy, monthlyBudgetRaw]
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

  const totalDebt = debts.reduce(
    (sum, d) => sum + parseNumber(d.balance),
    0
  );

  return (
    <div className="flex w-full justify-center px-4 py-10 text-slate-100">
      <div className="flex w-full max-w-5xl flex-col gap-8">
        {/* Header */}
        <header className="flex flex-col items-center gap-3 text-center">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-200">
            <span className="h-2 w-2 animate-pulse rounded-full bg-emerald-400" />
            Demo view · Mirroring your Home plan
          </div>

          <h1 className="text-3xl font-bold tracking-tight">
            DebtBeat Payoff Planner (Demo)
          </h1>

          <p className="max-w-2xl text-sm text-slate-300">
            This demo shows a{" "}
            <span className="font-semibold text-emerald-300">
              read-only view
            </span>{" "}
            of your DebtBeat plan. All numbers come from the{" "}
            <span className="font-semibold">Home</span> page.
          </p>

          <p className="text-xs text-slate-400">
            To change debts, strategy, or budget,{" "}
            <Link
              href="/"
              className="font-semibold text-emerald-300 hover:text-emerald-200"
            >
              go back to the main planner
            </Link>
            .
          </p>
        </header>

        {/* STEP 1: Cards & Budget (read-only) */}
        <section className="space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-emerald-300">
            Step 1 · Your cards & budget from Home
          </p>

          <div className="grid gap-6 rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg md:grid-cols-[2.1fr,1.1fr]">
            {/* Debts table */}
            <div className="overflow-x-auto">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Your Debts
                </h2>
                <span className="text-[11px] text-slate-400">
                  Edit on{" "}
                  <Link
                    href="/"
                    className="font-semibold text-emerald-300 hover:text-emerald-200"
                  >
                    Home
                  </Link>
                </span>
              </div>

              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-[11px] uppercase tracking-wide text-slate-400">
                    <th className="py-2 pr-3">Name</th>
                    <th className="py-2 pr-3">Balance</th>
                    <th className="py-2 pr-3">APR %</th>
                    <th className="py-2 pr-3">Min Payment</th>
                  </tr>
                </thead>
                <tbody>
                  {debts.length > 0 ? (
                    debts.map((d) => (
                      <tr
                        key={d.id}
                        className="border-b border-slate-800 last:border-0"
                      >
                        <td className="py-2 pr-3 text-slate-100">
                          {d.name || `Card ${d.id}`}
                        </td>
                        <td className="py-2 pr-3 text-slate-100">
                          ${parseNumber(d.balance).toFixed(2)}
                        </td>
                        <td className="py-2 pr-3 text-slate-100">
                          {parseNumber(d.apr).toFixed(2)}%
                        </td>
                        <td className="py-2 pr-3 text-slate-100">
                          ${parseNumber(d.minPayment).toFixed(2)}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={4}
                        className="py-4 text-center text-xs text-slate-500"
                      >
                        No cards yet. Add cards on the{" "}
                        <Link
                          href="/"
                          className="font-semibold text-emerald-300 hover:text-emerald-200"
                        >
                          Home
                        </Link>{" "}
                        page to see them here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {debts.length > 0 && (
                <p className="mt-2 text-[11px] text-slate-400">
                  Total debt:{" "}
                  <span className="font-semibold text-emerald-300">
                    ${totalDebt.toFixed(2)}
                  </span>
                </p>
              )}
            </div>

            {/* Strategy + budget */}
            <div className="flex flex-col gap-5 border-t border-slate-800 pt-4 md:border-l md:border-t-0 md:pl-4">
              <div>
                <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Strategy
                </h2>

                <div className="mt-3 flex items-center justify-center gap-6">
                  {(["warrior", "rebel", "wizard"] as Strategy[]).map((s) => {
                    const selected = strategy === s;
                    return (
                      <div
                        key={s}
                        className={`flex h-12 w-12 items-center justify-center rounded-full border text-2xl ${
                          selected
                            ? "border-emerald-400 bg-emerald-500/10 shadow-[0_0_0_1px_rgba(16,185,129,0.4)]"
                            : "border-slate-700 bg-slate-900/80 opacity-40"
                        }`}
                        aria-label={s}
                      >
                        {STRATEGY_ICONS[s]}
                      </div>
                    );
                  })}
                </div>
                <p className="mt-2 text-center text-[11px] text-slate-400">
                  Strategy is set on{" "}
                  <Link
                    href="/"
                    className="font-semibold text-emerald-300 hover:text-emerald-200"
                  >
                    Home
                  </Link>
                  .
                </p>
              </div>

              <div>
                <h2 className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">
                  Total monthly budget for debt payoff
                </h2>
                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-sm text-slate-300">$</span>
                  <span className="text-lg font-semibold text-emerald-300">
                    {state.extraBudget.toFixed(2)}
                  </span>
                </div>
                <p className="mt-2 text-xs text-slate-400">
                  This is the same total monthly budget you entered on the{" "}
                  <span className="font-semibold">Home</span> page, including
                  minimums and any extra you can put toward debt.
                </p>
              </div>

              <div className="mt-1 rounded-lg border border-dashed border-slate-700 bg-slate-900/80 p-3 text-xs text-slate-300">
                <p className="mb-1 font-semibold text-slate-100">
                  What this demo is showing:
                </p>
                <p>
                  We take your{" "}
                  <span className="font-semibold text-emerald-300">
                    real plan from Home
                  </span>{" "}
                  and render it here with charts and tables so you can see how
                  DebtBeat guides your payoff journey month by month.
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
                    Add debts and a monthly budget on the{" "}
                    <Link
                      href="/"
                      className="font-semibold text-emerald-300 hover:text-emerald-200"
                    >
                      Home
                    </Link>{" "}
                    page to see your payoff projection here.
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
                    Once you add at least one card and a positive budget on{" "}
                    <Link
                      href="/"
                      className="font-semibold text-emerald-300 hover:text-emerald-200"
                    >
                      Home
                    </Link>
                    , we&apos;ll show a detailed breakdown of your next payment
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
            Step 3 · Month-by-month payoff instructions
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
                Once you have at least one valid debt and a payment plan on{" "}
                <Link
                  href="/"
                  className="font-semibold text-emerald-300 hover:text-emerald-200"
                >
                  Home
                </Link>
                , your month-by-month instructions will show up here.
              </p>
            ) : (
              <div className="max-h-[480px] overflow-auto rounded-xl border border-slate-800 bg-slate-950/50">
                <table className="min-w-full text-left text-[11px]">
                  <thead className="sticky top-0 bg-slate-950 text-[11px] uppercase tracking-wide text-slate-400">
                    <tr>
                      <th className="py-2 px-3">Month</th>
                      <th className="py-2 px-3">Card</th>
                      <th className="py-2 px-3 text-right">
                        Start Balance
                      </th>
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
