import Link from "next/link";
import { getRepository } from "@/lib/repo";
import { DEFAULT_USER_ID } from "@/lib/api";
import { PageShell } from "@/components/PageShell";
import { Panel, PanelHeader, Tag } from "@/components/ui";
import { fmtAge } from "@/lib/utils";
import { Bell, Mail, Webhook, MessageCircle } from "lucide-react";

export const dynamic = "force-dynamic";

const SEV_TONE: Record<string, "good" | "caution" | "risk" | "official"> = { info: "official", opportunity: "good", warning: "caution", critical: "risk" };

export default async function AlertsPage() {
  const repo = await getRepository();
  const [alerts, watchlists] = await Promise.all([repo.getAlerts(DEFAULT_USER_ID), repo.getWatchlists(DEFAULT_USER_ID)]);

  return (
    <PageShell title="Alerts & Watchlists" subtitle="Opportunity, risk and portfolio alerts; saved watchlists">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <Panel>
            <PanelHeader title="Alert center" subtitle={`${alerts.length} alerts`} right={<Bell className="h-4 w-4 text-terminal-muted" />} />
            <div className="divide-y divide-terminal-border">
              {alerts.map((a) => (
                <div key={a.id} className="flex items-start gap-3 px-4 py-3">
                  <Tag tone={SEV_TONE[a.severity] ?? "neutral"}>{a.severity}</Tag>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-terminal-textHi">{a.title}</span>
                      <span className="shrink-0 text-2xs text-terminal-muted">{fmtAge(a.createdAt)}</span>
                    </div>
                    <p className="mt-0.5 text-2xs text-terminal-muted">{a.message}</p>
                    <div className="mt-1 flex gap-2 text-2xs">
                      {a.listingId && <Link href={`/listings/${a.listingId}`} className="text-accent">View listing →</Link>}
                      {a.assetId && <Link href="/portfolio" className="text-accent">View portfolio →</Link>}
                      <span className="text-terminal-muted">{a.alertType.replace(/_/g, " ")}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        <div className="space-y-3">
          <Panel>
            <PanelHeader title="Watchlists" subtitle={`${watchlists.length} saved`} />
            <div className="space-y-2 p-4">
              {watchlists.map((w) => (
                <div key={w.id} className="rounded border border-terminal-border bg-terminal-panel2 p-2 text-2xs">
                  <div className="flex items-center justify-between"><span className="font-medium text-terminal-textHi">{w.name}</span><span className="text-terminal-muted">{w.itemCount} items</span></div>
                  <code className="mt-1 block truncate text-[10px] text-terminal-muted">{JSON.stringify(w.criteria)}</code>
                </div>
              ))}
            </div>
          </Panel>
          <Panel>
            <PanelHeader title="Delivery channels" subtitle="Architecture ready — external sends require keys" />
            <div className="space-y-2 p-4 text-2xs">
              <Channel icon={<Bell className="h-3.5 w-3.5" />} label="In-app" status="active" />
              <Channel icon={<Mail className="h-3.5 w-3.5" />} label="Email" status="ready (SMTP_URL)" />
              <Channel icon={<Webhook className="h-3.5 w-3.5" />} label="Webhook" status="ready (ALERT_WEBHOOK_URL)" />
              <Channel icon={<MessageCircle className="h-3.5 w-3.5" />} label="WhatsApp" status="ready (WHATSAPP_API_TOKEN)" />
            </div>
          </Panel>
        </div>
      </div>
    </PageShell>
  );
}

function Channel({ icon, label, status }: { icon: React.ReactNode; label: string; status: string }) {
  const active = status === "active";
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-terminal-text">{icon}{label}</span>
      <Tag tone={active ? "good" : "missing"}>{status}</Tag>
    </div>
  );
}
