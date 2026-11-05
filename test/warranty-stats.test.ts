import { describe, expect, it } from "vitest";
import { aggregateWarrantyStats, type WarrantyStatsRow } from "@/lib/warranty-stats";

const NOW = new Date("2026-11-05T12:00:00Z");

function row(over: Partial<WarrantyStatsRow>): WarrantyStatsRow {
  return {
    submitted_at: "2026-11-01 09:00:00",
    status: "open",
    assignee: null,
    warranty_type: null,
    product_name: "Board",
    sku: "B-1",
    product_category: "boards",
    ...over,
  };
}

describe("aggregateWarrantyStats", () => {
  it("returns zeros for no claims", () => {
    const s = aggregateWarrantyStats([], NOW);
    expect(s.total).toBe(0);
    expect(s.byStatus).toEqual({ open: 0, in_review: 0, decided: 0, to_send_new_product: 0, finished: 0 });
    expect(s.byProduct).toEqual([]);
    expect(s.openOlderThan30d).toBe(0);
    expect(s.latestSubmittedAt).toBeNull();
  });

  it("counts legacy statuses under their normalised value", () => {
    const s = aggregateWarrantyStats(
      [
        row({ status: "new" }), // -> open
        row({ status: "open" }),
        row({ status: null }), // -> open
        row({ status: "approved" }), // -> decided
        row({ status: "shipped" }), // -> finished
        row({ status: "rejected" }), // -> finished
        row({ status: "in_review" }),
      ],
      NOW,
    );
    expect(s.total).toBe(7);
    expect(s.byStatus).toEqual({ open: 3, in_review: 1, decided: 1, to_send_new_product: 0, finished: 2 });
    expect(Object.keys(s.byStatus)).not.toContain("new");
  });

  it("groups warranty type, assignee and category with fallbacks", () => {
    const s = aggregateWarrantyStats(
      [
        row({ warranty_type: "proven", assignee: "Tine", product_category: "sails" }),
        row({ warranty_type: "proven", assignee: "  ", product_category: "" }),
        row({ warranty_type: "bogus", assignee: null, product_category: null }),
      ],
      NOW,
    );
    expect(s.byWarrantyType.proven).toBe(2);
    expect(s.byWarrantyType.unset).toBe(1); // unknown legacy type normalises to null
    expect(s.byWarrantyType).not.toHaveProperty("bogus");
    expect(s.byAssignee).toEqual({ Tine: 1, unassigned: 2 });
    expect(s.byProductCategory).toEqual({ sails: 1, unknown: 2 });
  });

  it("ranks products by count and keeps the top 20", () => {
    const rows: WarrantyStatsRow[] = [];
    for (let i = 0; i < 25; i++) rows.push(row({ product_name: `P${i}`, sku: `S${i}` }));
    rows.push(row({ product_name: "P7", sku: "S7" }), row({ product_name: "P7", sku: "S7" }));
    rows.push(row({ product_name: "P3", sku: "S3" }));
    const s = aggregateWarrantyStats(rows, NOW);
    expect(s.byProduct).toHaveLength(20);
    expect(s.byProduct[0]).toEqual({ productName: "P7", sku: "S7", count: 3 });
    expect(s.byProduct[1]).toEqual({ productName: "P3", sku: "S3", count: 2 });
  });

  it("counts non-finished claims older than 30 days and finds the latest", () => {
    const s = aggregateWarrantyStats(
      [
        row({ submitted_at: "2026-09-01 08:00:00", status: "open" }), // old, open
        row({ submitted_at: "2026-09-02 08:00:00", status: "new" }), // old, legacy open
        row({ submitted_at: "2026-09-03 08:00:00", status: "shipped" }), // old, legacy finished
        row({ submitted_at: "2026-09-04 08:00:00", status: "finished" }), // old, finished
        row({ submitted_at: "2026-10-20 08:00:00", status: "open" }), // recent
        row({ submitted_at: "2026-11-04 23:59:59", status: "decided" }), // recent, latest
      ],
      NOW,
    );
    expect(s.openOlderThan30d).toBe(2);
    expect(s.latestSubmittedAt).toBe("2026-11-04 23:59:59");
  });
});
