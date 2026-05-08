import { createClient } from "@/lib/supabase/server";
import { routing } from "@/i18n/routing";
import { NextRequest, NextResponse } from "next/server";

function resolveNextPath(next: string | null): string {
  if (!next || !next.startsWith("/")) {
    return `/${routing.defaultLocale}`;
  }

  const [pathname] = next.split("?");
  const match = pathname.match(/^\/([^/]+)(?:\/.*)?$/);
  if (!match) {
    return `/${routing.defaultLocale}`;
  }

  if (!routing.locales.includes(match[1] as (typeof routing.locales)[number])) {
    return `/${routing.defaultLocale}`;
  }

  return next;
}

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const type = searchParams.get("type");
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      // Password recovery flow → reset-password page
      if (type === "recovery") {
        return NextResponse.redirect(`${origin}/pt-BR/reset-password`);
      }

      const user = data.session.user;
      const email = user.email ?? "";

      // ── Allowlist check (server-side with service role) ──────────────────
      const { data: allowed } = await supabase
        .from("allowed_emails")
        .select("email")
        .eq("email", email)
        .single();

      if (!allowed) {
        // Not on the allowlist — sign out and redirect with denial message
        await supabase.auth.signOut();
        return NextResponse.redirect(
          `${origin}/pt-BR/login?error=access_denied`
        );
      }

      // ── Ensure profile exists ─────────────────────────────────────────────
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, onboarding_complete")
        .eq("id", user.id)
        .single();

      if (!profile) {
        // New user — create profile and send to onboarding
        await supabase.from("profiles").insert({
          id: user.id,
          email,
          display_name:
            user.user_metadata?.full_name ??
            user.user_metadata?.name ??
            null,
          total_xp: 0,
          onboarding_complete: false,
          created_at: new Date().toISOString(),
        });
        return NextResponse.redirect(`${origin}/pt-BR/onboarding`);
      }

      if (!profile.onboarding_complete) {
        return NextResponse.redirect(`${origin}/pt-BR/onboarding`);
      }

      return NextResponse.redirect(new URL(resolveNextPath(next), origin));
    }
  }

  return NextResponse.redirect(new URL(`/${routing.defaultLocale}/login?error=auth`, origin));
}
