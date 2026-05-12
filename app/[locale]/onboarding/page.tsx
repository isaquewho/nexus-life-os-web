"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import NexusButton from "@/components/ui/NexusButton";
import { Check, ChevronRight, Sparkles, Wallet, Flame, Trophy } from "lucide-react";

const STEP_ICONS = [Sparkles, Wallet, Flame, Trophy];
const STEP_COLORS = ["#3b82f6", "#10b981", "#8b5cf6", "#f59e0b"];

const HABIT_EMOJIS = ["🏃", "📚", "💧", "🧘", "🏋️", "🎯", "✍️", "🍎", "😴", "🎨"];
const GOAL_CATEGORIES = ["viagem", "educação", "tecnologia", "casa", "investimento", "emergência", "outros"];
const GOAL_EMOJIS: Record<string, string> = {
  viagem: "✈️", educação: "📚", tecnologia: "💻", casa: "🏠",
  investimento: "📈", emergência: "🛡️", outros: "🎯",
};

export default function OnboardingPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "pt-BR";
  const { profile, setProfile } = useAuthStore();

  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1 — name
  const [name, setName] = useState(profile?.full_name ?? "");

  // Step 2 — finance
  const [salary, setSalary] = useState("");

  // Step 3 — habit
  const [habitName, setHabitName] = useState("");
  const [habitEmoji, setHabitEmoji] = useState("🏃");

  // Step 4 — goal
  const [goalName, setGoalName] = useState("");
  const [goalAmount, setGoalAmount] = useState("");
  const [goalDeadline, setGoalDeadline] = useState("");
  const [goalCategory, setGoalCategory] = useState("outros");

  const steps = [
    {
      icon: Sparkles,
      title: "Bem-vindo ao NEXUS ✦",
      subtitle: "Seu sistema operacional pessoal. Vamos configurar tudo em 4 passos rápidos.",
      color: "#3b82f6",
    },
    {
      icon: Wallet,
      title: "Suas Finanças",
      subtitle: "Qual é o seu salário mensal? Isso nos ajuda a calcular seu saldo e orçamento.",
      color: "#10b981",
    },
    {
      icon: Flame,
      title: "Seu Primeiro Hábito",
      subtitle: "Qual hábito você quer construir? Comece com um que faça diferença no seu dia.",
      color: "#8b5cf6",
    },
    {
      icon: Trophy,
      title: "Sua Primeira Meta",
      subtitle: "O que você está guardando dinheiro para alcançar?",
      color: "#f59e0b",
    },
  ];

  const currentStep = steps[step];
  const StepIcon = currentStep.icon;

  const canAdvance = () => {
    if (step === 0) return name.trim().length > 0;
    if (step === 1) return parseFloat(salary) > 0;
    if (step === 2) return habitName.trim().length > 0;
    if (step === 3) return goalName.trim().length > 0 && parseFloat(goalAmount) > 0;
    return false;
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const supabase = createClient();
      const { data: session } = await supabase.auth.getSession();
      const uid = session.session?.user.id;
      if (!uid) return;

      // 1. Update profile name + mark onboarding complete
      const { data: updatedProfile } = await supabase
        .from("profiles")
        .update({ full_name: name.trim(), onboarding_complete: true })
        .eq("id", uid)
        .select()
        .single();
      if (updatedProfile) setProfile(updatedProfile);

      // 2. Upsert financial config (salary)
      await supabase.from("financial_config").upsert(
        { uid, salary: parseFloat(salary) },
        { onConflict: "uid" }
      );

      // 3. Insert first habit
      if (habitName.trim()) {
        await supabase.from("habits").insert({
          uid,
          name: habitName.trim(),
          emoji: habitEmoji,
          color: "#8b5cf6",
          frequency: "daily",
          xp_value: 20,
          is_active: true,
          streak: 0,
        });
      }

      // 4. Insert first goal
      if (goalName.trim() && parseFloat(goalAmount) > 0) {
        await supabase.from("goals").insert({
          uid,
          name: goalName.trim(),
          emoji: GOAL_EMOJIS[goalCategory] ?? "🎯",
          category: goalCategory,
          target_amount: parseFloat(goalAmount),
          saved_amount: 0,
          deadline: goalDeadline ? `${goalDeadline}-01` : null,
          monthly_planned: 0,
        });
      }

      // Done — go to dashboard
      router.replace(`/${locale}`);
    } catch (err) {
      console.error("Onboarding error:", err);
    } finally {
      setSaving(false);
    }
  };

  const handleNext = async () => {
    if (step < 3) {
      setStep((s) => s + 1);
    } else {
      await handleComplete();
    }
  };

  const progress = ((step + 1) / 4) * 100;

  return (
    <div className="min-h-dvh bg-nexus flex flex-col items-center justify-center p-6">
      {/* Progress bar */}
      <div className="w-full max-w-md mb-8">
        <div className="flex justify-between mb-2">
          {steps.map((s, i) => {
            const Icon = STEP_ICONS[i];
            return (
              <div
                key={i}
                className="flex flex-col items-center gap-1"
                style={{ opacity: i <= step ? 1 : 0.3 }}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300"
                  style={{
                    background: i < step
                      ? STEP_COLORS[i]
                      : i === step
                        ? STEP_COLORS[i] + "33"
                        : "rgba(255,255,255,0.06)",
                    border: i <= step ? `2px solid ${STEP_COLORS[i]}` : "2px solid rgba(255,255,255,0.1)",
                  }}
                >
                  {i < step ? (
                    <Check size={14} className="text-white" />
                  ) : (
                    <Icon size={14} style={{ color: i === step ? STEP_COLORS[i] : "#475569" }} />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${progress}%`,
              background: `linear-gradient(90deg, ${STEP_COLORS[0]}, ${STEP_COLORS[step]})`,
            }}
          />
        </div>
        <p className="text-muted text-xs text-right mt-1">Passo {step + 1} de 4</p>
      </div>

      {/* Card */}
      <div
        className="glass w-full max-w-md p-8 animate-slide-up"
        style={{ borderColor: currentStep.color + "33" }}
      >
        {/* Icon */}
        <div
          className="w-14 h-14 rounded-2xl flex items-center justify-center mb-6"
          style={{ background: currentStep.color + "20", border: `1px solid ${currentStep.color}40` }}
        >
          <StepIcon size={28} style={{ color: currentStep.color }} />
        </div>

        <h2 className="text-primary font-bold text-2xl mb-2">{currentStep.title}</h2>
        <p className="text-secondary text-sm mb-8 leading-relaxed">{currentStep.subtitle}</p>

        {/* Step content */}
        {step === 0 && (
          <div className="flex flex-col gap-4">
            <label className="text-secondary text-sm font-medium">Como posso te chamar?</label>
            <input
              className="w-full px-4 py-3 rounded-xl text-primary text-base outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
              placeholder="Seu nome"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoFocus
            />
          </div>
        )}

        {step === 1 && (
          <div className="flex flex-col gap-4">
            <label className="text-secondary text-sm font-medium">Salário Mensal (R$)</label>
            <input
              type="number"
              className="w-full px-4 py-3 rounded-xl text-primary text-base outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
              placeholder="Ex: 5000"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              autoFocus
            />
            <p className="text-muted text-xs">
              Isso é usado para calcular seu saldo disponível e taxa de economia. Pode atualizar depois.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="flex flex-col gap-4">
            <label className="text-secondary text-sm font-medium">Nome do Hábito</label>
            <input
              className="w-full px-4 py-3 rounded-xl text-primary text-base outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
              placeholder="Ex: Exercitar 30 min"
              value={habitName}
              onChange={(e) => setHabitName(e.target.value)}
              autoFocus
            />
            <label className="text-secondary text-sm font-medium">Escolha um emoji</label>
            <div className="flex flex-wrap gap-2">
              {HABIT_EMOJIS.map((emoji) => (
                <button
                  key={emoji}
                  onClick={() => setHabitEmoji(emoji)}
                  className="w-10 h-10 rounded-xl text-xl transition-all"
                  style={{
                    background: habitEmoji === emoji ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.06)",
                    border: habitEmoji === emoji ? "2px solid #8b5cf6" : "2px solid transparent",
                  }}
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="flex flex-col gap-4">
            <label className="text-secondary text-sm font-medium">Nome da Meta</label>
            <input
              className="w-full px-4 py-3 rounded-xl text-primary text-base outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
              placeholder="Ex: Viagem para o Japão"
              value={goalName}
              onChange={(e) => setGoalName(e.target.value)}
              autoFocus
            />
            <label className="text-secondary text-sm font-medium">Categoria</label>
            <div className="flex flex-wrap gap-2">
              {GOAL_CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setGoalCategory(cat)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                  style={{
                    background: goalCategory === cat ? "rgba(245,158,11,0.2)" : "rgba(255,255,255,0.06)",
                    border: goalCategory === cat ? "1px solid #f59e0b" : "1px solid transparent",
                    color: goalCategory === cat ? "#f59e0b" : "#94a3b8",
                  }}
                >
                  {GOAL_EMOJIS[cat]} {cat}
                </button>
              ))}
            </div>
            <label className="text-secondary text-sm font-medium">Valor Total (R$)</label>
            <input
              type="number"
              className="w-full px-4 py-3 rounded-xl text-primary text-base outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
              placeholder="Ex: 15000"
              value={goalAmount}
              onChange={(e) => setGoalAmount(e.target.value)}
            />
            <label className="text-secondary text-sm font-medium">Prazo (opcional)</label>
            <input
              type="month"
              className="w-full px-4 py-3 rounded-xl text-primary text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
              value={goalDeadline}
              onChange={(e) => setGoalDeadline(e.target.value)}
            />
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <NexusButton
              variant="secondary"
              className="flex-1"
              onClick={() => setStep((s) => s - 1)}
            >
              Voltar
            </NexusButton>
          )}
          <NexusButton
            variant="primary"
            className="flex-1"
            disabled={!canAdvance()}
            loading={saving}
            onClick={handleNext}
            rightIcon={step < 3 ? <ChevronRight size={16} /> : undefined}
          >
            {step === 3 ? "🚀 Começar" : "Próximo"}
          </NexusButton>
        </div>
      </div>

      {/* Branding */}
      <p className="text-muted text-xs mt-8 opacity-50">✦ NEXUS LIFE OS</p>
    </div>
  );
}
