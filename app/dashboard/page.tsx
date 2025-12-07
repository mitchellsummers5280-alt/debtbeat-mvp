"use client";

import React, { useEffect, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

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

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

// ----------------------------------------------------
// Component
// ----------------------------------------------------

const DashboardPage: React.FC = () => {
  const [summary, setSummary] = useState<StoredSummary>(DEFAULT_SUMMARY);
  const [chartData, setChartData] =
    useState<BalancePoint[]>(DEFAULT_BALANCE_DATA);

  // Read latest plan summary saved by Home page
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem("debtbeat-dashboard");
      if (!raw) return;

      const parsed = JSON.parse(raw) as StoredSummary;

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

  return (
    <div className="w-full flex justify-center px-4 py-10">
      <div className="w-full flex justify-center">
        <div className="w-full max-w-3xl flex flex-col gap-8">
          {/* HEADER */}
          <header className="text-center flex flex-col gap-2">
            <h1 className="text-3xl font-bold tracking-tight text-slate-100">
              Your Dashboard
            </h1>
            <p className="text-slate-300 text-sm">
              Track your payoff progress and stay motivated.
            </p>
            <p className="text-xs text-slate-500">
              Based on your latest plan from the Home page.
            </p>
          </header>

          {/* SUMMARY CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div className="bg-slate-800 rounded-xl p-4 text-center shadow">
              <p className="text-slate-400 text-xs uppercase tracking-wide">
                Total Debt
              </p>
              <p className="text-lg font-semibold text-slate-100">
                {currencyFormatter.format(summary.totalDebt)}
              </p>
            </div>

            <div className="bg-slate-800 rounded-xl p-4 text-center shadow">
              <p className="text-slate-400 text-xs uppercase tracking-wide">
                Interest Saved
              </p>
              <p className="text-lg font-semibold text-emerald-400">
                {currencyFormatter.format(summary.interestSaved)}
              </p>
            </div>

            <div className="bg-slate-800 rounded-xl p-4 text-center shadow">
              <p className="text-slate-400 text-xs uppercase tracking-wide">
                Months Left
              </p>
              <p className="text-lg font-semibold text-slate-100">
                {summary.projectedMonths}
              </p>
            </div>
          </div>

          {/* LINE CHART */}
          <div className="bg-slate-800 p-4 rounded-xl shadow">
            <h2 className="text-lg font-semibold text-slate-100 mb-2 text-center">
              Remaining Balance Over Time
            </h2>
            <p className="text-xs text-slate-400 mb-4 text-center">
              Projected remaining balance each month if you stick with your
              current plan.
            </p>

            <div className="w-full h-64">
              <ResponsiveContainer>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="month" stroke="#94a3b8" />
                  <YAxis stroke="#94a3b8" />
                  <Tooltip
                    contentStyle={{ background: "#0f172a", border: "none" }}
                    labelStyle={{ color: "#e2e8f0" }}
                    formatter={(value: any) =>
                      currencyFormatter.format(Number(value))
                    }
                  />
                  <Line
                    type="monotone"
                    dataKey="balance"
                    stroke="#38bdf8"
                    strokeWidth={3}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardPage;
