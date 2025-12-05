# DebtBeat – Roadmap

This roadmap outlines potential next steps beyond the MVP.

---

## Legend

- **P0** – High impact / should be done next
- **P1** – Important but not urgent
- **P2** – Nice-to-have / polish

---

## P0 – Core Product Enhancements

1. **Persist Debts to Database (Prisma + Postgres)**
   - Add `Debt` and `Plan` models to `schema.prisma`
   - Create API routes for:
     - Saving a set of debts
     - Fetching the latest plan for a user
   - Tie plans to `session.user.id` from NextAuth

2. **Multi-Strategy Comparison View**
   - Run all three strategies (Warrior, Rebel, Wizard) in parallel
   - Show comparison of:
     - Months to payoff
     - Total interest
   - UI: side-by-side cards or comparison chart

3. **Improved Validation & UX**
   - Form-level validation for:
     - Negative values
     - APR > 0 and < 100
   - Better error messaging and inline field errors

---

## P1 – Analytics & Visuals

1. **Per-Debt Payoff Chart**
   - Show a stacked chart or multiple lines:
     - Each card’s remaining balance over time

2. **Progress Tracking**
   - Allow user to log their actual payments
   - Compare “planned vs actual” payoff curve

3. **Export / Share**
   - Export plan to PDF or CSV
   - Shareable read-only link to a plan

---

## P2 – AI & Personalization

1. **AI Strategy Explanation (OpenAI API)**
   - Turn payoff summary into:
     - User-friendly explanation
     - Motivational commentary
   - Use `lib/debtPlan.ts` outputs as context

2. **“What If?” Scenario Library**
   - Save multiple what-if scenarios per user
   - Example:
     - Extra $100/month vs. extra $300/month
     - Applying a one-time lump sum

3. **Gamification**
   - Badges:
     - “First $1k paid off”
     - “Cut interest by 50%”
   - Streaks and milestones

---

## P2 – Design & Polish

- Replace inline styles with Tailwind or CSS modules
- Improve responsive behavior for very small devices
- Add light/dark theme toggle
- Add animations via `PageTransitions` and micro-interactions

---

# Developer Task List (Suggested)

1. Review `lib/debtPlan.ts` and unit-test the payoff logic.
2. Replace inline styles in `app/page.tsx` with Tailwind or CSS modules.
3. Implement multi-strategy comparison (Warrior vs Rebel vs Wizard) in the UI.
4. Add Prisma models for debts/plans and persist user data (see docs/ROADMAP.md).
5. Improve validation and error handling on the main form.
6. Optional: enable `PageTransitions` in `app/layout.tsx` for animated route changes.
7. Optional: integrate OpenAI for richer AI-style recommendations.

This roadmap is intentionally flexible. A future developer can pick a vertical (e.g., persistence, AI, or visuals) and build out features without needing to change the core payoff logic.
