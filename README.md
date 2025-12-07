# DebtBeat – MVP

Solve your credit card debt for the price of a coffee.

DebtBeat is a gamified payoff planner that shows people **how fast they can get out of credit-card debt** and **how much interest they can save** using different strategies.

This repo is the **front-end MVP** built in Next.js 14 (App Router) and TypeScript — ready for a backend/dev team to extend with Plaid integration, authentication, user accounts, and cloud persistence.

---

## Core Concept

- Users only enter data on the **Home / Strategy** page.
- The app calculates a payoff plan using one of three strategies:
  - **Warrior** – highest interest first (Avalanche style)
  - **Rebel** – smallest balance first (Snowball style)
  - **Wizard** – hybrid “smart” payoff
- The resulting payoff plan + summary are stored in a **global client store** (persisted to localStorage).
- Other pages display this data **read-only**, ensuring a clean, intuitive UX:
  - **Your Plan** (`/demo`)
  - **Summary** (`/dashboard`)

---

## Data Flow (for dev handoff)

**Single source of truth:** `useDebtStore` in `lib/debtStore.ts`.

### Where data is entered
- `app/page.tsx` (**Home / Strategy**)

### Where data is stored
- `useDebtStore` (React store with localStorage sync)
- Data persists across refreshes and page navigation.

### Who reads it
- `app/page.tsx` – displays the active payoff plan + chart  
- `app/demo/page.tsx` – shows “Your Plan” (read-only view)  
- `app/dashboard/page.tsx` – shows summary metrics + payoff chart  

### Summary object shape (approx.)

```ts
type DashboardSummary = {
  totalDebt: number;
  projectedMonths: number;
  monthlyPayment: number;
  interestSaved: number;
  chartData: { monthLabel: string; balance: number }[];
};
```