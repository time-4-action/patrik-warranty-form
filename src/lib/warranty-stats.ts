import {
  WARRANTY_STATUSES,
  WARRANTY_TYPES,
  normaliseWorkflow,
  type WarrantyStatus,
  type WarrantyType,
} from "@/types/warranty-settings";
import { getSql } from "./db";

export type WarrantyStatsRow = {
  submitted_at: string;
  status: string | null;
  assignee: string | null;
  warranty_type: string | null;
  product_name: string | null;
  sku: string | null;
  product_category: string | null;
};

export type WarrantyStats = {
  total: number;
  byStatus: Record<string, number>;
  byWarrantyType: Record<string, number>;
  byAssignee: Record<string, number>;
  byProductCategory: Record<string, number>;
  byProduct: { productName: string; sku: string; count: number }[];
  openOlderThan30d: number;
  latestSubmittedAt: string | null;
};

const TOP_PRODUCTS = 20;
const OPEN_AGE_DAYS = 30;
// Claims with no warranty type set yet.
export const UNSET_WARRANTY_TYPE = "unset";

// Same format as submittedAt: "YYYY-MM-DD HH:MM:SS" in UTC, so string
// comparison orders it like a date (as the submissions list filter does).
function stamp(d: Date): string {
  return d.toISOString().slice(0, 19).replace("T", " ");
}

const inc = (m: Record<string, number>, k: string) => {
  m[k] = (m[k] ?? 0) + 1;
};

/**
 * Pure aggregation over claim rows. Status / warranty type / assignee go
 * through normaliseWorkflow, the same as every claim the API returns, so
 * legacy values (e.g. status "new", "approved", "shipped") are counted under
 * their current value instead of separately.
 */
export function aggregateWarrantyStats(
  rows: WarrantyStatsRow[],
  now: Date = new Date(),
): WarrantyStats {
  const byStatus: Record<string, number> = Object.fromEntries(
    WARRANTY_STATUSES.map((s): [WarrantyStatus, number] => [s, 0]),
  );
  const byWarrantyType: Record<string, number> = Object.fromEntries(
    WARRANTY_TYPES.map((t): [WarrantyType, number] => [t, 0]),
  );
  const byAssignee: Record<string, number> = {};
  const byProductCategory: Record<string, number> = {};
  const products = new Map<string, { productName: string; sku: string; count: number }>();
  const cutoff = stamp(new Date(now.getTime() - OPEN_AGE_DAYS * 24 * 60 * 60 * 1000));
  let openOlderThan30d = 0;
  let latestSubmittedAt: string | null = null;

  for (const row of rows) {
    const wf = normaliseWorkflow({
      status: row.status,
      assignee: row.assignee,
      warrantyType: row.warranty_type,
    });
    inc(byStatus, wf.status);
    inc(byWarrantyType, wf.warrantyType ?? UNSET_WARRANTY_TYPE);
    inc(byAssignee, wf.assignee?.trim() || "unassigned");
    inc(byProductCategory, row.product_category?.trim() || "unknown");

    const productName = row.product_name?.trim() ?? "";
    const sku = row.sku?.trim() ?? "";
    const key = `${productName}\u0000${sku}`;
    const p = products.get(key);
    if (p) p.count++;
    else products.set(key, { productName, sku, count: 1 });

    const submittedAt = row.submitted_at ?? "";
    if (wf.status !== "finished" && submittedAt && submittedAt < cutoff) openOlderThan30d++;
    if (submittedAt && (latestSubmittedAt === null || submittedAt > latestSubmittedAt)) {
      latestSubmittedAt = submittedAt;
    }
  }

  const byProduct = [...products.values()]
    .sort(
      (a, b) =>
        b.count - a.count ||
        a.productName.localeCompare(b.productName) ||
        a.sku.localeCompare(b.sku),
    )
    .slice(0, TOP_PRODUCTS);

  return {
    total: rows.length,
    byStatus,
    byWarrantyType,
    byAssignee,
    byProductCategory,
    byProduct,
    openOlderThan30d,
    latestSubmittedAt,
  };
}

/** Stats over the claims submitted in [from, to] (same filter as the list). */
export async function getWarrantyStats(
  filter: { from?: string; to?: string } = {},
  now: Date = new Date(),
): Promise<WarrantyStats> {
  const sql = getSql();
  const rows = await sql<WarrantyStatsRow[]>`
    SELECT submitted_at, status, assignee, warranty_type,
           data->>'productName' AS product_name,
           data->>'sku' AS sku,
           data->>'productCategory' AS product_category
    FROM warranty
    WHERE TRUE
      ${filter.from ? sql`AND submitted_at >= ${filter.from}` : sql``}
      ${filter.to ? sql`AND submitted_at <= ${filter.to}` : sql``}`;
  return aggregateWarrantyStats(rows, now);
}
