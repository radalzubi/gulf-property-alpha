import Link from "next/link";
import { getRepository } from "@/lib/repo";
import { PageShell } from "@/components/PageShell";
import { Panel, PanelHeader, DataTable, Tag } from "@/components/ui";
import { fmtDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<string, "good" | "caution" | "official" | "neutral"> = {
  Completed: "good",
  Handover: "official",
  "Under Construction": "caution",
  Announced: "neutral",
  Unknown: "neutral",
};

export default async function ProjectsPage() {
  const repo = await getRepository();
  const [projects, developers] = await Promise.all([repo.getProjects(), repo.getDevelopers()]);
  const devName = new Map(developers.map((d) => [d.id, d.name]));
  return (
    <PageShell title="Project Intelligence" subtitle="Off-plan & completed projects across Dubai and Abu Dhabi (SAMPLE)">
      <Panel>
        <PanelHeader title="Projects" subtitle={`${projects.length} tracked`} />
        <DataTable>
          <thead><tr><th>Project</th><th>Developer</th><th>Emirate</th><th>Area</th><th>Status</th><th>Launch</th><th>Handover</th><th>Type</th><th>Project ID</th></tr></thead>
          <tbody>
            {projects.map((p) => (
              <tr key={p.id}>
                <td><Link href={`/projects/${p.id}`} className="font-medium text-terminal-textHi hover:text-accent">{p.name}</Link></td>
                <td><Link href={`/developers/${p.developerId}`} className="text-accent">{devName.get(p.developerId)}</Link></td>
                <td className="text-signal-official">{p.emirate}</td>
                <td>{p.areaId}</td>
                <td><Tag tone={STATUS_TONE[p.status] ?? "neutral"}>{p.status}</Tag></td>
                <td>{fmtDate(p.launchDate)}</td>
                <td>{fmtDate(p.handoverDate)}</td>
                <td>{p.projectType}</td>
                <td className="text-2xs text-terminal-muted">{p.officialProjectId ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </DataTable>
      </Panel>
    </PageShell>
  );
}
