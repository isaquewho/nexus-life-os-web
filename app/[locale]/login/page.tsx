"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { createClient } from "@/lib/supabase/client";
import { Mail, Sparkles, CheckCircle, AlertCircle, Loader } from "lucide-react";

export default function LoginPage() {
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "restricted" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;

    setStatus("loading");

    try {
      const supabase = createClient();

      // Check allowed_emails
      const { data: allowed, error: checkError } = await supabase
        .from("allowed_emails")
        .select("email")
        .eq("email", email.trim().toLowerCase())
        .single();

      if (checkError || !allowed) {
        setStatus("restricted");
        return;
      }

      // Send magic link
      const { error } = await supabase.auth.signInWithOtp({
        email: email.trim(),
        options: {
          emailRedirectTo: `${window.location.origin}/api/auth/callback`,
        },
      });

      if (error) {
        setErrorMsg(error.message);
        setStatus("error");
        return;
      }

      setStatus("sent");
    } catch {
      setStatus("error");
      setErrorMsg("Erro inesperado. Tente novamente.");
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
      <div className="flex flex-col items-center gap-3 mb-10 animate-fade-in">
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
        <p className="text-muted text-sm mt-1">{t("tagline")}</p>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-sm glass animate-slide-up"
        style={{ padding: "32px" }}
      >
        {status === "sent" ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "rgba(16,185,129,0.15)" }}
            >
              <CheckCircle className="text-finance" size={28} />
            </div>
            <div>
              <h2 className="text-primary font-semibold text-lg">{t("checkEmail")}</h2>
              <p className="text-secondary text-sm mt-1">
                {t("checkEmailDesc").replace("{email}", email)}
              </p>
            </div>
            <button
              onClick={() => { setStatus("idle"); setEmail(""); }}
              className="text-atlas text-sm underline underline-offset-2 mt-2"
            >
              Usar outro e-mail
            </button>
          </div>
        ) : status === "restricted" ? (
          <div className="flex flex-col items-center gap-4 text-center">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center"
              style={{ background: "rgba(244,63,94,0.15)" }}
            >
              <AlertCircle className="text-expense" size={28} />
            </div>
            <div>
              <h2 className="text-primary font-semibold text-lg">Acesso Restrito</h2>
              <p className="text-secondary text-sm mt-1">{t("accessRestricted")}</p>
            </div>
            <button
              onClick={() => setStatus("idle")}
              className="text-atlas text-sm underline underline-offset-2"
            >
              Tentar outro e-mail
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-5">
            <div>
              <h2 className="text-primary font-semibold text-xl">{t("login")}</h2>
              <p className="text-secondary text-sm mt-1">
                Entre com seu e-mail para receber o link de acesso
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <label className="text-secondary text-xs font-medium uppercase tracking-wider">
                {t("email")}
              </label>
              <div className="relative">
                <Mail
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted"
                  size={16}
                />
                <input
                  id="email-input"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t("emailPlaceholder")}
                  className="w-full pl-9 pr-4 py-3 rounded-xl text-primary text-sm outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.06)",
                    border: "1px solid rgba(255,255,255,0.12)",
                    caretColor: "#3b82f6",
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = "rgba(59,130,246,0.6)";
                    e.target.style.boxShadow = "0 0 0 3px rgba(59,130,246,0.1)";
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = "rgba(255,255,255,0.12)";
                    e.target.style.boxShadow = "none";
                  }}
                />
              </div>
            </div>

            {status === "error" && (
              <p className="text-expense text-xs">{errorMsg}</p>
            )}

            <button
              id="send-magic-link-btn"
              type="submit"
              disabled={status === "loading" || !email.trim()}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm text-white transition-all"
              style={{
                background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
                boxShadow: "0 4px 20px rgba(59,130,246,0.35)",
                opacity: status === "loading" || !email.trim() ? 0.6 : 1,
              }}
            >
              {status === "loading" ? (
                <Loader size={16} className="animate-spin" />
              ) : (
                <Sparkles size={16} />
              )}
              {status === "loading" ? "Enviando..." : t("sendMagicLink")}
            </button>
          </form>
        )}
      </div>

      {/* Footer */}
      <p className="text-muted text-xs mt-8 animate-fade-in">
        ✦ NEXUS LIFE OS — Sistema de Acesso Seguro
      </p>
    </div>
  );
}
