"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useFinanceStore } from "@/stores/financeStore";
import { createClient } from "@/lib/supabase/client";
import GlassCard from "@/components/ui/GlassCard";
import NexusButton from "@/components/ui/NexusButton";
import { formatCurrency } from "@/lib/utils";
import { Plus, Trash2, Save, DollarSign } from "lucide-react";

const CATEGORIES = ["moradia", "transporte", "saude", "educacao", "lazer", "assinatura", "alimentacao", "outros"];

export default function FinanceConfigPage() {
  const t = useTranslations("finance");
  const tCommon = useTranslations("common");
  const { config, fixedExpenses, setConfig, setFixedExpenses } = useFinanceStore();

  const [salary, setSalary] = useState(config?.salary?.toString() ?? "");
  const [savingSalary, setSavingSalary] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [newExpense, setNewExpense] = useState({ name: "", amount: "", category: "moradia" });
  const [savingExpense, setSavingExpense] = useState(false);

  useEffect(() => {
    const supabase = createClient();
    const load = async () => {
      const [cfg, fx] = await Promise.all([
        supabase.from("financial_config").select("*").single(),
        supabase.from("fixed_expenses").select("*").eq("is_active", true),
      ]);
      if (cfg.data) { setConfig(cfg.data); setSalary(cfg.data.salary.toString()); }
      if (fx.data) setFixedExpenses(fx.data);
    };
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalFixed = fixedExpenses.filter(e => e.is_active).reduce((s, e) => s + e.amount, 0);
  const salaryNum = parseFloat(salary) || 0;
  const commitPercent = salaryNum > 0 ? ((totalFixed / salaryNum) * 100).toFixed(0) : "0";

  const handleSaveSalary = async () => {
    setSavingSalary(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      const uid = user?.id;
      if (!uid) {
        alert("Erro de autenticação");
        console.error(userErr);
        return;
      }

      const { data, error } = await supabase
        .from("financial_config")
        .upsert({ uid, salary: parseFloat(salary.replace(',', '.')), updated_at: new Date().toISOString() }, { onConflict: "uid" })
        .select()
        .single();
        
      if (error) {
        alert("Erro ao salvar: " + error.message);
        console.error("Upsert error:", error);
        return;
      }
      if (data) setConfig(data);
    } finally {
      setSavingSalary(false);
    }
  };

  const handleAddExpense = async () => {
    if (!newExpense.name || !newExpense.amount) return;
    setSavingExpense(true);
    try {
      const supabase = createClient();
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      const uid = user?.id;
      if (!uid) {
        alert("Erro de autenticação");
        console.error(userErr);
        return;
      }

      const { data, error } = await supabase
        .from("fixed_expenses")
        .insert({ uid, name: newExpense.name, amount: parseFloat(newExpense.amount.replace(',', '.')), category: newExpense.category })
        .select()
        .single();
        
      if (error) {
        alert("Erro ao adicionar: " + error.message);
        console.error("Insert error:", error);
        return;
      }
      
      if (data) {
        setFixedExpenses([...fixedExpenses, data]);
        setNewExpense({ name: "", amount: "", category: "moradia" });
        setShowAdd(false);
      }
    } finally {
      setSavingExpense(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    const supabase = createClient();
    await supabase.from("fixed_expenses").update({ is_active: false }).eq("id", id);
    setFixedExpenses(fixedExpenses.filter((e) => e.id !== id));
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto w-full">
      <h1 className="text-primary text-2xl font-bold mb-2">{t("configTitle")}</h1>
      <p className="text-secondary text-sm mb-6">{t("configDesc")}</p>

      {/* Salary */}
      <GlassCard glowColor="green" padding="md" className="mb-5">
        <h2 className="text-primary font-semibold mb-4 flex items-center gap-2">
          <DollarSign size={16} className="text-finance" />
          {t("monthlySalary")}
        </h2>
        <div className="flex gap-3">
          <div className="relative flex-1">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">R$</span>
            <input
              type="number"
              className="w-full pl-9 pr-4 py-3 rounded-xl text-primary text-sm outline-none"
              style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
              placeholder={t("salaryPlaceholder")}
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
            />
          </div>
          <NexusButton
            variant="primary"
            size="md"
            leftIcon={<Save size={14} />}
            onClick={handleSaveSalary}
            loading={savingSalary}
          >
            {tCommon("save")}
          </NexusButton>
        </div>
        {salaryNum > 0 && (
          <p className="text-muted text-xs mt-3">
            {t("commitPercent", { percent: commitPercent })}
          </p>
        )}
      </GlassCard>

      {/* Fixed Expenses */}
      <GlassCard padding="md">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-primary font-semibold">{t("fixedExpenses")}</h2>
          <NexusButton
            variant="secondary"
            size="sm"
            leftIcon={<Plus size={14} />}
            onClick={() => setShowAdd(true)}
          >
            {t("addFixedExpense")}
          </NexusButton>
        </div>

        {fixedExpenses.filter(e => e.is_active).length === 0 ? (
          <p className="text-muted text-sm text-center py-8">{t("noFixedExpenses")}</p>
        ) : (
          <div className="flex flex-col gap-2">
            {fixedExpenses.filter(e => e.is_active).map((expense) => (
              <div
                key={expense.id}
                className="flex items-center justify-between py-3 border-b border-white/5 last:border-0"
              >
                <div>
                  <p className="text-primary text-sm font-medium">{expense.name}</p>
                  <p className="text-muted text-xs capitalize">{expense.category}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-secondary font-semibold text-sm">{formatCurrency(expense.amount)}</span>
                  <button
                    onClick={() => handleDeleteExpense(expense.id)}
                    className="text-muted hover:text-expense transition-colors"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
            <div className="flex justify-between pt-3 mt-1">
              <span className="text-secondary text-sm font-semibold">Total Fixos</span>
              <span className="text-expense font-bold">{formatCurrency(totalFixed)}</span>
            </div>
          </div>
        )}
      </GlassCard>

      {/* Add Expense Modal */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={e => e.target === e.currentTarget && setShowAdd(false)}
        >
          <div className="glass w-full max-w-md p-6 animate-slide-up">
            <h3 className="text-primary font-semibold text-lg mb-4">{t("addFixedExpense")}</h3>
            <div className="flex flex-col gap-3">
              <input
                className="w-full px-4 py-2.5 rounded-xl text-primary text-sm outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                placeholder={t("fixedName")}
                value={newExpense.name}
                onChange={e => setNewExpense(p => ({ ...p, name: e.target.value }))}
              />
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted text-sm">R$</span>
                <input
                  type="number"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl text-primary text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)" }}
                  placeholder={t("fixedAmount")}
                  value={newExpense.amount}
                  onChange={e => setNewExpense(p => ({ ...p, amount: e.target.value }))}
                />
              </div>
              <select
                className="px-4 py-2.5 rounded-xl text-primary text-sm outline-none"
                style={{ background: "#0f0f1a", border: "1px solid rgba(255,255,255,0.12)" }}
                value={newExpense.category}
                onChange={e => setNewExpense(p => ({ ...p, category: e.target.value }))}
              >
                {CATEGORIES.map(c => (
                  <option key={c} value={c} className="capitalize">{c}</option>
                ))}
              </select>
              <div className="flex gap-2 mt-1">
                <NexusButton variant="secondary" className="flex-1" onClick={() => setShowAdd(false)}>Cancelar</NexusButton>
                <NexusButton variant="primary" className="flex-1" onClick={handleAddExpense} loading={savingExpense}>Salvar</NexusButton>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
