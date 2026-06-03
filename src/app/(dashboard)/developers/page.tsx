import Link from "next/link";
import { getRepository } from "@/lib/repo";
import { PageShell } from "@/components/PageShell";
import { Panel, PanelHeader, DataTable, Tag, ScoreBar } from "@/components/ui";
import { fmtNum, fmtSignedPct } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DevelopersPage() {
  const repo = await getRepository();
  const devs = (await repo.getDevelopers()).sort((a, b) => (b.qualityScore ?? 0) - (a.qualityScore ?? 0));
  return (
    <PageShell title="Developer Intelligence" subtitle="Quality, delivery risk, resale performance (SAMPLE)">
      <Panel>
        <PanelHeader title="Developers" subtitle={`${devs.length} tracked`} />
        <DataTable>
          <thead>
            <tr>
              <th>Developer</th><th>Emirate</th><th>Quality</th><th>Delivery risk</th><th>SC risk</th>
              <th>Completed</th><th>Active</th><th>Delivered units</th><th>Avg delay</th><th>Resale prem.</th><th>Registry</th>
            </tr>
          </thead>
          <tbody>
            {devs.map((d) => (
              <tr key={d.id}>
                <td><Link href={`/developers/${d.id}`} className="font-medium text-terminal-textHi hover:text-accent">{d.name}</Link></td>
                <td className="text-signal-official">{d.emirate}</td>
                <td><div className="flex items-center gap-2"><span className="tnum w-6">{d.qualityScore}</span><ScoreBar value={d.qualityScore ?? 0} tone={(d.qualityScore ?? 0) >= 85 ? "good" : "caution"} className="w-16" /></div></td>
                <td className={(d.deliveryRiskScore ?? 0) > 25 ? "text-signal-caution" : "text-signal-good"}>{d.deliveryRiskScore}</td>
                <td>{d.serviceChargeRiskScore}</td>
                <td>{fmtNum(d.completedProjects)}</td>
                <td>{fmtNum(d.activeProjects)}</td>
                <td>{fmtNum(d.deliveredUnits)}</td>
                <td>{d.avgDelayMonths != null ? `${d.avgDelayMonths}mo` : "—"}</td>
                <td className={(d.avgResalePremiumPct ?? 0) >= 0 ? "text-signal-good" : "text-signal-risk"}>{fmtSignedPct(d.avgResalePremiumPct ?? 0)}</td>
                <td><Tag tone={d.officialId ? "official" : "missing"}>{d.officialId ? "registered" : "—"}</Tag></td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Panel>
    </PageShell>
  );
}
