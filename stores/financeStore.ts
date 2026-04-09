"use client";
import { create } from "zustand";
import type {
  FinancialConfig,
  FixedExpense,
  Transaction,
  BankConnection,
  FinanceSummary,
} from "@/types";

interface FinanceState {
  config: FinancialConfig | null;
  fixedExpenses: FixedExpense[];
  transactions: Transaction[];
  bankConnections: BankConnection[];
  isLoading: boolean;
  setConfig: (config: FinancialConfig | null) => void;
  setFixedExpenses: (expenses: FixedExpense[]) => void;
  setTransactions: (transactions: Transaction[]) => void;
  setBankConnections: (connections: BankConnection[]) => void;
  setLoading: (loading: boolean) => void;
  getSummary: () => FinanceSummary;
}

export const useFinanceStore = create<FinanceState>((set, get) => ({
  config: null,
  fixedExpenses: [],
  transactions: [],
  bankConnections: [],
  isLoading: false,
  setConfig: (config) => set({ config }),
  setFixedExpenses: (fixedExpenses) => set({ fixedExpenses }),
  setTransactions: (transactions) => set({ transactions }),
  setBankConnections: (bankConnections) => set({ bankConnections }),
  setLoading: (isLoading) => set({ isLoading }),
  getSummary: (): FinanceSummary => {
    const { config, fixedExpenses, transactions } = get();
    const salary = config?.salary ?? 0;
    const totalFixed = fixedExpenses
      .filter((e) => e.is_active)
      .reduce((sum, e) => sum + e.amount, 0);
    const availableBalance = salary - totalFixed;

    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const monthTxns = transactions.filter((t) =>
      t.date.startsWith(currentMonth)
    );
    const totalExtras = monthTxns
      .filter((t) => t.transaction_layer === "extra" && t.type === "income")
      .reduce((sum, t) => sum + t.amount, 0);
    const totalVariable = monthTxns
      .filter((t) => t.transaction_layer === "variable" && t.type === "expense")
      .reduce((sum, t) => sum + t.amount, 0);

    const realBalance = availableBalance + totalExtras - totalVariable;
    const fixedPercent = salary > 0 ? (totalFixed / salary) * 100 : 0;
    const savingsPercent = salary > 0 ? (realBalance / salary) * 100 : 0;

    return {
      salary,
      totalFixed,
      availableBalance,
      totalExtras,
      totalVariable,
      realBalance,
      fixedPercent,
      savingsPercent,
    };
  },
}));
