"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useHabitStore } from "@/stores/habitStore";
import GlassCard from "@/components/ui/GlassCard";
import NexusButton from "@/components/ui/NexusButton";
import { formatDateKey } from "@/lib/utils";
import { Plus, ChevronLeft, ChevronRight, Flame, Calendar } from "lucide-react";
import type { Habit, HabitLog } from "@/types";

const EMOJI_OPTIONS = ["🏃", "📚", "💪", "🧘", "🥗", "💧", "🎯", "🎸", "✍️", "🌅", "😴", "🧠"];
const COLOR_OPTIONS = ["#8b5cf6", "#3b82f6", "#10b981", "#f43f5e", "#f59e0b", "#ec4899"];

function ContributionGraph({ habit, logs }: { habit: Habit | null; logs: HabitLog[] }) {
  const today = new Date();
  const cells: { date: string; count: number }[] = [];

  for (let w = 51; w >= 0; w--) {
    for (let d = 0; d < 7; d++) {
      const dt = new Date(today);
      dt.setDate(today.getDate() - (w * 7 + (6 - d)));
      if (dt > today) continue;
      const key = dt.toISOString().split("T")[0];
      const completed = logs.filter(
        (l) => l.date_key === key && l.completed && (habit ? l.habit_id === habit.id : true)
      ).length;
      cells.push({ date: key, count: completed });
    }
  }

  const maxCount = Math.max(...cells.map(c => c.count), 1);
  const getColor = (count: number) => {
    if (count === 0) return "rgba(255,255,255,0.06)";
    const intensity = count / maxCount;
    const alpha = 0.3 + intensity * 0.7;
    return `rgba(139,92,246,${alpha})`;
  };

  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="overflow-x-auto">
      <div className="flex gap-1 min-w-max">
        {weeks.map((week, wi) => (
          <div key={wi} className="flex flex-col gap-1">
            {week.map((cell, di) => (
              <div
                key={di}
                className="w-3 h-3 rounded-sm transition-all"
                style={{ background: getColor(cell.count) }}
                title={`${cell.date}: ${cell.count} completions`}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function HabitsPage() {
  const t = useTranslations("habits");
  const { habits, logs, setHabits, setLogs } = useHabitStore();
  const [activeTab, setActiveTab] = useState<"tasks" | "schedule">("tasks");
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [showAdd, setShowAdd] = useState(false);
  const [newHabit, setNewHabit] = useState({ name: "", emoji: "🎯", color: "#8b5cf6", frequency: "daily", xp_value: 30 });
  const [saving, setSaving] = useState(false);
  const [xpPopId, setXpPopId] = useState<string | null>(null);
  const [filterHabit, setFilterHabit] = useState<string | null>(null);

  const dateKey = formatDateKey(selectedDate);
  const today = formatDateKey();

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/habits");
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        console.error("[habits] load error:", err.error ?? res.statusText);
        return;
      }
      const { habits: habs, logs: hlogs } = await res.json();
      if (habs) setHabits(habs);
      if (hlogs) setLogs(hlogs);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const todayCompleted = logs.filter(l => l.date_key === today && l.completed).length;
  const activeHabits = habits.filter(h => h.is_active);
  const progressPercent = activeHabits.length > 0 ? Math.round((todayCompleted / activeHabits.length) * 100) : 0;

  const maxStreak = Math.max(...habits.map(h => h.streak), 0);
  const monthLogs = logs.filter(l => l.date_key.startsWith(new Date().toISOString().slice(0, 7)));
  const totalPossible = activeHabits.length * new Date().getDate();
  const monthPercent = totalPossible > 0 ? Math.round((monthLogs.filter(l => l.completed).length / totalPossible) * 100) : 0;

  const handleToggle = async (habit: Habit) => {
    const existing = logs.find(l => l.habit_id === habit.id && l.date_key === dateKey);
    const newVal = existing ? !existing.completed : true;

    const res = await fetch("/api/habit-logs", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ habit_id: habit.id, date_key: dateKey, completed: newVal }),
    });
    const json = await res.json();
    if (!res.ok) {
      alert("Erro ao salvar log: " + (json.error ?? res.statusText));
      console.error("[habits] toggle error:", json);
      return;
    }

    setLogs(logs.map(l =>
      l.habit_id === habit.id && l.date_key === dateKey ? { ...l, completed: newVal } : l
    ).concat(existing ? [] : [json.data]));

    if (newVal) {
      setXpPopId(habit.id);
      setTimeout(() => setXpPopId(null), 1200);
    }
  };

  const handleAddHabit = async () => {
    if (!newHabit.name) return;
    setSaving(true);
    try {
      const res = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newHabit),
      });
      const json = await res.json();
      if (!res.ok) {
        alert("Erro ao criar hábito: " + (json.error ?? res.statusText));
        console.error("[habits] POST error:", json);
        return;
      }
      setHabits([...habits, json.data]);
      setShowAdd(false);
      setNewHabit({ name: "", emoji: "🎯", color: "#8b5cf6", frequency: "daily", xp_value: 30 });
    } finally { setSaving(false); }
  };

  const adjustDate = (days: number) => {
    const d = new Date(selectedDate);
    d.setDate(d.getDate() + days);
    setSelectedDate(d);
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-primary text-2xl font-bold">{t("title")}</h1>
        <NexusButton variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowAdd(true)}>
          {t("addHabit")}
        </NexusButton>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <GlassCard padding="sm" glowColor="violet">
          <div className="flex items-center gap-2 mb-1">
            <Flame size={14} className="text-habit" />
            <p className="text-muted text-xs">{t("longestStreak")}</p>
          </div>
          <p className="text-habit font-bold text-xl">{maxStreak} dias</p>
        </GlassCard>
        <GlassCard padding="sm">
          <div className="flex items-center gap-2 mb-1">
            <Calendar size={14} className="text-atlas" />
            <p className="text-muted text-xs">{t("monthPercent")}</p>
          </div>
          <p className="text-atlas font-bold text-xl">{monthPercent}%</p>
        </GlassCard>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-5">
        {(["tasks", "schedule"] as const).map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className="px-4 py-2 rounded-xl text-sm font-medium transition-all"
            style={{
              background: activeTab === tab ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.06)",
              color: activeTab === tab ? "#8b5cf6" : "#94a3b8",
              border: activeTab === tab ? "1px solid rgba(139,92,246,0.4)" : "1px solid transparent",
            }}
          >
            {t(tab)}
          </button>
        ))}
      </div>

      {activeTab === "tasks" && (
        <>
          {/* Date navigation */}
          <GlassCard padding="sm" className="mb-4">
            <div className="flex items-center justify-between">
              <button onClick={() => adjustDate(-1)} className="text-secondary hover:text-primary p-2">
                <ChevronLeft size={18} />
              </button>
              <div className="text-center">
                <p className="text-primary font-medium">
                  {dateKey === today ? "Hoje" : selectedDate.toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "short" })}
                </p>
                <p className="text-muted text-xs">{progressPercent}% completo</p>
              </div>
              <button onClick={() => adjustDate(1)} disabled={dateKey === today} className="text-secondary hover:text-primary p-2 disabled:opacity-30">
                <ChevronRight size={18} />
              </button>
            </div>
            <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(139,92,246,0.1)" }}>
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progressPercent}%`, background: "linear-gradient(90deg, #8b5cf6, #3b82f6)" }}
              />
            </div>
            <p className="text-muted text-xs text-center mt-1">{todayCompleted}/{activeHabits.length} hábitos</p>
          </GlassCard>

          {/* Habit list */}
          {activeHabits.length === 0 ? (
            <GlassCard padding="lg">
              <p className="text-muted text-center">{t("noHabits")}</p>
            </GlassCard>
          ) : (
            <div className="flex flex-col gap-2">
              {activeHabits.map(habit => {
                const isDone = logs.some(l => l.habit_id === habit.id && l.date_key === dateKey && l.completed);
                return (
                  <div
                    key={habit.id}
                    className="glass glass-hover flex items-center gap-3 p-4 cursor-pointer relative overflow-hidden"
                    onClick={() => handleToggle(habit)}
                  >
                    <button
                      className="w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-all duration-300"
                      style={{
                        borderColor: isDone ? habit.color : "rgba(255,255,255,0.2)",
                        background: isDone ? habit.color : "transparent",
                        boxShadow: isDone ? `0 0 10px ${habit.color}44` : "none",
                      }}
                    >
                      {isDone && <span className="text-white text-xs">✓</span>}
                    </button>
                    <span className="text-2xl">{habit.emoji}</span>
                    <div className="flex-1">
                      <p className="text-primary text-sm font-medium" style={{ opacity: isDone ? 0.6 : 1, textDecoration: isDone ? "line-through" : "none" }}>
                        {habit.name}
                      </p>
                      <p className="text-muted text-xs">{habit.streak} dias de streak</p>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full font-medium"
                      style={{ background: habit.color + "22", color: habit.color }}
                    >
                      +{habit.xp_value} XP
                    </span>
                    {xpPopId === habit.id && (
                      <div
                        className="absolute right-4 top-2 text-habit font-bold text-sm pointer-events-none animate-xp-pop"
                      >
                        +{habit.xp_value} XP! 🔥
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {activeTab === "schedule" && (
        <GlassCard padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-primary font-semibold">Histórico de Contribuições</h2>
            <div className="flex gap-2 overflow-x-auto">
              <button
                onClick={() => setFilterHabit(null)}
                className="px-2 py-1 rounded-lg text-xs"
                style={{
                  background: !filterHabit ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.06)",
                  color: !filterHabit ? "#8b5cf6" : "#94a3b8",
                }}
              >
                Todos
              </button>
              {habits.map(h => (
                <button
                  key={h.id}
                  onClick={() => setFilterHabit(h.id)}
                  className="px-2 py-1 rounded-lg text-xs whitespace-nowrap"
                  style={{
                    background: filterHabit === h.id ? h.color + "33" : "rgba(255,255,255,0.06)",
                    color: filterHabit === h.id ? h.color : "#94a3b8",
                  }}
                >
                  {h.emoji} {h.name}
                </button>
              ))}
            </div>
          </div>
          <ContributionGraph habit={habits.find(h => h.id === filterHabit) ?? null} logs={logs} />
          <div className="flex items-center gap-2 mt-3 justify-end">
            <span className="text-muted text-xs">Menos</span>
            {[0, 0.3, 0.5, 0.7, 1].map((a, i) => (
              <div
                key={i}
                className="w-3 h-3 rounded-sm"
                style={{ background: a === 0 ? "rgba(255,255,255,0.06)" : `rgba(139,92,246,${a})` }}
              />
            ))}
            <span className="text-muted text-xs">Mais</span>
          </div>
        </GlassCard>
      )}

      {/* Add Habit Modal */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={e => e.target === e.currentTarget && setShowAdd(false)}
        >
          <div className="glass w-full max-w-md p-6 animate-slide-up">
            <h3 className="text-primary font-semibold text-lg mb-4">{t("addHabit")}</h3>
            <div className="flex flex-col gap-4">
              <input
                className="w-full px-4 py-2.5 rounded-xl text-primary text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                placeholder={t("habitName")}
                value={newHabit.name}
                onChange={e => setNewHabit(p => ({ ...p, name: e.target.value }))}
              />
              <div>
                <p className="text-secondary text-xs mb-2">{t("emoji")}</p>
                <div className="flex flex-wrap gap-2">
                  {EMOJI_OPTIONS.map(e => (
                    <button
                      key={e}
                      onClick={() => setNewHabit(p => ({ ...p, emoji: e }))}
                      className="text-2xl p-1.5 rounded-lg transition-all"
                      style={{ background: newHabit.emoji === e ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.06)" }}
                    >
                      {e}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-secondary text-xs mb-2">{t("color")}</p>
                <div className="flex gap-2">
                  {COLOR_OPTIONS.map(c => (
                    <button
                      key={c}
                      onClick={() => setNewHabit(p => ({ ...p, color: c }))}
                      className="w-7 h-7 rounded-full transition-all"
                      style={{
                        background: c,
                        boxShadow: newHabit.color === c ? `0 0 0 3px rgba(255,255,255,0.3)` : "none",
                        transform: newHabit.color === c ? "scale(1.2)" : "scale(1)",
                      }}
                    />
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <p className="text-secondary text-xs mb-1">{t("frequency")}</p>
                  <select
                    className="w-full px-3 py-2 rounded-xl text-primary text-sm outline-none"
                    style={{ background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.12)" }}
                    value={newHabit.frequency}
                    onChange={e => setNewHabit(p => ({ ...p, frequency: e.target.value }))}
                  >
                    <option value="daily">{t("daily")}</option>
                    <option value="weekly">{t("weekly")}</option>
                  </select>
                </div>
                <div>
                  <p className="text-secondary text-xs mb-1">{t("xpValue")}</p>
                  <select
                    className="w-full px-3 py-2 rounded-xl text-primary text-sm outline-none"
                    style={{ background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.12)" }}
                    value={newHabit.xp_value}
                    onChange={e => setNewHabit(p => ({ ...p, xp_value: parseInt(e.target.value) }))}
                  >
                    <option value={30}>30 XP</option>
                    <option value={45}>45 XP</option>
                    <option value={60}>60 XP</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-2 mt-1">
                <NexusButton variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>Cancelar</NexusButton>
                <NexusButton variant="primary" className="flex-1" onClick={handleAddHabit} loading={saving}>Criar Hábito</NexusButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
