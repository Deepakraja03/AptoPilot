import { ObjectId, WithId } from "mongodb";
import { getDb } from "./connection";
import {
  User,
  Wallet,
  WalletAccount,
  OtpRecord,
  ApiHealthLog,
  ApiCallLog,
} from "../firebase/schema";

function now(): Date {
  return new Date();
}

function toId(id?: string) {
  return id && ObjectId.isValid(id) ? new ObjectId(id) : undefined;
}

// Mongo document shapes (persisted forms) - replace id with _id
type UserDoc = Omit<User, "id"> & { _id?: ObjectId };
type WalletDoc = Omit<Wallet, "id"> & { _id?: ObjectId };
type WalletAccountDoc = Omit<WalletAccount, "id"> & { _id?: ObjectId };
type OtpRecordDoc = Omit<OtpRecord, "id"> & { _id?: ObjectId };
type ApiHealthLogDoc = Omit<ApiHealthLog, "id"> & { _id?: ObjectId };
type ApiCallLogDoc = Omit<ApiCallLog, "id"> & { _id?: ObjectId };

// Mappers from Mongo docs to app models
function mapUser(doc: WithId<UserDoc>): User {
  const { ...rest } = doc;
  return { id: doc._id.toHexString(), ...(rest as Omit<User, "id">) };
}

function mapWallet(doc: WithId<WalletDoc>): Wallet {
  const { ...rest } = doc;
  return { id: doc._id.toHexString(), ...(rest as Omit<Wallet, "id">) };
}

function mapWalletAccount(doc: WithId<WalletAccountDoc>): WalletAccount {
  const { ...rest } = doc;
  return { id: doc._id.toHexString(), ...(rest as Omit<WalletAccount, "id">) };
}

function mapOtpRecord(doc: WithId<OtpRecordDoc>): OtpRecord {
  const { ...rest } = doc;
  return { id: doc._id.toHexString(), ...(rest as Omit<OtpRecord, "id">) };
}

class MongoDatabaseService {
  // Users
  async createUser(
    userData: Omit<User, "id" | "createdAt" | "updatedAt">
  ): Promise<User> {
    const db = await getDb();
    const doc: UserDoc = { ...userData, createdAt: now(), updatedAt: now() };
    const res = await db.collection<UserDoc>("users").insertOne(doc);
    return { id: res.insertedId.toHexString(), ...(doc as Omit<User, "id">) };
  }

  async getUserById(userId: string): Promise<User | null> {
    const db = await getDb();
    const doc = await db
      .collection<UserDoc>("users")
      .findOne({ _id: toId(userId) });
    if (!doc) return null;
    const user = mapUser(doc as WithId<UserDoc>);
    user.wallets = await this.getWalletsByUserId(user.id);
    return user;
  }

  async getUserByWallet(email: string): Promise<User | null> {
    const db = await getDb();
    const doc = await db.collection<UserDoc>("users").findOne({ email });
    if (!doc) return null;
    const user = mapUser(doc as WithId<UserDoc>);
    user.wallets = await this.getWalletsByUserId(user.id);
    return user;
  }

  async getUserByOrganizationId(organizationId: string): Promise<User | null> {
    const db = await getDb();
    const doc = await db
      .collection<UserDoc>("users")
      .findOne({ organizationId });
    if (!doc) return null;
    const user = mapUser(doc as WithId<UserDoc>);
    user.wallets = await this.getWalletsByUserId(user.id);
    return user;
  }

  async updateUser(
    userId: string,
    updates: Partial<Omit<User, "id" | "createdAt">>
  ): Promise<User> {
    const db = await getDb();
    const patch: Partial<UserDoc> = { ...updates, updatedAt: now() };
    await db
      .collection<UserDoc>("users")
      .updateOne({ _id: toId(userId) }, { $set: patch });
    const fresh = await this.getUserById(userId);
    if (!fresh) throw new Error("User not found after update");
    return fresh;
  }

  async deleteUser(userId: string): Promise<void> {
    const db = await getDb();
    await db.collection<UserDoc>("users").deleteOne({ _id: toId(userId) });
  }

  // Wallets
  async createWallet(
    walletData: Omit<Wallet, "id" | "createdAt" | "updatedAt">
  ): Promise<Wallet> {
    const db = await getDb();
    const doc: WalletDoc = { ...walletData, createdAt: now(), updatedAt: now() };
    const res = await db.collection<WalletDoc>("wallets").insertOne(doc);
    return { id: res.insertedId.toHexString(), ...(doc as Omit<Wallet, "id">) };
  }

  async getWalletById(walletId: string): Promise<Wallet | null> {
    const db = await getDb();
    const doc = await db.collection<WalletDoc>("wallets").findOne({ walletId });
    if (!doc) return null;
    return mapWallet(doc as WithId<WalletDoc>);
  }

  async updateWallet(
    walletId: string,
    updates: Partial<Omit<Wallet, "id" | "createdAt" | "walletId">>
  ): Promise<Wallet> {
    const db = await getDb();
    const patch: Partial<WalletDoc> = { ...updates, updatedAt: now() };
    await db.collection<WalletDoc>("wallets").updateOne({ walletId }, { $set: patch });
    const fresh = await this.getWalletById(walletId);
    if (!fresh) throw new Error("Wallet not found after update");
    return fresh;
  }

  async deleteWallet(walletId: string): Promise<void> {
    const db = await getDb();
    await db.collection<WalletDoc>("wallets").deleteOne({ walletId });
    await db.collection<WalletAccountDoc>("walletAccounts").deleteMany({ walletId });
  }

  async getWalletsByUserId(userId: string): Promise<Wallet[]> {
    const db = await getDb();
    const docs = await db.collection<WalletDoc>("wallets").find({ userId }).toArray();
    return docs.map((d) => mapWallet(d as WithId<WalletDoc>));
  }

  async createWalletAccounts(
    accountsData: Omit<WalletAccount, "id" | "createdAt">[]
  ): Promise<void> {
    if (!accountsData || accountsData.length === 0) return;
    const db = await getDb();
    const docs: WalletAccountDoc[] = accountsData.map((a) => ({ ...a, createdAt: now() }));
    await db.collection<WalletAccountDoc>("walletAccounts").insertMany(docs);
  }

  async getWalletAccountsByWalletId(walletId: string): Promise<WalletAccount[]> {
    const db = await getDb();
    const docs = await db
      .collection<WalletAccountDoc>("walletAccounts")
      .find({ walletId })
      .toArray();
    return docs.map((d) => mapWalletAccount(d as WithId<WalletAccountDoc>));
  }

  // OTP
  async createOtpRecord(
    otpData: Omit<OtpRecord, "id" | "isValid" | "createdAt">
  ): Promise<OtpRecord> {
    const db = await getDb();
    const doc: OtpRecordDoc = {
      ...otpData,
      isValid: true,
      createdAt: now(),
    };
    const res = await db.collection<OtpRecordDoc>("otpRecords").insertOne(doc);
    return { id: res.insertedId.toHexString(), ...(doc as Omit<OtpRecord, "id">) };
  }

  async getValidOtpByEmail(email: string): Promise<OtpRecord | null> {
    const db = await getDb();
    const doc = await db
      .collection<OtpRecordDoc>("otpRecords")
      .find({ email, isValid: true, expiresAt: { $gt: now() } })
      .sort({ createdAt: -1 })
      .limit(1)
      .next();
    if (!doc) return null;
    return mapOtpRecord(doc as WithId<OtpRecordDoc>);
  }

  async invalidateOtp(otpId: string): Promise<void> {
    const db = await getDb();
    await db
      .collection<OtpRecordDoc>("otpRecords")
      .updateMany({ otpId }, { $set: { isValid: false, updatedAt: now() } });
  }

  // Logs
  async logApiHealth(healthData: Omit<ApiHealthLog, "id">): Promise<void> {
    const db = await getDb();
    await db.collection<ApiHealthLogDoc>("apiHealthLogs").insertOne({ ...healthData });
  }

  async logApiCall(callData: Omit<ApiCallLog, "id">): Promise<void> {
    const db = await getDb();
    await db.collection<ApiCallLogDoc>("apiCallLogs").insertOne({ ...callData });
  }
}

const databaseService = new MongoDatabaseService();
export default databaseService;
