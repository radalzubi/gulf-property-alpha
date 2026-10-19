import Link from "next/link";
import { notFound } from "next/navigation";
import { getRepository } from "@/lib/repo";
import { PageShell } from "@/components/PageShell";
import { Panel, PanelHeader, Stat, Button, Tag } from "@/components/ui";
import { LineSeries } from "@/components/charts/LineSeries";
import { ListingCard } from "@/components/ListingCard";
import { fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ProjectDetailPage({ params }: { params: { id: string } }) {
  const repo = await getRepository();
  const d = await repo.getProjectDetail(params.id);
  if (!d) notFound();
  const p = d.project;
  return (
    <PageShell title={p.name} subtitle={`${p.emirate} · Project profile (SAMPLE)`}>
      <Link href="/projects"><Button size="sm" variant="ghost">← Projects</Button></Link>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Stat label="Developer" value={<Link href={`/developers/${p.developerId}`} className="text-accent">{d.developer?.name ?? "—"}</Link>} />
        <Stat label="Area" value={<Link href={`/neighborhoods/${p.areaId}`} className="text-accent">{d.area?.name ?? p.areaId}</Link>} />
        <Stat label="Status" value={<Tag tone="caution">{p.status}</Tag>} />
        <Stat label="Launch" value={fmtDate(p.launchDate)} />
        <Stat label="Handover" value={fmtDate(p.handoverDate)} />
      </div>

      <Panel>
        <PanelHeader title="Area price trend" subtitle="Median sale PSF (SAMPLE gov transactions in project's area)" />
        <div className="p-4"><LineSeries data={d.priceSeries.map((s) => ({ period: s.periodStart.slice(0, 7), psf: s.value }))} xKey="period" yKey="psf" area /></div>
      </Panel>

      <section>
        <h2 className="mb-2 text-sm font-semibold text-terminal-textHi">Current listings in {p.name} ({d.listings.length})</h2>
        {d.listings.length === 0 ? <Panel className="p-6 text-center text-2xs text-terminal-muted">No active listings tracked for this project.</Panel> : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">{d.listings.map((l) => <ListingCard key={l.id} listing={l} />)}</div>
        )}
      </section>
    </PageShell>
  );
}
