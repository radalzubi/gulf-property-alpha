import type { PaymentInstallment, PaymentPlan } from "@/types/domain";

interface PlanSpec {
  listingId: string;
  planName: string;
  downPaymentPercent: number;
  duringConstructionPercent: number;
  onHandoverPercent: number;
  postHandoverPercent: number;
  handoverMonths: number;
  postHandoverMonths?: number;
  duringInstallments?: number;
  postInstallments?: number;
  rawText: string;
}

/** Lays out a normalized installment schedule from a plan spec. */
function schedule(spec: PlanSpec): PaymentInstallment[] {
  const out: PaymentInstallment[] = [];
  out.push({ label: "Down payment / booking", monthOffset: 0, percent: spec.downPaymentPercent, milestone: "booking" });

  const nDuring = spec.duringInstallments ?? Math.max(1, Math.round(spec.handoverMonths / 4));
  if (spec.duringConstructionPercent > 0) {
    const each = spec.duringConstructionPercent / nDuring;
    for (let i = 1; i <= nDuring; i++) {
      out.push({
        label: `Construction installment ${i}`,
        monthOffset: Math.round((spec.handoverMonths * i) / (nDuring + 1)),
        percent: round2(each),
        milestone: "construction",
      });
    }
  }
  if (spec.onHandoverPercent > 0) {
    out.push({ label: "On handover", monthOffset: spec.handoverMonths, percent: spec.onHandoverPercent, milestone: "handover" });
  }
  if (spec.postHandoverPercent > 0) {
    const postMonths = spec.postHandoverMonths ?? 24;
    const nPost = spec.postInstallments ?? Math.max(1, Math.round(postMonths / 3));
    const each = spec.postHandoverPercent / nPost;
    for (let i = 1; i <= nPost; i++) {
      out.push({
        label: `Post-handover installment ${i}`,
        monthOffset: spec.handoverMonths + Math.round((postMonths * i) / nPost),
        percent: round2(each),
        milestone: "post_handover",
      });
    }
  }
  return out;
}

const round2 = (n: number) => Math.round(n * 100) / 100;

const SPECS: PlanSpec[] = [
  {
    listingId: "lst-businessbay-damacbay-1br",
    planName: "70/30 construction-linked",
    downPaymentPercent: 20,
    duringConstructionPercent: 50,
    onHandoverPercent: 30,
    postHandoverPercent: 0,
    handoverMonths: 22,
    duringInstallments: 5,
    rawText: "20% on booking, 50% during construction (5 installments), 30% on handover.",
  },
  {
    listingId: "lst-businessbay-riviera-studio",
    planName: "Post-handover 2yr",
    downPaymentPercent: 30,
    duringConstructionPercent: 10,
    onHandoverPercent: 20,
    postHandoverPercent: 40,
    handoverMonths: 2,
    postHandoverMonths: 24,
    postInstallments: 8,
    rawText: "30% paid (assignment), 10% remaining to handover, 20% on handover, 40% over 24 months post-handover.",
  },
  {
    listingId: "lst-dubaihills-parkheights-1br",
    planName: "Emaar 90/10 with post-handover",
    downPaymentPercent: 20,
    duringConstructionPercent: 50,
    onHandoverPercent: 10,
    postHandoverPercent: 20,
    handoverMonths: 4,
    postHandoverMonths: 24,
    postInstallments: 8,
    rawText: "20% booking, 50% during construction, 10% on handover, 20% over 2 years post-handover.",
  },
  {
    listingId: "lst-arjan-samana-studio",
    planName: "1% monthly post-handover",
    downPaymentPercent: 10,
    duringConstructionPercent: 20,
    onHandoverPercent: 10,
    postHandoverPercent: 60,
    handoverMonths: 30,
    postHandoverMonths: 60,
    postInstallments: 60,
    rawText: "10% down, 20% during construction, 10% on handover, then 1% per month for 60 months (60%).",
  },
  {
    listingId: "lst-yas-gardeniabay-1br",
    planName: "Aldar 60/40",
    downPaymentPercent: 10,
    duringConstructionPercent: 50,
    onHandoverPercent: 40,
    postHandoverPercent: 0,
    handoverMonths: 24,
    duringInstallments: 6,
    rawText: "10% booking, 50% during construction (6 installments), 40% on handover.",
  },
  {
    listingId: "lst-saadiyat-bloom-2br",
    planName: "Bloom 50/50",
    downPaymentPercent: 10,
    duringConstructionPercent: 40,
    onHandoverPercent: 50,
    postHandoverPercent: 0,
    handoverMonths: 20,
    duringInstallments: 5,
    rawText: "10% booking, 40% during construction, 50% on handover.",
  },
];

export const SAMPLE_PAYMENT_PLANS: PaymentPlan[] = SPECS.map((s, i) => {
  const sch = schedule(s);
  return {
    id: `pp-${i + 1}`,
    listingId: s.listingId,
    planName: s.planName,
    downPaymentPercent: s.downPaymentPercent,
    duringConstructionPercent: s.duringConstructionPercent,
    onHandoverPercent: s.onHandoverPercent,
    postHandoverPercent: s.postHandoverPercent,
    numberOfInstallments: sch.length,
    handoverMonths: s.handoverMonths,
    rawText: s.rawText,
    schedule: sch,
    confidenceScore: 0.7,
    sourceClass: "broker_developer_provided",
  };
});

export const PAYMENT_PLAN_BY_LISTING = new Map(SAMPLE_PAYMENT_PLANS.map((p) => [p.listingId, p]));
