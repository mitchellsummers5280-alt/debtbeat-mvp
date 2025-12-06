"use client";

import React from "react";
import Link from "next/link";

const InfoPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 flex justify-center">
      {/* Page wrapper */}
      <main className="w-full max-w-3xl flex flex-col gap-8 px-4 pb-16 pt-10">
        {/* Hero / Intro */}
        <section className="space-y-4">
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

          <p className="text-sm leading-relaxed text-slate-300">
            DebtBeat is built for real people with real bills, surprises, and
            messy lives. Having credit card debt doesn&apos;t mean you&apos;re
            bad with money — it means you&apos;re human. We&apos;re here to
            help you take your power back, one month at a time.
          </p>
        </section>

        {/* Credit card crisis section */}
        <section className="space-y-4 rounded-2xl bg-slate-900/60 p-4 ring-1 ring-slate-800">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-rose-500/10 text-xl">
              📉
            </span>
            <span>The credit card crunch</span>
          </h2>

          <p className="text-sm text-slate-300">
            Credit card debt has quietly turned into a crisis for millions of
            people. High interest rates, rising prices, emergencies, and life
            changes have made it harder than ever to catch up.
          </p>

          <ul className="space-y-2 text-sm text-slate-300">
            <li className="flex gap-2">
              <span className="mt-1 text-emerald-400">•</span>
              <span>
                Balances are at record highs and interest rates are often over{" "}
                <span className="font-semibold text-slate-100">20% APR</span>.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 text-emerald-400">•</span>
              <span>
                Many people feel{" "}
                <span className="font-semibold text-slate-100">
                  ashamed or isolated
                </span>{" "}
                because of their debt.
              </span>
            </li>
            <li className="flex gap-2">
              <span className="mt-1 text-emerald-400">•</span>
              <span>
                Most debt doesn&apos;t come from &quot;bad choices&quot; — it
                comes from{" "}
                <span className="font-semibold text-slate-100">
                  real life: medical bills, job changes, helping family,
                  inflation
                </span>
                .
              </span>
            </li>
          </ul>

          <p className="text-sm font-medium text-emerald-300">
            You are not alone. You are not behind. You&apos;re just in the
            middle of the story.
          </p>
        </section>

        {/* Our mission */}
        <section className="space-y-4 rounded-2xl bg-slate-900/40 p-4 ring-1 ring-slate-800">
          <h2 className="flex items-center gap-2 text-lg font-semibold">
            <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-xl">
              🎯
            </span>
            <span>What DebtBeat is here to do</span>
          </h2>

          <p className="text-sm text-slate-300">
            DebtBeat is a gamified payoff planner that turns a stressful problem
            into a clear, winnable plan. No lectures. No shame. Just structure
            and momentum.
          </p>

          <div className="grid gap-3 text-sm text-slate-200">
            <div className="rounded-xl bg-slate-950/40 p-3 ring-1 ring-slate-800/80">
              <p className="font-semibold">📌 Give you clarity</p>
              <p className="mt-1 text-slate-300">
                See how long your plan will take, how much you&apos;ll pay
                monthly, and how much interest you&apos;ll knock out.
              </p>
            </div>
            <div className="rounded-xl bg-slate-950/40 p-3 ring-1 ring-slate-800/80">
              <p className="font-semibold">🧭 Match your personality</p>
              <p className="mt-1 text-slate-300">
                Choose a strategy style that actually fits you — not just what a
                calculator says is &quot;optimal.&quot;
              </p>
            </div>
            <div className="rounded-xl bg-slate-950/40 p-3 ring-1 ring-slate-800/80">
              <p className="font-semibold">📈 Build momentum</p>
              <p className="mt-1 text-slate-300">
                Watch your balances drop, milestones stack up, and your future
                self get lighter month by month.
              </p>
            </div>
          </div>

          <p className="text-sm font-medium text-emerald-300">
            Our goal is simple: help you beat your debt and feel proud of the
            process.
          </p>
        </section>

        {/* Characters / Strategies */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-semibold">Choose your debt persona</h2>
            <span className="text-xs uppercase tracking-wide text-slate-400">
              Warrior • Rebel • Wizard
            </span>
          </div>

          <p className="text-sm text-slate-300">
            In DebtBeat, your strategy becomes a character. Each one represents
            a different way to tackle debt — pick the one that feels the most
            like you.
          </p>

          <div className="space-y-4">
            {/* Warrior */}
            <article className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-4 ring-1 ring-slate-800">
              <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-emerald-500/10 blur-3xl" />
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-emerald-500/15 text-2xl">
                  ⚔️
                </div>
                <div>
                  <h3 className="text-base font-semibold">
                    The Warrior — Highest Interest First
                  </h3>
                  <p className="text-xs uppercase tracking-wide text-emerald-300">
                    Strategy: Avalanche
                  </p>
                </div>
              </div>

              <p className="mt-3 text-sm text-slate-200">
                The Warrior charges straight at the most expensive enemy: the
                card with the highest interest rate. Every extra dollar you pay
                here saves you the most money long-term.
              </p>

              <ul className="mt-3 space-y-1.5 text-xs text-slate-300">
                <li>• Best for: people who love efficiency and logic.</li>
                <li>
                  • Focus: save the most on interest and pay debt off faster.
                </li>
                <li>
                  • Vibe: disciplined, focused, &quot;let&apos;s do this the
                  smartest way possible.&quot;
                </li>
              </ul>
            </article>

            {/* Rebel */}
            <article className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-4 ring-1 ring-slate-800">
              <div className="pointer-events-none absolute -left-10 -top-10 h-32 w-32 rounded-full bg-rose-500/10 blur-3xl" />
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-500/15 text-2xl">
                  🔥
                </div>
                <div>
                  <h3 className="text-base font-semibold">
                    The Rebel — Small Wins First
                  </h3>
                  <p className="text-xs uppercase tracking-wide text-rose-300">
                    Strategy: Snowball
                  </p>
                </div>
              </div>

              <p className="mt-3 text-sm text-slate-200">
                The Rebel doesn&apos;t care about &quot;perfect math&quot; —
                they care about real momentum. They target the smallest balance
                first to knock out quick wins and keep motivation high.
              </p>

              <ul className="mt-3 space-y-1.5 text-xs text-slate-300">
                <li>• Best for: people who need progress they can feel.</li>
                <li>
                  • Focus: closing out accounts quickly so it feels like
                  you&apos;re actually winning.
                </li>
                <li>
                  • Vibe: energetic, emotional, &quot;let me see this number hit
                  zero.&quot;
                </li>
              </ul>
            </article>

            {/* Wizard */}
            <article className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-4 ring-1 ring-slate-800">
              <div className="pointer-events-none absolute -right-12 top-1/2 h-32 w-32 -translate-y-1/2 rounded-full bg-indigo-500/15 blur-3xl" />
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-500/20 text-2xl">
                  🔮
                </div>
                <div>
                  <h3 className="text-base font-semibold">
                    The Wizard — Balanced & Adaptive
                  </h3>
                  <p className="text-xs uppercase tracking-wide text-indigo-300">
                    Strategy: Hybrid
                  </p>
                </div>
              </div>

              <p className="mt-3 text-sm text-slate-200">
                The Wizard blends logic and motivation. Sometimes they hit the
                highest interest. Sometimes they clean up a smaller card to keep
                energy high. It&apos;s a thoughtful mix of speed and psychology.
              </p>

              <ul className="mt-3 space-y-1.5 text-xs text-slate-300">
                <li>
                  • Best for: people who want the &quot;best of both
                  worlds.&quot;
                </li>
                <li>
                  • Focus: strong progress that still feels emotionally
                  sustainable.
                </li>
                <li>
                  • Vibe: wise, flexible, &quot;what actually works for my real
                  life?&quot;
                </li>
              </ul>
            </article>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="mt-2 space-y-3 rounded-2xl bg-slate-900/70 p-4 ring-1 ring-slate-800">
          <p className="text-sm font-semibold text-slate-100">
            You don&apos;t have to be perfect to get out of debt — you just have
            to start.
          </p>
          <p className="text-sm text-slate-300">
            Pick a character, make a plan, and let DebtBeat handle the math.
            Your only job is to keep moving.
          </p>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href="/"
              className="inline-flex h-11 items-center justify-center rounded-xl bg-emerald-500 px-4 text-sm font-semibold text-slate-950 shadow-lg shadow-emerald-500/30 transition hover:bg-emerald-400 active:scale-[0.98]"
            >
              Start a payoff plan
            </Link>
            <p className="text-xs text-slate-400">
              No judgment. No perfect budget required. Just your numbers and a
              fresh start.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
};

export default InfoPage;
