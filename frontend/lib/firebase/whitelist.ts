/* eslint-disable */
import { db } from "../services/firebase/index";
import {
  collection,
  doc,
  setDoc,
  getDoc,
  serverTimestamp,
} from "firebase/firestore";

export interface WhitelistEntry {
  walletAddress: string;
  totalPoints: number;
  lastSpinDate?: string; // YYYY-MM-DD format - optional for users who haven't spun
  spinCount: number;
  timestamp: any;
  isWhitelisted: boolean;
  pointsHistory: Array<{
    points: number;
    date: string;
    timestamp: any;
    type?: string; // 'spin' or 'swap'
    solSpent?: number; // For swap transactions
    transactionSignature?: string; // Transaction signature
    solTransferSignature?: string; // SOL transfer signature
    isolTransferSignature?: string; // ISOL transfer signature
  }>;
  // Swap-related properties
  lastSwapDate?: string; // YYYY-MM-DD format
  swapCount?: number;
}

export const addToWhitelist = async (
  walletAddress: string,
  points: string
): Promise<{ success: boolean; message: string; data?: any }> => {
  try {
    const whitelistRef = doc(db, "whitelist", walletAddress);
    const docSnap = await getDoc(whitelistRef);

    const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
    const pointsValue = parseFloat(points.replace(" ISOL", ""));

    if (docSnap.exists()) {
      const existingData = docSnap.data() as WhitelistEntry;

      // Check if user spun within last 24 hours
      const lastSpinTime = existingData.timestamp.seconds
        ? new Date(existingData.timestamp.seconds * 1000)
        : new Date(existingData.timestamp);

      const now = new Date();
      const timeSinceLastSpin = now.getTime() - lastSpinTime.getTime();
      const twentyFourHours = 24 * 60 * 60 * 1000;

      if (timeSinceLastSpin < twentyFourHours) {
        const timeUntilNext = twentyFourHours - timeSinceLastSpin;
        const hoursUntilNext = Math.floor(timeUntilNext / (1000 * 60 * 60));
        const minutesUntilNext = Math.floor(
          (timeUntilNext % (1000 * 60 * 60)) / (1000 * 60)
        );

        const timeMessage =
          hoursUntilNext === 0
            ? `${minutesUntilNext} minutes`
            : `${hoursUntilNext}h ${minutesUntilNext}m`;

        return {
          success: false,
          message: `You've already spun! Next spin available in ${timeMessage}.`,
          data: existingData,
        };
      }

      // Add points to existing total
      const updatedData: WhitelistEntry = {
        ...existingData,
        totalPoints: existingData.totalPoints + pointsValue,
        lastSpinDate: today,
        spinCount: (existingData.spinCount || 0) + 1,
        timestamp: serverTimestamp(),
        pointsHistory: [
          ...existingData.pointsHistory,
          {
            points: pointsValue,
            date: today,
            timestamp: new Date(),
            type: "spin",
          },
        ],
      };

      await setDoc(whitelistRef, updatedData);

      return {
        success: true,
        message: `${points} added to your total! You now have ${updatedData.totalPoints} ISOL.`,
        data: updatedData,
      };
    } else {
      // First time user
      const newData: WhitelistEntry = {
        walletAddress,
        totalPoints: pointsValue,
        lastSpinDate: today,
        spinCount: 1,
        timestamp: serverTimestamp(),
        isWhitelisted: true,
        pointsHistory: [
          {
            points: pointsValue,
            date: today,
            timestamp: new Date(),
            type: "spin",
          },
        ],
      };

      await setDoc(whitelistRef, newData);

      return {
        success: true,
        message: `Welcome! You've earned ${points} and are now whitelisted for the airdrop!`,
        data: newData,
      };
    }
  } catch (error) {
    console.error("Error adding to whitelist:", error);
    return {
      success: false,
      message: "Error processing your request. Please try again.",
    };
  }
};

export const checkWhitelistStatus = async (
  walletAddress: string
): Promise<WhitelistEntry | null> => {
  try {
    const whitelistRef = doc(db, "whitelist", walletAddress);
    const docSnap = await getDoc(whitelistRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as WhitelistEntry;

      // Ensure default values for optional fields to prevent undefined errors
      return {
        ...data,
        spinCount: data.spinCount || 0,
        swapCount: data.swapCount || 0,
        pointsHistory: data.pointsHistory || [],
      };
    }

    return null;
  } catch (error) {
    console.error("Error checking whitelist status:", error);
    return null;
  }
};

export const canUserSpinToday = async (
  walletAddress: string
): Promise<{
  canSpin: boolean;
  message?: string;
  hoursUntilNext?: number;
  userData?: any;
}> => {
  try {
    const whitelistRef = doc(db, "whitelist", walletAddress);
    const docSnap = await getDoc(whitelistRef);

    const today = new Date().toISOString().split("T")[0];

    if (docSnap.exists()) {
      const userData = docSnap.data();

      // Handle both old and new schema
      let lastSpinDate = userData.lastSpinDate;

      // If old schema (no lastSpinDate), migrate it
      if (!lastSpinDate && userData.timestamp) {
        const timestampDate = new Date(userData.timestamp.seconds * 1000);
        lastSpinDate = timestampDate.toISOString().split("T")[0];

        // Migrate old data to new schema
        await migrateOldData(walletAddress, userData);
      }

      // Only check spin cooldown if user has actually spun before
      if (userData.lastSpinDate) {
        // Check if user spun within last 24 hours
        const lastSpinTime = userData.timestamp.seconds
          ? new Date(userData.timestamp.seconds * 1000)
          : new Date(userData.timestamp);

        const now = new Date();
        const timeSinceLastSpin = now.getTime() - lastSpinTime.getTime();
        const twentyFourHours = 24 * 60 * 60 * 1000;

        if (timeSinceLastSpin < twentyFourHours) {
          const timeUntilNext = twentyFourHours - timeSinceLastSpin;
          const hoursUntilNext = Math.floor(timeUntilNext / (1000 * 60 * 60));
          const minutesUntilNext = Math.floor(
            (timeUntilNext % (1000 * 60 * 60)) / (1000 * 60)
          );

          const timeMessage =
            hoursUntilNext === 0
              ? `${minutesUntilNext} minutes`
              : `${hoursUntilNext}h ${minutesUntilNext}m`;

          return {
            canSpin: false,
            message: `You've already spun! Next spin available in ${timeMessage}.`,
            hoursUntilNext,
            userData: {
              ...userData,
              lastSpinTimestamp:
                userData.timestamp ||
                userData.pointsHistory?.[userData.pointsHistory.length - 1]
                  ?.timestamp,
            },
          };
        }
      }

      return { canSpin: true, userData };
    }

    return { canSpin: true };
  } catch (error) {
    console.error("Error checking spin availability:", error);
    return { canSpin: true }; // Allow spin if there's an error
  }
};

// Migration function for old data
export const migrateOldData = async (walletAddress: string, oldData: any) => {
  try {
    const whitelistRef = doc(db, "whitelist", walletAddress);

    // Convert old points format to number
    const pointsValue =
      typeof oldData.points === "string"
        ? parseFloat(oldData.points.replace(" ISOL", ""))
        : oldData.points || 0;

    const timestampDate = new Date(oldData.timestamp.seconds * 1000);
    const spinDate = timestampDate.toISOString().split("T")[0];

    const migratedData: WhitelistEntry = {
      walletAddress,
      totalPoints: pointsValue,
      lastSpinDate: spinDate,
      spinCount: 1,
      timestamp: oldData.timestamp,
      isWhitelisted: true,
      pointsHistory: [
        {
          points: pointsValue,
          date: spinDate,
          timestamp: oldData.timestamp,
          type: "spin",
        },
      ],
    };

    await setDoc(whitelistRef, migratedData);
    console.log(`Migrated data for wallet: ${walletAddress}`);

    return migratedData;
  } catch (error) {
    console.error("Error migrating old data:", error);
    return null;
  }
};

// Helper function to safely create/update whitelist entries for swaps
export const updateWhitelistForSwap = async (
  walletAddress: string,
  isolValue: number,
  solValue: number,
  solTransferSignature: string,
  isolTransferSignature: string
): Promise<{ success: boolean; data?: WhitelistEntry; error?: string }> => {
  try {
    const currentEntry = await checkWhitelistStatus(walletAddress);
    const today = new Date().toISOString().split("T")[0];

    const newPointsHistoryEntry = {
      points: isolValue,
      date: today,
      timestamp: new Date(),
      type: "swap" as const,
      solSpent: solValue,
      solTransferSignature,
      isolTransferSignature,
    };

    let updatedData: WhitelistEntry;

    if (currentEntry) {
      // Update existing entry
      updatedData = {
        ...currentEntry,
        totalPoints: currentEntry.totalPoints + isolValue,
        lastSwapDate: today,
        swapCount: (currentEntry.swapCount || 0) + 1,
        timestamp: serverTimestamp(),
        pointsHistory: [...currentEntry.pointsHistory, newPointsHistoryEntry],
      };
    } else {
      // Create new entry for first-time swapper
      updatedData = {
        walletAddress,
        totalPoints: isolValue,
        lastSwapDate: today,
        swapCount: 1,
        spinCount: 0, // Default to 0 for new swap-only users
        timestamp: serverTimestamp(),
        isWhitelisted: true,
        pointsHistory: [newPointsHistoryEntry],
      };
    }

    const whitelistRef = doc(db, "whitelist", walletAddress);
    await setDoc(whitelistRef, updatedData);

    return { success: true, data: updatedData };
  } catch (error) {
    console.error("Error updating whitelist for swap:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
};
