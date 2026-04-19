import type { WarrantyPayload } from "@/types/warranty";
import { WARRANTY_COLLECTION, getMongoDb } from "./mongo";

export type WarrantyDocument = WarrantyPayload & {
  submittedAt: string;
};

export async function insertWarrantyDoc(
  p: WarrantyPayload,
  submittedAt: string,
): Promise<void> {
  const db = await getMongoDb();
  await db.collection(WARRANTY_COLLECTION).insertOne({
    ...p,
    submittedAt,
  });
}

export async function findWarrantyBySubmissionId(
  submissionId: string,
): Promise<WarrantyDocument | null> {
  const db = await getMongoDb();
  const doc = await db
    .collection<WarrantyDocument>(WARRANTY_COLLECTION)
    .findOne({ submissionId }, { projection: { _id: 0 } });
  return doc as WarrantyDocument | null;
}
