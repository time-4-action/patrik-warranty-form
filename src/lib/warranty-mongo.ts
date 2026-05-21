import type { WarrantyPayload } from "@/types/warranty";
import {
  WARRANTY_STATUSES,
  type WarrantyStatus,
} from "@/types/warranty-settings";
import { WARRANTY_COLLECTION, getMongoDb } from "./mongo";

export type WarrantyDocument = WarrantyPayload & {
  submittedAt: string;
  status?: WarrantyStatus;
  statusUpdatedAt?: string;
};

export async function insertWarrantyDoc(
  p: WarrantyPayload,
  submittedAt: string,
): Promise<void> {
  const db = await getMongoDb();
  await db.collection(WARRANTY_COLLECTION).insertOne({
    ...p,
    submittedAt,
    status: "new" satisfies WarrantyStatus,
    statusUpdatedAt: submittedAt,
  });
}

export async function findWarrantyBySubmissionId(
  submissionId: string,
): Promise<WarrantyDocument | null> {
  const db = await getMongoDb();
  const doc = await db
    .collection<WarrantyDocument>(WARRANTY_COLLECTION)
    .findOne({ submissionId }, { projection: { _id: 0 } });
  if (!doc) return null;
  return { ...doc, status: doc.status ?? "new" };
}

export type ListWarrantyFilter = {
  status?: WarrantyStatus | "all";
  search?: string;
  from?: string;
  to?: string;
  limit?: number;
  skip?: number;
};

export type ListWarrantyResult = {
  total: number;
  items: WarrantyDocument[];
};

export async function listWarrantySubmissions(
  filter: ListWarrantyFilter = {},
): Promise<ListWarrantyResult> {
  const db = await getMongoDb();
  const coll = db.collection<WarrantyDocument>(WARRANTY_COLLECTION);

  const q: Record<string, unknown> = {};
  if (filter.status && filter.status !== "all") {
    q.status = filter.status;
  }
  if (filter.search?.trim()) {
    const safe = filter.search.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(safe, "i");
    q.$or = [
      { submissionId: rx },
      { name: rx },
      { surname: rx },
      { email: rx },
      { company: rx },
      { productName: rx },
      { serialNumber: rx },
      { invoiceNumber: rx },
    ];
  }
  if (filter.from || filter.to) {
    const range: Record<string, string> = {};
    if (filter.from) range.$gte = filter.from;
    if (filter.to) range.$lte = filter.to;
    q.submittedAt = range;
  }

  const limit = Math.min(Math.max(filter.limit ?? 50, 1), 200);
  const skip = Math.max(filter.skip ?? 0, 0);

  const [total, raw] = await Promise.all([
    coll.countDocuments(q),
    coll
      .find(q, { projection: { _id: 0 } })
      .sort({ submittedAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray(),
  ]);

  const items = raw.map((d) => ({ ...d, status: d.status ?? "new" }));
  return { total, items };
}

export async function updateWarrantyStatus(
  submissionId: string,
  status: WarrantyStatus,
): Promise<WarrantyDocument | null> {
  if (!WARRANTY_STATUSES.includes(status)) return null;
  const db = await getMongoDb();
  const coll = db.collection<WarrantyDocument>(WARRANTY_COLLECTION);
  const updatedAt = new Date().toISOString();
  const res = await coll.findOneAndUpdate(
    { submissionId },
    { $set: { status, statusUpdatedAt: updatedAt } },
    { returnDocument: "after", projection: { _id: 0 } },
  );
  if (!res) return null;
  return { ...res, status: res.status ?? "new" };
}
