"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Search, Globe } from "lucide-react";

export function Topbar({ title, subtitle }: { title: string; subtitle?: string }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between gap-4 border-b border-terminal-border bg-terminal-bg/90 px-5 py-3 backdrop-blur">
      <div className="min-w-0">
        <h1 className="truncate text-base font-semibold text-terminal-textHi">{title}</h1>
        {subtitle && <p className="truncate text-2xs text-terminal-muted">{subtitle}</p>}
      </div>
      <div className="flex items-center gap-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            router.push(`/listings?q=${encodeURIComponent(q)}`);
          }}
          className="relative hidden md:block"
        >
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-terminal-muted" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search listings, buildings, areas…"
            className="w-72 rounded-md border border-terminal-border bg-terminal-panel py-1.5 pl-8 pr-3 text-xs text-terminal-textHi placeholder:text-terminal-muted focus:border-accent/60 focus:outline-none"
          />
        </form>
        <div className="flex items-center gap-1.5 rounded-md border border-terminal-border bg-terminal-panel px-2 py-1.5 text-2xs text-terminal-muted">
          <Globe className="h-3.5 w-3.5 text-signal-official" />
          Dubai · Abu Dhabi
        </div>
      </div>
    </header>
  );
}
