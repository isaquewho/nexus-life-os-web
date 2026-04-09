import { cn } from "@/lib/utils";
import React from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "atlas";
type Size = "sm" | "md" | "lg";

interface NexusButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const variantStyles: Record<Variant, React.CSSProperties> = {
  primary: {
    background: "linear-gradient(135deg, #3b82f6, #6366f1)",
    color: "#fff",
    border: "none",
    boxShadow: "0 4px 15px rgba(59,130,246,0.3)",
  },
  secondary: {
    background: "rgba(255,255,255,0.06)",
    color: "#f8fafc",
    border: "1px solid rgba(255,255,255,0.12)",
  },
  danger: {
    background: "rgba(244,63,94,0.15)",
    color: "#f43f5e",
    border: "1px solid rgba(244,63,94,0.3)",
  },
  ghost: {
    background: "transparent",
    color: "#94a3b8",
    border: "none",
  },
  atlas: {
    background: "linear-gradient(135deg, #3b82f6, #8b5cf6)",
    color: "#fff",
    border: "none",
    boxShadow: "0 4px 20px rgba(59,130,246,0.35)",
  },
};

const sizeStyles: Record<Size, string> = {
  sm: "px-3 py-1.5 text-xs rounded-lg gap-1.5",
  md: "px-4 py-2.5 text-sm rounded-xl gap-2",
  lg: "px-6 py-3 text-base rounded-xl gap-2.5",
};

export default function NexusButton({
  children,
  variant = "primary",
  size = "md",
  loading = false,
  leftIcon,
  rightIcon,
  className,
  disabled,
  ...props
}: NexusButtonProps) {
  return (
    <button
      className={cn(
        "flex items-center justify-center font-medium transition-all duration-200",
        "hover:opacity-90 hover:scale-[1.02] active:scale-[0.98]",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
        sizeStyles[size],
        className
      )}
      style={variantStyles[variant]}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
      ) : (
        <>
          {leftIcon}
          {children}
          {rightIcon}
        </>
      )}
    </button>
  );
}
