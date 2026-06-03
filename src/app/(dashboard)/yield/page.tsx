import { Suspense } from "react";
import { Topbar } from "@/components/shell/Topbar";
import { YieldAnalyzer } from "@/components/analyzers/YieldAnalyzer";
import { Skeleton } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function YieldPage() {
  return (
    <>
      <Topbar title="Yield & Rent Analyzer" subtitle="Full cashflow, IRR, DSCR, sensitivity & scenario modeling" />
      <div className="animate-fade-in p-5">
        <Suspense fallback={<Skeleton className="h-96" />}>
          <YieldAnalyzer />
        </Suspense>
      </div>
    </>
  );
}
