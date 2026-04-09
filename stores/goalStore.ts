"use client";
import { create } from "zustand";
import type { Goal, GoalContribution } from "@/types";

interface GoalState {
  goals: Goal[];
  contributions: GoalContribution[];
  isLoading: boolean;
  setGoals: (goals: Goal[]) => void;
  setContributions: (contributions: GoalContribution[]) => void;
  setLoading: (loading: boolean) => void;
  getTotalSaved: () => number;
  getTotalTarget: () => number;
  getOverallProgress: () => number;
  getAchievedCount: () => number;
}

export const useGoalStore = create<GoalState>((set, get) => ({
  goals: [],
  contributions: [],
  isLoading: false,
  setGoals: (goals) => set({ goals }),
  setContributions: (contributions) => set({ contributions }),
  setLoading: (isLoading) => set({ isLoading }),
  getTotalSaved: () =>
    get().goals.reduce((sum, g) => sum + g.saved_amount, 0),
  getTotalTarget: () =>
    get().goals.reduce((sum, g) => sum + g.target_amount, 0),
  getOverallProgress: () => {
    const { goals } = get();
    if (goals.length === 0) return 0;
    const total = goals.reduce((sum, g) => sum + g.target_amount, 0);
    const saved = goals.reduce((sum, g) => sum + g.saved_amount, 0);
    return total > 0 ? (saved / total) * 100 : 0;
  },
  getAchievedCount: () =>
    get().goals.filter((g) => g.saved_amount >= g.target_amount).length,
}));
