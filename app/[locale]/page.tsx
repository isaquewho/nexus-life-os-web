"use client";

import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/authStore";
import { useFinanceStore } from "@/stores/financeStore";
import { useHabitStore } from "@/stores/habitStore";
import { useGoalStore } from "@/stores/goalStore";
import { createClient } from "@/lib/supabase/client";
import GlassCard from "@/components/ui/GlassCard";
import { formatCurrency, formatDate, formatDateKey, getDayGreeting } from "@/lib/utils";
import { Wallet, Target, Trophy, TrendingUp, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export default function DashboardPage() {
  const t = useTranslations("dashboard");
  const tFin = useTranslations("finance");
  const { profile } = useAuthStore();
  const { config, fixedExpenses, transactions, setConfig, setFixedExpenses, setTransactions } = useFinanceStore();
  const financeStore = useFinanceStore();
  const { habits, logs, setHabits, setLogs } = useHabitStore();
  const { goals, setGoals } = useGoalStore();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "pt-BR";

  const today = formatDateKey();
  const hour = new Date().getHours();

  const greetingKey =
    hour < 12 ? "greetingMorning" : hour < 18 ? "greetingAfternoon" : "greetingEvening";

  const greeting = t(greetingKey);

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const { data: cfg } = await supabase.from("financial_config").select("*").single();
      if (cfg) setConfig(cfg);

      const { data: fx } = await supabase.from("fixed_expenses").select("*").eq("is_active", true);
      if (fx) setFixedExpenses(fx);

      const { data: txns } = await supabase
        .from("transactions")
        .select("*")
        .order("date", { ascending: false })
        .limit(5);
      if (txns) setTransactions(txns);

      const { data: habs } = await supabase.from("habits").select("*").eq("is_active", true);
      if (habs) setHabits(habs);

      const { data: hlogs } = await supabase
        .from("habit_logs")
        .select("*")
        .eq("date_key", today);
      if (hlogs) setLogs(hlogs);

      const { data: gls } = await supabase.from("goals").select("*").order("created_at", { ascending: false });
      if (gls) setGoals(gls);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = financeStore.getSummary();
  const todayCompleted = logs.filter((l) => l.date_key === today && l.completed).length;
  const activeHabits = habits.filter((h) => h.is_active);
  const topGoal = goals[0];
  const topGoalProgress = topGoal
    ? Math.round((topGoal.saved_amount / topGoal.target_amount) * 100)
    : 0;

  const dateStr = new Date().toLocaleDateString(locale === "pt-BR" ? "pt-BR" : locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6 animate-fade-in">
        <p className="text-secondary text-sm capitalize">{dateStr}</p>
        <h1 className="text-primary text-2xl font-bold mt-1">
          {greeting},{" "}
          <span className="gradient-atlas">
            {profile?.full_name?.split(" ")[0] ?? "você"} ✦
          </span>
        </h1>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <GlassCard glowColor="blue" padding="md" className="col-span-1">
          <p className="text-muted text-xs uppercase tracking-wider mb-1">{t("availableBalance")}</p>
          <p className="text-atlas font-bold text-xl">{formatCurrency(summary.availableBalance)}</p>
          <p className="text-muted text-xs mt-1">
            Fixos: {formatCurrency(summary.totalFixed)}
          </p>
        </GlassCard>

        <GlassCard glowColor="green" padding="md" className="col-span-1">
          <p className="text-muted text-xs uppercase tracking-wider mb-1">{t("realBalance")}</p>
          <p
            className="font-bold text-xl"
            style={{ color: summary.realBalance >= 0 ? "#10b981" : "#f43f5e" }}
          >
            {formatCurrency(summary.realBalance)}
          </p>
          <p className="text-muted text-xs mt-1">
            {summary.savingsPercent.toFixed(0)}% do salário
          </p>
        </GlassCard>

        <GlassCard glowColor="violet" padding="md" className="col-span-1">
          <p className="text-muted text-xs uppercase tracking-wider mb-1">{t("habitsToday")}</p>
          <p className="text-habit font-bold text-xl">
            {todayCompleted}/{activeHabits.length}
          </p>
          <div
            className="mt-2 h-1.5 rounded-full overflow-hidden"
            style={{ background: "rgba(139,92,246,0.2)" }}
          >
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: activeHabits.length > 0
                  ? `${(todayCompleted / activeHabits.length) * 100}%`
                  : "0%",
                background: "#8b5cf6",
              }}
            />
          </div>
        </GlassCard>

        <GlassCard padding="md" className="col-span-1">
          <p className="text-muted text-xs uppercase tracking-wider mb-1">{t("goalsProgress")}</p>
          <p className="text-primary font-bold text-xl">{goals.length}</p>
          <p className="text-muted text-xs mt-1">
            {goals.filter((g) => g.saved_amount >= g.target_amount).length} concluídas
          </p>
        </GlassCard>
      </div>

      {/* Recent Transactions */}
      <GlassCard padding="md" className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-primary font-semibold flex items-center gap-2">
            <Wallet size={16} className="text-atlas" />
            {t("recentTransactions")}
          </h2>
          <Link href={`/${locale}/finance`} className="text-atlas text-xs">
            Ver tudo →
          </Link>
        </div>
        {transactions.length === 0 ? (
          <p className="text-muted text-sm text-center py-4">{t("noTransactions")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {transactions.slice(0, 5).map((txn) => (
              <div key={txn.id} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <div>
                  <p className="text-primary text-sm font-medium">{txn.description}</p>
                  <p className="text-muted text-xs">{txn.category} · {formatDate(txn.date, locale)}</p>
                </div>
                <div className="flex items-center gap-1">
                  {txn.type === "income" ? (
                    <ArrowUpRight size={14} className="text-finance" />
                  ) : (
                    <ArrowDownRight size={14} className="text-expense" />
                  )}
                  <span
                    className="font-semibold text-sm"
                    style={{ color: txn.type === "income" ? "#10b981" : "#f43f5e" }}
                  >
                    {txn.type === "income" ? "+" : "-"}{formatCurrency(txn.amount)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Today Habits Quick */}
      <GlassCard padding="md" className="mb-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-primary font-semibold flex items-center gap-2">
            <Target size={16} className="text-habit" />
            {t("todayHabits")}
          </h2>
          <Link href={`/${locale}/habits`} className="text-atlas text-xs">
            Ver tudo →
          </Link>
        </div>
        {activeHabits.length === 0 ? (
          <p className="text-muted text-sm text-center py-4">{t("noHabits")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {activeHabits.slice(0, 4).map((habit) => {
              const done = logs.some((l) => l.habit_id === habit.id && l.date_key === today && l.completed);
              return (
                <div key={habit.id} className="flex items-center gap-3 py-1.5">
                  <div
                    className="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0"
                    style={{
                      borderColor: done ? habit.color || "#8b5cf6" : "rgba(255,255,255,0.2)",
                      background: done ? habit.color || "#8b5cf6" : "transparent",
                    }}
                  >
                    {done && <span className="text-white text-xs">✓</span>}
                  </div>
                  <span className="text-lg">{habit.emoji}</span>
                  <p className="text-primary text-sm flex-1">{habit.name}</p>
                  <span className="text-muted text-xs">+{habit.xp_value} XP</span>
                </div>
              );
            })}
          </div>
        )}
      </GlassCard>

      {/* Top Goal */}
      {topGoal && (
        <GlassCard padding="md">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-primary font-semibold flex items-center gap-2">
              <Trophy size={16} className="text-atlas" />
              {t("topGoal")}
            </h2>
            <Link href={`/${locale}/goals`} className="text-atlas text-xs">
              Ver tudo →
            </Link>
          </div>
          <div className="flex items-start gap-3">
            <span className="text-3xl">{topGoal.emoji}</span>
            <div className="flex-1">
              <p className="text-primary font-semibold">{topGoal.name}</p>
              <p className="text-secondary text-sm">{topGoal.category}</p>
              <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: "rgba(59,130,246,0.2)" }}>
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${topGoalProgress}%`,
                    background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
                  }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-muted text-xs">{formatCurrency(topGoal.saved_amount)}</span>
                <span className="text-secondary text-xs">{topGoalProgress}%</span>
                <span className="text-muted text-xs">{formatCurrency(topGoal.target_amount)}</span>
              </div>
            </div>
          </div>
        </GlassCard>
      )}
    </div>
  );
}
