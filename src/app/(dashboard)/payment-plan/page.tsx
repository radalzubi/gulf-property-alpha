import { Suspense } from "react";
import { Topbar } from "@/components/shell/Topbar";
import { PaymentPlanAnalyzer } from "@/components/analyzers/PaymentPlanAnalyzer";
import { Skeleton } from "@/components/ui";

export const dynamic = "force-dynamic";

export default function PaymentPlanPage() {
  return (
    <>
      <Topbar title="Payment Plan Analyzer" subtitle="Normalize plans, model cash exposure, compare vs cash & mortgage" />
      <div className="animate-fade-in p-5">
        <Suspense fallback={<Skeleton className="h-96" />}>
          <PaymentPlanAnalyzer />
        </Suspense>
      </div>
    </>
  );
}
