import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepository } from "@/lib/repo";
import { PageShell } from "@/components/PageShell";
import { Panel, PanelHeader, Stat, DataTable, Button, Tag } from "@/components/ui";
import { ListingCard } from "@/components/ListingCard";
import { fmtNum, fmtSignedPct, fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DeveloperDetailPage({ params }: { params: { id: string } }) {
  const repo = await getRepository();
  const d = await repo.getDeveloperDetail(params.id);
  if (!d) notFound();
  const dev = d.developer;
  return (
    <PageShell title={dev.name} subtitle={`${dev.emirate} · Developer profile (SAMPLE)`}>
      <Link href="/developers"><Button size="sm" variant="ghost">← Developers</Button></Link>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-6">
        <Stat label="Quality" value={`${dev.qualityScore}/100`} tone={(dev.qualityScore ?? 0) >= 85 ? "good" : undefined} />
        <Stat label="Delivery risk" value={`${dev.deliveryRiskScore}/100`} tone={(dev.deliveryRiskScore ?? 0) > 25 ? "risk" : "good"} />
        <Stat label="Completed" value={fmtNum(dev.completedProjects)} />
        <Stat label="Active" value={fmtNum(dev.activeProjects)} />
        <Stat label="Avg delay" value={dev.avgDelayMonths != null ? `${dev.avgDelayMonths} mo` : "—"} />
        <Stat label="Avg resale prem." value={fmtSignedPct(dev.avgResalePremiumPct ?? 0)} tone={(dev.avgResalePremiumPct ?? 0) >= 0 ? "good" : "risk"} />
      </div>

      {dev.notes && <p className="text-2xs text-terminal-muted">{dev.notes} {dev.officialId && <Tag tone="official">{dev.officialId}</Tag>}</p>}

      <Panel>
        <PanelHeader title="Projects" subtitle={`${d.projects.length} tracked · avg PSF from current listings`} />
        <DataTable>
          <thead><tr><th>Project</th><th>Area</th><th>Status</th><th>Handover</th><th>Avg PSF (listings)</th><th>Listings</th></tr></thead>
          <tbody>
            {d.projectStats.map((p) => {
              const proj = d.projects.find((x) => x.id === p.projectId)!;
              return (
                <tr key={p.projectId}>
                  <td><Link href={`/projects/${p.projectId}`} className="font-medium text-terminal-textHi hover:text-accent">{p.name}</Link></td>
                  <td>{proj.areaId}</td>
                  <td>{proj.status}</td>
                  <td>{fmtDate(proj.handoverDate)}</td>
                  <td>{p.avgPsf ? fmtNum(p.avgPsf) : "—"}</td>
                  <td>{p.listings}</td>
                </tr>
              );
            })}
          </tbody>
        </DataTable>
      </Panel>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <section>
          <h2 className="mb-2 text-sm font-semibold text-signal-good">Best current deals</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{d.bestDeals.map((l) => <ListingCard key={l.id} listing={l} />)}</div>
        </section>
        <section>
          <h2 className="mb-2 text-sm font-semibold text-signal-caution">Weakest current deals</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">{d.weakestDeals.map((l) => <ListingCard key={l.id} listing={l} />)}</div>
        </section>
      </div>
    </PageShell>
  );
}
