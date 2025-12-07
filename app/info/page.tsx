"use client";

import Link from "next/link";

export default function InfoPage() {
  return (
    <div className="flex min-h-screen justify-center bg-slate-950 text-slate-50">
      <main className="w-full max-w-3xl space-y-10 px-4 py-10">
        {/* Badge */}
        <div className="inline-flex items-center gap-2 rounded-full bg-slate-900/70 px-3 py-1 text-xs font-medium text-slate-300 ring-1 ring-slate-700/80">
          <span className="text-lg">💳</span>
          <span>DebtBeat Info &amp; Story</span>
        </div>

        {/* Hero */}
        <section className="space-y-4">
          <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
            Credit card debt is{" "}
            <span className="bg-gradient-to-r from-emerald-400 to-cyan-400 bg-clip-text text-transparent">
              normal
            </span>{" "}
            — and beatable.
          </h1>

          <p className="text-sm leading-relaxed text-slate-300 sm:text-base">
            DebtBeat is a focused payoff planner that helps you organize your
            credit cards, pick a strategy, and follow a clear month-by-month
            plan. Instead of guessing, you see exactly{" "}
            <span className="font-semibold text-emerald-300">
              what to pay, on which card, and when
            </span>
            .
          </p>

          <div className="flex flex-wrap gap-3 pt-2">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition-colors hover:bg-emerald-400"
            >
              Start the main planner
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 transition-colors hover:border-emerald-400 hover:text-emerald-300"
            >
              Try the demo (no sign-in)
            </Link>
          </div>
        </section>

        {/* How DebtBeat works */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-100">
            How DebtBeat actually helps
          </h2>
          <p className="text-sm text-slate-300">
            You tell DebtBeat about your cards and how much you can put toward
            them each month. DebtBeat then builds a payoff plan that:
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                1 · Organizes
              </p>
              <p className="text-sm text-slate-100">
                All your cards in one place — balances, APRs, and minimums.
              </p>
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                2 · Plans
              </p>
              <p className="text-sm text-slate-100">
                Turns your total monthly budget into a step-by-step payoff plan.
              </p>
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-emerald-300">
                3 · Focuses
              </p>
              <p className="text-sm text-slate-100">
                Shows you exactly which card to attack next so you never guess.
              </p>
            </div>
          </div>
        </section>

        {/* Strategies */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-100">
            Pick the strategy that fits your brain
          </h2>
          <p className="text-sm text-slate-300">
            DebtBeat uses three payoff styles — each with its own personality.
          </p>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">⚔️</span>
                <p className="text-sm font-semibold text-slate-100">
                  Warrior
                </p>
              </div>
              <p className="text-xs text-slate-300">
                Smallest balance first. Quick wins, fast motivation, and a sense
                of progress right away.
              </p>
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🔥</span>
                <p className="text-sm font-semibold text-slate-100">Rebel</p>
              </div>
              <p className="text-xs text-slate-300">
                Highest APR first. Attacks the most expensive debt to reduce
                interest as aggressively as possible.
              </p>
            </div>

            <div className="space-y-2 rounded-2xl border border-slate-800 bg-slate-900/80 p-4">
              <div className="flex items-center gap-2">
                <span className="text-xl">🪄</span>
                <p className="text-sm font-semibold text-slate-100">Wizard</p>
              </div>
              <p className="text-xs text-slate-300">
                Interest-optimized. Dynamically targets whatever is costing you
                the most right now.
              </p>
            </div>
          </div>
        </section>

        {/* Why this exists */}
        <section className="space-y-4">
          <h2 className="text-lg font-semibold text-slate-100">
            Why build another debt tool?
          </h2>
          <p className="text-sm leading-relaxed text-slate-300">
            Most budget apps try to do everything. DebtBeat is intentionally
            narrow: it&apos;s built just for credit card payoff. No clutter, no
            ads, no confusing categories — just clear instructions for getting
            out of high-interest debt faster.
          </p>

          <ul className="space-y-2 text-sm text-slate-300">
            <li>
              • Mobile-first and simple enough to use on the train or in line.
            </li>
            <li>
              • Visual payoff timeline so you can see your progress over time.
            </li>
            <li>
              • Strategy-based so you can choose motivation or math-optimized
              savings.
            </li>
          </ul>
        </section>

        {/* CTA footer */}
        <section className="mt-4 space-y-3 rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
          <h3 className="text-sm font-semibold text-slate-100">
            What should you do next?
          </h3>
          <p className="text-sm text-slate-300">
            Take 2–3 minutes to enter your real card balances and pick a
            strategy. DebtBeat will handle the math and show you a clear path
            out of debt — one payment at a time.
          </p>
          <div className="flex flex-wrap gap-3">
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-lg bg-emerald-500 px-4 py-2 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition-colors hover:bg-emerald-400"
            >
              Open the main planner
            </Link>
            <Link
              href="/demo"
              className="inline-flex items-center justify-center rounded-lg border border-slate-700 bg-slate-900 px-4 py-2 text-sm font-semibold text-slate-100 transition-colors hover:border-emerald-400 hover:text-emerald-300"
            >
              Play with the demo
            </Link>
          </div>
        </section>
      </main>
    </div>
  );
}
