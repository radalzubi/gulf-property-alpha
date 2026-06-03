import * as React from "react";
import { cn } from "@/lib/utils";

type Tone = "good" | "caution" | "risk" | "official" | "inferred" | "missing" | "neutral";

const TONE_CLASS: Record<Tone, string> = {
  good: "text-signal-good bg-signal-goodDim border-signal-good/30",
  caution: "text-signal-caution bg-signal-cautionDim border-signal-caution/30",
  risk: "text-signal-risk bg-signal-riskDim border-signal-risk/30",
  official: "text-signal-official bg-signal-officialDim border-signal-official/30",
  inferred: "text-signal-inferred bg-signal-inferredDim border-signal-inferred/30",
  missing: "text-signal-missing bg-signal-missingDim border-signal-missing/30",
  neutral: "text-terminal-text bg-terminal-panel2 border-terminal-border",
};

export function Panel({ className, children, ...rest }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("panel", className)} {...rest}>
      {children}
    </div>
  );
}

export function PanelHeader({ title, subtitle, right, className }: { title: React.ReactNode; subtitle?: React.ReactNode; right?: React.ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 border-b border-terminal-border px-4 py-3", className)}>
      <div>
        <h3 className="text-sm font-semibold text-terminal-textHi">{title}</h3>
        {subtitle && <p className="mt-0.5 text-2xs text-terminal-muted">{subtitle}</p>}
      </div>
      {right}
    </div>
  );
}

export function Stat({ label, value, sub, tone, className }: { label: React.ReactNode; value: React.ReactNode; sub?: React.ReactNode; tone?: Tone; className?: string }) {
  return (
    <div className={cn("panel px-4 py-3", className)}>
      <div className="kpi-label">{label}</div>
      <div className={cn("kpi-value mt-1", tone === "good" && "text-signal-good", tone === "risk" && "text-signal-risk", tone === "caution" && "text-signal-caution")}>{value}</div>
      {sub && <div className="mt-0.5 text-2xs text-terminal-muted">{sub}</div>}
    </div>
  );
}

export function Tag({ tone = "neutral", className, children }: { tone?: Tone; className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-2xs font-medium", TONE_CLASS[tone], className)}>{children}</span>
  );
}

export function Button({
  variant = "default",
  size = "md",
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "default" | "primary" | "ghost" | "danger"; size?: "sm" | "md" }) {
  const variants = {
    default: "border border-terminal-border bg-terminal-panel2 text-terminal-text hover:border-terminal-borderHi hover:text-terminal-textHi",
    primary: "border border-accent/40 bg-accent/15 text-accent hover:bg-accent/25",
    ghost: "text-terminal-muted hover:text-terminal-textHi hover:bg-terminal-panel2",
    danger: "border border-signal-risk/40 bg-signal-riskDim text-signal-risk hover:bg-signal-risk/20",
  };
  const sizes = { sm: "px-2 py-1 text-2xs", md: "px-3 py-1.5 text-xs" };
  return <button className={cn("inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors disabled:opacity-40", variants[variant], sizes[size], className)} {...rest} />;
}

export function Input({ className, ...rest }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cn(
        "w-full rounded-md border border-terminal-border bg-terminal-bg px-2.5 py-1.5 text-xs text-terminal-textHi placeholder:text-terminal-muted focus:border-accent/60 focus:outline-none focus:ring-1 focus:ring-accent/40",
        className,
      )}
      {...rest}
    />
  );
}

export function Select({ className, children, ...rest }: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cn(
        "w-full rounded-md border border-terminal-border bg-terminal-bg px-2 py-1.5 text-xs text-terminal-textHi focus:border-accent/60 focus:outline-none",
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Field({ label, hint, children, className }: { label: React.ReactNode; hint?: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1 block text-2xs font-medium uppercase tracking-wider text-terminal-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-2xs text-terminal-muted">{hint}</span>}
    </label>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton h-4 w-full", className)} />;
}

export function EmptyState({ title, hint, icon }: { title: string; hint?: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-12 text-center">
      {icon && <div className="text-terminal-muted">{icon}</div>}
      <p className="text-sm font-medium text-terminal-text">{title}</p>
      {hint && <p className="max-w-sm text-2xs text-terminal-muted">{hint}</p>}
    </div>
  );
}

/** Inline horizontal score bar (0..100). */
export function ScoreBar({ value, tone = "neutral", className }: { value: number; tone?: Tone; className?: string }) {
  const barTone: Record<Tone, string> = {
    good: "bg-signal-good",
    caution: "bg-signal-caution",
    risk: "bg-signal-risk",
    official: "bg-signal-official",
    inferred: "bg-signal-inferred",
    missing: "bg-signal-missing",
    neutral: "bg-accent",
  };
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-terminal-border", className)}>
      <div className={cn("h-full rounded-full", barTone[tone])} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

/** Hover tooltip — CSS-only so it works in server components. */
export function Tooltip({ content, children, className }: { content: React.ReactNode; children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("group/tt relative inline-flex", className)}>
      {children}
      <span className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-1.5 hidden -translate-x-1/2 whitespace-pre rounded-md border border-terminal-borderHi bg-terminal-panel px-2 py-1.5 text-2xs text-terminal-text shadow-panel group-hover/tt:block">
        {content}
      </span>
    </span>
  );
}

export function DataTable({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-auto", className)}>
      <table className="data-grid w-full border-collapse">{children}</table>
    </div>
  );
}
