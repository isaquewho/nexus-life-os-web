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

export default function Sidebar() {
  const pathname = usePathname();
  const t = useTranslations("nav");

  // Extract locale from pathname
  const segments = pathname.split("/");
  const locale = segments[1] || "pt-BR";
  const basePath = `/${locale}`;

  const isActive = (href: string) => {
    const fullHref = `${basePath}${href}`;
    if (href === "") return pathname === basePath || pathname === `${basePath}/`;
    return pathname.startsWith(fullHref);
  };

  return (
    <aside
      className="hidden md:flex flex-col fixed left-0 top-0 h-full w-64 z-40"
      style={{
        background: "#0f0f1a",
        borderRight: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      {/* Logo */}
      <div className="p-6 border-b border-white/8">
        <Link href={basePath} className="flex items-center gap-2 group">
          <span
            className="text-2xl gradient-atlas animate-pulse-glow"
            style={{ fontFamily: "monospace" }}
          >
            ✦
          </span>
          <div>
            <h1 className="text-primary font-bold text-sm tracking-widest">
              NEXUS
            </h1>
            <p className="text-muted text-xs tracking-widest">LIFE OS</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 flex flex-col gap-1">
        {NAV_ITEMS.map(({ key, href, icon: Icon, highlight }) => {
          const active = isActive(href);
          return (
            <Link
              key={key}
              href={`${basePath}${href}`}
              className="flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 group"
              style={{
                background: active
                  ? highlight
                    ? "rgba(59,130,246,0.15)"
                    : "rgba(255,255,255,0.07)"
                  : "transparent",
                color: active
                  ? highlight
                    ? "#3b82f6"
                    : "#f8fafc"
                  : "#94a3b8",
                borderLeft: active
                  ? `3px solid ${highlight ? "#3b82f6" : "#8b5cf6"}`
                  : "3px solid transparent",
              }}
            >
              <Icon
                size={18}
                className="shrink-0 transition-transform group-hover:scale-110"
              />
              <span className="text-sm font-medium">
                {key === "atlas" ? (
                  <span className={highlight ? "text-atlas" : ""}>
                    {t(key)} {highlight && "✦"}
                  </span>
                ) : (
                  t(key)
                )}
              </span>
              {active && (
                <div
                  className="ml-auto w-1.5 h-1.5 rounded-full"
                  style={{
                    background: highlight ? "#3b82f6" : "#8b5cf6",
                  }}
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-white/8">
        <p className="text-muted text-xs text-center">✦ NEXUS v1.0</p>
      </div>
    </aside>
  );
}
