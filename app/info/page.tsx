"use client";

import React from "react";
import Link from "next/link";

const InfoPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex justify-center">
      <section className="max-w-2xl w-full px-4 py-10 space-y-4">
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/70 px-3 py-1 text-xs font-medium text-slate-300 ring-1 ring-slate-700/80">
          <span className="text-lg">💳</span>
          <span>DebtBeat Info & Story</span>
        </div>

        <h1 className="text-3xl font-bold tracking-tight">
          Credit card debt is{" "}
          <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
            normal
          </span>{" "}
          — and beatable.
        </h1>

        <p className="text-sm text-slate-300">
          DebtBeat is a payoff planner that helps you organize your credit
          cards, pick a strategy, and stick to a clear month-by-month plan.
        </p>

        <p className="text-sm text-slate-300">
          You control your total monthly budget. DebtBeat handles the math:
          minimums first, then every freed-up dollar attacks the next
          highest-priority card based on the strategy you choose.
        </p>

        <p className="text-xs text-slate-400 pt-4">
          Ready to try it?{" "}
          <Link
            href="/"
            className="text-emerald-300 font-semibold hover:text-emerald-200"
          >
            Go to the main planner
          </Link>
          .
        </p>
      </section>
    </div>
  );
};

export default InfoPage;
