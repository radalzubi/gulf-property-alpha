import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepository } from "@/lib/repo";
import { Topbar } from "@/components/shell/Topbar";
import { Panel, PanelHeader, Stat, Tag, ScoreBar, Button } from "@/components/ui";
import { DealScoreBadge, ConfidenceBadge, RiskBadge, SourceBadge, SampleBadge, ProvenanceValue, TimestampBadge } from "@/components/badges";
import { MarketCompsTable } from "@/components/MarketCompsTable";
import { PaymentPlanTimeline } from "@/components/PaymentPlanTimeline";
import { LineSeries } from "@/components/charts/LineSeries";
import { ListingCard } from "@/components/ListingCard";
import { computeYield, defaultAssumptions } from "@/lib/scoring";
import { similaritySets } from "@/lib/recommender";
import { fmtAED, fmtNum, fmtPct, fmtSignedPct, fmtDate, fmtAge, toSqm } from "@/lib/utils";
import { CheckCircle2, XCircle, ExternalLink } from "lucide-react";
import type { FieldProvenance } from "@/lib/provenance";

export const dynamic = "force-dynamic";

export default async function DealDetailPage({ params }: { params: { id: string } }) {
  const repo = await getRepository();
  const pool = (await repo.getListings({ limit: 500, hideDuplicates: false })).items;
  const l = pool.find((x) => x.id === params.id) ?? (await repo.getListing(params.id));
  if (!l) notFound();

  const [comps, areaDetail, developerDetail] = await Promise.all([
    repo.getListingComps(l.id),
    repo.getAreaDetail(l.areaId),
    l.developerId ? repo.getDeveloperDetail(l.developerId) : Promise.resolve(null),
  ]);

  const s = l.score;
  const fp: FieldProvenance = l.fieldProvenance ?? {};
  const sim = similaritySets(l, pool, 4);

  // Recompute yield breakdown for display
  const y = computeYield({
    askingPriceAed: l.askingPriceAed ?? 0,
    estimatedAnnualRentAed: s.estimatedAnnualRentAed,
    sizeSqft: l.sizeSqft,
    serviceChargePsf: l.serviceChargePsf,
    assumptions: defaultAssumptions(l.emirate),
  });

  const buildingComps = comps.filter((c) => c.compType === "same_building");
  const hasBuildingMatch = buildingComps.length > 0;
  const hasAreaTxns = comps.length > 0;
  const hasRentRecords = (areaDetail?.rentSeries.length ?? 0) > 0;

  return (
    <>
      <Topbar title={l.title} subtitle={`${l.emirate} · ${l.areaName}${l.buildingName ? ` · ${l.buildingName}` : ""}`} />
      <div className="animate-fade-in space-y-4 p-5">
        {/* header bar */}
        <div className="flex flex-wrap items-center gap-2">
          <Link href="/listings"><Button size="sm" variant="ghost">← Listings</Button></Link>
          <DealScoreBadge score={s.totalDealScore} />
          <RiskBadge risk={s.riskLabel} />
          <ConfidenceBadge confidence={s.overallConfidence} />
          <SourceBadge sourceClass={l.sourceClass} sourceId={l.sourceId} />
          {l.isSample && <SampleBadge />}
          {l.readyState === "Off-Plan" && <Tag tone="inferred">Off-Plan</Tag>}
          {l.status === "stale" && <Tag tone="caution">Stale</Tag>}
          {l.isDuplicate && <Tag tone="caution">Duplicate</Tag>}
          <div className="ml-auto"><TimestampBadge at={l.lastRefreshedAt} /></div>
        </div>

        {/* KPI strip */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
          <Stat label="Asking price" value={fmtAED(l.askingPriceAed, { compact: true })} sub={l.pricePerSqft ? `${fmtNum(l.pricePerSqft)} AED/sqft` : "psf N/A"} />
          <Stat label="Est. market value" value={fmtAED(s.estimatedMarketValueAed, { compact: true })} sub={`${s.compCount} comps`} />
          <Stat label="Value gap" value={s.valueGapPercent != null ? fmtSignedPct(s.valueGapPercent) : "—"} tone={(s.valueGapPercent ?? 0) < 0 ? "good" : (s.valueGapPercent ?? 0) > 3 ? "risk" : undefined} sub={(s.valueGapPercent ?? 0) < 0 ? "discount" : "premium"} />
          <Stat label="Net / gross yield" value={`${fmtPct(s.estimatedNetYield)} / ${fmtPct(s.estimatedGrossYield)}`} tone="good" sub={`${s.rentCompCount} rent comps`} />
          <Stat label="Deal score" value={`${s.totalDealScore}/100`} tone={s.totalDealScore >= 70 ? "good" : s.totalDealScore >= 50 ? "caution" : "risk"} sub={s.riskLabel + " risk"} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* LEFT: A, C, D */}
          <div className="space-y-4 lg:col-span-2">
            {/* A. Listing summary */}
            <Panel>
              <PanelHeader title="Listing summary" subtitle="Each figure shows where it came from — hover the dot." />
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 p-4 text-2xs sm:grid-cols-3">
                <Row label="Price"><ProvenanceValue value={fmtAED(l.askingPriceAed)} entry={fp.askingPriceAed} /></Row>
                <Row label="Size"><ProvenanceValue value={l.sizeSqft ? `${fmtNum(l.sizeSqft)} sqft (${fmtNum(toSqm(l.sizeSqft))} sqm)` : ""} entry={fp.sizeSqft} /></Row>
                <Row label="AED/sqft"><ProvenanceValue value={l.pricePerSqft ? fmtNum(l.pricePerSqft) : ""} entry={fp.pricePerSqft} /></Row>
                <Row label="Bedrooms"><ProvenanceValue value={l.bedrooms === 0 ? "Studio" : l.bedrooms} entry={fp.bedrooms} /></Row>
                <Row label="Bathrooms">{l.bathrooms ?? "—"}</Row>
                <Row label="Type">{l.propertyType}</Row>
                <Row label="Area">{l.areaName}</Row>
                <Row label="Building">{l.buildingName ?? "—"}</Row>
                <Row label="Developer">{developerDetail ? <Link className="text-accent" href={`/developers/${l.developerId}`}>{l.developerName}</Link> : "—"}</Row>
                <Row label="Status">{l.readyState}</Row>
                <Row label="Handover"><ProvenanceValue value={fmtDate(l.handoverDate)} entry={fp.handoverDate} /></Row>
                <Row label="Furnishing">{l.furnishingStatus}</Row>
                <Row label="Occupancy"><ProvenanceValue value={l.occupancyStatus} entry={fp.occupancyStatus} /></Row>
                <Row label="Tenure">{l.tenure}</Row>
                <Row label="Service charge"><ProvenanceValue value={l.serviceChargePsf ? `${l.serviceChargePsf} AED/sqft` : ""} entry={fp.serviceChargePsf} /></Row>
                <Row label="Agent">{l.agentName ?? "—"}</Row>
                <Row label="Agency">{l.agencyName ?? "—"}</Row>
                <Row label="Contact"><ProvenanceValue value={l.publicPhone ?? ""} entry={fp.publicPhone} /></Row>
                <Row label="Source">{l.sourceId}</Row>
                <Row label="Listed">{fmtAge(l.listedAt)}</Row>
                <Row label="Listing URL">{l.listingUrl ? <a className="inline-flex items-center gap-1 text-accent" href={l.listingUrl} target="_blank" rel="noreferrer">open <ExternalLink className="h-3 w-3" /></a> : "—"}</Row>
              </div>
            </Panel>

            {/* C. Price analysis */}
            <Panel>
              <PanelHeader title="Price analysis" subtitle="Recent comparable sales, weighted by how recent and similar they are" />
              <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-4">
                <Mini label="Asking" value={fmtAED(l.askingPriceAed, { compact: true })} />
                <Mini label="Est. value" value={fmtAED(s.estimatedMarketValueAed, { compact: true })} />
                <Mini label="Value range" value={`${fmtAED(s.estimatedMarketValueLow, { compact: true })} – ${fmtAED(s.estimatedMarketValueHigh, { compact: true })}`} />
                <Mini label="vs fair value" value={s.valueGapPercent != null ? fmtSignedPct(s.valueGapPercent) : "—"} tone={(s.valueGapPercent ?? 0) < 0 ? "good" : "risk"} />
                <Mini label="Median building PSF" value={areaDetail && hasBuildingMatch ? fmtNum(buildingMedian(comps)) : "n/a"} />
                <Mini label="Median area PSF" value={areaDetail?.area.medianSalePsf ? fmtNum(areaDetail.area.medianSalePsf) : "—"} />
                <Mini label="Liquidity" value={`${areaDetail?.area.liquidityScore ?? "—"}/100`} />
                <Mini label="Txn volume (sample)" value={fmtNum(areaDetail?.txnVolume12m ?? 0)} />
              </div>
              <div className="border-t border-terminal-border">
                <MarketCompsTable comps={comps} />
              </div>
            </Panel>

            {/* D. Rental / yield */}
            <Panel>
              <PanelHeader title="Rent & yield" subtitle="Net yield is rental income after costs, divided by the all-in purchase price" />
              <div className="grid grid-cols-1 gap-4 p-4 md:grid-cols-2">
                <div className="space-y-1.5 text-2xs">
                  <KV label="Estimated annual rent" value={fmtAED(s.estimatedAnnualRentAed)} strong />
                  <KV label="Rent range" value={`${fmtAED(s.estimatedAnnualRentLow, { compact: true })} – ${fmtAED(s.estimatedAnnualRentHigh, { compact: true })}`} />
                  <KV label="Gross yield" value={fmtPct(s.estimatedGrossYield)} />
                  <KV label="− Vacancy allowance" value={fmtAED(y.vacancyCostAed)} />
                  <KV label="− Service charge" value={`${fmtAED(y.serviceChargeAed)}${y.serviceChargeAssumed ? " (assumed)" : ""}`} />
                  <KV label="− Management fee" value={fmtAED(y.managementFeeAed)} />
                  <KV label="− Maintenance reserve" value={fmtAED(y.maintenanceAed)} />
                  <KV label="− Insurance" value={fmtAED(y.insuranceAed)} />
                  <KV label="= NOI" value={fmtAED(y.noiAed)} strong />
                </div>
                <div className="space-y-1.5 text-2xs">
                  <KV label="All-in acquisition cost" value={fmtAED(y.allInAcquisitionCostAed)} strong />
                  <KV label="incl. transfer / registration" value={fmtPct(defaultAssumptions(l.emirate).transferCostPct)} />
                  <KV label="incl. broker fee" value={fmtPct(defaultAssumptions(l.emirate).brokerFeePct)} />
                  <KV label="Net yield" value={fmtPct(y.netYieldPct)} strong />
                  <KV label="Tenant demand" value={`${s.breakdown.rentDemandScore}/100`} />
                  <KV label="Vacancy risk (area)" value={`${areaDetail?.area.vacancyRiskScore ?? "—"}/100`} />
                  <div className="mt-2 rounded border border-terminal-border bg-terminal-panel2 p-2 text-terminal-muted">
                    Mortgage-adjusted returns (cash-on-cash, levered IRR, DSCR) are available in the <Link href={`/yield?listing=${l.id}`} className="text-accent">Yield Analyzer</Link> with your financing assumptions.
                  </div>
                </div>
              </div>
            </Panel>

            {/* E. Payment plan */}
            {l.paymentPlan && l.askingPriceAed && (
              <Panel>
                <PanelHeader title="Payment plan" subtitle={l.paymentPlan.planName} right={<Link href={`/payment-plan?listing=${l.id}`}><Button size="sm" variant="ghost">Open →</Button></Link>} />
                <div className="p-4">
                  <PaymentPlanTimeline plan={l.paymentPlan} totalPriceAed={l.askingPriceAed} />
                </div>
              </Panel>
            )}

            {/* G. Land / area value history */}
            <Panel>
              <PanelHeader title="Area price history" subtitle={`${l.areaName} — median price per sqft (sample data)`} />
              <div className="p-4">
                <LineSeries
                  data={(areaDetail?.priceSeries ?? []).map((p) => ({ period: p.periodStart.slice(0, 7), psf: p.value }))}
                  xKey="period"
                  yKey="psf"
                  area
                  format="psf"
                />
                <p className="mt-2 text-2xs text-terminal-muted">
                  Exact land-parcel history is unavailable for this unit. Showing area-level transaction PSF trend instead.
                  {l.emirate === "Abu Dhabi" && " Abu Dhabi official coverage is thinner than Dubai."}
                </p>
              </div>
            </Panel>
          </div>

          {/* RIGHT: B, F, H, I */}
          <div className="space-y-4">
            {/* B. Official data match */}
            <Panel>
              <PanelHeader title="Official data match" subtitle="What we could link to government records" />
              <div className="space-y-1.5 p-4">
                <Match ok={hasAreaTxns} label="DLD transaction records (area)" />
                <Match ok={hasBuildingMatch} label="DLD transactions (same building)" />
                <Match ok={hasRentRecords} label="DLD rental records (area)" />
                <Match ok={!!developerDetail?.developer.officialId} label={`Developer registry${developerDetail?.developer.officialId ? ` · ${developerDetail.developer.officialId}` : ""}`} />
                <Match ok={!!l.projectId} label="Project / project ID" />
                {l.emirate === "Abu Dhabi" ? (
                  <Match ok={false} label="ADREC / DARI / rental index (awaiting credentials)" />
                ) : (
                  <Match ok={false} label="DLD Gateway / Dubai REST (awaiting credentials)" />
                )}
              </div>
            </Panel>

            {/* F. Developer / project */}
            {developerDetail && (
              <Panel>
                <PanelHeader title="Developer" subtitle={developerDetail.developer.name} right={<Link href={`/developers/${l.developerId}`}><Button size="sm" variant="ghost">Profile →</Button></Link>} />
                <div className="space-y-1.5 p-4 text-2xs">
                  <KV label="Quality score" value={`${developerDetail.developer.qualityScore}/100`} />
                  <KV label="Delivery risk" value={`${developerDetail.developer.deliveryRiskScore}/100`} />
                  <KV label="Service-charge risk" value={`${developerDetail.developer.serviceChargeRiskScore ?? "—"}/100`} />
                  <KV label="Avg. delay" value={developerDetail.developer.avgDelayMonths != null ? `${developerDetail.developer.avgDelayMonths} mo` : "—"} />
                  <KV label="Avg. resale premium" value={fmtSignedPct(developerDetail.developer.avgResalePremiumPct ?? 0)} />
                  <KV label="Completed / active" value={`${developerDetail.developer.completedProjects ?? "—"} / ${developerDetail.developer.activeProjects ?? "—"}`} />
                  {developerDetail.developer.notes && <p className="pt-1 text-terminal-muted">{developerDetail.developer.notes}</p>}
                </div>
              </Panel>
            )}

            {/* H. Reason for sale */}
            <Panel>
              <PanelHeader title="Why is it being sold?" subtitle="Shown as fact only if stated — otherwise a clearly-labeled guess" />
              <div className="p-4">
                {l.reasonForSale ? (
                  <>
                    <div className="mb-2 flex flex-wrap items-center gap-1.5">
                      <Tag tone={l.reasonForSale.confidence === "high" ? "good" : l.reasonForSale.confidence === "medium" ? "caution" : "missing"}>
                        {reasonLabel(l.reasonForSale.category)}
                      </Tag>
                      <Tag tone={l.reasonForSale.confidence === "high" ? "good" : "caution"}>{l.reasonForSale.confidence} confidence</Tag>
                      <SourceBadge sourceClass={l.reasonForSale.sourceClass} />
                    </div>
                    <p className="text-2xs text-terminal-text">{l.reasonForSale.explanation}</p>
                    <ul className="mt-2 space-y-0.5 text-2xs text-terminal-muted">
                      {l.reasonForSale.evidence.map((e, i) => <li key={i}>• {e}</li>)}
                    </ul>
                  </>
                ) : (
                  <p className="text-2xs text-terminal-muted">No reliable signal for reason-for-sale. Not inferred. (Reason is shown as fact only when explicitly stated in the listing, broker/developer notes, or user notes.)</p>
                )}
              </div>
            </Panel>

            {/* I. Deal score explanation */}
            <Panel>
              <PanelHeader title="How we scored this" subtitle={`${s.totalDealScore} out of 100 — what drove it`} />
              <div className="space-y-2 p-4">
                <Bar label="Price discount" v={s.breakdown.priceScore} />
                <Bar label="Net yield" v={s.breakdown.yieldScore} />
                <Bar label="Rent demand" v={s.breakdown.rentDemandScore} />
                <Bar label="Liquidity" v={s.breakdown.liquidityScore} />
                <Bar label="Area momentum" v={s.breakdown.areaMomentumScore} />
                <Bar label="Developer" v={s.breakdown.developerScore} />
                <Bar label="Payment plan" v={s.breakdown.paymentPlanScore} />
                <Bar label="Risk (safer→)" v={s.breakdown.riskScore} />
                <Bar label="Confidence" v={s.breakdown.confidenceScore} />
                {s.breakdown.missingDataPenalty > 0 && <div className="text-2xs text-signal-caution">Missing-data penalty: −{s.breakdown.missingDataPenalty} pts</div>}
                <ul className="space-y-1 border-t border-terminal-border pt-2 text-2xs text-terminal-muted">
                  {s.explanation.map((e, i) => <li key={i}>• {e}</li>)}
                </ul>
              </div>
            </Panel>
          </div>
        </div>

        {/* Alternatives */}
        <AltSection title="Similar — same area" items={sim.sameArea} />
        <AltSection title="Better value (bigger discount)" items={sim.betterValue} />
        <AltSection title="Higher yield" items={sim.higherYield} />
        <AltSection title="Safer alternatives" items={sim.safer} />
        <AltSection title="Same developer" items={sim.sameDeveloper} />
        <AltSection title="Better payment terms" items={sim.betterPaymentTerms} />
      </div>
    </>
  );
}

function buildingMedian(comps: { compType: string; pricePerSqft: number }[]): number {
  const b = comps.filter((c) => c.compType === "same_building").map((c) => c.pricePerSqft).sort((a, z) => a - z);
  if (b.length === 0) return 0;
  return Math.round(b[Math.floor(b.length / 2)]);
}

function reasonLabel(c: string) {
  return c.replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase());
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-terminal-muted/70">{label}</div>
      <div className="text-terminal-text">{children}</div>
    </div>
  );
}
function Mini({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "good" | "risk" }) {
  return (
    <div className="rounded-md border border-terminal-border bg-terminal-panel2 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wide text-terminal-muted">{label}</div>
      <div className={`tnum text-xs font-semibold ${tone === "good" ? "text-signal-good" : tone === "risk" ? "text-signal-risk" : "text-terminal-textHi"}`}>{value}</div>
    </div>
  );
}
function KV({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-terminal-muted">{label}</span>
      <span className={strong ? "tnum font-semibold text-terminal-textHi" : "tnum text-terminal-text"}>{value}</span>
    </div>
  );
}
function Match({ ok, label }: { ok: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2 text-2xs">
      {ok ? <CheckCircle2 className="h-3.5 w-3.5 text-signal-good" /> : <XCircle className="h-3.5 w-3.5 text-signal-missing" />}
      <span className={ok ? "text-terminal-text" : "text-terminal-muted"}>{label}</span>
    </div>
  );
}
function Bar({ label, v }: { label: string; v: number }) {
  const tone = v >= 70 ? "good" : v >= 45 ? "caution" : "risk";
  return (
    <div>
      <div className="flex items-center justify-between text-2xs">
        <span className="text-terminal-muted">{label}</span>
        <span className="tnum text-terminal-text">{v}</span>
      </div>
      <ScoreBar value={v} tone={tone} className="mt-0.5" />
    </div>
  );
}
function AltSection({ title, items }: { title: string; items: import("@/types/domain").ScoredListing[] }) {
  if (!items || items.length === 0) return null;
  return (
    <section>
      <h2 className="mb-2 text-sm font-semibold text-terminal-textHi">{title}</h2>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((l) => <ListingCard key={l.id} listing={l} />)}
      </div>
    </section>
  );
}
