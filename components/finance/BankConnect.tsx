"use client";

import { useEffect, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useFinanceStore } from "@/stores/financeStore";
import NexusButton from "@/components/ui/NexusButton";
import { Building2, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface BankConnectProps {
  uid: string;
  onConnected?: (bankName: string) => void;
}

type ConnectState = "idle" | "loading" | "open" | "success" | "error";

export default function BankConnect({ uid, onConnected }: BankConnectProps) {
  const [state, setState] = useState<ConnectState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const { setBankConnections, bankConnections } = useFinanceStore();

  // Dynamically load the Pluggy Connect widget script
  useEffect(() => {
    if (document.getElementById("pluggy-connect-script")) return;
    const script = document.createElement("script");
    script.id = "pluggy-connect-script";
    script.src = "https://cdn.pluggy.ai/pluggy-connect/v2.6.0/pluggy-connect.js";
    script.async = true;
    document.head.appendChild(script);
    return () => {
      // leave script — reuse across re-renders
    };
  }, []);

  const handleConnect = useCallback(async () => {
    setState("loading");
    setErrorMsg("");

    try {
      // 1. Get connect token from our API
      const res = await fetch("/api/connect-token");
      if (!res.ok) {
        const { error } = await res.json();
        throw new Error(error ?? "Failed to get connect token");
      }
      const { accessToken } = await res.json();

      // 2. Open Pluggy Connect widget
      setState("open");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const PluggyConnect = (window as any).PluggyConnect;
      if (!PluggyConnect) {
        throw new Error("Pluggy Connect widget not loaded");
      }

      const pluggy = new PluggyConnect({
        connectToken: accessToken,
        // Callback when user successfully connects their bank
        onSuccess: async (itemData: { item: { id: string; connector: { name: string } } }) => {
          setState("loading");

          const itemId = itemData.item.id;
          const bankName = itemData.item.connector.name;

          // 3. Save to Supabase bank_connections
          const supabase = createClient();
          const { data, error } = await supabase
            .from("bank_connections")
            .upsert(
              {
                uid,
                item_id: itemId,
                bank_name: bankName,
                status: "active",
                last_sync: new Date().toISOString(),
              },
              { onConflict: "item_id" }
            )
            .select()
            .single();

          if (error) {
            console.error("Supabase save error:", error);
            setState("error");
            setErrorMsg("Banco conectado, mas erro ao salvar. Tente novamente.");
            return;
          }

          if (data) {
            setBankConnections([...bankConnections, data]);
          }

          setState("success");
          onConnected?.(bankName);

          // Reset after 3s
          setTimeout(() => setState("idle"), 3000);
        },
        // Callback on error
        onError: (error: { message: string }) => {
          console.error("Pluggy error:", error);
          setState("error");
          setErrorMsg(error.message ?? "Erro ao conectar banco");
        },
        // Callback when user closes widget without connecting
        onClose: () => {
          if (state === "open") setState("idle");
        },
      });

      pluggy.open();
    } catch (err) {
      console.error("BankConnect error:", err);
      setState("error");
      setErrorMsg(err instanceof Error ? err.message : "Erro desconhecido");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [uid, bankConnections]);

  if (state === "success") {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-finance text-sm"
        style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)" }}>
        <CheckCircle2 size={14} />
        <span>Banco conectado!</span>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2 px-3 py-2 rounded-xl text-expense text-xs"
          style={{ background: "rgba(244,63,94,0.1)", border: "1px solid rgba(244,63,94,0.3)" }}>
          <AlertCircle size={12} />
          <span>{errorMsg || "Erro ao conectar"}</span>
        </div>
        <NexusButton variant="secondary" size="sm" onClick={() => setState("idle")}>
          Tentar novamente
        </NexusButton>
      </div>
    );
  }

  return (
    <NexusButton
      variant="secondary"
      size="sm"
      leftIcon={
        state === "loading" ? (
          <Loader2 size={14} className="animate-spin" />
        ) : (
          <Building2 size={14} />
        )
      }
      onClick={handleConnect}
      loading={state === "loading"}
      disabled={state === "loading" || state === "open"}
    >
      {state === "open" ? "Conectando..." : "Conectar Banco"}
    </NexusButton>
  );
}
