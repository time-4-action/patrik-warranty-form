import { MongoClient, type Db } from "mongodb";

// Cache the connection promise on globalThis so dev HMR reuses it.
const globalForMongo = globalThis as unknown as {
  _mongoClientPromise?: Promise<MongoClient>;
};

function getClientPromise(): Promise<MongoClient> {
  if (globalForMongo._mongoClientPromise) {
    return globalForMongo._mongoClientPromise;
  }
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("MONGODB_URI not set");
  globalForMongo._mongoClientPromise = new MongoClient(uri).connect();
  return globalForMongo._mongoClientPromise;
}

export async function getMongoDb(): Promise<Db> {
  const client = await getClientPromise();
  return client.db();
}

export const WARRANTY_COLLECTION = "warranty";
