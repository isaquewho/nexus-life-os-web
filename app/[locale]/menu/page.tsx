"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { useAuthStore } from "@/stores/authStore";
import { useHabitStore } from "@/stores/habitStore";
import { useGoalStore } from "@/stores/goalStore";
import { useFinanceStore } from "@/stores/financeStore";
import { createClient } from "@/lib/supabase/client";
import GlassCard from "@/components/ui/GlassCard";
import NexusButton from "@/components/ui/NexusButton";
import { formatCurrency, formatDateKey } from "@/lib/utils";
import { LogOut, Settings, Globe, Wallet, Target, Trophy, Star } from "lucide-react";
import Link from "next/link";

const LANGUAGES = [
  { code: "pt-BR", label: "Português (BR)", flag: "🇧🇷" },
  { code: "en-US", label: "English (US)", flag: "🇺🇸" },
  { code: "es-ES", label: "Español", flag: "🇪🇸" },
  { code: "zh-CN", label: "中文 (简体)", flag: "🇨🇳" },
  { code: "hi-IN", label: "हिंदी", flag: "🇮🇳" },
  { code: "ar-SA", label: "العربية", flag: "🇸🇦" },
];

export default function MenuPage() {
  const t = useTranslations("menu");
  const router = useRouter();
  const pathname = usePathname();
  const { profile, setProfile } = useAuthStore();
  const { habits, logs } = useHabitStore();
  const { goals } = useGoalStore();
  const financeStore = useFinanceStore();

  const [showLogout, setShowLogout] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const locale = pathname.split("/")[1] || "pt-BR";
  const summary = financeStore.getSummary();
  const today = formatDateKey();
  const todayDone = logs.filter(l => l.date_key === today && l.completed).length;
  const activeHabits = habits.filter(h => h.is_active).length;
  const achieved = goals.filter(g => g.saved_amount >= g.target_amount).length;

  const handleLogout = async () => {
    setLoggingOut(true);
    const supabase = createClient();
    await supabase.auth.signOut();
    setProfile(null);
    router.replace(`/${locale}/login`);
  };

  const handleLangChange = (code: string) => {
    const pathSegments = pathname.split("/");
    pathSegments[1] = code;
    router.push(pathSegments.join("/"));
  };

  const currentLang = LANGUAGES.find(l => l.code === locale) ?? LANGUAGES[0];

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto w-full">
      <h1 className="text-primary text-2xl font-bold mb-6">{t("title")}</h1>

      {/* Profile Card */}
      <GlassCard padding="md" glowColor="blue" className="mb-4">
        <div className="flex items-center gap-4">
          <div
            className="w-16 h-16 rounded-full flex items-center justify-center text-white text-2xl font-bold shrink-0"
            style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
          >
            {profile?.full_name?.[0]?.toUpperCase() ?? "✦"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-primary font-semibold text-lg truncate">
              {profile?.full_name ?? "Usuário Nexus"}
            </p>
            <p className="text-secondary text-sm truncate">{profile?.email ?? ""}</p>
            <div className="flex items-center gap-1 mt-1">
              <Star size={12} className="text-habit" />
              <span className="text-habit text-xs font-medium">{profile?.total_xp ?? 0} XP</span>
            </div>
          </div>
        </div>
      </GlassCard>

      {/* Summary */}
      <GlassCard padding="md" className="mb-4">
        <h2 className="text-secondary text-xs uppercase tracking-wider mb-3">{t("summary")}</h2>
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="flex justify-center mb-1">
              <Wallet size={16} className="text-atlas" />
            </div>
            <p className="text-primary font-semibold text-sm">{formatCurrency(summary.realBalance)}</p>
            <p className="text-muted text-xs">{t("balance")}</p>
          </div>
          <div className="text-center">
            <div className="flex justify-center mb-1">
              <Target size={16} className="text-habit" />
            </div>
            <p className="text-primary font-semibold text-sm">{todayDone}/{activeHabits}</p>
            <p className="text-muted text-xs">{t("habits")}</p>
          </div>
          <div className="text-center">
            <div className="flex justify-center mb-1">
              <Trophy size={16} className="text-finance" />
            </div>
            <p className="text-primary font-semibold text-sm">{achieved}/{goals.length}</p>
            <p className="text-muted text-xs">{t("goals")}</p>
          </div>
        </div>
      </GlassCard>

      {/* Language Selector */}
      <GlassCard padding="md" className="mb-4">
        <h2 className="text-secondary text-xs uppercase tracking-wider mb-3 flex items-center gap-2">
          <Globe size={14} />
          {t("language")}
        </h2>
        <div className="grid grid-cols-2 gap-2">
          {LANGUAGES.map(lang => (
            <button
              key={lang.code}
              onClick={() => handleLangChange(lang.code)}
              className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm transition-all text-left"
              style={{
                background: locale === lang.code ? "rgba(59,130,246,0.15)" : "rgba(255,255,255,0.04)",
                border: locale === lang.code ? "1px solid rgba(59,130,246,0.4)" : "1px solid rgba(255,255,255,0.08)",
                color: locale === lang.code ? "#3b82f6" : "#94a3b8",
              }}
            >
              <span className="text-lg">{lang.flag}</span>
              <span className="truncate text-xs font-medium">{lang.label}</span>
              {locale === lang.code && <span className="ml-auto text-atlas text-xs">✓</span>}
            </button>
          ))}
        </div>
      </GlassCard>

          <Link
            href={`/${locale}/finance/config`}
            className="flex items-center gap-3 px-3 py-3 rounded-xl transition-all hover:bg-white/5"
          >
            <Settings size={16} className="text-atlas" />
            <span className="text-primary text-sm">{t("financeConfig")}</span>
            <span className="ml-auto text-muted">→</span>
          </Link>

      {/* Logout */}
      <NexusButton
        variant="danger"
        className="w-full"
        leftIcon={<LogOut size={16} />}
        onClick={() => setShowLogout(true)}
      >
        {t("logout")}
      </NexusButton>

      {/* Logout Confirm Modal */}
      {showLogout && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(4px)" }}
        >
          <div className="glass w-full max-w-sm p-6 flex flex-col gap-4 animate-slide-up text-center">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center mx-auto"
              style={{ background: "rgba(244,63,94,0.15)" }}
            >
              <LogOut size={20} className="text-expense" />
            </div>
            <div>
              <h3 className="text-primary font-semibold">{t("logout")}</h3>
              <p className="text-secondary text-sm mt-1">{t("logoutConfirm")}</p>
            </div>
            <div className="flex gap-2">
              <NexusButton variant="secondary" className="flex-1" onClick={() => setShowLogout(false)}>
                Cancelar
              </NexusButton>
              <NexusButton variant="danger" className="flex-1" onClick={handleLogout} loading={loggingOut}>
                Sair
              </NexusButton>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
