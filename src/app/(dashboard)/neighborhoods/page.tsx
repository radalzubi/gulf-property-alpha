import Link from "next/link";
import { getRepository } from "@/lib/repo";
import { PageShell } from "@/components/PageShell";
import { Panel, PanelHeader, DataTable, Tag } from "@/components/ui";
import { fmtAED, fmtNum, fmtPct, fmtSignedPct } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function NeighborhoodsPage() {
  const repo = await getRepository();
  const areas = await repo.getAreas();
  const dubai = areas.filter((a) => a.emirate === "Dubai");
  const auh = areas.filter((a) => a.emirate === "Abu Dhabi");

  return (
    <PageShell title="Neighborhood Intelligence" subtitle="Area-level pricing, yield, momentum, supply & liquidity (SAMPLE)">
      {[{ label: "Dubai", list: dubai }, { label: "Abu Dhabi", list: auh }].map((grp) => (
        <div key={grp.label}>
          <h2 className="mb-2 text-sm font-semibold text-terminal-textHi">{grp.label}</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {grp.list.map((a) => (
              <Link key={a.id} href={`/neighborhoods/${a.id}`} className="panel p-3 transition-colors hover:border-terminal-borderHi">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-terminal-textHi">{a.name}</span>
                  <Tag tone={(a.annualPriceChangePct ?? 0) >= 10 ? "good" : "neutral"}>{fmtSignedPct(a.annualPriceChangePct)}</Tag>
                </div>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-2xs">
                  <KV label="Median PSF" value={fmtNum(a.medianSalePsf)} />
                  <KV label="Gross yield" value={fmtPct(a.grossYield)} tone="good" />
                  <KV label="Net yield" value={fmtPct(a.netYield)} />
                  <KV label="Liquidity" value={`${a.liquidityScore}/100`} />
                  <KV label="Rent Δ/yr" value={fmtSignedPct(a.annualRentChangePct)} />
                  <KV label="Off-plan" value={fmtPct(a.offPlanSharePct)} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}

      <Panel>
        <PanelHeader title="Comparison view" subtitle="All tracked areas, side by side" />
        <DataTable>
          <thead>
            <tr>
              <th>Area</th><th>Emirate</th><th>Median PSF</th><th>Median price</th><th>Rent PSF</th>
              <th>Gross yield</th><th>Net yield</th><th>Price Δ/yr</th><th>Rent Δ/yr</th><th>Liquidity</th><th>Vacancy risk</th><th>Off-plan</th><th>Pipeline</th>
            </tr>
          </thead>
          <tbody>
            {areas.map((a) => (
              <tr key={a.id}>
                <td><Link href={`/neighborhoods/${a.id}`} className="font-medium text-terminal-textHi hover:text-accent">{a.name}</Link></td>
                <td className="text-signal-official">{a.emirate}</td>
                <td>{fmtNum(a.medianSalePsf)}</td>
                <td>{fmtAED(a.medianSalePrice, { compact: true })}</td>
                <td>{fmtNum(a.medianRentPsf)}</td>
                <td className="text-signal-good">{fmtPct(a.grossYield)}</td>
                <td>{fmtPct(a.netYield)}</td>
                <td className={(a.annualPriceChangePct ?? 0) >= 0 ? "text-signal-good" : "text-signal-risk"}>{fmtSignedPct(a.annualPriceChangePct)}</td>
                <td>{fmtSignedPct(a.annualRentChangePct)}</td>
                <td>{a.liquidityScore}</td>
                <td className={(a.vacancyRiskScore ?? 0) > 30 ? "text-signal-caution" : ""}>{a.vacancyRiskScore}</td>
                <td>{fmtPct(a.offPlanSharePct)}</td>
                <td>{fmtNum(a.supplyPipelineUnits)}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Panel>
    </PageShell>
  );
}

function KV({ label, value, tone }: { label: string; value: React.ReactNode; tone?: "good" }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-terminal-muted">{label}</span>
      <span className={`tnum ${tone === "good" ? "text-signal-good" : "text-terminal-text"}`}>{value}</span>
    </div>
  );
}
