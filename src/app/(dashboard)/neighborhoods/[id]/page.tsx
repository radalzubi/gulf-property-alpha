import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepository } from "@/lib/repo";
import { PageShell } from "@/components/PageShell";
import { Panel, PanelHeader, Stat, Button } from "@/components/ui";
import { LineSeries } from "@/components/charts/LineSeries";
import { ListingCard } from "@/components/ListingCard";
import { fmtAED, fmtNum, fmtPct, fmtSignedPct } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AreaDetailPage(props: { params: Promise<{ id: string }> }) {
  const params = await props.params;
  const repo = await getRepository();
  const d = await repo.getAreaDetail(params.id);
  if (!d) notFound();
  const a = d.area;
  const overpriced = [...d.buildings].filter((b) => b.count >= 3).sort((x, y) => y.vsAreaPct - x.vsAreaPct).slice(0, 5);
  const underpriced = [...d.buildings].filter((b) => b.count >= 3).sort((x, y) => x.vsAreaPct - y.vsAreaPct).slice(0, 5);

  return (
    <PageShell title={a.name} subtitle={`${a.emirate} · Neighborhood intelligence (SAMPLE)`}>
      <Link href="/neighborhoods"><Button size="sm" variant="ghost">← Neighborhoods</Button></Link>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Median PSF" value={fmtNum(a.medianSalePsf)} />
        <Stat label="Median price" value={fmtAED(a.medianSalePrice, { compact: true })} />
        <Stat label="Gross yield" value={fmtPct(a.grossYield)} tone="good" />
        <Stat label="Net yield" value={fmtPct(a.netYield)} />
        <Stat label="Price Δ/yr" value={fmtSignedPct(a.annualPriceChangePct)} tone={(a.annualPriceChangePct ?? 0) >= 0 ? "good" : "risk"} />
        <Stat label="Liquidity" value={`${a.liquidityScore}/100`} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Panel>
          <PanelHeader title="Median sale PSF trend" subtitle={`${d.priceSeries.length} months · SAMPLE gov transactions`} />
          <div className="p-4"><LineSeries data={d.priceSeries.map((p) => ({ period: p.periodStart.slice(0, 7), psf: p.value }))} xKey="period" yKey="psf" area /></div>
        </Panel>
        <Panel>
          <PanelHeader title="Median rent PSF trend" subtitle={`${d.rentSeries.length} months`} />
          <div className="p-4"><LineSeries data={d.rentSeries.map((p) => ({ period: p.periodStart.slice(0, 7), rent: p.value }))} xKey="period" yKey="rent" color="#2fd47e" area /></div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Panel>
          <PanelHeader title="Investment thesis" />
          <div className="space-y-2 p-4 text-2xs">
            <p className="text-terminal-text">{a.thesis}</p>
            <div className="pt-1 text-terminal-muted">Risks:</div>
            <ul className="space-y-0.5 text-terminal-muted">{(a.risks ?? []).map((r, i) => <li key={i}>• {r}</li>)}</ul>
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Developer mix" subtitle="By active listings in area" />
          <div className="space-y-1 p-4 text-2xs">
            {d.developerMix.length === 0 ? <p className="text-terminal-muted">No developer-tagged listings.</p> : d.developerMix.map((m) => (
              <div key={m.developerId} className="flex items-center justify-between">
                <Link href={`/developers/${m.developerId}`} className="text-terminal-text hover:text-accent">{m.name}</Link>
                <span className="tnum text-terminal-muted">{m.count}</span>
              </div>
            ))}
          </div>
        </Panel>
        <Panel>
          <PanelHeader title="Under / over-priced buildings" subtitle="Building median PSF vs area median" />
          <div className="grid grid-cols-2 gap-3 p-4 text-2xs">
            <div>
              <div className="mb-1 text-signal-good">Underpriced</div>
              {underpriced.map((b) => <div key={b.name} className="flex justify-between"><span className="truncate text-terminal-text">{b.name}</span><span className="text-signal-good">{fmtSignedPct(b.vsAreaPct)}</span></div>)}
            </div>
            <div>
              <div className="mb-1 text-signal-risk">Overpriced</div>
              {overpriced.map((b) => <div key={b.name} className="flex justify-between"><span className="truncate text-terminal-text">{b.name}</span><span className="text-signal-risk">{fmtSignedPct(b.vsAreaPct)}</span></div>)}
            </div>
          </div>
        </Panel>
      </div>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-terminal-textHi">Listings in {a.name}</h2>
        {d.listings.length === 0 ? <Panel className="p-6 text-center text-2xs text-terminal-muted">No active listings tracked in this area.</Panel> : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{d.listings.map((l) => <ListingCard key={l.id} listing={l} />)}</div>
        )}
      </section>
    </PageShell>
  );
}
