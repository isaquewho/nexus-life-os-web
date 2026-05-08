"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UserPlus, Trash2, Mail, Users, Shield, Loader, AlertCircle, CheckCircle, LogOut } from "lucide-react";

const ADMIN_EMAIL = "isaquediass33@gmail.com";

type AllowedEmail = {
  id: string;
  email: string;
  created_at: string;
};

export default function AdminPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "pt-BR";

  const [checking, setChecking] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [emails, setEmails] = useState<AllowedEmail[]>([]);
  const [newEmail, setNewEmail] = useState("");
  const [adding, setAdding] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  // ── Auth check ──────────────────────────────────────────────────────────────
  useEffect(() => {
    const init = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session || session.user.email !== ADMIN_EMAIL) {
        router.replace(`/${locale}`);
        return;
      }

      setIsAdmin(true);
      await loadEmails(supabase);
      setChecking(false);
    };
    init();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadEmails = async (supabase: ReturnType<typeof createClient>) => {
    const { data } = await supabase
      .from("allowed_emails")
      .select("*")
      .order("created_at", { ascending: false });
    setEmails(data ?? []);
  };

  const showFeedback = (type: "success" | "error", msg: string) => {
    setFeedback({ type, msg });
    setTimeout(() => setFeedback(null), 3500);
  };

  // ── Add email ───────────────────────────────────────────────────────────────
  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newEmail.trim().toLowerCase();
    if (!trimmed) return;

    setAdding(true);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("allowed_emails")
        .insert({ email: trimmed });

      if (error) {
        if (error.code === "23505") {
          showFeedback("error", "Este e-mail já tem acesso.");
        } else {
          showFeedback("error", "Erro ao liberar acesso: " + error.message);
        }
      } else {
        showFeedback("success", `Acesso liberado para ${trimmed}`);
        setNewEmail("");
        await loadEmails(supabase);
      }
    } catch {
      showFeedback("error", "Erro inesperado.");
    } finally {
      setAdding(false);
    }
  };

  // ── Remove email ────────────────────────────────────────────────────────────
  const handleRemove = async (id: string, email: string) => {
    if (email === ADMIN_EMAIL) {
      showFeedback("error", "Você não pode remover seu próprio acesso.");
      return;
    }
    setRemoving(id);
    try {
      const supabase = createClient();
      const { error } = await supabase
        .from("allowed_emails")
        .delete()
        .eq("id", id);

      if (error) {
        showFeedback("error", "Erro ao revogar acesso.");
      } else {
        showFeedback("success", `Acesso revogado: ${email}`);
        setEmails((prev) => prev.filter((e) => e.id !== id));
      }
    } catch {
      showFeedback("error", "Erro inesperado.");
    } finally {
      setRemoving(null);
    }
  };

  const handleLogout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace(`/${locale}/login`);
  };

  // ── Loading / unauthorized ─────────────────────────────────────────────────
  if (checking) {
    return (
      <div className="min-h-dvh bg-nexus flex items-center justify-center">
        <Loader className="animate-spin text-muted" size={28} />
      </div>
    );
  }

  if (!isAdmin) return null;

  // ── UI ─────────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-dvh p-6 flex flex-col items-center"
      style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.1) 0%, #000 60%)" }}
    >
      {/* Header */}
      <div className="w-full max-w-lg flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", boxShadow: "0 0 24px rgba(59,130,246,0.35)" }}
          >
            <Shield size={18} className="text-white" />
          </div>
          <div>
            <h1 className="text-primary font-bold text-lg">Painel Admin</h1>
            <p className="text-muted text-xs">Gerenciar acessos ao Nexus</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-2 text-muted hover:text-expense transition-colors text-sm"
        >
          <LogOut size={15} />
          Sair
        </button>
      </div>

      {/* Stats */}
      <div className="w-full max-w-lg grid grid-cols-2 gap-3 mb-6">
        <div className="glass p-4 rounded-2xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(59,130,246,0.15)" }}>
            <Users size={16} className="text-atlas" />
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">{emails.length}</p>
            <p className="text-muted text-xs">Usuários com acesso</p>
          </div>
        </div>
        <div className="glass p-4 rounded-2xl flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
            <Shield size={16} className="text-finance" />
          </div>
          <div>
            <p className="text-2xl font-bold text-primary">1</p>
            <p className="text-muted text-xs">Admin ativo</p>
          </div>
        </div>
      </div>

      {/* Add email form */}
      <div className="w-full max-w-lg glass p-6 rounded-2xl mb-4">
        <h2 className="text-primary font-semibold mb-4 flex items-center gap-2">
          <UserPlus size={16} className="text-atlas" />
          Liberar acesso
        </h2>
        <form onSubmit={handleAdd} className="flex gap-3">
          <div className="relative flex-1">
            <Mail size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted pointer-events-none" />
            <input
              type="email"
              required
              placeholder="email@cliente.com"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full pl-9 pr-4 py-3 rounded-xl text-primary text-sm outline-none transition-all"
              style={{
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.12)",
                caretColor: "#3b82f6",
              }}
              onFocus={(e) => { e.target.style.borderColor = "rgba(59,130,246,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.08)"; }}
              onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.boxShadow = "none"; }}
            />
          </div>
          <button
            type="submit"
            disabled={adding}
            className="flex items-center gap-2 px-4 py-3 rounded-xl font-semibold text-sm text-white transition-all shrink-0"
            style={{
              background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
              boxShadow: "0 4px 16px rgba(59,130,246,0.3)",
              opacity: adding ? 0.6 : 1,
            }}
          >
            {adding ? <Loader size={15} className="animate-spin" /> : <UserPlus size={15} />}
            Liberar
          </button>
        </form>
      </div>

      {/* Feedback toast */}
      {feedback && (
        <div
          className="w-full max-w-lg flex items-center gap-2 px-4 py-3 rounded-xl mb-4 transition-all"
          style={{
            background: feedback.type === "success" ? "rgba(16,185,129,0.12)" : "rgba(244,63,94,0.1)",
            border: `1px solid ${feedback.type === "success" ? "rgba(16,185,129,0.3)" : "rgba(244,63,94,0.25)"}`,
          }}
        >
          {feedback.type === "success"
            ? <CheckCircle size={15} className="text-finance shrink-0" />
            : <AlertCircle size={15} className="text-expense shrink-0" />
          }
          <p className="text-sm" style={{ color: feedback.type === "success" ? "#10b981" : "#f43f5e" }}>
            {feedback.msg}
          </p>
        </div>
      )}

      {/* Email list */}
      <div className="w-full max-w-lg glass rounded-2xl overflow-hidden">
        <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <h2 className="text-primary font-semibold text-sm flex items-center gap-2">
            <Mail size={14} className="text-muted" />
            Acessos liberados
          </h2>
        </div>

        {emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users size={32} className="text-muted mb-3 opacity-40" />
            <p className="text-secondary text-sm">Nenhum e-mail liberado ainda.</p>
            <p className="text-muted text-xs mt-1">Adicione o e-mail de um cliente acima.</p>
          </div>
        ) : (
          <ul>
            {emails.map((item, i) => (
              <li
                key={item.id}
                className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-white/[0.02]"
                style={{ borderBottom: i < emails.length - 1 ? "1px solid rgba(255,255,255,0.05)" : "none" }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    style={{ background: item.email === ADMIN_EMAIL ? "rgba(245,158,11,0.15)" : "rgba(59,130,246,0.12)" }}
                  >
                    <span className="text-sm">
                      {item.email === ADMIN_EMAIL ? "👑" : item.email[0].toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <p className="text-primary text-sm font-medium">{item.email}</p>
                    <p className="text-muted text-xs">
                      {item.email === ADMIN_EMAIL ? "Admin" : `Desde ${new Date(item.created_at).toLocaleDateString("pt-BR")}`}
                    </p>
                  </div>
                </div>

                {item.email !== ADMIN_EMAIL && (
                  <button
                    onClick={() => handleRemove(item.id, item.email)}
                    disabled={removing === item.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
                    style={{
                      background: "rgba(244,63,94,0.08)",
                      border: "1px solid rgba(244,63,94,0.2)",
                      color: "#f43f5e",
                      opacity: removing === item.id ? 0.5 : 1,
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(244,63,94,0.16)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(244,63,94,0.08)"; }}
                  >
                    {removing === item.id ? <Loader size={12} className="animate-spin" /> : <Trash2 size={12} />}
                    Revogar
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>

      <p className="text-muted text-xs mt-8 opacity-30">✦ NEXUS LIFE OS — Painel Administrativo</p>
    </div>
  );
}
