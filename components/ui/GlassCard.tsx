import { cn } from "@/lib/utils";
import React from "react";

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  glowColor?: "blue" | "green" | "violet" | "red" | "none";
  padding?: "sm" | "md" | "lg";
}

export default function GlassCard({
  children,
  className,
  glowColor = "none",
  padding = "md",
  ...props
}: GlassCardProps) {
  const glowMap = {
    blue: "0 0 30px rgba(59,130,246,0.15)",
    green: "0 0 30px rgba(16,185,129,0.15)",
    violet: "0 0 30px rgba(139,92,246,0.15)",
    red: "0 0 30px rgba(244,63,94,0.15)",
    none: "none",
  };

  const padMap = {
    sm: "p-3",
    md: "p-5",
    lg: "p-6",
  };

  return (
    <div
      className={cn("glass animate-fade-in", padMap[padding], className)}
      style={{ boxShadow: glowMap[glowColor] }}
      {...props}
    >
      {children}
    </div>
  );
}
