import { MongoClient, Db } from "mongodb";

let cachedClient: MongoClient | null = null;
let cachedDb: Db | null = null;

const DEFAULT_DB_NAME = process.env.NEXT_PUBLIC_MONGODB_DB || "aptopilot";

export async function getDb(): Promise<Db> {
  const uri = process.env.NEXT_PUBLIC_MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set in environment");
  }

  if (cachedDb) return cachedDb;

  if (!cachedClient) {
    cachedClient = new MongoClient(uri, {
      maxPoolSize: 10,
      retryWrites: true,
    });
    await cachedClient.connect();
  }

  cachedDb = cachedClient.db(DEFAULT_DB_NAME);
  return cachedDb;
}

export async function closeDb(): Promise<void> {
  if (cachedClient) {
    await cachedClient.close();
    cachedClient = null;
    cachedDb = null;
  }
}
