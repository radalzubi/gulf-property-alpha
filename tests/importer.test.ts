import { describe, it, expect } from "vitest";
import { importCsv } from "@/ingestion/importers/csv";
import { buildSampleDataset } from "@/db/seed";

describe("CSV importer", () => {
  it("accepts well-formed listing rows and maps aliases", () => {
    const csv = [
      "Title,Emirate,Area,Building,Type,Beds,Size,Price,ServiceCharge",
      "Nice 1BR,Dubai,JVC,Bloom Towers,Apartment,1,720,820000,14",
      "Studio,Dubai,Arjan,Samana Greens,Apartment,0,420,560000,16",
    ].join("\n");
    const r = importCsv("listings", csv);
    expect(r.accepted).toBe(2);
    expect(r.rejected).toBe(0);
    expect(r.rows[0].title).toBe("Nice 1BR");
    expect(r.rows[0].priceAed).toBe(820000);
    expect(r.rows[0]._sourceClass).toBe("user_entered");
  });

  it("rejects rows missing required fields", () => {
    const csv = ["title,emirate,area,priceAed", "No price,Dubai,JVC,", ",Dubai,JVC,500000"].join("\n");
    const r = importCsv("listings", csv);
    expect(r.rejected).toBe(1); // first row missing price; second has no title but title isn't required for listings
    expect(r.errors.length).toBeGreaterThan(0);
  });

  it("validates transactions require size + price", () => {
    const csv = ["emirate,area,priceAed,sizeSqft,transactionDate", "Dubai,JVC,800000,900,2026-01-01", "Dubai,JVC,,900,2026-02-01"].join("\n");
    const r = importCsv("transactions", csv);
    expect(r.accepted).toBe(1);
    expect(r.rejected).toBe(1);
  });
});

describe("sample dataset sanity", () => {
  const ds = buildSampleDataset();
  it("builds a non-trivial, fully-labeled sample dataset", () => {
    expect(ds.listings.length).toBeGreaterThan(15);
    expect(ds.transactions.length).toBeGreaterThan(300);
    expect(ds.rents.length).toBeGreaterThan(200);
    expect(ds.listings.every((l) => l.isSample)).toBe(true);
    expect(ds.areas.some((a) => a.emirate === "Abu Dhabi")).toBe(true);
    expect(ds.areas.some((a) => a.emirate === "Dubai")).toBe(true);
  });

  it("includes a duplicate cluster and an unknown-size listing for edge cases", () => {
    expect(ds.listings.some((l) => l.isDuplicate)).toBe(true);
    expect(ds.listings.some((l) => l.sizeSqft == null)).toBe(true);
  });
});
