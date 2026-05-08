"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import { generateRecurringTransactions } from "@/lib/recurring";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";

// Paths that bypass auth check entirely (no session required)
const PUBLIC_PATHS = ["/login", "/reset-password"];
// Paths that require auth but don't redirect logged-in users away
const PROTECTED_PASS_PATHS = ["/admin", "/onboarding"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setProfile, setLoading } = useAuthStore();
  const [ready, setReady] = useState(false);
  const [mounted, setMounted] = useState(false);

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.includes(p));
  const isPassPath = PROTECTED_PASS_PATHS.some((p) => pathname.includes(p));

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    const supabase = createClient();

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setProfile(null);
          setLoading(false);
          if (!isPublicPath) {
            const localePart = pathname.split("/")[1] || "pt-BR";
            router.replace(`/${localePart}/login`);
            return;
          }
        } else {
          const uid = session.user.id;
          const localePart = pathname.split("/")[1] || "pt-BR";

          // Load profile
          let { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", uid)
            .single();

          // Auto-create profile if it doesn't exist yet (first login after signUp)
          if (!profile) {
            const { data: newProfile } = await supabase
              .from("profiles")
              .insert({
                id: uid,
                email: session.user.email ?? "",
                total_xp: 0,
                onboarding_complete: false,
                created_at: new Date().toISOString(),
              })
              .select()
              .single();
            profile = newProfile;
          }

          setProfile(profile);
          setLoading(false);

          if (isPublicPath) {
            // Logged in on login page → redirect to dashboard or onboarding
            if (profile?.onboarding_complete === false || profile?.onboarding_complete === null) {
              router.replace(`/${localePart}/onboarding`);
              return;
            }
            router.replace(`/${localePart}`);
            return;
          }

          // Admin / onboarding: let them stay, they handle their own auth
          if (isPassPath) {
            setReady(true);
            return;
          }

          // Redirect to onboarding if not complete
          if (profile?.onboarding_complete === false || profile?.onboarding_complete === null) {
            router.replace(`/${localePart}/onboarding`);
            return;
          }

          // Generate recurring transactions in background (no await to not block UI)
          generateRecurringTransactions(uid).catch(console.error);
        }
      } catch {
        setLoading(false);
      }
      setReady(true);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        // PASSWORD_RECOVERY: user clicked reset link — stay on reset-password page
        if (event === "PASSWORD_RECOVERY") return;

        if (event === "SIGNED_IN" && session) {
          // If already on reset-password, don't redirect away
          if (pathname.includes("/reset-password")) return;

          const uid = session.user.id;
          const localePart = pathname.split("/")[1] || "pt-BR";

          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", uid)
            .single();

          setProfile(profile);

          if (profile?.onboarding_complete === false || profile?.onboarding_complete === null) {
            router.replace(`/${localePart}/onboarding`);
          } else {
            router.replace(`/${localePart}`);
          }
        } else if (event === "SIGNED_OUT") {
          setProfile(null);
          const localePart = pathname.split("/")[1] || "pt-BR";
          router.replace(`/${localePart}/login`);
        }
      }
    );

    return () => subscription.unsubscribe();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // SSR skeleton — prevents hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-dvh bg-nexus" aria-hidden />
    );
  }

  // Public paths (login, reset-password) — no auth needed
  if (isPublicPath) {
    return <>{children}</>;
  }

  // Pass-through paths (admin, onboarding) — render without sidebar
  if (isPassPath) {
    return <>{children}</>;
  }

  if (!ready) {
    return (
      <div className="min-h-dvh bg-nexus flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <span className="text-4xl animate-pulse-glow">✦</span>
          <p className="text-secondary text-sm">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-nexus flex">
      {/* Desktop Sidebar */}
      <Sidebar />

      {/* Main content */}
      <main className="flex-1 flex flex-col min-h-dvh">
        <div className="flex-1 pb-20 md:pb-0 md:pl-64">
          {children}
        </div>
        {/* Mobile Bottom Nav */}
        <BottomNav />
      </main>
    </div>
  );
}
