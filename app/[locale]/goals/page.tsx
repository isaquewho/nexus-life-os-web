"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useGoalStore } from "@/stores/goalStore";
import { createClient } from "@/lib/supabase/client";
import GlassCard from "@/components/ui/GlassCard";
import NexusButton from "@/components/ui/NexusButton";
import { formatCurrency, monthsUntil, progressPercent } from "@/lib/utils";
import { Plus, Trophy, Target } from "lucide-react";

const GOAL_CATEGORIES = ["viagem", "educação", "tecnologia", "casa", "carro", "investimento", "emergência", "presente", "outros"];
const GOAL_EMOJIS: Record<string, string> = {
  viagem: "✈️", educação: "📚", tecnologia: "💻", casa: "🏠",
  carro: "🚗", investimento: "📈", emergência: "🛟", presente: "🎁", outros: "🎯",
};

export default function GoalsPage() {
  const t = useTranslations("goals");
  const { goals, setGoals, getTotalSaved, getTotalTarget, getOverallProgress, getAchievedCount } = useGoalStore();
  const goalStore = useGoalStore();
  const [showAdd, setShowAdd] = useState(false);
  const [showContrib, setShowContrib] = useState<string | null>(null);
  const [newGoal, setNewGoal] = useState({ name: "", category: "outros", emoji: "🎯", target_amount: "", deadline: "", monthly_planned: "" });
  const [contribAmount, setContribAmount] = useState("");
  const [contribNote, setContribNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [savingContrib, setSavingContrib] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const { data } = await supabase.from("goals").select("*").order("created_at", { ascending: false });
      if (data) setGoals(data);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalSaved = getTotalSaved();
  const totalTarget = getTotalTarget();
  const overallProgress = getOverallProgress();
  const achievedCount = getAchievedCount();

  const handleAddGoal = async () => {
    if (!newGoal.name || !newGoal.target_amount) return;
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id ?? "";
      const { data, error } = await supabase.from("goals").insert({
        uid,
        name: newGoal.name,
        category: newGoal.category,
        emoji: GOAL_EMOJIS[newGoal.category] || "🎯",
        target_amount: parseFloat(newGoal.target_amount),
        saved_amount: 0,
        deadline: newGoal.deadline || null,
        monthly_planned: parseFloat(newGoal.monthly_planned) || 0,
      }).select().single();
      if (!error && data) {
        setGoals([data, ...goals]);
        setShowAdd(false);
        setNewGoal({ name: "", category: "outros", emoji: "🎯", target_amount: "", deadline: "", monthly_planned: "" });
      }
    } finally { setSaving(false); }
  };

  const handleContribution = async (goalId: string) => {
    if (!contribAmount) return;
    setSavingContrib(true);
    try {
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id ?? "";
      const amount = parseFloat(contribAmount);

      await Promise.all([
        supabase.from("goal_contributions").insert({ goal_id: goalId, uid, amount, note: contribNote || null, date: new Date().toISOString().split("T")[0] }),
        supabase.from("goals").update({ saved_amount: (goals.find(g => g.id === goalId)?.saved_amount ?? 0) + amount }).eq("id", goalId),
      ]);

      setGoals(goals.map(g => g.id === goalId ? { ...g, saved_amount: g.saved_amount + amount } : g));
      setShowContrib(null);
      setContribAmount("");
      setContribNote("");
    } finally { setSavingContrib(false); }
  };

  const autoCalcMonthly = () => {
    const target = parseFloat(newGoal.target_amount);
    if (!target || !newGoal.deadline) return "";
    const months = monthsUntil(newGoal.deadline);
    if (months <= 0) return "";
    return (target / months).toFixed(2);
  };

  const monthlyCalc = autoCalcMonthly();

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-primary text-2xl font-bold">{t("title")}</h1>
        <NexusButton variant="primary" size="sm" leftIcon={<Plus size={14} />} onClick={() => setShowAdd(true)}>
          {t("addGoal")}
        </NexusButton>
      </div>

      {/* Header Metrics */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <GlassCard padding="sm">
          <p className="text-muted text-xs">{t("totalToAchieve")}</p>
          <p className="text-primary font-bold text-lg">{formatCurrency(totalTarget)}</p>
        </GlassCard>
        <GlassCard glowColor="green" padding="sm">
          <p className="text-muted text-xs">{t("alreadySaved")}</p>
          <p className="text-finance font-bold text-lg">{formatCurrency(totalSaved)}</p>
        </GlassCard>
        <GlassCard padding="sm">
          <p className="text-muted text-xs">{t("progress")}</p>
          <p className="text-atlas font-bold text-lg">{overallProgress.toFixed(0)}%</p>
        </GlassCard>
        <GlassCard padding="sm">
          <p className="text-muted text-xs">{t("achieved")}</p>
          <div className="flex items-center gap-1">
            <Trophy size={14} className="text-habit" />
            <p className="text-habit font-bold text-lg">{achievedCount}</p>
          </div>
        </GlassCard>
      </div>

      {/* Goals */}
      {goals.length === 0 ? (
        <GlassCard padding="lg">
          <div className="flex flex-col items-center gap-3 py-4">
            <Target size={40} className="text-muted" />
            <p className="text-muted text-center">{t("noGoals")}</p>
            <NexusButton variant="primary" size="sm" onClick={() => setShowAdd(true)}>
              {t("addGoal")}
            </NexusButton>
          </div>
        </GlassCard>
      ) : (
        <div className="flex flex-col gap-4">
          {goals.map((goal) => {
            const pct = progressPercent(goal.saved_amount, goal.target_amount);
            const months = goal.deadline ? monthsUntil(goal.deadline) : null;
            const isAchieved = goal.saved_amount >= goal.target_amount;
            const gradientColor = isAchieved ? "#10b981" : "#3b82f6";

            return (
              <GlassCard
                key={goal.id}
                padding="md"
                glowColor={isAchieved ? "green" : "none"}
                className="animate-slide-up"
              >
                <div className="flex items-start gap-3 mb-3">
                  <span className="text-3xl">{goal.emoji}</span>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-primary font-semibold">{goal.name}</h3>
                      {isAchieved && <Trophy size={14} className="text-finance" />}
                    </div>
                    <p className="text-muted text-xs capitalize">{goal.category}</p>
                  </div>
                  <span
                    className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ background: `${gradientColor}22`, color: gradientColor }}
                  >
                    {pct.toFixed(0)}%
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2.5 rounded-full overflow-hidden mb-2" style={{ background: "rgba(255,255,255,0.08)" }}>
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${pct}%`,
                      background: isAchieved
                        ? "linear-gradient(90deg, #10b981, #3b82f6)"
                        : "linear-gradient(90deg, #3b82f6, #8b5cf6)",
                    }}
                  />
                </div>

                <div className="flex justify-between text-xs mb-3">
                  <span className="text-secondary">{t("saved")}: {formatCurrency(goal.saved_amount)}</span>
                  <span className="text-muted">{t("remaining")}: {formatCurrency(Math.max(0, goal.target_amount - goal.saved_amount))}</span>
                  <span className="text-secondary">/ {formatCurrency(goal.target_amount)}</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-3 text-xs">
                    {months !== null && (
                      <span className="text-muted">{months} {t("monthsLeft")}</span>
                    )}
                    {goal.monthly_planned > 0 && (
                      <span className="text-atlas">{formatCurrency(goal.monthly_planned)}{t("perMonth")}</span>
                    )}
                  </div>
                  {!isAchieved && (
                    <NexusButton
                      variant="secondary"
                      size="sm"
                      onClick={() => setShowContrib(goal.id)}
                    >
                      {t("addValue")}
                    </NexusButton>
                  )}
                </div>
              </GlassCard>
            );
          })}
        </div>
      )}

      {/* Add Goal Modal */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={e => e.target === e.currentTarget && setShowAdd(false)}
        >
          <div className="glass w-full max-w-md p-6 animate-slide-up">
            <h3 className="text-primary font-semibold text-lg mb-4">{t("addGoal")}</h3>
            <div className="flex flex-col gap-3">
              <input
                className="w-full px-4 py-2.5 rounded-xl text-primary text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                placeholder={t("goalName")}
                value={newGoal.name}
                onChange={e => setNewGoal(p => ({ ...p, name: e.target.value }))}
              />
              <select
                className="px-4 py-2.5 rounded-xl text-primary text-sm outline-none"
                style={{ background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.12)" }}
                value={newGoal.category}
                onChange={e => setNewGoal(p => ({ ...p, category: e.target.value, emoji: GOAL_EMOJIS[e.target.value] || "🎯" }))}
              >
                {GOAL_CATEGORIES.map(c => <option key={c} value={c} className="capitalize">{GOAL_EMOJIS[c]} {c}</option>)}
              </select>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">R$</span>
                <input
                  type="number"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-primary text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                  placeholder={t("targetAmount")}
                  value={newGoal.target_amount}
                  onChange={e => setNewGoal(p => ({ ...p, target_amount: e.target.value }))}
                />
              </div>
              <input
                type="date"
                className="w-full px-4 py-2.5 rounded-xl text-primary text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                value={newGoal.deadline}
                onChange={e => setNewGoal(p => ({ ...p, deadline: e.target.value }))}
              />
              {monthlyCalc && (
                <p className="text-atlas text-xs text-center">
                  💡 {t("needsPerMonth", { amount: formatCurrency(parseFloat(monthlyCalc)) })}
                </p>
              )}
              <div className="flex gap-2 mt-1">
                <NexusButton variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>Cancelar</NexusButton>
                <NexusButton variant="primary" className="flex-1" onClick={handleAddGoal} loading={saving}>Criar Meta</NexusButton>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Contribution Modal */}
      {showContrib && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={e => e.target === e.currentTarget && setShowContrib(null)}
        >
          <div className="glass w-full max-w-md p-6 animate-slide-up">
            <h3 className="text-primary font-semibold text-lg mb-4">
              {t("addValue")} — {goals.find(g => g.id === showContrib)?.name}
            </h3>
            <div className="flex flex-col gap-3">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">R$</span>
                <input
                  type="number"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-primary text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                  placeholder="Valor"
                  value={contribAmount}
                  onChange={e => setContribAmount(e.target.value)}
                />
              </div>
              <input
                className="w-full px-4 py-2.5 rounded-xl text-primary text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                placeholder={t("note")}
                value={contribNote}
                onChange={e => setContribNote(e.target.value)}
              />
              <div className="flex gap-2 mt-1">
                <NexusButton variant="secondary" className="flex-1" onClick={() => setShowContrib(null)}>Cancelar</NexusButton>
                <NexusButton variant="primary" className="flex-1" onClick={() => handleContribution(showContrib)} loading={savingContrib}>Confirmar</NexusButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
