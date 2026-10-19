"use client";

import * as React from "react";
import { useQuery } from "@tanstack/react-query";
import type { Area, Recommendation, ScoredListing, ScoringWeights } from "@/types/domain";
import { apiGet, apiSend } from "@/lib/client";
import { PRESET_PROFILES } from "@/lib/recommender/profiles";
import { Topbar } from "@/components/shell/Topbar";
import { ListingCard } from "@/components/ListingCard";
import { RecommendationWeightSliders } from "@/components/RecommendationWeightSliders";
import { EmptyState, Skeleton, Stat } from "@/components/ui";
import { cn, fmtPct, fmtSignedPct } from "@/lib/utils";
import { TrendingUp } from "lucide-react";

type ListingsResp = { items: ScoredListing[]; total: number; isSampleData: boolean };

export default function HomePage() {
  const [profileId, setProfileId] = React.useState(PRESET_PROFILES[0].id);
  const [weights, setWeights] = React.useState<ScoringWeights>(PRESET_PROFILES[0].weights);

  const profile = PRESET_PROFILES.find((p) => p.id === profileId)!;

  const selectProfile = (id: string) => {
    setProfileId(id);
    setWeights(PRESET_PROFILES.find((p) => p.id === id)!.weights);
  };

  const recs = useQuery({
    queryKey: ["recs", profileId, weights],
    queryFn: () => apiSend<Recommendation[]>("/api/recommendations/query", "POST", { profileId, weights, limit: 48 }),
  });
  const pool = useQuery({
    queryKey: ["home-pool"],
    queryFn: () => apiGet<ListingsResp>("/api/listings?limit=500&hideDuplicates=true"),
  });
  const areas = useQuery({ queryKey: ["areas"], queryFn: () => apiGet<Area[]>("/api/market/areas") });

  const all = pool.data?.items ?? [];
  const byYield = [...all].filter((l) => l.score.estimatedNetYield != null).sort((a, b) => (b.score.estimatedNetYield ?? 0) - (a.score.estimatedNetYield ?? 0));
  const undervalued = [...all].filter((l) => (l.score.valueGapPercent ?? 0) < -3).sort((a, b) => (a.score.valueGapPercent ?? 0) - (b.score.valueGapPercent ?? 0));
  const offPlanPlans = [...all].filter((l) => l.paymentPlan).sort((a, b) => b.score.breakdown.paymentPlanScore - a.score.breakdown.paymentPlanScore);
  const readyIncome = [...all].filter((l) => l.readyState === "Ready" && (l.score.estimatedNetYield ?? 0) > 0).sort((a, b) => (b.score.estimatedNetYield ?? 0) - (a.score.estimatedNetYield ?? 0));
  const lowRisk = [...all].filter((l) => l.score.riskLabel === "Low" || l.score.riskLabel === "Moderate").sort((a, b) => b.score.breakdown.riskScore - a.score.breakdown.riskScore);
  const highUpside = [...all].filter((l) => l.score.riskLabel === "Elevated" || l.score.riskLabel === "High" || l.readyState === "Off-Plan").sort((a, b) => b.score.breakdown.areaMomentumScore - a.score.breakdown.areaMomentumScore);

  const momentumAreas = [...(areas.data ?? [])].sort((a, b) => (b.annualPriceChangePct ?? 0) - (a.annualPriceChangePct ?? 0)).slice(0, 6);

  const loading = recs.isLoading || pool.isLoading;

  return (
    <>
      <Topbar title="Home / Recommended Deals" subtitle="Top decision page — ranked opportunities across Dubai & Abu Dhabi" />
      <div className="animate-fade-in space-y-5 p-5">
        {/* Profile selector */}
        <div className="flex flex-wrap items-center gap-1.5">
          {PRESET_PROFILES.map((p) => (
            <button
              key={p.id}
              onClick={() => selectProfile(p.id)}
              title={p.description}
              className={cn(
                "rounded-full border px-2.5 py-1 text-2xs font-medium transition-colors",
                p.id === profileId ? "border-accent/50 bg-accent/15 text-accent" : "border-terminal-border bg-terminal-panel text-terminal-muted hover:text-terminal-text",
              )}
            >
              {p.name}
            </button>
          ))}
        </div>
        <p className="text-2xs text-terminal-muted">{profile.description}</p>

        <RecommendationWeightSliders weights={weights} onChange={setWeights} onReset={() => setWeights(profile.weights)} />

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Stat label="Listings analyzed" value={pool.data ? pool.data.total : "—"} sub="provenance-scored" />
          <Stat label="Recommended (this profile)" value={recs.data ? recs.data.length : "—"} sub={profile.name} tone="good" />
          <Stat label="Undervalued (>3% discount)" value={undervalued.length} sub="vs comp fair value" tone={undervalued.length ? "good" : undefined} />
          <Stat label="Top net yield" value={byYield[0] ? fmtPct(byYield[0].score.estimatedNetYield) : "—"} sub={byYield[0]?.areaName} tone="good" />
        </div>

        {loading ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="panel p-3">
                <Skeleton className="mb-3 aspect-[16/9] w-full" />
                <Skeleton className="mb-2 h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <RecSection title="Top recommended deals" hint={`Ranked for "${profile.name}" with your weights`} recs={recs.data ?? []} />
            {/* Area momentum strip */}
            {momentumAreas.length > 0 && (
              <section>
                <SectionHeader title="Strongest appreciation-momentum areas" hint="By annual price change (SAMPLE area trends)" />
                <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-6">
                  {momentumAreas.map((a) => (
                    <a key={a.id} href={`/neighborhoods/${a.id}`} className="panel px-3 py-2.5 transition-colors hover:border-terminal-borderHi">
                      <div className="flex items-center justify-between">
                        <span className="text-2xs text-signal-official">{a.emirate}</span>
                        <TrendingUp className="h-3 w-3 text-signal-good" />
                      </div>
                      <div className="mt-0.5 line-clamp-1 text-xs font-semibold text-terminal-textHi">{a.name}</div>
                      <div className="mt-1 text-sm font-semibold tnum text-signal-good">{fmtSignedPct(a.annualPriceChangePct)}</div>
                      <div className="text-2xs text-terminal-muted">rent {fmtSignedPct(a.annualRentChangePct)} · yield {fmtPct(a.grossYield)}</div>
                    </a>
                  ))}
                </div>
              </section>
            )}
            <ListingSection title="Undervalued listings" hint="Largest discounts to comp-based fair value" items={undervalued} />
            <ListingSection title="Highest net-yield listings" hint="Best estimated net rental yield" items={byYield} />
            <ListingSection title="Best off-plan payment-plan opportunities" hint="Most attractive plans from credible developers" items={offPlanPlans} />
            <ListingSection title="Best ready-property rental income" hint="Ready units with strong supportable cashflow" items={readyIncome} />
            <ListingSection title="Low-risk stable-income opportunities" hint="Lowest risk score with positive yield" items={lowRisk} />
            <ListingSection title="Higher-risk, higher-upside opportunities" hint="Elevated risk with strong momentum / off-plan upside" items={highUpside} />
          </>
        )}
      </div>
    </>
  );
}

function SectionHeader({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between">
      <h2 className="text-sm font-semibold text-terminal-textHi">{title}</h2>
      {hint && <span className="text-2xs text-terminal-muted">{hint}</span>}
    </div>
  );
}

function RecSection({ title, hint, recs }: { title: string; hint?: string; recs: Recommendation[] }) {
  if (recs.length === 0) return <section><SectionHeader title={title} hint={hint} /><div className="panel"><EmptyState title="No recommendations match this profile" hint="Try a different profile or relax the weights/filters." /></div></section>;
  return (
    <section>
      <SectionHeader title={title} hint={hint} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {recs.slice(0, 8).map((r) => (
          <ListingCard key={r.listing.id} listing={r.listing} reasons={r.reasons} missingData={r.missingData} />
        ))}
      </div>
    </section>
  );
}

function ListingSection({ title, hint, items }: { title: string; hint?: string; items: ScoredListing[] }) {
  if (items.length === 0) return null;
  return (
    <section>
      <SectionHeader title={title} hint={hint} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {items.slice(0, 4).map((l) => (
          <ListingCard key={l.id} listing={l} />
        ))}
      </div>
    </section>
  );
}
