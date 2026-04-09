"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuthStore } from "@/stores/authStore";
import Sidebar from "./Sidebar";
import BottomNav from "./BottomNav";

const PUBLIC_PATHS = ["/login"];

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const { setProfile, setLoading } = useAuthStore();
  const [ready, setReady] = useState(false);

  // Determine if the current path is a public (login) path
  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.includes(p));

  useEffect(() => {
    const supabase = createClient();

    const init = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
          setProfile(null);
          setLoading(false);
          if (!isPublicPath) {
            // Navigate to login with the current locale
            const localePart = pathname.split("/")[1] || "pt-BR";
            router.replace(`/${localePart}/login`);
            return;
          }
        } else {
          // Load profile
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();

          setProfile(profile);
          setLoading(false);

          if (isPublicPath) {
            const localePart = pathname.split("/")[1] || "pt-BR";
            router.replace(`/${localePart}`);
            return;
          }
        }
      } catch {
        setLoading(false);
      }
      setReady(true);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === "SIGNED_IN" && session) {
          const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", session.user.id)
            .single();
          setProfile(profile);
          if (isPublicPath) {
            const localePart = pathname.split("/")[1] || "pt-BR";
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

  // Always render on public paths
  if (isPublicPath) {
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
