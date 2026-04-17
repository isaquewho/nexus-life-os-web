"use client";

import { useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  Mail, Lock, Key, Sparkles, CheckCircle, AlertCircle,
  Loader, Eye, EyeOff, UserPlus, LogIn,
} from "lucide-react";

type Mode = "login" | "register";
type Status = "idle" | "loading" | "confirm" | "error";

export default function LoginPage() {
  const router = useRouter();
  const pathname = usePathname();
  const locale = pathname.split("/")[1] || "pt-BR";

  const [mode, setMode] = useState<Mode>("login");
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [showPass, setShowPass] = useState(false);

  // Login fields
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Register fields
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirm, setRegConfirm] = useState("");
  const [inviteCode, setInviteCode] = useState("");

  const resetError = () => { setStatus("idle"); setErrorMsg(""); };

  // ── Login ──────────────────────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setErrorMsg(
          error.message.includes("Invalid login credentials")
            ? "E-mail ou senha incorretos."
            : error.message
        );
        setStatus("error");
      }
      // AuthGuard handles redirect after SIGNED_IN event
    } catch {
      setErrorMsg("Erro inesperado. Tente novamente.");
      setStatus("error");
    }
  };

  // ── Register ───────────────────────────────────────────────────────────────
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (regPassword.length < 6) {
      setErrorMsg("A senha deve ter pelo menos 6 caracteres.");
      setStatus("error");
      return;
    }
    if (regPassword !== regConfirm) {
      setErrorMsg("As senhas não coincidem.");
      setStatus("error");
      return;
    }
    if (!inviteCode.trim()) {
      setErrorMsg("Código de convite obrigatório.");
      setStatus("error");
      return;
    }

    setStatus("loading");

    try {
      const supabase = createClient();

      // 1. Validate invite code
      const { data: code, error: codeError } = await supabase
        .from("invite_codes")
        .select("*")
        .eq("code", inviteCode.trim().toUpperCase())
        .eq("is_active", true)
        .single();

      if (codeError || !code || code.use_count >= code.max_uses) {
        setErrorMsg("Código de convite inválido ou já utilizado.");
        setStatus("error");
        return;
      }

      // 2. Create account
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
      });

      if (signUpError) {
        setErrorMsg(
          signUpError.message.includes("already registered")
            ? "Este e-mail já está cadastrado. Faça login."
            : signUpError.message
        );
        setStatus("error");
        return;
      }

      const user = signUpData.user;

      if (!user) {
        // Email confirmation required — show "check email" screen
        setStatus("confirm");
        return;
      }

      // 3. Create profile immediately
      await supabase.from("profiles").upsert({
        id: user.id,
        email: regEmail.trim().toLowerCase(),
        full_name: null,
        total_xp: 0,
        onboarding_complete: false,
        created_at: new Date().toISOString(),
      }, { onConflict: "id" });

      // 4. Mark invite code as used
      const newCount = code.use_count + 1;
      await supabase
        .from("invite_codes")
        .update({ use_count: newCount, is_active: newCount < code.max_uses })
        .eq("id", code.id);

      // 5. Sign in (if email confirmation is disabled in Supabase)
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: regEmail.trim().toLowerCase(),
        password: regPassword,
      });

      if (signInError) {
        // Email confirmation is enabled — show confirmation screen
        setStatus("confirm");
        return;
      }

      // 6. Go to onboarding
      router.replace(`/${locale}/onboarding`);

    } catch {
      setErrorMsg("Erro inesperado. Tente novamente.");
      setStatus("error");
    }
  };

  // ── UI ─────────────────────────────────────────────────────────────────────
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

        {/* Email confirmation screen */}
        {status === "confirm" ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "rgba(16,185,129,0.15)" }}
            >
              <CheckCircle className="text-finance" size={28} />
            </div>
            <div>
              <h2 className="text-primary font-semibold text-lg">Verifique seu e-mail!</h2>
              <p className="text-secondary text-sm mt-1">
                Enviamos um link de confirmação para <strong>{regEmail}</strong>.
                Clique no link para ativar sua conta.
              </p>
            </div>
            <button
              onClick={() => { setStatus("idle"); setMode("register"); }}
              className="text-atlas text-sm underline underline-offset-2 mt-2"
            >
              Usar outro e-mail
            </button>
          </div>
        ) : (
          <>
            {/* Tabs */}
            <div
              className="flex rounded-xl mb-6 p-1"
              style={{ background: "rgba(255,255,255,0.06)" }}
            >
              {(["login", "register"] as Mode[]).map((m) => (
                <button
                  key={m}
                  onClick={() => { setMode(m); resetError(); }}
                  className="flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all"
                  style={{
                    background: mode === m ? "rgba(59,130,246,0.2)" : "transparent",
                    color: mode === m ? "#3b82f6" : "#64748b",
                    border: mode === m ? "1px solid rgba(59,130,246,0.35)" : "1px solid transparent",
                  }}
                >
                  {m === "login" ? <LogIn size={14} /> : <UserPlus size={14} />}
                  {m === "login" ? "Entrar" : "Criar conta"}
                </button>
              ))}
            </div>

            {/* Login form */}
            {mode === "login" && (
              <form onSubmit={handleLogin} className="flex flex-col gap-4">
                <Field
                  icon={<Mail size={15} className="text-muted" />}
                  label="E-mail"
                  type="email"
                  id="login-email"
                  placeholder="seu@email.com"
                  value={email}
                  onChange={setEmail}
                />
                <Field
                  icon={<Lock size={15} className="text-muted" />}
                  label="Senha"
                  type={showPass ? "text" : "password"}
                  id="login-password"
                  placeholder="••••••••"
                  value={password}
                  onChange={setPassword}
                  rightElement={
                    <button type="button" onClick={() => setShowPass(s => !s)} className="text-muted hover:text-secondary">
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }
                />
                {status === "error" && <ErrorMsg msg={errorMsg} />}
                <SubmitBtn loading={status === "loading"} label="Entrar" />
              </form>
            )}

            {/* Register form */}
            {mode === "register" && (
              <form onSubmit={handleRegister} className="flex flex-col gap-4">
                <Field
                  icon={<Mail size={15} className="text-muted" />}
                  label="E-mail"
                  type="email"
                  id="reg-email"
                  placeholder="seu@email.com"
                  value={regEmail}
                  onChange={setRegEmail}
                />
                <Field
                  icon={<Lock size={15} className="text-muted" />}
                  label="Senha"
                  type={showPass ? "text" : "password"}
                  id="reg-password"
                  placeholder="Mínimo de 6 caracteres"
                  value={regPassword}
                  onChange={setRegPassword}
                  rightElement={
                    <button type="button" onClick={() => setShowPass(s => !s)} className="text-muted hover:text-secondary">
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }
                />
                <Field
                  icon={<Lock size={15} className="text-muted" />}
                  label="Confirmar senha"
                  type={showPass ? "text" : "password"}
                  id="reg-confirm"
                  placeholder="Repita a senha"
                  value={regConfirm}
                  onChange={setRegConfirm}
                />
                <div className="h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
                <Field
                  icon={<Key size={15} className="text-muted" />}
                  label="Código de convite"
                  type="text"
                  id="invite-code"
                  placeholder="Ex: NEXUS-AB12"
                  value={inviteCode}
                  onChange={(v) => setInviteCode(v.toUpperCase())}
                  hint="Você precisa de um código para criar conta."
                />
                {status === "error" && <ErrorMsg msg={errorMsg} />}
                <SubmitBtn loading={status === "loading"} label="Criar conta" />
              </form>
            )}
          </>
        )}
      </div>

      <p className="text-muted text-xs mt-8 animate-fade-in opacity-50">
        ✦ NEXUS LIFE OS — Acesso por convite
      </p>
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Field({
  icon, label, type, id, placeholder, value, onChange, hint, rightElement,
}: {
  icon: React.ReactNode;
  label: string;
  type: string;
  id: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  hint?: string;
  rightElement?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-secondary text-xs font-medium uppercase tracking-wider">
        {label}
      </label>
      <div className="relative flex items-center">
        <div className="absolute left-3 pointer-events-none">{icon}</div>
        <input
          id={id}
          type={type}
          required
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
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
        />
        {rightElement && (
          <div className="absolute right-3">{rightElement}</div>
        )}
      </div>
      {hint && <p className="text-muted text-xs">{hint}</p>}
    </div>
  );
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <div
      className="flex items-center gap-2 px-3 py-2 rounded-lg"
      style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)" }}
    >
      <AlertCircle size={14} className="text-expense shrink-0" />
      <p className="text-expense text-xs">{msg}</p>
    </div>
  );
}

function SubmitBtn({ loading, label }: { loading: boolean; label: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm text-white transition-all mt-1"
      style={{
        background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
        boxShadow: "0 4px 20px rgba(59,130,246,0.35)",
        opacity: loading ? 0.6 : 1,
      }}
    >
      {loading ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
      {loading ? "Aguarde..." : label}
    </button>
  );
}
