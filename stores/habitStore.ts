"use client";
import { create } from "zustand";
import type { Habit, HabitLog } from "@/types";

interface HabitState {
  habits: Habit[];
  logs: HabitLog[];
  isLoading: boolean;
  setHabits: (habits: Habit[]) => void;
  setLogs: (logs: HabitLog[]) => void;
  setLoading: (loading: boolean) => void;
  getTodayLogs: (dateKey: string) => HabitLog[];
  getTodayProgress: (dateKey: string) => { completed: number; total: number };
}

export const useHabitStore = create<HabitState>((set, get) => ({
  habits: [],
  logs: [],
  isLoading: false,
  setHabits: (habits) => set({ habits }),
  setLogs: (logs) => set({ logs }),
  setLoading: (isLoading) => set({ isLoading }),
  getTodayLogs: (dateKey) =>
    get().logs.filter((l) => l.date_key === dateKey),
  getTodayProgress: (dateKey) => {
    const { habits, logs } = get();
    const active = habits.filter((h) => h.is_active);
    const completedToday = logs.filter(
      (l) => l.date_key === dateKey && l.completed
    );
    return { completed: completedToday.length, total: active.length };
  },
}));
