import type { PaymentPlan } from "@/types/domain";
import { analyzePaymentPlan } from "@/lib/finance";
import { fmtAED, fmtPct } from "@/lib/utils";

const MILESTONE_COLOR: Record<string, string> = {
  booking: "#111111",
  construction: "#b45309",
  handover: "#15803d",
  post_handover: "#6d28d9",
};

/** Presentational payment-plan timeline + cumulative cash + IRR-impact summary. */
export function PaymentPlanTimeline({ plan, totalPriceAed }: { plan: PaymentPlan; totalPriceAed: number }) {
  const handoverMonths = plan.handoverMonths ?? 24;
  const analysis = analyzePaymentPlan(totalPriceAed, plan.schedule, handoverMonths);
  const lastMonth = plan.schedule.reduce((m, s) => Math.max(m, s.monthOffset), handoverMonths);
  let cum = 0;

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Mini label="Before handover" value={fmtAED(analysis.totalBeforeHandoverAed, { compact: true })} sub={`${analysis.totalBeforeHandoverPct.toFixed(0)}% of price`} />
        <Mini label="On handover" value={fmtAED(analysis.handoverExposureAed, { compact: true })} />
        <Mini label="Post-handover" value={fmtAED(analysis.postHandoverObligationAed, { compact: true })} sub={`${plan.postHandoverPercent ?? 0}%`} />
        <Mini label="Plan vs full-cash benefit" value={analysis.deferralBenefitAnnualPct != null ? fmtPct(analysis.deferralBenefitAnnualPct) : "—"} sub="PV deferral @6%" tone="good" />
      </div>

      {/* Timeline bars */}
      <div className="space-y-1.5">
        {plan.schedule.map((s, i) => {
          cum += s.percent;
          const left = (s.monthOffset / Math.max(1, lastMonth)) * 100;
          return (
            <div key={i} className="flex items-center gap-2 text-2xs">
              <div className="w-40 shrink-0 truncate text-terminal-muted">{s.label}</div>
              <div className="relative h-4 flex-1 rounded bg-terminal-border/40">
                <div
                  className="absolute top-0 h-4 -translate-x-1/2 rounded px-1 text-[9px] leading-4 text-white"
                  style={{ left: `${Math.min(96, left)}%`, background: MILESTONE_COLOR[s.milestone ?? "construction"] }}
                >
                  {s.percent}%
                </div>
              </div>
              <div className="w-24 shrink-0 text-right text-terminal-muted">m{s.monthOffset} · {fmtAED((s.percent / 100) * totalPriceAed, { compact: true })}</div>
              <div className="w-12 shrink-0 text-right tnum text-terminal-text">{cum.toFixed(0)}%</div>
            </div>
          );
        })}
      </div>
      <p className="text-2xs text-terminal-muted">Booking → handover at month {handoverMonths}. Cumulative % shown at right. Source: {plan.sourceClass.replace(/_/g, " ")}.</p>
    </div>
  );
}

function Mini({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: "good" }) {
  return (
    <div className="rounded-md border border-terminal-border bg-terminal-panel2 px-2.5 py-2">
      <div className="text-[10px] uppercase tracking-wide text-terminal-muted">{label}</div>
      <div className={`tnum text-sm font-semibold ${tone === "good" ? "text-signal-good" : "text-terminal-textHi"}`}>{value}</div>
      {sub && <div className="text-[10px] text-terminal-muted">{sub}</div>}
    </div>
  );
}
