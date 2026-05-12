"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Mail, Lock, Sparkles, AlertCircle, Loader, Eye, EyeOff, UserPlus, ArrowLeft, CheckCircle2 } from "lucide-react";

// ── Google Icon ───────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.874 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 6.29C4.672 4.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

type Status = "idle" | "loading" | "reset_sent" | "error" | "success";

export default function LoginPage() {
  const pathname = usePathname();
  const router = useRouter();
  const locale = pathname.split("/")[1] || "pt-BR";

  const [mounted, setMounted] = useState(false);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [inviteCode, setInviteCode] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [needsPassword, setNeedsPassword] = useState(false);

  useEffect(() => {
    setMounted(true);
    const params = new URLSearchParams(window.location.search);
    if (params.get("error") === "access_denied") {
      setErrorMsg("Seu e-mail não tem acesso ao Nexus. Entre em contato para solicitar acesso.");
      setStatus("error");
    } else if (params.get("error") === "auth") {
      setErrorMsg("Erro na autenticação. Tente novamente.");
      setStatus("error");
    }
  }, []);

  const getAuthCallbackUrl = () =>
    `${window.location.origin}/api/auth/callback?next=/${locale}`;

  // ── Google OAuth ────────────────────────────────────────────────────────────
  const handleGoogleLogin = async () => {
    setStatus("loading");
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getAuthCallbackUrl(),
          queryParams: { access_type: "offline", prompt: "consent" },
        },
      });
      if (error) {
        setErrorMsg("Erro ao conectar com Google. Tente novamente.");
        setStatus("error");
      }
    } catch {
      setErrorMsg("Erro inesperado. Tente novamente.");
      setStatus("error");
    }
  };

  // ── Email + Password login ──────────────────────────────────────────────────
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("loading");
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const allowlistResponse = await fetch("/api/allowlist/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });

      if (!allowlistResponse.ok) {
        setErrorMsg("Erro ao validar acesso. Tente novamente.");
        setStatus("error");
        return;
      }

      const { allowed } = (await allowlistResponse.json()) as {
        allowed?: boolean;
      };

      if (!allowed) {
        setErrorMsg("Seu e-mail não tem acesso ao Nexus. Entre em contato para solicitar acesso.");
        setStatus("error");
        return;
      }

      const supabase = createClient();

      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) {
        setErrorMsg(
          error.message.includes("Invalid login credentials")
            ? "E-mail ou senha incorretos."
            : error.message
        );
        setStatus("error");
      } else {
        router.push(`/${locale}`);
        router.refresh();
      }
    } catch {
      setErrorMsg("Erro inesperado. Tente novamente.");
      setStatus("error");
    }
  };

  // ── Invite Validation ──────────────────────────────────────────────────────
  const handleValidateInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteCode.trim() || !email.trim()) {
      setErrorMsg("Preencha o e-mail e o código.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    setSuccessMsg("");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.rpc("validate_and_register_invite", {
        p_code: inviteCode.trim().toUpperCase(),
        p_email: email.trim().toLowerCase(),
      });

      if (error) {
        setErrorMsg(error.message);
        setStatus("error");
        return;
      }

      if (data.success) {
        setSuccessMsg(data.message);
        setNeedsPassword(true);
        setStatus("idle");
      } else {
        setErrorMsg(data.message);
        setStatus("error");
      }
    } catch {
      setErrorMsg("Erro inesperado. Tente novamente.");
      setStatus("error");
    }
  };

  // ── Finalize Sign Up ────────────────────────────────────────────────────────
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password.length < 6) {
      setErrorMsg("A senha deve ter pelo menos 6 caracteres.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const supabase = createClient();
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: {
          emailRedirectTo: getAuthCallbackUrl(),
        }
      });
      if (error) {
        setErrorMsg(error.message);
        setStatus("error");
      } else if (data.session) {
        setSuccessMsg("Cadastro concluído! Redirecionando...");
        router.push(`/${locale}/onboarding`);
      } else {
        setSuccessMsg("Cadastro concluído! Por favor, verifique a caixa de entrada do seu e-mail para confirmar a conta.");
        setNeedsPassword(false);
        setShowInvite(false);
        setStatus("idle");
      }
    } catch {
      setErrorMsg("Erro inesperado. Tente novamente.");
      setStatus("error");
    }
  };

  // ── Forgot Password ────────────────────────────────────────────────────────
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setErrorMsg("Digite seu e-mail acima para receber o link.");
      setStatus("error");
      return;
    }
    setStatus("loading");
    setErrorMsg("");
    try {
      const supabase = createClient();
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/api/auth/callback?type=recovery`,
      });
      setStatus("reset_sent");
    } catch {
      setErrorMsg("Erro ao enviar e-mail. Tente novamente.");
      setStatus("error");
    }
  };

  if (!mounted) {
    return (
      <div
        className="min-h-dvh flex flex-col items-center justify-center p-6"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.12) 0%, #000 60%)" }}
      >
        <Logo />
        <div className="w-full max-w-sm glass" style={{ padding: "32px", minHeight: "260px" }} />
      </div>
    );
  }

  if (status === "reset_sent") {
    return (
      <div
        className="min-h-dvh flex flex-col items-center justify-center p-6"
        style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.12) 0%, #000 60%)" }}
      >
        <Logo />
        <div className="w-full max-w-sm glass animate-slide-up flex flex-col items-center gap-4 text-center" style={{ padding: "32px" }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center" style={{ background: "rgba(59,130,246,0.15)" }}>
            <Mail size={28} className="text-atlas" />
          </div>
          <div>
            <h2 className="text-primary font-semibold text-lg">Link enviado!</h2>
            <p className="text-secondary text-sm mt-1">
              Enviamos um link para <strong>{email}</strong>. Clique para definir sua nova senha.
            </p>
          </div>
          <button onClick={() => setStatus("idle")} className="text-atlas text-sm underline underline-offset-2 mt-2">
            Voltar ao login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-dvh flex flex-col items-center justify-center p-6"
      style={{ background: "radial-gradient(ellipse at 50% 0%, rgba(59,130,246,0.12) 0%, #000 60%)" }}
    >
      <Logo />

      <div className="w-full max-w-sm glass animate-slide-up" style={{ padding: "32px" }}>
        
        {successMsg && !showInvite && !needsPassword && (
          <div className="flex items-start gap-2 px-3 py-3 rounded-lg mb-4 animate-fade-in" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)" }}>
            <CheckCircle2 size={16} className="text-finance shrink-0 mt-0.5" />
            <p className="text-finance text-xs">{successMsg}</p>
          </div>
        )}

        {showInvite ? (
          <div className="animate-fade-in">
            <button 
              onClick={() => { setShowInvite(false); setNeedsPassword(false); setErrorMsg(""); setSuccessMsg(""); }}
              className="flex items-center gap-2 text-muted text-xs mb-6 hover:text-primary transition-colors"
            >
              <ArrowLeft size={14} /> Voltar ao login
            </button>
            
            <h2 className="text-primary font-bold text-xl mb-2">
              {needsPassword ? "Definir Senha" : "Usar Convite"}
            </h2>
            <p className="text-secondary text-xs mb-6">
              {needsPassword 
                ? "Quase lá! Escolha uma senha segura para sua conta." 
                : "Registre seu e-mail usando um código de convite válido."}
            </p>

            <form onSubmit={needsPassword ? handleSignUp : handleValidateInvite} className="flex flex-col gap-4">
              {!needsPassword ? (
                <>
                  <InputField
                    icon={<Mail size={15} className="text-muted" />}
                    type="email"
                    id="invite-email"
                    placeholder="Seu melhor e-mail"
                    value={email}
                    onChange={setEmail}
                  />
                  <InputField
                    icon={<UserPlus size={15} className="text-muted" />}
                    type="text"
                    id="invite-code"
                    placeholder="Código (Ex: NEXUS-XXXX)"
                    value={inviteCode}
                    onChange={(v) => setInviteCode(v.toUpperCase())}
                  />
                </>
              ) : (
                <InputField
                  icon={<Lock size={15} className="text-muted" />}
                  type={showPass ? "text" : "password"}
                  id="signup-password"
                  placeholder="Crie sua senha"
                  value={password}
                  onChange={setPassword}
                  rightEl={
                    <button type="button" onClick={() => setShowPass(s => !s)} className="text-muted hover:text-secondary">
                      {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  }
                />
              )}

              {errorMsg && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)" }}>
                  <AlertCircle size={14} className="text-expense shrink-0 mt-0.5" />
                  <p className="text-expense text-xs">{errorMsg}</p>
                </div>
              )}

              {successMsg && needsPassword && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)" }}>
                  <CheckCircle2 size={14} className="text-finance shrink-0 mt-0.5" />
                  <p className="text-finance text-xs">{successMsg}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm text-white transition-all mt-2"
                style={{
                  background: needsPassword 
                    ? "linear-gradient(135deg, #10b981, #3b82f6)" 
                    : "linear-gradient(135deg, #8b5cf6, #d946ef)",
                  boxShadow: needsPassword 
                    ? "0 4px 20px rgba(16,185,129,0.3)" 
                    : "0 4px 20px rgba(139,92,246,0.3)",
                  opacity: status === "loading" ? 0.6 : 1,
                }}
              >
                {status === "loading" ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {status === "loading" ? "Processando..." : (needsPassword ? "Finalizar Cadastro" : "Validar Convite")}
              </button>
            </form>
          </div>
        ) : (
          <>
            <button
              onClick={handleGoogleLogin}
              disabled={status === "loading"}
              className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl font-semibold text-sm transition-all mb-5"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(255,255,255,0.18)",
                color: "#f1f5f9",
                opacity: status === "loading" ? 0.6 : 1,
              }}
            >
              {status === "loading" ? <Loader size={18} className="animate-spin" /> : <GoogleIcon />}
              Continuar com Google
            </button>

            <div className="flex items-center gap-3 mb-5">
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
              <span className="text-muted text-xs">ou entre com e-mail</span>
              <div className="flex-1 h-px" style={{ background: "rgba(255,255,255,0.08)" }} />
            </div>

            <form onSubmit={handleLogin} className="flex flex-col gap-4">
              <InputField
                icon={<Mail size={15} className="text-muted" />}
                type="email"
                id="login-email"
                placeholder="seu@email.com"
                value={email}
                onChange={setEmail}
              />
              <InputField
                icon={<Lock size={15} className="text-muted" />}
                type={showPass ? "text" : "password"}
                id="login-password"
                placeholder="Senha"
                value={password}
                onChange={setPassword}
                rightEl={
                  <button type="button" onClick={() => setShowPass(s => !s)} className="text-muted hover:text-secondary">
                    {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                }
              />

              {errorMsg && (
                <div className="flex items-start gap-2 px-3 py-2 rounded-lg" style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.25)" }}>
                  <AlertCircle size={14} className="text-expense shrink-0 mt-0.5" />
                  <p className="text-expense text-xs">{errorMsg}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm text-white transition-all"
                style={{
                  background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                  boxShadow: "0 4px 20px rgba(59,130,246,0.3)",
                  opacity: status === "loading" ? 0.6 : 1,
                }}
              >
                {status === "loading" ? <Loader size={16} className="animate-spin" /> : <Sparkles size={16} />}
                {status === "loading" ? "Aguarde..." : "Entrar"}
              </button>

              <button
                type="button"
                onClick={handleForgotPassword}
                className="text-muted text-xs text-center hover:text-atlas transition-colors"
              >
                Esqueci minha senha
              </button>
            </form>
            
            <div className="mt-8 pt-6 border-t border-white/5">
              <button 
                onClick={() => { setShowInvite(true); setErrorMsg(""); setSuccessMsg(""); }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-medium transition-all"
                style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.15)", color: "#8b5cf6" }}
              >
                <UserPlus size={16} />
                Tenho um código de convite
              </button>
            </div>
          </>
        )}
      </div>

      <p className="text-muted text-xs mt-8 opacity-40">✦ NEXUS LIFE OS — Acesso por convite</p>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex flex-col items-center gap-3 mb-8 animate-fade-in">
      <div
        className="w-16 h-16 rounded-2xl flex items-center justify-center"
        style={{ background: "linear-gradient(135deg, #3b82f6, #8b5cf6)", boxShadow: "0 0 40px rgba(59,130,246,0.4)" }}
      >
        <span className="text-2xl text-white">✦</span>
      </div>
      <div className="text-center">
        <h1 className="text-2xl font-bold text-primary tracking-widest">NEXUS</h1>
        <p className="text-secondary text-sm tracking-widest">LIFE OS</p>
      </div>
    </div>
  );
}

function InputField({
  icon, type, id, placeholder, value, onChange, rightEl,
}: {
  icon: React.ReactNode;
  type: string;
  id: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  rightEl?: React.ReactNode;
}) {
  return (
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
        onFocus={(e) => { e.target.style.borderColor = "rgba(59,130,246,0.6)"; e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.08)"; }}
        onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.12)"; e.target.style.boxShadow = "none"; }}
      />
      {rightEl && <div className="absolute right-3">{rightEl}</div>}
    </div>
  );
}
