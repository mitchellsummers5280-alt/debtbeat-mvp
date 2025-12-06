"use client";

import React from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

const DashboardPage = () => {
  const mockBalanceData = [
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

  return (
    <div className="flex justify-center px-4 py-10">
      <div className="w-full max-w-3xl flex flex-col gap-8">

        {/* HEADER */}
        <header className="text-center flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight text-slate-100">
            Your Dashboard
          </h1>
          <p className="text-slate-300 text-sm">
            Track your payoff progress and stay motivated.
          </p>
        </header>

        {/* SUMMARY CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="bg-slate-800 rounded-xl p-4 text-center shadow">
            <p className="text-slate-400 text-xs">Total Debt</p>
            <p className="text-lg font-semibold text-slate-100">$12,540</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-4 text-center shadow">
            <p className="text-slate-400 text-xs">Interest Saved</p>
            <p className="text-lg font-semibold text-green-400">$1,880</p>
          </div>

          <div className="bg-slate-800 rounded-xl p-4 text-center shadow sm:block hidden">
            <p className="text-slate-400 text-xs">Months Left</p>
            <p className="text-lg font-semibold text-slate-100">14</p>
          </div>
        </div>

        {/* LINE CHART */}
        <div className="bg-slate-800 p-4 rounded-xl shadow">
          <h2 className="text-lg font-semibold text-slate-100 mb-4 text-center">
            Remaining Balance Over Time
          </h2>

          <div className="w-full h-64">
            <ResponsiveContainer>
              <LineChart data={mockBalanceData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="month" stroke="#94a3b8" />
                <YAxis stroke="#94a3b8" />
                <Tooltip
                  contentStyle={{ background: "#1e293b", border: "none" }}
                  labelStyle={{ color: "#e2e8f0" }}
                />
                <Line
                  type="monotone"
                  dataKey="balance"
                  stroke="#38bdf8"
                  strokeWidth={3}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

      </div>
    </div>
  );
};

export default DashboardPage;
