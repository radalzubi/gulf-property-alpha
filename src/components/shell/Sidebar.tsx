"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV } from "./nav";

export function Sidebar() {
  const pathname = usePathname();
  return (
    <aside className="flex h-screen w-60 flex-col border-r border-terminal-border bg-terminal-panel">
      <div className="flex items-center gap-2 border-b border-terminal-border px-4 py-3.5">
        <div className="flex h-7 w-7 items-center justify-center rounded-md bg-accent/20 text-accent">
          <span className="font-mono text-sm font-bold">α</span>
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold text-terminal-textHi">Gulf Property Alpha</div>
          <div className="text-2xs text-terminal-muted">Dubai · Abu Dhabi</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-2 py-3">
        {NAV.map((group) => (
          <div key={group.label} className="mb-3">
            <div className="px-2 pb-1 text-2xs font-semibold uppercase tracking-wider text-terminal-muted/70">{group.label}</div>
            {group.items.map((item) => {
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group mb-0.5 flex items-center gap-2.5 rounded-md px-2 py-1.5 text-xs transition-colors",
                    active ? "bg-accent/15 text-accent" : "text-terminal-muted hover:bg-terminal-panel2 hover:text-terminal-text",
                  )}
                >
                  <Icon className="h-4 w-4 shrink-0" strokeWidth={1.75} />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="border-t border-terminal-border px-3 py-2.5 text-2xs text-terminal-muted">
        <div className="flex items-center gap-1.5">
          <span className="h-1.5 w-1.5 rounded-full bg-signal-inferred" />
          Sample data
        </div>
        <p className="mt-1 leading-snug">For research only — not financial advice. Every figure shows its source.</p>
      </div>
    </aside>
  );
}
