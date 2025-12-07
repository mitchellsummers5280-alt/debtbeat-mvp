"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { useDebtStore } from "@/lib/debtStore";
import { type Strategy, getStrategyLabel, formatCurrency } from "@/lib/debtPlan";

// ----------------------------------------------------
// Types & Defaults
// ----------------------------------------------------

type BalancePoint = {
  month: string;
  balance: number;
};

type StoredSummary = {
  totalDebt: number;
  projectedMonths: number;
  monthlyPayment: number;
  interestSaved: number;
  chartData?: { monthLabel?: string; balance: number }[];
};

const DEFAULT_SUMMARY: StoredSummary = {
  totalDebt: 12540,
  projectedMonths: 14,
  monthlyPayment: 500,
  interestSaved: 1880,
};

const DEFAULT_BALANCE_DATA: BalancePoint[] = [
  { month: "Month 1", balance: 8200 },
  { month: "Month 2", balance: 7900 },
  { month: "Month 3", balance: 7550 },
  { month: "Month 4", balance: 7120 },
  { month: "Month 5", balance: 6680 },
  { month: "Month 6", balance: 6200 },
  { month: "Month 7", balance: 5650 },
  { month: "Month 8", balance: 5050 },
  { month: "Month 9", balance: 4400 },
  { month: "Month 10", balance: 3800 },
];

const currency0Formatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

const STRATEGY_ICON: Record<Strategy, string> = {
  warrior: "⚔️",
  rebel: "🔥",
  wizard: "🪄",
};

const STRATEGY_TAGLINE: Record<Strategy, string> = {
  warrior: "You’re attacking the smallest balances first for quick wins.",
  rebel: "You’re attacking the highest-interest cards to save as much as possible.",
  wizard: "You’re using a smart blend of motivation and interest savings.",
};

// ----------------------------------------------------
// Component
// ----------------------------------------------------

const DashboardPage: React.FC = () => {
  const { state } = useDebtStore(); // current strategy from global store

  const [summary, setSummary] = useState<StoredSummary>(DEFAULT_SUMMARY);
  const [chartData, setChartData] =
    useState<BalancePoint[]>(DEFAULT_BALANCE_DATA);

  // Read latest plan summary saved by Home page
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem("debtbeat-dashboard");
      if (!raw) return;

      const parsed = JSON.parse(raw) as Partial<StoredSummary>;

      setSummary((prev) => ({
        ...prev,
        ...parsed,
      }));

      if (parsed.chartData && parsed.chartData.length > 0) {
        const mapped: BalancePoint[] = parsed.chartData.map((p, index) => ({
          month: p.monthLabel ?? `Month ${index + 1}`,
          balance: p.balance,
        }));
        setChartData(mapped);
      }
    } catch (err) {
      console.error("Failed to load dashboard summary:", err);
    }
  }, []);

  // --------------------------------------------------
  // Derived metrics
  // --------------------------------------------------

  const monthsLeft = summary.projectedMonths ?? 0;
  const monthlyPayment = summary.monthlyPayment ?? 0;

  // Approximate Month 1 principal vs interest using starting vs first-chart point
  const {
    requiredPayment,
    interestThisMonth,
    principalThisMonth,
    payoffLabel,
  } = useMemo(() => {
    const payment = monthlyPayment > 0 ? monthlyPayment : 0;

    let principal = 0;
    let interest = 0;

    if (
      chartData.length > 0 &&
      summary.totalDebt > 0 &&
      payment > 0
    ) {
      const firstEndBalance = chartData[0].balance;
      const rawPrincipal = summary.totalDebt - firstEndBalance;

      principal = rawPrincipal > 0 ? rawPrincipal : 0;
      const rawInterest = payment - principal;
      interest = rawInterest > 0 ? rawInterest : 0;
    }

    const payoff =
      summary.projectedMonths && summary.projectedMonths > 0
        ? `Month ${summary.projectedMonths}`
        : "—";

    return {
      requiredPayment: payment,
      interestThisMonth: interest,
      principalThisMonth: principal,
      payoffLabel: payoff,
    };
  }, [chartData, summary.totalDebt, summary.projectedMonths, monthlyPayment]);

  const progressAfterMonthOne = useMemo(() => {
    if (!monthsLeft || monthsLeft <= 0) return 0;
    return (1 / monthsLeft) * 100;
  }, [monthsLeft]);

  // NEW: “plan savings strength” percentage based on interestSaved vs totalDebt
  const savingsPercent = useMemo(() => {
    if (!summary.totalDebt || summary.totalDebt <= 0) return 0;
    const ratio = summary.interestSaved / summary.totalDebt;
    return Math.max(0, Math.min(100, ratio * 100));
  }, [summary.interestSaved, summary.totalDebt]);

  const celebrationMessage = useMemo(() => {
    // 75%+ tier
    if (savingsPercent >= 75) {
      return `You’re crushing it — this plan is projected to avoid about ${formatCurrency(
        summary.interestSaved
      )} in interest. 🔥`;
    }

    // 50–75%
    if (savingsPercent >= 50) {
      return `Strong plan — you’re on track to avoid around ${formatCurrency(
        summary.interestSaved
      )} in interest. Keep pushing. 💪`;
    }

    // 25–50%
    if (savingsPercent >= 25) {
      return `Solid plan — you’re already lined up to save ${formatCurrency(
        summary.interestSaved
      )} in interest over the life of this payoff. ⚡️`;
    }

    // Under 25% savings but fast payoff
    if (monthsLeft > 0 && monthsLeft <= 12) {
      return "You’re less than a year away — stay locked in. 💪";
    }

    // Default “just starting” message
    return "You just started — keep going, the plan is in motion. 🚀";
  }, [savingsPercent, summary.interestSaved, monthsLeft]);

  const currentStrategy = state.strategy;
  const strategyLabel = getStrategyLabel(currentStrategy);
  const strategyIcon = STRATEGY_ICON[currentStrategy];
  const strategyTagline = STRATEGY_TAGLINE[currentStrategy];

  // --------------------------------------------------
  // Render
  // --------------------------------------------------

  return (
    <div className="w-full flex justify-center px-4 py-10 text-slate-100">
      <div className="w-full max-w-5xl flex flex-col gap-6">
        {/* HEADER */}
        <header className="text-center flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">
            <span>Your</span>
            <span className="text-emerald-400">Summary</span>
          </h1>
          <p className="text-slate-300 text-sm">
            Track your payoff progress and stay motivated.
          </p>
          <p className="text-xs text-slate-500">
            Based on your latest DebtBeat plan from the{" "}
            <span className="font-semibold text-emerald-300">Home</span> page.
          </p>
        </header>

        {/* CELEBRATION / MOTIVATION BANNER */}
        <div className="w-full flex justify-center mt-4">
          <div className="max-w-2xl w-full rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-xs sm:text-sm text-emerald-100 flex items-center gap-2 shadow-[0_0_20px_rgba(16,185,129,0.15)]">
            <span className="text-lg">✨</span>
            <p>{celebrationMessage}</p>
          </div>
        </div>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-slate-900/80 rounded-xl px-4 py-3 text-center shadow border border-slate-800/70">
            <p className="text-slate-400 text-[11px] uppercase tracking-[0.18em]">
              Total Debt
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-100">
              {currency0Formatter.format(summary.totalDebt)}
            </p>
          </div>

          <div className="bg-slate-900/80 rounded-xl px-4 py-3 text-center shadow border border-slate-800/70">
            <p className="text-slate-400 text-[11px] uppercase tracking-[0.18em]">
              Interest Saved
            </p>
            <p className="mt-1 text-lg font-semibold text-emerald-400">
              {currency0Formatter.format(summary.interestSaved)}
            </p>
          </div>

          <div className="bg-slate-900/80 rounded-xl px-4 py-3 text-center shadow border border-slate-800/70">
            <p className="text-slate-400 text-[11px] uppercase tracking-[0.18em]">
              Months Left
            </p>
            <p className="mt-1 text-lg font-semibold text-slate-100">
              {monthsLeft || 0}
            </p>
          </div>
        </div>

        {/* PLAN PROGRESS + STRATEGY */}
        <section className="space-y-3 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-4 py-3 shadow-lg">
          {/* Progress label */}
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
              Plan Progress
            </p>
            <p className="mt-1 text-xs text-slate-400">
              After you complete Month 1, you&apos;ll be about{" "}
              <span className="font-semibold text-emerald-300">
                {progressAfterMonthOne.toFixed(0)}%
              </span>{" "}
              of the way through your payoff journey.
            </p>
          </div>

          {/* Progress bar */}
          <div className="mt-1 h-2 w-full rounded-full bg-slate-900 border border-slate-800/90 overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-emerald-500 to-sky-400 transition-all"
              style={{ width: `${Math.min(progressAfterMonthOne, 100)}%` }}
            />
          </div>

          {/* Strategy badge */}
          <div className="mt-2 flex items-center gap-3 rounded-xl bg-slate-950/70 px-3 py-2 border border-slate-800/80">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-400/60 text-lg">
              <span>{strategyIcon}</span>
            </div>
            <div className="text-xs">
              <p className="font-semibold text-slate-100">
                Your strategy:{" "}
                <span className="text-emerald-300">{strategyLabel}</span>
              </p>
              <p className="text-slate-400 mt-0.5">{strategyTagline}</p>
            </div>
          </div>
        </section>

        {/* LINE CHART */}
        <section className="bg-slate-900/80 p-4 rounded-2xl shadow border border-slate-800/80">
          <h2 className="text-sm font-semibold text-slate-100 mb-1 text-center">
            Remaining Balance Over Time
          </h2>
          <p className="text-[11px] text-slate-400 mb-4 text-center">
            Projected remaining balance each month if you stick with your
            current plan.
          </p>

          <div className="w-full h-72">
            <ResponsiveContainer>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis
                  dataKey="month"
                  stroke="#94a3b8"
                  tick={{ fontSize: 11 }}
                />
                <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} />
                <Tooltip
                  contentStyle={{
                    background: "#020617",
                    border: "1px solid #1e293b",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  labelStyle={{ color: "#e2e8f0" }}
                  formatter={(value: any) =>
                    currency0Formatter.format(Number(value))
                  }
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#38bdf8"
                  strokeWidth={3}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* MONTHLY SNAPSHOT – under chart */}
        <section className="mt-4 rounded-2xl border border-slate-800/80 bg-slate-900/80 px-5 py-4 shadow-lg">
          <h2 className="text-xs font-semibold tracking-[0.2em] text-slate-300 uppercase flex items-center gap-2 mb-3">
            <span>📊</span>
            Monthly Snapshot
          </h2>

          <div className="grid grid-cols-1 gap-4 text-xs sm:grid-cols-4 sm:gap-6 divide-y sm:divide-y-0 sm:divide-x divide-slate-800">
            {/* Required payment */}
            <div className="pt-2 sm:pt-0 sm:pr-4 text-center">
              <p className="text-slate-400 tracking-[0.16em] uppercase mb-1">
                Required Payment
              </p>
              <p className="text-base font-semibold text-slate-100">
                {formatCurrency(requiredPayment)}
              </p>
            </div>

            {/* Interest this month */}
            <div className="pt-2 sm:pt-0 sm:px-4 text-center">
              <p className="text-slate-400 tracking-[0.16em] uppercase mb-1">
                Goes to Interest this Month
              </p>
              <p className="text-base font-semibold text-rose-300">
                {formatCurrency(interestThisMonth)}
              </p>
            </div>

            {/* Principal this month */}
            <div className="pt-2 sm:pt-0 sm:px-4 text-center">
              <p className="text-slate-400 tracking-[0.16em] uppercase mb-1">
                Knocks Down Your Principal
              </p>
              <p className="text-base font-semibold text-emerald-300">
                {formatCurrency(principalThisMonth)}
              </p>
            </div>

            {/* Payoff month */}
            <div className="pt-2 sm:pt-0 sm:pl-4 text-center">
              <p className="text-slate-400 tracking-[0.16em] uppercase mb-1">
                Estimated Payoff Month
              </p>
              <p className="text-base font-semibold text-slate-100">
                {payoffLabel}
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default DashboardPage;
