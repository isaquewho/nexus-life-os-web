"use client";

import { useMemo } from "react";
import { useFinanceStore } from "@/stores/financeStore";
import { useHabitStore } from "@/stores/habitStore";
import { useGoalStore } from "@/stores/goalStore";

interface HealthScoreProps {
  className?: string;
}

function getScoreColor(score: number): string {
  if (score >= 80) return "#10b981"; // green
  if (score >= 60) return "#3b82f6"; // blue
  if (score >= 40) return "#f59e0b"; // yellow
  return "#f43f5e";                  // red
}

function getScoreLabel(score: number): string {
  if (score >= 80) return "Excelente ✦";
  if (score >= 60) return "Bom 👍";
  if (score >= 40) return "Regular ⚡";
  return "Atenção ⚠️";
}

export default function HealthScore({ className = "" }: HealthScoreProps) {
  const financeStore = useFinanceStore();
  const { habits, logs } = useHabitStore();
  const { goals } = useGoalStore();

  const score = useMemo(() => {
    const summary = financeStore.getSummary();
    let total = 0;

    // ── Criterio 1: Taxa de economia (35 pts) ──────────────────────────
    // Ideal: realBalance >= 20% of salary
    if (summary.salary > 0) {
      const savingsRate = summary.realBalance / summary.salary;
      if (savingsRate >= 0.2)      total += 35;
      else if (savingsRate >= 0.1) total += 20;
      else if (savingsRate >= 0)   total += 10;
      // negative savings = 0 pts
    }

    // ── Criterio 2: % fixos do salário (25 pts) ───────────────────────
    // Ideal: totalFixed <= 50% of salary
    if (summary.salary > 0) {
      const fixedRate = summary.totalFixed / summary.salary;
      if (fixedRate <= 0.5)      total += 25;
      else if (fixedRate <= 0.6) total += 15;
      else if (fixedRate <= 0.7) total += 8;
      // else 0 pts
    } else {
      total += 25; // no salary configured → neutral
    }

    // ── Criterio 3: Consistência de hábitos no mês (25 pts) ───────────
    const activeHabits = habits.filter((h) => h.is_active);
    if (activeHabits.length > 0) {
      const now = new Date();
      const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      const dayOfMonth = now.getDate();
      const expectedTotal = activeHabits.length * dayOfMonth;
      const completedThisMonth = logs.filter(
        (l) => l.completed && l.date_key.startsWith(currentMonth)
      ).length;
      const habitRate = Math.min(1, completedThisMonth / expectedTotal);
      total += Math.round(habitRate * 25);
    }

    // ── Criterio 4: Progresso de metas ativas (15 pts) ────────────────
    const activeGoals = goals.filter((g) => g.saved_amount < g.target_amount);
    if (activeGoals.length > 0) {
      const avgProgress = activeGoals.reduce(
        (sum, g) => sum + Math.min(1, g.saved_amount / g.target_amount), 0
      ) / activeGoals.length;
      total += Math.round(avgProgress * 15);
    }

    return Math.min(100, Math.max(0, total));
  }, [financeStore, habits, logs, goals]);

  const color = getScoreColor(score);
  const label = getScoreLabel(score);

  // SVG circle animation
  const radius = 40;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference - (score / 100) * circumference;

  return (
    <div
      className={`flex items-center gap-5 p-4 rounded-2xl ${className}`}
      style={{
        background: "rgba(255,255,255,0.04)",
        border: `1px solid ${color}30`,
      }}
    >
      {/* Circular progress */}
      <div className="relative shrink-0">
        <svg width="90" height="90" viewBox="0 0 100 100" className="-rotate-90">
          {/* Track */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.08)"
            strokeWidth="8"
          />
          {/* Progress */}
          <circle
            cx="50" cy="50" r={radius}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 1s ease-in-out, stroke 0.5s ease" }}
          />
        </svg>
        {/* Score number in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span
            className="text-xl font-bold"
            style={{ color }}
          >
            {score}
          </span>
        </div>
      </div>

      {/* Text */}
      <div className="flex-1 min-w-0">
        <p className="text-muted text-xs uppercase tracking-wider mb-0.5">Saúde Financeira</p>
        <p className="text-primary font-bold text-lg leading-tight">{label}</p>
        <div className="mt-2 flex flex-col gap-1">
          <ScorePill label="Economia" value={financeStore.getSummary().savingsPercent.toFixed(0) + "%"} color={color} />
          <ScorePill
            label="Hábitos"
            value={`${habits.filter(h => h.is_active).length} ativos`}
            color="#8b5cf6"
          />
        </div>
      </div>
    </div>
  );
}

function ScorePill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-muted text-xs">{label}:</span>
      <span className="text-secondary text-xs font-medium">{value}</span>
    </div>
  );
}
