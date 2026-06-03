"use client";

import * as React from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import type { ScoredListing } from "@/types/domain";
import { apiGet } from "@/lib/client";
import { Panel, PanelHeader, Select, Field, Stat, EmptyState, Tag } from "@/components/ui";
import { PaymentPlanTimeline } from "@/components/PaymentPlanTimeline";
import { analyzePaymentPlan } from "@/lib/finance";
import { fmtAED, fmtPct } from "@/lib/utils";

type ListingsResp = { items: ScoredListing[] };

export function PaymentPlanAnalyzer() {
  const sp = useSearchParams();
  const initial = sp.get("listing") ?? "";
  const [id, setId] = React.useState(initial);

  const plans = useQuery({ queryKey: ["pp-listings"], queryFn: () => apiGet<ListingsResp>("/api/listings?hasPaymentPlan=true&hideDuplicates=true&limit=100") });
  const items = plans.data?.items ?? [];
  const selectedId = id || items[0]?.id;
  const l = items.find((x) => x.id === selectedId);

  if (plans.isLoading) return <Panel className="p-6"><EmptyState title="Loading payment-plan listings…" /></Panel>;
  if (items.length === 0) return <Panel className="p-6"><EmptyState title="No payment-plan listings" hint="Off-plan / developer listings with plans will appear here." /></Panel>;

  return (
    <div className="space-y-4">
      <div className="max-w-md">
        <Field label="Select an off-plan / payment-plan listing">
          <Select value={selectedId} onChange={(e) => setId(e.target.value)}>
            {items.map((it) => (
              <option key={it.id} value={it.id}>{it.title} — {it.areaName} ({fmtAED(it.askingPriceAed, { compact: true })})</option>
            ))}
          </Select>
        </Field>
      </div>
      {l && l.paymentPlan && l.askingPriceAed ? <PlanDetail listing={l} /> : <Panel className="p-6"><EmptyState title="No plan data for this listing" /></Panel>}
    </div>
  );
}

function PlanDetail({ listing }: { listing: ScoredListing }) {
  const price = listing.askingPriceAed!;
  const plan = listing.paymentPlan!;
  const handoverMonths = plan.handoverMonths ?? 24;
  const a = analyzePaymentPlan(price, plan.schedule, handoverMonths);

  // Comparison vs a ready-property mortgage purchase (20% down + 6% costs upfront).
  const mortgageUpfront = price * (0.2 + 0.06);
  const planUpfront = a.totalBeforeHandoverAed;
  const upfrontSaving = mortgageUpfront - planUpfront;

  const aggressive = (plan.postHandoverPercent ?? 0) >= 50 || handoverMonths > 30;

  return (
    <>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Cash price" value={fmtAED(price, { compact: true })} />
        <Stat label="Down payment" value={`${plan.downPaymentPercent ?? 0}%`} />
        <Stat label="Before handover" value={fmtAED(a.totalBeforeHandoverAed, { compact: true })} sub={`${a.totalBeforeHandoverPct.toFixed(0)}%`} />
        <Stat label="Post-handover" value={fmtAED(a.postHandoverObligationAed, { compact: true })} sub={`${plan.postHandoverPercent ?? 0}%`} />
        <Stat label="Payment-plan score" value={`${listing.score.breakdown.paymentPlanScore}/100`} tone={listing.score.breakdown.paymentPlanScore >= 65 ? "good" : "caution"} />
      </div>

      <Panel>
        <PanelHeader title="Payment schedule & timeline" subtitle={plan.planName} right={aggressive ? <Tag tone="caution">Aggressive plan</Tag> : <Tag tone="good">Standard plan</Tag>} />
        <div className="p-4"><PaymentPlanTimeline plan={plan} totalPriceAed={price} /></div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Plan vs full-cash purchase" subtitle="Present-value benefit of deferring payments (opportunity cost @6%)" />
          <div className="space-y-1.5 p-4 text-2xs">
            <KV label="PV deferral benefit" v={a.deferralBenefitAnnualPct != null ? fmtPct(a.deferralBenefitAnnualPct) : "—"} strong />
            <KV label="Effective embedded premium/discount" v={listing.score.valueGapPercent != null ? `${listing.score.valueGapPercent > 0 ? "+" : ""}${listing.score.valueGapPercent.toFixed(1)}% vs comps` : "—"} />
            <p className="pt-1 text-terminal-muted">Deferring installments has positive PV vs paying 100% today; weigh against off-plan delivery risk and any price premium embedded in the plan.</p>
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Plan vs ready-property mortgage" subtitle="Upfront cash comparison" />
          <div className="space-y-1.5 p-4 text-2xs">
            <KV label="Ready (20% down + 6% costs) upfront" v={fmtAED(mortgageUpfront, { compact: true })} />
            <KV label="Off-plan before-handover cash" v={fmtAED(planUpfront, { compact: true })} />
            <KV label="Upfront cash difference" v={`${upfrontSaving >= 0 ? "−" : "+"}${fmtAED(Math.abs(upfrontSaving), { compact: true })}`} strong />
            <p className="pt-1 text-terminal-muted">{upfrontSaving >= 0 ? "The payment plan needs less cash upfront than a ready mortgage purchase — but you forgo rental income during construction." : "This plan front-loads more cash than a ready mortgage purchase."}</p>
          </div>
        </Panel>
      </div>
    </>
  );
}

function KV({ label, v, strong }: { label: string; v: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-terminal-muted">{label}</span>
      <span className={strong ? "font-semibold text-terminal-textHi" : "text-terminal-text"}>{v}</span>
    </div>
  );
}
