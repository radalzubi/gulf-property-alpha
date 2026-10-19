"use client";

import * as React from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { Area, Developer, ScoredListing } from "@/types/domain";
import { apiGet, qs } from "@/lib/client";
import { effectiveDownPaymentPct } from "@/lib/recommender";
import { Button, DataTable, EmptyState, Field, Input, Select, Skeleton } from "@/components/ui";
import { DealScoreBadge, ConfidenceBadge, RiskBadge, SourceBadge, SampleBadge } from "@/components/badges";
import { fmtAED, fmtNum, fmtPct, fmtAge } from "@/lib/utils";
import { Download, ArrowUpDown, Copy, Filter as FilterIcon } from "lucide-react";

type ListingsResp = { items: ScoredListing[]; total: number; isSampleData: boolean; facets?: Record<string, { value: string; count: number }[]> };

interface Filters {
  q: string;
  emirate: string;
  areaId: string;
  developerId: string;
  propertyType: string;
  readyState: string;
  bedrooms: string;
  minPrice: string;
  maxPrice: string;
  minNetYield: string;
  minDealScore: string;
  riskLabel: string;
  source: string;
  hasPaymentPlan: string;
  hideLowQuality: boolean;
  hideDuplicates: boolean;
  sortBy: string;
  sortDir: "asc" | "desc";
}

const EMPTY: Filters = {
  q: "", emirate: "", areaId: "", developerId: "", propertyType: "", readyState: "", bedrooms: "",
  minPrice: "", maxPrice: "", minNetYield: "", minDealScore: "", riskLabel: "", source: "", hasPaymentPlan: "",
  hideLowQuality: false, hideDuplicates: true, sortBy: "dealScore", sortDir: "desc",
};

export function ListingsExplorer() {
  const sp = useSearchParams();
  const [filters, setFilters] = React.useState<Filters>({ ...EMPTY, q: sp.get("q") ?? "", areaId: sp.get("areaId") ?? "", developerId: sp.get("developerId") ?? "" });
  const [selected, setSelected] = React.useState<Set<string>>(new Set());

  const set = <K extends keyof Filters>(k: K, v: Filters[K]) => setFilters((f) => ({ ...f, [k]: v }));

  const queryString = qs({
    q: filters.q, emirate: filters.emirate, areaId: filters.areaId, developerId: filters.developerId,
    propertyType: filters.propertyType, readyState: filters.readyState, bedrooms: filters.bedrooms,
    minPrice: filters.minPrice, maxPrice: filters.maxPrice, minNetYield: filters.minNetYield,
    minDealScore: filters.minDealScore, riskLabel: filters.riskLabel, source: filters.source,
    hasPaymentPlan: filters.hasPaymentPlan, hideLowQuality: filters.hideLowQuality, hideDuplicates: filters.hideDuplicates,
    sortBy: filters.sortBy, sortDir: filters.sortDir, limit: 500,
  });

  const { data, isLoading } = useQuery({ queryKey: ["listings", queryString], queryFn: () => apiGet<ListingsResp>(`/api/listings${queryString}`) });
  const areas = useQuery({ queryKey: ["areas"], queryFn: () => apiGet<Area[]>("/api/market/areas") });
  const developers = useQuery({ queryKey: ["developers"], queryFn: () => apiGet<Developer[]>("/api/market/developers") });

  const items = data?.items ?? [];
  const sort = (col: string) =>
    setFilters((f) => ({ ...f, sortBy: col, sortDir: f.sortBy === col && f.sortDir === "desc" ? "asc" : "desc" }));
  const toggle = (id: string) => setSelected((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });

  const exportHref = `/api/export?type=listings&${queryString.replace(/^\?/, "")}`;

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
      {/* Filter rail */}
      <aside className="panel h-fit space-y-3 p-3 lg:sticky lg:top-20">
        <div className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-terminal-muted">
          <FilterIcon className="h-3 w-3" /> Filters
        </div>
        <Field label="Search"><Input value={filters.q} onChange={(e) => set("q", e.target.value)} placeholder="title, building, area…" /></Field>
        <Field label="Emirate">
          <Select value={filters.emirate} onChange={(e) => set("emirate", e.target.value)}>
            <option value="">All</option><option>Dubai</option><option>Abu Dhabi</option>
          </Select>
        </Field>
        <Field label="Area">
          <Select value={filters.areaId} onChange={(e) => set("areaId", e.target.value)}>
            <option value="">All areas</option>
            {(areas.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </Select>
        </Field>
        <Field label="Developer">
          <Select value={filters.developerId} onChange={(e) => set("developerId", e.target.value)}>
            <option value="">All developers</option>
            {(developers.data ?? []).map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Type">
            <Select value={filters.propertyType} onChange={(e) => set("propertyType", e.target.value)}>
              <option value="">Any</option><option>Apartment</option><option>Villa</option><option>Townhouse</option><option>Penthouse</option>
            </Select>
          </Field>
          <Field label="Status">
            <Select value={filters.readyState} onChange={(e) => set("readyState", e.target.value)}>
              <option value="">Any</option><option>Ready</option><option>Off-Plan</option>
            </Select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Min price"><Input type="number" value={filters.minPrice} onChange={(e) => set("minPrice", e.target.value)} placeholder="AED" /></Field>
          <Field label="Max price"><Input type="number" value={filters.maxPrice} onChange={(e) => set("maxPrice", e.target.value)} placeholder="AED" /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Min net yield %"><Input type="number" value={filters.minNetYield} onChange={(e) => set("minNetYield", e.target.value)} /></Field>
          <Field label="Min deal score"><Input type="number" value={filters.minDealScore} onChange={(e) => set("minDealScore", e.target.value)} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Field label="Beds (min)">
            <Select value={filters.bedrooms} onChange={(e) => set("bedrooms", e.target.value)}>
              <option value="">Any</option><option value="0">Studio+</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option>
            </Select>
          </Field>
          <Field label="Risk">
            <Select value={filters.riskLabel} onChange={(e) => set("riskLabel", e.target.value)}>
              <option value="">Any</option><option>Low</option><option>Moderate</option><option>Elevated</option><option>High</option>
            </Select>
          </Field>
        </div>
        <Field label="Payment plan">
          <Select value={filters.hasPaymentPlan} onChange={(e) => set("hasPaymentPlan", e.target.value)}>
            <option value="">Any</option><option value="true">Has plan</option><option value="false">No plan</option>
          </Select>
        </Field>
        <label className="flex items-center gap-2 text-2xs text-terminal-text"><input type="checkbox" checked={filters.hideLowQuality} onChange={(e) => set("hideLowQuality", e.target.checked)} /> Hide low-quality / stale</label>
        <label className="flex items-center gap-2 text-2xs text-terminal-text"><input type="checkbox" checked={filters.hideDuplicates} onChange={(e) => set("hideDuplicates", e.target.checked)} /> Hide duplicates</label>
        <Button variant="ghost" size="sm" className="w-full" onClick={() => setFilters(EMPTY)}>Reset filters</Button>
      </aside>

      {/* Table */}
      <div className="min-w-0 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="text-2xs text-terminal-muted">
            {isLoading ? "Loading…" : `${data?.total ?? 0} listings`} {selected.size > 0 && <span className="text-accent">· {selected.size} selected</span>}
          </div>
          <div className="flex items-center gap-1.5">
            {selected.size > 0 && (
              <>
                <Button size="sm" variant="ghost" onClick={() => alert(`Added ${selected.size} to watchlist (sample). Wire to POST /api/watchlists/:id/items.`)}>Add to watchlist</Button>
                <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>Clear</Button>
              </>
            )}
            <a href={exportHref}><Button size="sm" variant="default"><Download className="h-3 w-3" /> Export CSV</Button></a>
          </div>
        </div>

        <div className="panel">
          {isLoading ? (
            <div className="space-y-2 p-3">{Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-6" />)}</div>
          ) : items.length === 0 ? (
            <EmptyState title="No listings match these filters" hint="Loosen a filter or reset to see the full sample dataset." icon={<FilterIcon className="h-5 w-5" />} />
          ) : (
            <DataTable className="max-h-[72vh]">
              <thead>
                <tr>
                  <th className="w-7"></th>
                  <Th label="Listing" />
                  <Th label="Area / Building" />
                  <Th label="Type" />
                  <Th label="Beds" />
                  <ThSort label="Price" col="price" cur={filters.sortBy} onSort={sort} />
                  <ThSort label="AED/sqft" col="psf" cur={filters.sortBy} onSort={sort} />
                  <ThSort label="Value gap" col="valueGap" cur={filters.sortBy} onSort={sort} />
                  <ThSort label="Net yield" col="netYield" cur={filters.sortBy} onSort={sort} />
                  <Th label="Down" />
                  <Th label="Source" />
                  <ThSort label="Deal" col="dealScore" cur={filters.sortBy} onSort={sort} />
                  <ThSort label="Conf" col="confidence" cur={filters.sortBy} onSort={sort} />
                  <Th label="Risk" />
                  <Th label="Refreshed" />
                </tr>
              </thead>
              <tbody>
                {items.map((l) => (
                  <tr key={l.id} className={l.isDuplicate ? "opacity-60" : ""}>
                    <td><input type="checkbox" checked={selected.has(l.id)} onChange={() => toggle(l.id)} /></td>
                    <td>
                      <Link href={`/listings/${l.id}`} className="font-medium text-terminal-textHi hover:text-accent">{l.title}</Link>
                      <div className="flex items-center gap-1 text-[10px] text-terminal-muted">
                        {l.isSample && <SampleBadge />}
                        {l.readyState === "Off-Plan" && <span className="text-signal-inferred">Off-plan</span>}
                        {l.status === "stale" && <span className="text-signal-caution">stale</span>}
                        {l.isDuplicate && <span className="inline-flex items-center gap-0.5 text-signal-caution"><Copy className="h-2.5 w-2.5" />dup</span>}
                      </div>
                    </td>
                    <td><div className="text-terminal-text">{l.areaName}</div><div className="text-[10px] text-terminal-muted">{l.buildingName}</div></td>
                    <td>{l.propertyType}</td>
                    <td>{l.bedrooms === 0 ? "Studio" : l.bedrooms ?? "—"}</td>
                    <td className="font-semibold text-terminal-textHi">{fmtAED(l.askingPriceAed, { compact: true })}</td>
                    <td>{l.pricePerSqft ? fmtNum(l.pricePerSqft) : "—"}</td>
                    <td className={(l.score.valueGapPercent ?? 0) < 0 ? "text-signal-good" : (l.score.valueGapPercent ?? 0) > 3 ? "text-signal-risk" : ""}>
                      {l.score.valueGapPercent != null ? `${l.score.valueGapPercent > 0 ? "+" : ""}${l.score.valueGapPercent.toFixed(1)}%` : "—"}
                    </td>
                    <td className="text-signal-good">{fmtPct(l.score.estimatedNetYield)}</td>
                    <td>{fmtNum(effectiveDownPaymentPct(l))}%</td>
                    <td><SourceBadge sourceClass={l.sourceClass} sourceId={l.sourceId} /></td>
                    <td><DealScoreBadge score={l.score.totalDealScore} showLabel={false} /></td>
                    <td><ConfidenceBadge confidence={l.score.overallConfidence} /></td>
                    <td><RiskBadge risk={l.score.riskLabel} /></td>
                    <td className="text-[10px] text-terminal-muted">{fmtAge(l.lastRefreshedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          )}
        </div>
        <p className="text-2xs text-terminal-muted">Tip: click sortable headers to sort. Export respects active filters. Contact info shown is agent/agency public data only.</p>
      </div>
    </div>
  );
}

function Th({ label }: { label: string }) {
  return <th>{label}</th>;
}
function ThSort({ label, col, cur, onSort }: { label: string; col: string; cur: string; onSort: (c: string) => void }) {
  return (
    <th>
      <button onClick={() => onSort(col)} className="inline-flex items-center gap-1 hover:text-terminal-textHi">
        {label}
        <ArrowUpDown className={`h-2.5 w-2.5 ${cur === col ? "text-accent" : "opacity-40"}`} />
      </button>
    </th>
  );
}
