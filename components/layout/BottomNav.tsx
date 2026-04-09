"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  Wallet,
  Sparkles,
  Target,
  Trophy,
  UserCircle,
} from "lucide-react";

const NAV_ITEMS = [
  { key: "dashboard", href: "", icon: LayoutDashboard },
  { key: "finance", href: "/finance", icon: Wallet },
  { key: "atlas", href: "/atlas", icon: Sparkles, highlight: true },
  { key: "habits", href: "/habits", icon: Target },
  { key: "goals", href: "/goals", icon: Trophy },
  { key: "menu", href: "/menu", icon: UserCircle },
];

export default function BottomNav() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  const segments = pathname.split("/");
  const locale = segments[1] || "pt-BR";
  const basePath = `/${locale}`;

  const isActive = (href: string) => {
    const fullHref = `${basePath}${href}`;
    if (href === "") return pathname === basePath || pathname === `${basePath}/`;
    return pathname.startsWith(fullHref);
  };

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around px-2 py-2"
      style={{
        background: "#0f0f1a",
        borderTop: "1px solid rgba(255,255,255,0.08)",
        backdropFilter: "blur(20px)",
        paddingBottom: "max(8px, env(safe-area-inset-bottom))",
      }}
    >
      {NAV_ITEMS.map(({ key, href, icon: Icon, highlight }) => {
        const active = isActive(href);
        return (
          <Link
            key={key}
            href={`${basePath}${href}`}
            className="flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-all duration-200 min-w-0"
            style={{
              color: active
                ? highlight
                  ? "#3b82f6"
                  : "#f8fafc"
                : "#475569",
            }}
          >
            <div className="relative">
              <Icon size={20} />
              {active && (
                <span
                  className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full"
                  style={{ background: highlight ? "#3b82f6" : "#8b5cf6" }}
                />
              )}
            </div>
            <span className="text-[10px] font-medium truncate max-w-full">
              {key === "atlas" ? "✦" : t(key).slice(0, 6)}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
