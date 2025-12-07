"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Strategy = "warrior" | "rebel" | "wizard";

export type EditableDebt = {
  id: number;
  name: string;
  balance: string; // stored as string while typing
  apr: string;
  minPayment: string;
};

export type DashboardSummary = {
  totalDebt: number;
  projectedMonths: number;
  monthlyPayment: number;
  interestSaved: number;
  chartData: { monthLabel: string; balance: number }[];
};

type DebtState = {
  debts: EditableDebt[];
  strategy: Strategy;
  extraBudget: number; // total monthly budget for debt payoff
  dashboardSummary: DashboardSummary | null;
};

type DebtContextValue = {
  state: DebtState;
  setDebts: (debts: EditableDebt[]) => void;
  setStrategy: (strategy: Strategy) => void;
  setExtraBudget: (amount: number) => void;
  setDashboardSummary: (summary: DashboardSummary | null) => void;
};

// bump version so any old "500" defaults in localStorage are ignored
const STORAGE_KEY = "debtbeat-global-state-v2";

const defaultState: DebtState = {
  debts: [],
  strategy: "warrior",
  extraBudget: 0, // start from 0; UI will let user type their own budget
  dashboardSummary: null,
};

const DebtContext = createContext<DebtContextValue | undefined>(undefined);

export const DebtProvider = ({ children }: { children: ReactNode }) => {
  const [state, setState] = useState<DebtState>(defaultState);
  const [initialized, setInitialized] = useState(false);

  // Load once on mount
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<DebtState>;

        setState((prev) => ({
          ...prev,
          ...parsed,
        }));
      }
    } catch (err) {
      console.error("Failed to load DebtBeat state from localStorage", err);
    } finally {
      setInitialized(true);
    }
  }, []);

  // Persist whenever state changes
  useEffect(() => {
    if (!initialized) return;
    if (typeof window === "undefined") return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (err) {
      console.error("Failed to save DebtBeat state to localStorage", err);
    }
  }, [state, initialized]);

  const setDebts = (debts: EditableDebt[]) => {
    setState((prev) => ({
      ...prev,
      debts,
    }));
  };

  const setStrategy = (strategy: Strategy) => {
    setState((prev) => ({
      ...prev,
      strategy,
    }));
  };

  const setExtraBudget = (amount: number) => {
    setState((prev) => ({
      ...prev,
      extraBudget: amount,
    }));
  };

  const setDashboardSummary = (summary: DashboardSummary | null) => {
    setState((prev) => ({
      ...prev,
      dashboardSummary: summary,
    }));
  };

  const value: DebtContextValue = {
    state,
    setDebts,
    setStrategy,
    setExtraBudget,
    setDashboardSummary,
  };

  return <DebtContext.Provider value={value}>{children}</DebtContext.Provider>;
};

export const useDebtStore = (): DebtContextValue => {
  const ctx = useContext(DebtContext);
  if (!ctx) {
    throw new Error("useDebtStore must be used within a DebtProvider");
  }
  return ctx;
};
