"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { apiSend } from "@/lib/client";
import { Button, Input, Select, Field } from "@/components/ui";
import { Plus } from "lucide-react";

export function AddAssetForm() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [form, setForm] = React.useState({
    assetName: "", emirate: "Dubai", areaId: "dxb-dubai-marina", status: "Owned", propertyType: "Apartment",
    sizeSqft: "", purchasePriceAed: "", currentEstimatedValueAed: "", annualRentAed: "", mortgageBalanceAed: "",
    interestRate: "", monthlyPaymentAed: "", serviceChargesAed: "", occupancyStatus: "Vacant",
  });
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setBusy(true);
    try {
      await apiSend("/api/portfolio/assets", "POST", {
        assetName: form.assetName || "New asset",
        emirate: form.emirate,
        areaId: form.areaId,
        status: form.status,
        propertyType: form.propertyType,
        occupancyStatus: form.occupancyStatus,
        sizeSqft: num(form.sizeSqft),
        purchasePriceAed: num(form.purchasePriceAed),
        currentEstimatedValueAed: num(form.currentEstimatedValueAed) || num(form.purchasePriceAed),
        annualRentAed: num(form.annualRentAed),
        mortgageBalanceAed: num(form.mortgageBalanceAed),
        interestRate: num(form.interestRate),
        monthlyPaymentAed: num(form.monthlyPaymentAed),
        serviceChargesAed: num(form.serviceChargesAed),
      });
      setOpen(false);
      setForm((f) => ({ ...f, assetName: "" }));
      router.refresh();
    } finally {
      setBusy(false);
    }
  };

  if (!open) return <Button size="sm" variant="primary" onClick={() => setOpen(true)}><Plus className="h-3 w-3" /> Add asset</Button>;

  return (
    <div className="panel w-full p-3">
      <div className="mb-2 text-2xs font-semibold uppercase tracking-wider text-terminal-muted">Add portfolio asset (user-entered)</div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        <Field label="Name"><Input value={form.assetName} onChange={(e) => set("assetName", e.target.value)} placeholder="e.g. Marina 1BR" /></Field>
        <Field label="Status"><Select value={form.status} onChange={(e) => set("status", e.target.value)}><option>Owned</option><option>Planned</option><option>Off-Plan</option><option>Sold</option><option>Watch</option><option>Hypothetical</option></Select></Field>
        <Field label="Emirate"><Select value={form.emirate} onChange={(e) => set("emirate", e.target.value)}><option>Dubai</option><option>Abu Dhabi</option></Select></Field>
        <Field label="Occupancy"><Select value={form.occupancyStatus} onChange={(e) => set("occupancyStatus", e.target.value)}><option>Vacant</option><option>Tenanted</option><option>Owner-Occupied</option></Select></Field>
        <Field label="Size sqft"><Input type="number" value={form.sizeSqft} onChange={(e) => set("sizeSqft", e.target.value)} /></Field>
        <Field label="Purchase price"><Input type="number" value={form.purchasePriceAed} onChange={(e) => set("purchasePriceAed", e.target.value)} /></Field>
        <Field label="Current value"><Input type="number" value={form.currentEstimatedValueAed} onChange={(e) => set("currentEstimatedValueAed", e.target.value)} /></Field>
        <Field label="Annual rent"><Input type="number" value={form.annualRentAed} onChange={(e) => set("annualRentAed", e.target.value)} /></Field>
        <Field label="Mortgage balance"><Input type="number" value={form.mortgageBalanceAed} onChange={(e) => set("mortgageBalanceAed", e.target.value)} /></Field>
        <Field label="Interest %"><Input type="number" value={form.interestRate} onChange={(e) => set("interestRate", e.target.value)} /></Field>
        <Field label="Monthly payment"><Input type="number" value={form.monthlyPaymentAed} onChange={(e) => set("monthlyPaymentAed", e.target.value)} /></Field>
        <Field label="Service charges/yr"><Input type="number" value={form.serviceChargesAed} onChange={(e) => set("serviceChargesAed", e.target.value)} /></Field>
      </div>
      <div className="mt-2 flex gap-2">
        <Button size="sm" variant="primary" onClick={submit} disabled={busy}>{busy ? "Saving…" : "Save asset"}</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </div>
  );
}

const num = (s: string) => (s === "" ? 0 : Number(s));
