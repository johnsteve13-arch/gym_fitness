import React from "react";

interface BadgeProps {
  children: React.ReactNode;
  variant?: "success" | "warning" | "danger" | "info" | "neutral" | "emerald";
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({ children, variant = "neutral", className = "" }) => {
  const variantStyles = {
    success: "bg-emerald-950/70 text-emerald-400 border-emerald-800/60",
    emerald: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
    warning: "bg-amber-950/70 text-amber-400 border-amber-800/60",
    danger: "bg-red-950/70 text-red-400 border-red-800/60",
    info: "bg-cyan-950/70 text-cyan-400 border-cyan-800/60",
    neutral: "bg-slate-800 text-slate-300 border-slate-700",
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border ${variantStyles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
