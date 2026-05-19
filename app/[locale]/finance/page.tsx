"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useFinanceStore } from "@/stores/financeStore";
import { createClient } from "@/lib/supabase/client";
import GlassCard from "@/components/ui/GlassCard";
import NexusButton from "@/components/ui/NexusButton";
import { formatCurrency, formatDate } from "@/lib/utils";
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import { Plus } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const CATEGORY_EMOJIS: Record<string, string> = {
  alimentacao: "🍽️", transporte: "🚗", saude: "💊", lazer: "🎯",
  moradia: "🏠", educacao: "📚", roupas: "👕", viagem: "✈️",
  assinatura: "📱", outros: "💸", salario: "💼", freelance: "💻",
  bonus: "🎁", investimento: "📈", default: "💳",
};

type TabType = "fixed" | "extra" | "variable";

const TABS: { key: TabType; label: string; color: string }[] = [
  { key: "fixed",    label: "Fixos",     color: "#94a3b8" },
  { key: "extra",    label: "Extras",    color: "#10b981" },
  { key: "variable", label: "Variáveis", color: "#f43f5e" },
];

export default function FinancePage() {
  const t = useTranslations("finance");
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "pt-BR";

  const {
    config, fixedExpenses, transactions,
    setConfig, setFixedExpenses, setTransactions,
  } = useFinanceStore();
  const financeStore = useFinanceStore();

  const [activeTab, setActiveTab] = useState<TabType>("variable");
  const [showAddTxn, setShowAddTxn] = useState(false);
  const [newTxn, setNewTxn] = useState({
    description: "",
    amount: "",
    category: "outros",
    type: "expense" as "income" | "expense",
    date: new Date().toISOString().split("T")[0],
    layer: "variable" as TabType,
    isRecurring: false,
    recurringDay: new Date().getDate(),
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const [cfg, fx, txnsRes] = await Promise.all([
        supabase.from("financial_config").select("*").single(),
        supabase.from("fixed_expenses").select("*"),
        fetch("/api/transactions"),
      ]);
      if (cfg.data) setConfig(cfg.data);
      if (fx.data) setFixedExpenses(fx.data);
      if (txnsRes.ok) {
        const { data } = await txnsRes.json();
        if (data) setTransactions(data);
      } else {
        console.error("[finance] transactions load error:", txnsRes.statusText);
      }
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const summary = financeStore.getSummary();
  const filteredTxns = transactions.filter((t) => t.transaction_layer === activeTab);

  const handleAddTransaction = async () => {
    if (!newTxn.description || !newTxn.amount) return;
    setSaving(true);
    try {
      const res = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          description: newTxn.description,
          amount: newTxn.amount,
          category: newTxn.category,
          type: newTxn.type,
          date: newTxn.date,
          transaction_layer: newTxn.layer,
          is_recurring: newTxn.isRecurring,
          recurring_day: newTxn.isRecurring ? newTxn.recurringDay : null,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert("Erro ao adicionar transação: " + (json.error ?? res.statusText));
        console.error("[finance] POST error:", json);
        return;
      }
      setTransactions([json.data, ...transactions]);
      setShowAddTxn(false);
      setNewTxn({
        description: "", amount: "", category: "outros",
        type: "expense", date: new Date().toISOString().split("T")[0], layer: "variable",
        isRecurring: false, recurringDay: new Date().getDate(),
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteTransaction = async (id: string) => {
    const res = await fetch(`/api/transactions?id=${id}`, { method: "DELETE" });
    if (!res.ok) {
      const json = await res.json().catch(() => ({}));
      console.error("[finance] DELETE error:", json);
      return;
    }
    setTransactions(transactions.filter((t) => t.id !== id));
  };

  // Chart — last 7 days
  const now = new Date();
  const chartData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() - (6 - i));
    const key = d.toISOString().split("T")[0];
    const dayTxns = transactions.filter((t) => t.date === key);
    const income  = dayTxns.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);
    const expense = dayTxns.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
    return {
      day: d.toLocaleDateString(locale, { weekday: "short" }),
      receita: income,
      gasto: expense,
    };
  });

  const getLayerLabel = (layer: string) => TABS.find((t) => t.key === layer)?.label ?? layer;
  const getLayerColor = (layer: string) => TABS.find((t) => t.key === layer)?.color ?? "#94a3b8";

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto w-full">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-primary text-2xl font-bold">{t("title")}</h1>
        <Link href={`/${locale}/finance/config`}>
          <NexusButton variant="secondary" size="sm">⚙️ Config</NexusButton>
        </Link>
      </div>

      {/* Balance Cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <GlassCard glowColor="blue" padding="md">
          <p className="text-muted text-xs uppercase tracking-wider mb-1">{t("availableBalance")}</p>
          <p className="text-atlas font-bold text-2xl">{formatCurrency(summary.availableBalance)}</p>
          <p className="text-muted text-xs mt-1">Salário - Fixos</p>
        </GlassCard>
        <GlassCard glowColor="green" padding="md">
          <p className="text-muted text-xs uppercase tracking-wider mb-1">{t("realBalance")}</p>
          <p
            className="font-bold text-2xl"
            style={{ color: summary.realBalance >= 0 ? "#10b981" : "#f43f5e" }}
          >
            {formatCurrency(summary.realBalance)}
          </p>
          <p className="text-muted text-xs mt-1">{summary.savingsPercent.toFixed(1)}% do sal.</p>
        </GlassCard>
      </div>

      {/* Month progress bar */}
      <GlassCard padding="sm" className="mb-5">
        <div className="flex justify-between mb-2">
          <span className="text-secondary text-xs">Mês atual</span>
          <span className="text-secondary text-xs">
            {new Date().toLocaleDateString(locale, { month: "long", year: "numeric" })}
          </span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
          <div
            className="h-full rounded-full"
            style={{
              width: `${Math.min(100, (new Date().getDate() / new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()) * 100)}%`,
              background: "linear-gradient(90deg, #3b82f6, #8b5cf6)",
            }}
          />
        </div>
      </GlassCard>

      {/* Summary mini-cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <GlassCard padding="sm">
          <p className="text-muted text-xs">Fixos</p>
          <p className="text-secondary font-semibold">{formatCurrency(summary.totalFixed)}</p>
          <p className="text-muted text-xs">{summary.fixedPercent.toFixed(0)}% do sal.</p>
        </GlassCard>
        <GlassCard padding="sm">
          <p className="text-muted text-xs">Extras este mês</p>
          <p className="text-finance font-semibold">+{formatCurrency(summary.totalExtras)}</p>
        </GlassCard>
        <GlassCard padding="sm">
          <p className="text-muted text-xs">Variáveis este mês</p>
          <p className="text-expense font-semibold">-{formatCurrency(summary.totalVariable)}</p>
        </GlassCard>
        <GlassCard padding="sm">
          <p className="text-muted text-xs">Economia Real</p>
          <p className="font-semibold" style={{ color: summary.realBalance >= 0 ? "#10b981" : "#f43f5e" }}>
            {formatCurrency(summary.realBalance)}
          </p>
        </GlassCard>
      </div>

      {/* Chart */}
      <GlassCard padding="md" className="mb-5">
        <p className="text-secondary text-sm font-medium mb-4">Últimos 7 dias</p>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData} barSize={20}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="day" tick={{ fill: "#475569", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis hide />
            <Tooltip
              contentStyle={{ background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#f8fafc", fontSize: 12 }}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              formatter={(v: any) => [formatCurrency(v as number), ""]}
            />
            <Bar dataKey="receita" fill="#10b981" radius={[4, 4, 0, 0]} />
            <Bar dataKey="gasto"   fill="#f43f5e" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </GlassCard>

      {/* Transactions */}
      <GlassCard padding="md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-primary font-semibold">Transações</h2>
          <NexusButton
            variant="primary"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={() => setShowAddTxn(true)}
          >
            {t("addTransaction")}
          </NexusButton>
        </div>

        {/* Layer tabs */}
        <div className="flex gap-2 mb-4">
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
              style={{
                background: activeTab === tab.key ? tab.color + "22" : "rgba(255,255,255,0.06)",
                color: activeTab === tab.key ? tab.color : "#94a3b8",
                border: activeTab === tab.key ? `1px solid ${tab.color}44` : "1px solid transparent",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {filteredTxns.length === 0 ? (
          <p className="text-muted text-sm text-center py-8">Nenhuma transação nesta categoria</p>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredTxns.map((txn) => (
              <div
                key={txn.id}
                className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0"
              >
                <span className="text-xl">{CATEGORY_EMOJIS[txn.category] ?? CATEGORY_EMOJIS.default}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-primary text-sm font-medium truncate">{txn.description}</p>
                    {txn.is_recurring && (
                      <span className="text-muted text-xs" title="Recorrente">🔁</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span
                      className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                      style={{ background: getLayerColor(txn.transaction_layer) + "22", color: getLayerColor(txn.transaction_layer) }}
                    >
                      {getLayerLabel(txn.transaction_layer)}
                    </span>
                    <span className="text-muted text-xs">{formatDate(txn.date, locale)}</span>
                  </div>
                </div>
                <span
                  className="font-semibold text-sm whitespace-nowrap"
                  style={{ color: txn.type === "income" ? "#10b981" : "#f43f5e" }}
                >
                  {txn.type === "income" ? "+" : "-"}{formatCurrency(txn.amount)}
                </span>
                <button
                  onClick={() => handleDeleteTransaction(txn.id)}
                  className="text-muted hover:text-expense transition-colors ml-1 shrink-0"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      {/* Add Transaction Modal */}
      {showAddTxn && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={(e) => e.target === e.currentTarget && setShowAddTxn(false)}
        >
          <div className="glass w-full max-w-md p-6 animate-slide-up">
            <h3 className="text-primary font-semibold text-lg mb-4">Nova Transação</h3>
            <div className="flex flex-col gap-4">
              <input
                className="w-full px-4 py-2.5 rounded-xl text-primary text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                placeholder="Descrição"
                value={newTxn.description}
                onChange={(e) => setNewTxn((p) => ({ ...p, description: e.target.value }))}
              />
              <input
                type="number"
                className="w-full px-4 py-2.5 rounded-xl text-primary text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                placeholder="Valor (R$)"
                value={newTxn.amount}
                onChange={(e) => setNewTxn((p) => ({ ...p, amount: e.target.value }))}
              />
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="px-3 py-2 rounded-xl text-primary text-sm outline-none"
                  style={{ background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.12)" }}
                  value={newTxn.type}
                  onChange={(e) => setNewTxn((p) => ({ ...p, type: e.target.value as "income" | "expense" }))}
                >
                  <option value="expense">Gasto</option>
                  <option value="income">Entrada</option>
                </select>
                <select
                  className="px-3 py-2 rounded-xl text-primary text-sm outline-none"
                  style={{ background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.12)" }}
                  value={newTxn.layer}
                  onChange={(e) => setNewTxn((p) => ({ ...p, layer: e.target.value as TabType }))}
                >
                  <option value="variable">Variável</option>
                  <option value="extra">Extra</option>
                  <option value="fixed">Fixo</option>
                </select>
              </div>
              <input
                type="date"
                className="w-full px-4 py-2.5 rounded-xl text-primary text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                value={newTxn.date}
                onChange={(e) => setNewTxn((p) => ({ ...p, date: e.target.value }))}
              />
              {/* Recurring */}
              <label className="flex items-center gap-3 cursor-pointer">
                <div
                  className="w-9 h-5 rounded-full relative transition-all"
                  style={{ background: newTxn.isRecurring ? "#3b82f6" : "rgba(255,255,255,0.12)" }}
                  onClick={() => setNewTxn((p) => ({ ...p, isRecurring: !p.isRecurring }))}
                >
                  <div
                    className="absolute top-0.5 w-4 h-4 rounded-full bg-white transition-all"
                    style={{ left: newTxn.isRecurring ? "calc(100% - 18px)" : "2px" }}
                  />
                </div>
                <span className="text-secondary text-sm">🔁 Recorrente (todo mês)</span>
              </label>
              {newTxn.isRecurring && (
                <div className="flex items-center gap-3">
                  <span className="text-secondary text-sm whitespace-nowrap">Todo dia</span>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    className="w-20 px-3 py-2 rounded-xl text-primary text-sm outline-none text-center"
                    style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(59,130,246,0.4)" }}
                    value={newTxn.recurringDay}
                    onChange={(e) => setNewTxn((p) => ({ ...p, recurringDay: Math.min(28, Math.max(1, parseInt(e.target.value) || 1)) }))}
                  />
                  <span className="text-muted text-xs">do mês</span>
                </div>
              )}
              <div className="flex gap-2">
                <NexusButton variant="secondary" className="flex-1" onClick={() => setShowAddTxn(false)}>
                  Cancelar
                </NexusButton>
                <NexusButton variant="primary" className="flex-1" onClick={handleAddTransaction} loading={saving}>
                  Salvar
                </NexusButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
