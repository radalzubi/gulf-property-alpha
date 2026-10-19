import { getRepository } from "@/lib/repo";
import { DEFAULT_USER_ID } from "@/lib/api";
import { PageShell } from "@/components/PageShell";
import { Panel, PanelHeader, Stat, DataTable, Tag, ScoreBar } from "@/components/ui";
import { AddAssetForm } from "@/components/portfolio/AddAssetForm";
import { fmtAED, fmtPct, fmtNum, fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const SEV_TONE: Record<string, "good" | "caution" | "risk" | "official"> = { info: "official", opportunity: "good", warning: "caution", critical: "risk" };

export default async function PortfolioPage() {
  const repo = await getRepository();
  const { assets, summary } = await repo.getPortfolio(DEFAULT_USER_ID);

  return (
    <PageShell title="Portfolio Management" subtitle="Owned, planned, off-plan & hypothetical assets — value, income, risk & actions">
      <div className="flex items-center justify-between">
        <p className="text-2xs text-terminal-muted">{assets.length} assets · user-entered data (not sample-mixed)</p>
        <AddAssetForm />
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Portfolio value" value={fmtAED(summary.totalValue, { compact: true })} />
        <Stat label="Equity" value={fmtAED(summary.equity, { compact: true })} tone="good" />
        <Stat label="Debt" value={fmtAED(summary.debt, { compact: true })} />
        <Stat label="LTV" value={fmtPct(summary.ltv)} tone={summary.ltv > 60 ? "risk" : undefined} />
        <Stat label="Annual rent" value={fmtAED(summary.annualRent, { compact: true })} />
        <Stat label="NOI" value={fmtAED(summary.noi, { compact: true })} />
        <Stat label="Gross yield" value={fmtPct(summary.grossYield)} />
        <Stat label="Net yield" value={fmtPct(summary.netYield)} tone="good" />
        <Stat label="Cash-on-cash" value={fmtPct(summary.cashOnCash)} tone={summary.cashOnCash >= 0 ? "good" : "risk"} />
        <Stat label="Unrealized gain" value={fmtAED(summary.unrealizedGain, { compact: true })} tone={summary.unrealizedGain >= 0 ? "good" : "risk"} />
        <Stat label="IRR (approx)" value={summary.irr != null ? fmtPct(summary.irr * 100) : "—"} tone="good" />
        <Stat label="Portfolio risk" value={`${Math.round(summary.riskScore)}/100`} tone={summary.riskScore > 50 ? "risk" : "good"} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel>
          <PanelHeader title="Concentration" subtitle="% of portfolio value" />
          <div className="space-y-2 p-4 text-2xs">
            <div className="text-terminal-muted">By emirate</div>
            {summary.geographicConcentration.map((c) => (
              <div key={c.key}><div className="flex justify-between"><span>{c.key}</span><span className="tnum">{fmtPct(c.pct)}</span></div><ScoreBar value={c.pct} tone={c.pct > 60 ? "caution" : "neutral"} className="mt-0.5" /></div>
            ))}
            <div className="pt-2 text-terminal-muted">By developer</div>
            {summary.developerConcentration.map((c) => (
              <div key={c.key}><div className="flex justify-between"><span>{c.key === "Unknown" ? "Unknown" : c.key.replace("dev-", "")}</span><span className="tnum">{fmtPct(c.pct)}</span></div><ScoreBar value={c.pct} tone={c.pct > 50 ? "caution" : "neutral"} className="mt-0.5" /></div>
            ))}
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Exposure" />
          <div className="space-y-1.5 p-4 text-2xs">
            <KV label="Off-plan exposure" v={fmtPct(summary.offPlanExposurePct)} />
            <KV label="Ready/income exposure" v={fmtPct(summary.readyExposurePct)} />
            <KV label="Vacancy exposure" v={fmtPct(summary.vacancyExposurePct)} tone={summary.vacancyExposurePct > 15 ? "risk" : undefined} />
            <KV label="DSCR" v={summary.dscr != null ? summary.dscr.toFixed(2) : "n/a"} />
            <div className="pt-2 text-terminal-muted">Rent renewals (≤12 mo)</div>
            {summary.rentRenewals.length === 0 ? <p className="text-terminal-muted">None upcoming.</p> : summary.rentRenewals.map((r) => (
              <div key={r.assetId} className="flex justify-between"><span className="truncate">{r.assetName}</span><span className={r.monthsToEnd <= 3 ? "text-signal-caution" : "text-terminal-muted"}>{r.monthsToEnd}mo · {fmtDate(r.leaseEnd)}</span></div>
            ))}
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Recommended actions" subtitle="Rule-based decision support" />
          <div className="space-y-2 p-4 text-2xs">
            {summary.recommendedActions.map((a, i) => (
              <div key={i} className="rounded border border-terminal-border bg-terminal-panel2 p-2">
                <div className="mb-0.5 flex items-center gap-1.5"><Tag tone={SEV_TONE[a.severity] ?? "neutral"}>{a.severity}</Tag><span className="font-medium text-terminal-textHi">{a.title}</span></div>
                <p className="text-terminal-muted">{a.detail}</p>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <Panel>
        <PanelHeader title="Assets" />
        <DataTable>
          <thead><tr><th>Asset</th><th>Status</th><th>Area</th><th>Type</th><th>Size</th><th>Purchase</th><th>Current value</th><th>Gain</th><th>Annual rent</th><th>Net yield</th><th>Mortgage</th><th>Occupancy</th></tr></thead>
          <tbody>
            {assets.map((a) => {
              const opex = a.serviceChargesAed + a.maintenanceAed + a.managementFeeAed + a.insuranceAed + a.otherExpensesAed;
              const ny = a.currentEstimatedValueAed > 0 ? ((a.annualRentAed - opex) / a.currentEstimatedValueAed) * 100 : 0;
              const gain = a.currentEstimatedValueAed - a.purchasePriceAed;
              return (
                <tr key={a.id}>
                  <td className="font-medium text-terminal-textHi">{a.assetName}</td>
                  <td><Tag tone={a.status === "Owned" ? "good" : a.status === "Off-Plan" ? "inferred" : "neutral"}>{a.status}</Tag></td>
                  <td>{a.areaId}</td>
                  <td>{a.propertyType}</td>
                  <td>{fmtNum(a.sizeSqft)}</td>
                  <td>{fmtAED(a.purchasePriceAed, { compact: true })}</td>
                  <td>{fmtAED(a.currentEstimatedValueAed, { compact: true })}</td>
                  <td className={gain >= 0 ? "text-signal-good" : "text-signal-risk"}>{fmtAED(gain, { compact: true })}</td>
                  <td>{a.annualRentAed ? fmtAED(a.annualRentAed, { compact: true }) : "—"}</td>
                  <td className="text-signal-good">{a.annualRentAed ? fmtPct(ny) : "—"}</td>
                  <td>{a.mortgageBalanceAed ? fmtAED(a.mortgageBalanceAed, { compact: true }) : "—"}</td>
                  <td>{a.occupancyStatus}</td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      </Panel>
    </PageShell>
  );
}

function KV({ label, v, tone }: { label: string; v: React.ReactNode; tone?: "risk" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-terminal-muted">{label}</span>
      <span className={`tnum ${tone === "risk" ? "text-signal-risk" : "text-terminal-text"}`}>{v}</span>
    </div>
  );
}
