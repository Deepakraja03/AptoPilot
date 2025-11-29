 
import {
  collection,
  doc,
  addDoc,
  getDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  Timestamp,
} from "firebase/firestore";
import { db } from "./index";
import {
  User,
  Wallet,
  WalletAccount,
  OtpRecord,
  ApiHealthLog,
  ApiCallLog,
  SwapTransaction,
  UserAllocation,
  SpinHistory,
  UserIntent,
} from "./schema";

class FirebaseDatabaseService {
  // User operations
  async createUser(
    userData: Omit<User, "id" | "createdAt" | "updatedAt">
  ): Promise<User> {
    const now = new Date();
    const userDoc = {
      ...userData,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
    };

    const docRef = await addDoc(collection(db, "users"), userDoc);
    return { ...userData, id: docRef.id, createdAt: now, updatedAt: now };
  }

  async getUserById(userId: string): Promise<User | null> {
    const docRef = doc(db, "users", userId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      const user = {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        sessionExpiry: data.sessionExpiry?.toDate(),
        lastLoginAt: data.lastLoginAt?.toDate(),
      } as User;

      // Fetch user's wallets
      user.wallets = await this.getWalletsByUserId(user.id);

      return user;
    }
    return null;
  }

  async getUserByWallet(email: string): Promise<User | null> {
    const q = query(
      collection(db, "users"),
      where("email", "==", email),
      limit(1)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      const user = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        sessionExpiry: data.sessionExpiry?.toDate(),
        lastLoginAt: data.lastLoginAt?.toDate(),
      } as User;

      // Fetch user's wallets
      user.wallets = await this.getWalletsByUserId(user.id);

      return user;
    }
    return null;
  }

  async getUserByOrganizationId(organizationId: string): Promise<User | null> {
    const q = query(
      collection(db, "users"),
      where("organizationId", "==", organizationId),
      limit(1)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      const user = {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        sessionExpiry: data.sessionExpiry?.toDate(),
        lastLoginAt: data.lastLoginAt?.toDate(),
      } as User;

      // Fetch user's wallets
      user.wallets = await this.getWalletsByUserId(user.id);

      return user;
    }
    return null;
  }

  async updateUser(
    userId: string,
    updates: Partial<Omit<User, "id" | "createdAt">>
  ): Promise<User> {
    const docRef = doc(db, "users", userId);
    const updateData = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
      ...(updates.sessionExpiry && {
        sessionExpiry: Timestamp.fromDate(updates.sessionExpiry),
      }),
      ...(updates.lastLoginAt && {
        lastLoginAt: Timestamp.fromDate(updates.lastLoginAt),
      }),
    };

    await updateDoc(docRef, updateData);
    const updatedDoc = await this.getUserById(userId);
    return updatedDoc!;
  }

  async deleteUser(userId: string): Promise<void> {
    await deleteDoc(doc(db, "users", userId));
  }

  // Wallet operations
  async createWallet(
    walletData: Omit<Wallet, "id" | "createdAt" | "updatedAt">
  ): Promise<Wallet> {
    const now = new Date();
    const walletDoc = {
      ...walletData,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      ...(walletData.importedAt && {
        importedAt: Timestamp.fromDate(walletData.importedAt),
      }),
      ...(walletData.exportedAt && {
        exportedAt: Timestamp.fromDate(walletData.exportedAt),
      }),
    };

    const docRef = await addDoc(collection(db, "wallets"), walletDoc);
    return { ...walletData, id: docRef.id, createdAt: now, updatedAt: now };
  }

  async getWalletById(walletId: string): Promise<Wallet | null> {
    const q = query(
      collection(db, "wallets"),
      where("walletId", "==", walletId),
      limit(1)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        importedAt: data.importedAt?.toDate(),
        exportedAt: data.exportedAt?.toDate(),
      } as Wallet;
    }
    return null;
  }

  async updateWallet(
    walletId: string,
    updates: Partial<Omit<Wallet, "id" | "createdAt" | "walletId">>
  ): Promise<Wallet> {
    const q = query(
      collection(db, "wallets"),
      where("walletId", "==", walletId),
      limit(1)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const docRef = querySnapshot.docs[0].ref;
      const updateData = {
        ...updates,
        updatedAt: Timestamp.fromDate(new Date()),
        ...(updates.exportedAt && {
          exportedAt: Timestamp.fromDate(updates.exportedAt),
        }),
        ...(updates.importedAt && {
          importedAt: Timestamp.fromDate(updates.importedAt),
        }),
      };

      await updateDoc(docRef, updateData);
      const updatedWallet = await this.getWalletById(walletId);
      return updatedWallet!;
    }
    throw new Error("Wallet not found");
  }

  async deleteWallet(walletId: string): Promise<void> {
    const q = query(
      collection(db, "wallets"),
      where("walletId", "==", walletId),
      limit(1)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      await deleteDoc(querySnapshot.docs[0].ref);

      // Also delete associated wallet accounts
      const accountsQuery = query(
        collection(db, "walletAccounts"),
        where("walletId", "==", walletId)
      );
      const accountsSnapshot = await getDocs(accountsQuery);

      for (const accountDoc of accountsSnapshot.docs) {
        await deleteDoc(accountDoc.ref);
      }
    }
  }

  async getWalletsByUserId(userId: string): Promise<Wallet[]> {
    const q = query(collection(db, "wallets"), where("userId", "==", userId));
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        importedAt: data.importedAt?.toDate(),
        exportedAt: data.exportedAt?.toDate(),
      } as Wallet;
    });
  }

  async createWalletAccounts(
    accountsData: Omit<WalletAccount, "id" | "createdAt">[]
  ): Promise<void> {
    const now = Timestamp.fromDate(new Date());
    const batch = accountsData.map((account) => ({
      ...account,
      createdAt: now,
    }));

    for (const account of batch) {
      await addDoc(collection(db, "walletAccounts"), account);
    }
  }

  async getWalletAccountsByWalletId(
    walletId: string
  ): Promise<WalletAccount[]> {
    const q = query(
      collection(db, "walletAccounts"),
      where("walletId", "==", walletId)
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
      } as WalletAccount;
    });
  }

  // OTP operations
  async createOtpRecord(
    otpData: Omit<OtpRecord, "id" | "isValid" | "createdAt">
  ): Promise<OtpRecord> {
    const now = new Date();
    const otpDoc = {
      ...otpData,
      expiresAt: Timestamp.fromDate(otpData.expiresAt),
      isValid: true,
      createdAt: Timestamp.fromDate(now),
    };

    const docRef = await addDoc(collection(db, "otpRecords"), otpDoc);
    return {
      ...otpData,
      id: docRef.id,
      isValid: true,
      createdAt: now,
    };
  }

  async getValidOtpByEmail(email: string): Promise<OtpRecord | null> {
    try {
      const nowTimestamp = Timestamp.fromDate(new Date());
      console.log("Searching for OTP with email:", email);
      console.log("Current timestamp:", nowTimestamp);

      // Try the optimized query first
      try {
        const q = query(
          collection(db, "otpRecords"),
          where("email", "==", email),
          where("isValid", "==", true),
          where("expiresAt", ">", nowTimestamp),
          orderBy("expiresAt", "desc"),
          limit(1)
        );

        const querySnapshot = await getDocs(q);
        console.log("Optimized query results count:", querySnapshot.size);

        if (!querySnapshot.empty) {
          const doc = querySnapshot.docs[0];
          const data = doc.data();
          console.log("Found OTP record (optimized):", data);

          return {
            id: doc.id,
            ...data,
            expiresAt: data.expiresAt.toDate(),
            createdAt: data.createdAt.toDate(),
          } as OtpRecord;
        }
      } catch (indexError) {
        console.log("Optimized query failed, using fallback:", indexError);
      }

      // Fallback query - get all valid records for this email and sort manually
      console.log("Using fallback query...");
      const fallbackQuery = query(
        collection(db, "otpRecords"),
        where("email", "==", email),
        where("isValid", "==", true)
      );

      const fallbackSnapshot = await getDocs(fallbackQuery);
      console.log("Fallback query results count:", fallbackSnapshot.size);

      const now = new Date();
      const validRecords: (OtpRecord & { docId: string })[] = [];

      // Filter valid records and convert timestamps
      for (const doc of fallbackSnapshot.docs) {
        const data = doc.data();
        const expiresAt = data.expiresAt.toDate();
        const createdAt = data.createdAt.toDate();

        if (expiresAt > now) {
          validRecords.push({
            id: doc.id,
            docId: doc.id,
            ...data,
            expiresAt,
            createdAt,
          } as OtpRecord & { docId: string });
        }
      }

      if (validRecords.length === 0) {
        console.log("No valid OTP found for email:", email);
        return null;
      }

      // Sort by createdAt descending to get the latest record
      validRecords.sort(
        (a, b) => b.createdAt.getTime() - a.createdAt.getTime()
      );

      const latestRecord = validRecords[0];
      console.log("Found latest valid OTP record:", {
        otpId: latestRecord.otpId,
        createdAt: latestRecord.createdAt,
        expiresAt: latestRecord.expiresAt,
      });

      return latestRecord;
    } catch (error) {
      console.error("Error in getValidOtpByEmail:", error);
      throw error;
    }
  }

  async invalidateOtp(otpId: string): Promise<void> {
    const q = query(collection(db, "otpRecords"), where("otpId", "==", otpId));
    const querySnapshot = await getDocs(q);

    for (const docSnap of querySnapshot.docs) {
      await updateDoc(doc(db, "otpRecords", docSnap.id), {
        isValid: false,
        updatedAt: Timestamp.fromDate(new Date()),
      });
    }
  }

  // Logging operations
  async logApiHealth(healthData: Omit<ApiHealthLog, "id">): Promise<void> {
    const logDoc = {
      ...healthData,
      checkedAt: Timestamp.fromDate(healthData.checkedAt),
    };

    await addDoc(collection(db, "apiHealthLogs"), logDoc);
  }

  async logApiCall(callData: Omit<ApiCallLog, "id">): Promise<void> {
    const logDoc = {
      ...callData,
      calledAt: Timestamp.fromDate(callData.calledAt),
    };

    await addDoc(collection(db, "apiCallLogs"), logDoc);
  }

  // Swap Transaction operations
  async createSwapTransaction(
    swapData: Omit<SwapTransaction, "id" | "createdAt">
  ): Promise<SwapTransaction> {
    const now = new Date();
    const swapDoc = {
      ...swapData,
      createdAt: Timestamp.fromDate(now),
      ...(swapData.completedAt && {
        completedAt: Timestamp.fromDate(swapData.completedAt),
      }),
    };

    const docRef = await addDoc(collection(db, "swapTransactions"), swapDoc);
    return { ...swapData, id: docRef.id, createdAt: now };
  }

  async updateSwapTransaction(
    id: string,
    updates: Partial<Omit<SwapTransaction, "id" | "createdAt">>
  ): Promise<void> {
    const updateData = {
      ...updates,
      ...(updates.completedAt && {
        completedAt: Timestamp.fromDate(updates.completedAt),
      }),
    };

    await updateDoc(doc(db, "swapTransactions", id), updateData);
  }

  async getSwapTransactionsByUserId(
    userId: string
  ): Promise<SwapTransaction[]> {
    const q = query(
      collection(db, "swapTransactions"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        completedAt: data.completedAt?.toDate(),
      } as SwapTransaction;
    });
  }

  async getSwapTransactionsByUserAddress(
    userAddress: string
  ): Promise<SwapTransaction[]> {
    const q = query(
      collection(db, "swapTransactions"),
      where("userAddress", "==", userAddress),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        completedAt: data.completedAt?.toDate(),
      } as SwapTransaction;
    });
  }

  // User Allocation operations
  async createUserAllocation(
    allocationData: Omit<UserAllocation, "id" | "createdAt" | "updatedAt">
  ): Promise<UserAllocation> {
    const now = new Date();
    const allocationDoc = {
      ...allocationData,
      createdAt: Timestamp.fromDate(now),
      updatedAt: Timestamp.fromDate(now),
      ...(allocationData.lastSpinDate && {
        lastSpinDate: Timestamp.fromDate(allocationData.lastSpinDate),
      }),
    };

    const docRef = await addDoc(
      collection(db, "userAllocations"),
      allocationDoc
    );
    return { ...allocationData, id: docRef.id, createdAt: now, updatedAt: now };
  }

  async getUserAllocationByUserId(
    userId: string
  ): Promise<UserAllocation | null> {
    const q = query(
      collection(db, "userAllocations"),
      where("userId", "==", userId),
      limit(1)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        lastSpinDate: data.lastSpinDate?.toDate(),
      } as UserAllocation;
    }
    return null;
  }

  async getUserAllocationByAddress(
    userAddress: string
  ): Promise<UserAllocation | null> {
    const q = query(
      collection(db, "userAllocations"),
      where("userAddress", "==", userAddress),
      limit(1)
    );
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      const doc = querySnapshot.docs[0];
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        lastSpinDate: data.lastSpinDate?.toDate(),
      } as UserAllocation;
    }
    return null;
  }

  async updateUserAllocation(
    id: string,
    updates: Partial<Omit<UserAllocation, "id" | "createdAt">>
  ): Promise<void> {
    const updateData = {
      ...updates,
      updatedAt: Timestamp.fromDate(new Date()),
      ...(updates.lastSpinDate && {
        lastSpinDate: Timestamp.fromDate(updates.lastSpinDate),
      }),
    };

    await updateDoc(doc(db, "userAllocations", id), updateData);
  }

  async getLeaderboard(limitCount: number = 10): Promise<UserAllocation[]> {
    const q = query(
      collection(db, "userAllocations"),
      orderBy("totalAllocation", "desc"),
      limit(limitCount)
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        updatedAt: data.updatedAt.toDate(),
        lastSpinDate: data.lastSpinDate?.toDate(),
      } as UserAllocation;
    });
  }

  // Spin History operations
  async createSpinHistory(
    spinData: Omit<SpinHistory, "id">
  ): Promise<SpinHistory> {
    const spinDoc = {
      ...spinData,
      spinDate: Timestamp.fromDate(spinData.spinDate),
    };

    const docRef = await addDoc(collection(db, "spinHistory"), spinDoc);
    return { ...spinData, id: docRef.id };
  }

  async getSpinHistoryByUserId(userId: string): Promise<SpinHistory[]> {
    const q = query(
      collection(db, "spinHistory"),
      where("userId", "==", userId),
      orderBy("spinDate", "desc")
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        spinDate: data.spinDate.toDate(),
      } as SpinHistory;
    });
  }

  async getSpinHistoryByUserAddress(
    userAddress: string
  ): Promise<SpinHistory[]> {
    const q = query(
      collection(db, "spinHistory"),
      where("userAddress", "==", userAddress),
      orderBy("spinDate", "desc")
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        spinDate: data.spinDate.toDate(),
      } as SpinHistory;
    });
  }

  async getTodaySpinCount(userId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const q = query(
      collection(db, "spinHistory"),
      where("userId", "==", userId),
      where("spinDate", ">=", Timestamp.fromDate(today)),
      where("spinDate", "<", Timestamp.fromDate(tomorrow))
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.size;
  }

  // User Intent operations
  async createUserIntent(
    intentData: Omit<UserIntent, "id" | "createdAt">
  ): Promise<UserIntent> {
    const now = new Date();
    const intentDoc = {
      ...intentData,
      createdAt: Timestamp.fromDate(now),
      ...(intentData.executedAt && {
        executedAt: Timestamp.fromDate(intentData.executedAt),
      }),
      ...(intentData.nextExecution && {
        nextExecution: Timestamp.fromDate(intentData.nextExecution),
      }),
    };

    const docRef = await addDoc(collection(db, "userIntents"), intentDoc);
    return { ...intentData, id: docRef.id, createdAt: now };
  }

  async getUserIntentsByUserId(userId: string): Promise<UserIntent[]> {
    const q = query(
      collection(db, "userIntents"),
      where("userId", "==", userId),
      orderBy("createdAt", "desc")
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => {
      const data = doc.data();
      return {
        id: doc.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        executedAt: data.executedAt?.toDate(),
        nextExecution: data.nextExecution?.toDate(),
      } as UserIntent;
    });
  }

  async getUserIntentById(intentId: string): Promise<UserIntent | null> {
    const docRef = doc(db, "userIntents", intentId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data();
      return {
        id: docSnap.id,
        ...data,
        createdAt: data.createdAt.toDate(),
        executedAt: data.executedAt?.toDate(),
        nextExecution: data.nextExecution?.toDate(),
      } as UserIntent;
    }
    return null;
  }

  async updateUserIntent(
    intentId: string,
    updates: Partial<Omit<UserIntent, "id" | "userId" | "createdAt">>
  ): Promise<void> {
    const updateData = {
      ...updates,
      ...(updates.executedAt && {
        executedAt: Timestamp.fromDate(updates.executedAt),
      }),
      ...(updates.nextExecution && {
        nextExecution: Timestamp.fromDate(updates.nextExecution),
      }),
    };

    await updateDoc(doc(db, "userIntents", intentId), updateData);
  }

  async deleteUserIntent(intentId: string): Promise<void> {
    await deleteDoc(doc(db, "userIntents", intentId));
  }
}

const databaseService = new FirebaseDatabaseService();
export default databaseService;
