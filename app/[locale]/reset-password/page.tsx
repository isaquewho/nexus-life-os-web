"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Lock, Eye, EyeOff, CheckCircle, Loader, Sparkles, AlertCircle } from "lucide-react";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false); // session established (hash or code)
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    const supabase = createClient();

    // 1. Handle implicit flow: Supabase JS auto-detects #access_token in hash
    //    and fires PASSWORD_RECOVERY event.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event) => {
        if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
          setReady(true);
        }
      }
    );

    // 2. Handle PKCE flow: session already exists from /api/auth/callback
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (password.length < 6) {
      setErrorMsg("A senha deve ter pelo menos 6 caracteres.");
      setStatus("error");
      return;
    }
    if (password !== confirm) {
      setErrorMsg("As senhas não coincidem.");
      setStatus("error");
      return;
    }

    setStatus("loading");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.updateUser({ password });

      if (error) {
        setErrorMsg(error.message);
        setStatus("error");
        return;
      }

      setStatus("done");
      setTimeout(() => router.replace("/pt-BR"), 2000);
    } catch {
      setErrorMsg("Erro inesperado. Tente novamente.");
      setStatus("error");
    }
  };

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center p-6"
      style={{
        background: "radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.12) 0%, #000 60%)",
      }}
    >
      {/* Logo */}
      <div className="flex flex-col items-center gap-3 mb-8 animate-fade-in">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
            boxShadow: "0 0 40px rgba(59,130,246,0.4)",
          }}
        >
          <span className="text-2xl text-white">✦</span>
        </div>
        <div className="text-center">
          <h1 className="text-2xl font-bold text-primary tracking-widest">NEXUS</h1>
          <p className="text-secondary text-sm tracking-widest">LIFE OS</p>
        </div>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm glass animate-slide-up" style={{ padding: "32px" }}>
        {status === "done" ? (
          // ── Success ─────────────────────────────────────────────────────────
          <div className="flex flex-col items-center gap-4 text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "rgba(16,185,129,0.15)" }}
            >
              <CheckCircle className="text-finance" size={28} />
            </div>
            <div>
              <h2 className="text-primary font-semibold text-lg">Senha definida!</h2>
              <p className="text-secondary text-sm mt-1">
                Redirecionando para o dashboard...
              </p>
            </div>
          </div>
        ) : !ready ? (
          // ── Waiting for auth token ───────────────────────────────────────────
          <div className="flex flex-col items-center gap-4 text-center">
            <Loader size={28} className="text-atlas animate-spin" />
            <div>
              <h2 className="text-primary font-semibold">Verificando link...</h2>
              <p className="text-secondary text-sm mt-1">
                Aguarde enquanto validamos seu link de recuperação.
              </p>
            </div>
            <p className="text-muted text-xs mt-2">
              Se demorar mais de 5 segundos,{" "}
              <button
                onClick={() => router.replace("/pt-BR/login")}
                className="text-atlas underline underline-offset-2"
              >
                volte ao login
              </button>{" "}
              e solicite um novo link.
            </p>
          </div>
        ) : (
          // ── Password form ────────────────────────────────────────────────────
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="mb-2">
              <h2 className="text-primary font-bold text-xl">Definir senha</h2>
              <p className="text-secondary text-sm mt-1">
                Crie uma senha segura para acessar o NEXUS.
              </p>
            </div>

            {/* New password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="new-password" className="text-secondary text-xs font-medium uppercase tracking-wider">
                Nova senha
              </label>
              <div className="relative flex items-center">
                <Lock size={15} className="absolute left-3 text-muted pointer-events-none" />
                <input
                  id="new-password"
                  type={showPass ? "text" : "password"}
                  required
                  placeholder="Mínimo de 6 caracteres"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setStatus("idle"); }}
                  className="w-full pl-9 pr-10 py-3 rounded-xl text-primary text-sm outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    caretColor: "#3b82f6",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(59,130,246,0.6)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.08)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.12)";
                    e.target.style.boxShadow = "none";
                  }}
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPass((s) => !s)}
                  className="absolute right-3 text-muted hover:text-secondary transition-colors"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>

            {/* Confirm password */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm-password" className="text-secondary text-xs font-medium uppercase tracking-wider">
                Confirmar senha
              </label>
              <div className="relative flex items-center">
                <Lock size={15} className="absolute left-3 text-muted pointer-events-none" />
                <input
                  id="confirm-password"
                  type={showPass ? "text" : "password"}
                  required
                  placeholder="Repita a senha"
                  value={confirm}
                  onChange={(e) => { setConfirm(e.target.value); setStatus("idle"); }}
                  className="w-full pl-9 pr-4 py-3 rounded-xl text-primary text-sm outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: confirm
                      ? confirm === password
                        ? "1px solid rgba(16,185,129,0.5)"
                        : "1px solid rgba(244,63,94,0.4)"
                      : "1px solid rgba(255,255,255,0.12)",
                    caretColor: "#3b82f6",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(59,130,246,0.6)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.08)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = confirm
                      ? confirm === password
                        ? "rgba(16,185,129,0.5)"
                        : "rgba(244,63,94,0.4)"
                      : "rgba(255,255,255,0.12)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
              {confirm && (
                <p className={`text-xs flex items-center gap-1 ${confirm === password ? "text-finance" : "text-expense"}`}>
                  {confirm === password
                    ? <><CheckCircle size={11} /> Senhas coincidem</>
                    : <><AlertCircle size={11} /> Senhas não coincidem</>
                  }
                </p>
              )}
            </div>

            {/* Error */}
            {status === "error" && (
              <div
                className="flex items-center gap-2 px-3 py-2 rounded-lg"
                style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)" }}
              >
                <AlertCircle size={14} className="text-expense shrink-0" />
                <p className="text-expense text-xs">{errorMsg}</p>
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={status === "loading" || !password || !confirm}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm text-white transition-all mt-1"
              style={{
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                boxShadow: "0 4px 20px rgba(59,130,246,0.35)",
                opacity: status === "loading" || !password || !confirm ? 0.6 : 1,
              }}
            >
              {status === "loading" ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
              {status === "loading" ? "Salvando..." : "Definir senha"}
            </button>
          </form>
        )}
      </div>

      <p className="text-muted text-xs mt-8 opacity-50">✦ NEXUS LIFE OS</p>
    </div>
  );
}
