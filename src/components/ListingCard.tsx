import Link from "next/link";
import { BedDouble, Bath, Ruler } from "lucide-react";
import type { ScoredListing } from "@/types/domain";
import { fmtAED, fmtNum, fmtPct, fmtAge } from "@/lib/utils";
import { effectiveDownPaymentPct } from "@/lib/recommender";
import { DealScoreBadge, RiskBadge, ConfidenceBadge, SampleBadge } from "@/components/badges";

function ValueGap({ gap }: { gap: number | null }) {
  if (gap == null) return <span className="text-terminal-muted">—</span>;
  const discount = gap < 0;
  return (
    <span className={discount ? "text-signal-good" : gap > 3 ? "text-signal-risk" : "text-terminal-text"}>
      {discount ? `${Math.abs(gap).toFixed(0)}% below` : `${gap.toFixed(0)}% above`}
    </span>
  );
}

export function ListingCard({ listing, reasons, missingData }: { listing: ScoredListing; reasons?: string[]; missingData?: string[] }) {
  const l = listing;
  const s = l.score;
  const down = effectiveDownPaymentPct(l);
  const warnings = missingData ?? [];

  return (
    <div className="panel flex flex-col overflow-hidden transition-shadow hover:shadow-card">
      <Link href={`/listings/${l.id}`} className="relative block aspect-[16/10] overflow-hidden bg-terminal-panel2">
        {l.imageUrls[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={l.imageUrls[0]} alt={l.title} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full items-center justify-center text-2xs text-terminal-muted">No image</div>
        )}
        <div className="absolute left-2.5 top-2.5">
          <DealScoreBadge score={s.totalDealScore} />
        </div>
        {l.isSample && <div className="absolute right-2.5 top-2.5"><SampleBadge /></div>}
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-3.5">
        <div>
          <Link href={`/listings/${l.id}`} className="line-clamp-1 text-sm font-semibold text-terminal-textHi hover:underline">
            {l.title}
          </Link>
          <div className="mt-1 flex flex-wrap items-center gap-x-1.5 text-2xs text-terminal-muted">
            <span>{l.emirate}</span>·<span>{l.areaName}</span>
            {l.developerName && <>·<span>{l.developerName}</span></>}
            {l.readyState === "Off-Plan" && <span className="text-signal-inferred">· Off-plan</span>}
          </div>
        </div>

        <div className="flex items-center gap-4 text-2xs text-terminal-muted">
          <span className="inline-flex items-center gap-1"><BedDouble className="h-3.5 w-3.5" />{l.bedrooms === 0 ? "Studio" : l.bedrooms ?? "—"}</span>
          <span className="inline-flex items-center gap-1"><Bath className="h-3.5 w-3.5" />{l.bathrooms ?? "—"}</span>
          <span className="inline-flex items-center gap-1"><Ruler className="h-3.5 w-3.5" />{l.sizeSqft ? `${fmtNum(l.sizeSqft)} sqft` : "size n/a"}</span>
        </div>

        <div className="grid grid-cols-3 gap-x-3 gap-y-2 border-t border-terminal-border pt-3 text-2xs">
          <Metric label="Price" value={fmtAED(l.askingPriceAed, { compact: true })} strong />
          <Metric label="Market value" value={fmtAED(s.estimatedMarketValueAed, { compact: true })} />
          <Metric label="vs. market" value={<ValueGap gap={s.valueGapPercent} />} />
          <Metric label="Net yield" value={fmtPct(s.estimatedNetYield)} />
          <Metric label="Per sqft" value={l.pricePerSqft ? fmtNum(l.pricePerSqft) : "—"} />
          <Metric label="Down payment" value={`${fmtNum(down)}%`} />
        </div>

        {reasons && reasons.length > 0 && (
          <ul className="space-y-1 border-t border-terminal-border pt-2.5 text-2xs text-terminal-muted">
            {reasons.slice(0, 2).map((r, i) => (
              <li key={i} className="flex gap-1.5">
                <span className="mt-px text-signal-good">•</span>
                <span>{r}</span>
              </li>
            ))}
          </ul>
        )}

        {warnings.length > 0 && (
          <div className="text-2xs text-signal-caution">⚠ {warnings.slice(0, 2).join(" · ")}</div>
        )}

        <div className="mt-auto flex items-center gap-3 border-t border-terminal-border pt-2.5">
          <RiskBadge risk={s.riskLabel} />
          <ConfidenceBadge confidence={s.overallConfidence} />
          <span className="ml-auto text-2xs text-terminal-muted">{fmtAge(l.listedAt)}</span>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, strong }: { label: string; value: React.ReactNode; strong?: boolean }) {
  return (
    <div>
      <div className="text-[10px] text-terminal-muted">{label}</div>
      <div className={strong ? "tnum text-sm font-semibold text-terminal-textHi" : "tnum text-sm text-terminal-text"}>{value}</div>
    </div>
  );
}
