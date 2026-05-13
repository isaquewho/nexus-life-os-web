"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { useAtlasStore } from "@/stores/atlasStore";
import { useFinanceStore } from "@/stores/financeStore";
import { useHabitStore } from "@/stores/habitStore";
import { createClient } from "@/lib/supabase/client";
import { formatCurrency, formatDateKey } from "@/lib/utils";
import { Send, Sparkles } from "lucide-react";
import type { AtlasMessage } from "@/types";

// ── NLP Engine ────────────────────────────────────────────────────────────────

type ParsedIntent =
  | { type: "expense"; amount: number; description: string; category: string }
  | { type: "income"; amount: number; description: string }
  | { type: "habit_complete"; habitName: string }
  | { type: "query_balance" }
  | { type: "query_summary" }
  | { type: "query_streaks" }
  | { type: "unknown" };

function parseMessage(msg: string): ParsedIntent {
  const m = msg.toLowerCase().trim();
  const amountMatch = m.match(/r?\$?\s*(\d+(?:[.,]\d+)?)/);
  const amount = amountMatch ? parseFloat(amountMatch[1].replace(",", ".")) : 0;

  const expenseKw = /gastei|paguei|comprei|saiu|custou|gastar|pagar/;
  const incomeKw = /recebi|ganhei|entrou|faturo|freelance|freela|bonus|bônus|vendi/;
  const habitKw = /completei|fiz|terminei|pratiquei|concluí|conclui/;
  const balanceKw = /saldo|quanto (tenho|sobrou|resta)|meu saldo/;
  const summaryKw = /resumo|como estou|situação|visão geral/;
  const streaksKw = /streak|sequência|dias consecutivos/;

  const extractDescription = (txt: string) => {
    return txt.replace(/r?\$?\s*\d+(?:[.,]\d+)?/g, "")
      .replace(/gastei|paguei|comprei|saiu|custou|recebi|ganhei|entrou/g, "")
      .replace(/de |em |no |na |um |uma /g, "")
      .trim() || "gasto";
  };

  const guessCategory = (desc: string) => {
    const d = desc.toLowerCase();
    if (/restaurante|comida|almoço|jantar|lanche|café|pizza/.test(d)) return "alimentacao";
    if (/uber|taxi|ônibus|gasolina|combustível|metrô/.test(d)) return "transporte";
    if (/farmácia|médico|remédio|saúde/.test(d)) return "saude";
    if (/netflix|spotify|amazon|assinatura|streaming/.test(d)) return "assinatura";
    if (/academia|ginásio|esporte/.test(d)) return "lazer";
    if (/aluguel|condomínio|iptu/.test(d)) return "moradia";
    return "outros";
  };

  if (expenseKw.test(m) && amount > 0) {
    const desc = extractDescription(m);
    return { type: "expense", amount, description: desc, category: guessCategory(desc) };
  }
  if (incomeKw.test(m) && amount > 0) {
    const desc = extractDescription(m);
    return { type: "income", amount, description: desc };
  }
  if (habitKw.test(m)) {
    const habitName = m.replace(/completei|fiz|terminei|pratiquei|concluí/g, "").trim();
    return { type: "habit_complete", habitName };
  }
  if (streaksKw.test(m)) return { type: "query_streaks" };
  if (summaryKw.test(m)) return { type: "query_summary" };
  if (balanceKw.test(m)) return { type: "query_balance" };

  return { type: "unknown" };
}

// ── Component ─────────────────────────────────────────────────────────────────

const QUICK_CHIPS = [
  { label: "💰 Saldo", message: "qual meu saldo?" },
  { label: "📊 Resumo", message: "me dê um resumo" },
  { label: "🔥 Streaks", message: "mostrar streaks" },
  { label: "➕ Entrada", message: "recebi " },
  { label: "➖ Gasto", message: "gastei " },
];

export default function AtlasPage() {
  const t = useTranslations("atlas");
  const { messages, isTyping, addMessage, setTyping } = useAtlasStore();
  const financeStore = useFinanceStore();
  const { habits, logs, setHabits, setLogs } = useHabitStore();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // Load initial data
    const supabase = createClient();
    const init = async () => {
      const [habs, hlogs] = await Promise.all([
        supabase.from("habits").select("*").eq("is_active", true),
        supabase.from("habit_logs").select("*").eq("date_key", formatDateKey()),
      ]);
      if (habs.data) setHabits(habs.data);
      if (hlogs.data) setLogs(hlogs.data);
    };
    init();

    if (messages.length === 0) {
      addMessage({
        id: crypto.randomUUID(),
        role: "atlas",
        content: t("welcome"),
        created_at: new Date().toISOString(),
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  const processIntent = async (
    intent: ParsedIntent,
    supabase: ReturnType<typeof createClient>,
    uid: string
  ): Promise<string> => {
    const summary = financeStore.getSummary();

    switch (intent.type) {
      case "expense": {
        await supabase.from("transactions").insert({
          uid,
          description: intent.description,
          amount: intent.amount,
          category: intent.category,
          type: "expense",
          date: new Date().toISOString().split("T")[0],
          source: "atlas",
          transaction_layer: "variable",
        });
        // Refresh store
        const newTransactions = [
          { id: crypto.randomUUID(), uid, description: intent.description, amount: intent.amount, category: intent.category, type: "expense" as const, date: new Date().toISOString().split("T")[0], source: "atlas", transaction_layer: "variable" as const, is_recurring: false, created_at: new Date().toISOString() },
          ...financeStore.transactions,
        ];
        financeStore.setTransactions(newTransactions);
        const newSummary = financeStore.getSummary();
        return t("responses.expense", {
          amount: formatCurrency(intent.amount),
          category: intent.category,
          balance: formatCurrency(newSummary.realBalance),
        });
      }

      case "income": {
        await supabase.from("transactions").insert({
          uid,
          description: intent.description,
          amount: intent.amount,
          category: "outros",
          type: "income",
          date: new Date().toISOString().split("T")[0],
          source: "atlas",
          transaction_layer: "extra",
        });
        const newTransactions = [
          { id: crypto.randomUUID(), uid, description: intent.description, amount: intent.amount, category: "outros", type: "income" as const, date: new Date().toISOString().split("T")[0], source: "atlas", transaction_layer: "extra" as const, is_recurring: false, created_at: new Date().toISOString() },
          ...financeStore.transactions,
        ];
        financeStore.setTransactions(newTransactions);
        const newSummary = financeStore.getSummary();
        return t("responses.income", {
          amount: formatCurrency(intent.amount),
          balance: formatCurrency(newSummary.realBalance),
        });
      }

      case "habit_complete": {
        const habit = habits.find((h) =>
          h.name.toLowerCase().includes(intent.habitName.toLowerCase().slice(0, 5))
        );
        if (!habit) return t("responses.habitNotFound", { name: intent.habitName });
        const today = formatDateKey();
        const alreadyDone = logs.some(
          (l) => l.habit_id === habit.id && l.date_key === today && l.completed
        );
        if (alreadyDone) return t("responses.habitAlreadyDone", { habit: `${habit.emoji} ${habit.name}` });
        await supabase.from("habit_logs").upsert(
          { habit_id: habit.id, uid, date_key: today, completed: true, logged_at: new Date().toISOString() },
          { onConflict: "habit_id,date_key" }
        );
        return t("responses.habit", {
          habit: `${habit.emoji} ${habit.name}`,
          xp: habit.xp_value,
          days: habit.streak + 1,
        });
      }

      case "query_balance":
        return t("responses.balance", {
          available: formatCurrency(summary.availableBalance),
          real: formatCurrency(summary.realBalance),
        });

      case "query_summary":
        return t("responses.summary", {
          salary: formatCurrency(summary.salary),
          fixed: formatCurrency(summary.totalFixed),
          fixedPct: summary.fixedPercent.toFixed(0),
          available: formatCurrency(summary.availableBalance),
          extras: formatCurrency(summary.totalExtras),
          variable: formatCurrency(summary.totalVariable),
          real: formatCurrency(summary.realBalance),
        });

      case "query_streaks": {
        if (habits.length === 0) return t("responses.noHabits");
        const lines = habits.map((h) => `${h.emoji} **${h.name}**: ${h.streak} dias`).join("\n");
        return t("responses.streaks", { lines });
      }

      default:
        return t("responses.unknown");
    }
  };

  const handleSend = async (text?: string) => {
    const msg = (text ?? input).trim();
    if (!msg) return;
    setInput("");

    const userMsg: AtlasMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: msg,
      created_at: new Date().toISOString(),
    };
    addMessage(userMsg);
    setTyping(true);

    try {
      const supabase = createClient();
      const { data: { user }, error: userErr } = await supabase.auth.getUser();
      const uid = user?.id;
      if (!uid) {
        addMessage({
          id: crypto.randomUUID(),
          role: "atlas",
          content: "❌ Erro de autenticação. Por favor, faça login novamente.",
          created_at: new Date().toISOString(),
        });
        console.error(userErr);
        setTyping(false);
        return;
      }

      const intent = parseMessage(msg);

      // Simulate typing delay
      await new Promise(r => setTimeout(r, 700 + Math.random() * 500));

      const response = await processIntent(intent, supabase, uid);

      addMessage({
        id: crypto.randomUUID(),
        role: "atlas",
        content: response,
        created_at: new Date().toISOString(),
      });
    } catch {
      addMessage({
        id: crypto.randomUUID(),
        role: "atlas",
        content: "❌ Erro ao processar. Tente novamente.",
        created_at: new Date().toISOString(),
      });
    } finally {
      setTyping(false);
    }
  };

  const renderContent = (content: string) => {
    return content.split("\n").map((line, i) => (
      <span key={i}>
        {line.split(/\*\*(.*?)\*\*/).map((part, j) =>
          j % 2 === 1 ? <strong key={j}>{part}</strong> : part
        )}
        {i < content.split("\n").length - 1 && <br />}
      </span>
    ));
  };

  return (
    <div className="flex flex-col h-dvh md:h-screen max-w-2xl mx-auto w-full">
      {/* Header */}
      <div
        className="flex items-center gap-3 p-4 border-b"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: "#0f0f1a" }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold"
          style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
        >
          ✦
        </div>
        <div>
          <h1 className="text-primary font-semibold">{t("title")}</h1>
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-finance animate-pulse-glow" />
            <span className="text-finance text-xs">{t("online")}</span>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3 pb-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in`}
          >
            {msg.role === "atlas" && (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs text-white shrink-0 mr-2 mt-1"
                style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
              >
                ✦
              </div>
            )}
            <div
              className="max-w-[80%] px-4 py-3 text-sm leading-relaxed"
              style={
                msg.role === "user"
                  ? {
                      background: "linear-gradient(135deg, #3b82f6, #6366f1)",
                      color: "#fff",
                      borderRadius: "18px 18px 4px 18px",
                    }
                  : {
                      background: "rgba(255,255,255,0.06)",
                      border: "1px solid rgba(255,255,255,0.1)",
                      color: "#f8fafc",
                      borderRadius: "18px 18px 18px 4px",
                    }
              }
            >
              {renderContent(msg.content)}
            </div>
          </div>
        ))}

        {isTyping && (
          <div className="flex items-center gap-2 animate-fade-in">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs text-white shrink-0"
              style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)" }}
            >
              ✦
            </div>
            <div
              className="px-4 py-3 flex gap-1"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.1)",
                borderRadius: "18px 18px 18px 4px",
              }}
            >
              {[0, 1, 2].map(i => (
                <span
                  key={i}
                  className="w-2 h-2 rounded-full bg-secondary"
                  style={{ animation: `pulse-glow 1.4s ease ${i * 0.2}s infinite` }}
                />
              ))}
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Quick Chips */}
      <div className="px-4 pb-2 flex gap-2 overflow-x-auto">
        {QUICK_CHIPS.map((chip) => (
          <button
            key={chip.label}
            onClick={() => {
              if (chip.message.endsWith(" ")) {
                setInput(chip.message);
                inputRef.current?.focus();
              } else {
                handleSend(chip.message);
              }
            }}
            className="px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all hover:opacity-80"
            style={{
              background: "rgba(59,130,246,0.12)",
              color: "#3b82f6",
              border: "1px solid rgba(59,130,246,0.25)",
            }}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {/* Input */}
      <div
        className="p-4 flex gap-3 items-end border-t mb-16 md:mb-0"
        style={{ borderColor: "rgba(255,255,255,0.08)", background: "#0f0f1a" }}
      >
        <input
          ref={inputRef}
          className="flex-1 px-4 py-3 rounded-2xl text-primary text-sm outline-none"
          style={{
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            caretColor: "#3b82f6",
          }}
          placeholder={t("placeholder")}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && handleSend()}
        />
        <button
          id="atlas-send-btn"
          onClick={() => handleSend()}
          disabled={!input.trim() || isTyping}
          className="w-11 h-11 rounded-full flex items-center justify-center text-white transition-all hover:opacity-90 active:scale-95 shrink-0"
          style={{
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            opacity: !input.trim() || isTyping ? 0.5 : 1,
          }}
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
