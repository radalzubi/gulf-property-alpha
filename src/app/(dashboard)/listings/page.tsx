import { Suspense } from "react";
import { Topbar } from "@/components/shell/Topbar";
import { ListingsExplorer } from "@/components/listings/ListingsExplorer";
import { Skeleton } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function ListingsPage() {
  return (
    <>
      <Topbar title="Listings Explorer" subtitle="Filter, sort, score and export every tracked listing" />
      <div className="animate-fade-in p-5">
        <Suspense fallback={<Skeleton className="h-96" />}>
          <ListingsExplorer />
        </Suspense>
      </div>
    </>
  );
}
