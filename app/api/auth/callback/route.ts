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
  const next = searchParams.get("next");

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      return NextResponse.redirect(new URL(resolveNextPath(next), origin));
    }
  }

  return NextResponse.redirect(new URL(`/${routing.defaultLocale}/login?error=auth`, origin));
}
