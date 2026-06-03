import { Topbar } from "@/components/shell/Topbar";
import { AdminConsole } from "@/components/admin/AdminConsole";

export const dynamic = "force-dynamic";

export default function AdminPage() {
  return (
    <>
      <Topbar title="Admin / Data Connectors" subtitle="Run connectors, review setup, import CSV/Excel — credentials never required to boot" />
      <div className="animate-fade-in p-5">
        <AdminConsole />
      </div>
    </>
  );
}
