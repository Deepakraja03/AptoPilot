/* eslint-disable */
/**
 * Intent Dashboard Service
 *
 * This service handles intent-related operations for the dashboard,
 * including fetching user intents from Firebase and categorizing them by status.
 */

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
import { db } from "./firebase/index";

// Intent data model for dashboard
export interface DashboardIntent {
  id: string;
  userId: string;
  type: "swap" | "stake" | "lend" | "bridge";
  status: "automated" | "pending" | "completed" | "failed";
  description: string;
  fromChain?: string;
  toChain?: string;
  amount?: number;
  symbol?: string;
  createdAt: Date;
  executedAt?: Date;
  nextExecution?: Date;
}

// Response interface for dashboard API
export interface IntentsResponse {
  totalCount: number;
  automated: number;
  pendingApproval: number;
  intents: Array<{
    id: string;
    type: string;
    status: "automated" | "pending" | "completed" | "failed";
    createdAt: string;
    description: string;
  }>;
}

// Intent status categorization
export type IntentStatus = "automated" | "pending" | "completed" | "failed";

export class IntentService {
  private static readonly COLLECTION_NAME = "userIntents";

  /**
   * Fetch user intents from Firebase and return dashboard-formatted response
   * @param userId - The user ID to fetch intents for
   * @returns Promise<IntentsResponse>
   */
  async getUserIntents(userId: string): Promise<IntentsResponse> {
    try {
      if (!userId) {
        throw new Error("User ID is required");
      }

      // Query user intents from Firebase
      const q = query(
        collection(db, IntentService.COLLECTION_NAME),
        where("userId", "==", userId),
        orderBy("createdAt", "desc")
      );

      const querySnapshot = await getDocs(q);

      // Convert Firebase documents to DashboardIntent objects
      const intents: DashboardIntent[] = querySnapshot.docs.map((doc) => {
        const data = doc.data();
        return {
          id: doc.id,
          userId: data.userId,
          type: data.type,
          status: data.status,
          description: data.description,
          fromChain: data.fromChain,
          toChain: data.toChain,
          amount: data.amount,
          symbol: data.symbol,
          createdAt: data.createdAt.toDate(),
          executedAt: data.executedAt?.toDate(),
          nextExecution: data.nextExecution?.toDate(),
        } as DashboardIntent;
      });

      // Count intents by status
      const statusCounts = this.categorizeIntentsByStatus(intents);

      // Format response for dashboard
      const response: IntentsResponse = {
        totalCount: intents.length,
        automated: statusCounts.automated,
        pendingApproval: statusCounts.pending,
        intents: intents.map((intent) => ({
          id: intent.id,
          type: intent.type,
          status: intent.status,
          createdAt: intent.createdAt.toISOString(),
          description: intent.description,
        })),
      };

      return response;
    } catch (error) {
      console.error("Error fetching user intents:", error);
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Get intent status for a specific intent
   * @param intentId - The intent ID to check status for
   * @returns Promise<IntentStatus>
   */
  async getIntentStatus(intentId: string): Promise<IntentStatus> {
    try {
      if (!intentId) {
        throw new Error("Intent ID is required");
      }

      const docRef = doc(db, IntentService.COLLECTION_NAME, intentId);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        throw new Error("Intent not found");
      }

      const data = docSnap.data();
      return data.status as IntentStatus;
    } catch (error) {
      console.error("Error fetching intent status:", error);
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Create a new intent in Firebase
   * @param intentData - Intent data without id and createdAt
   * @returns Promise<DashboardIntent>
   */
  async createIntent(
    intentData: Omit<DashboardIntent, "id" | "createdAt">
  ): Promise<DashboardIntent> {
    try {
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

      const docRef = await addDoc(
        collection(db, IntentService.COLLECTION_NAME),
        intentDoc
      );

      return {
        ...intentData,
        id: docRef.id,
        createdAt: now,
      };
    } catch (error) {
      console.error("Error creating intent:", error);
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Update an existing intent
   * @param intentId - The intent ID to update
   * @param updates - Partial intent data to update
   * @returns Promise<void>
   */
  async updateIntent(
    intentId: string,
    updates: Partial<Omit<DashboardIntent, "id" | "userId" | "createdAt">>
  ): Promise<void> {
    try {
      if (!intentId) {
        throw new Error("Intent ID is required");
      }

      const docRef = doc(db, IntentService.COLLECTION_NAME, intentId);
      const updateData = {
        ...updates,
        ...(updates.executedAt && {
          executedAt: Timestamp.fromDate(updates.executedAt),
        }),
        ...(updates.nextExecution && {
          nextExecution: Timestamp.fromDate(updates.nextExecution),
        }),
      };

      await updateDoc(docRef, updateData);
    } catch (error) {
      console.error("Error updating intent:", error);
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Delete an intent
   * @param intentId - The intent ID to delete
   * @returns Promise<void>
   */
  async deleteIntent(intentId: string): Promise<void> {
    try {
      if (!intentId) {
        throw new Error("Intent ID is required");
      }

      await deleteDoc(doc(db, IntentService.COLLECTION_NAME, intentId));
    } catch (error) {
      console.error("Error deleting intent:", error);
      throw this.handleFirebaseError(error);
    }
  }

  /**
   * Categorize intents by status for dashboard metrics
   * @param intents - Array of DashboardIntent objects
   * @returns Object with counts for each status category
   */
  private categorizeIntentsByStatus(intents: DashboardIntent[]): {
    automated: number;
    pending: number;
    completed: number;
    failed: number;
  } {
    const counts = {
      automated: 0,
      pending: 0,
      completed: 0,
      failed: 0,
    };

    intents.forEach((intent) => {
      switch (intent.status) {
        case "automated":
          counts.automated++;
          break;
        case "pending":
          counts.pending++;
          break;
        case "completed":
          counts.completed++;
          break;
        case "failed":
          counts.failed++;
          break;
        default:
          console.warn(`Unknown intent status: ${intent.status}`);
      }
    });

    return counts;
  }

  /**
   * Handle Firebase errors and provide meaningful error messages
   * @param error - The original error from Firebase
   * @returns Error with user-friendly message
   */
  private handleFirebaseError(error: any): Error {
    if (error.code) {
      switch (error.code) {
        case "permission-denied":
          return new Error("Access denied. Please check your authentication.");
        case "unavailable":
          return new Error(
            "Firebase service is temporarily unavailable. Please try again later."
          );
        case "deadline-exceeded":
          return new Error(
            "Request timeout. Please check your connection and try again."
          );
        case "not-found":
          return new Error("Requested data not found.");
        case "already-exists":
          return new Error("Data already exists.");
        case "resource-exhausted":
          return new Error("Service quota exceeded. Please try again later.");
        case "failed-precondition":
          return new Error("Operation failed due to invalid state.");
        case "aborted":
          return new Error("Operation was aborted due to a conflict.");
        case "out-of-range":
          return new Error("Invalid parameter value provided.");
        case "unimplemented":
          return new Error("Operation not supported.");
        case "internal":
          return new Error("Internal server error. Please try again later.");
        case "data-loss":
          return new Error("Data corruption detected. Please contact support.");
        default:
          return new Error(
            `Firebase error: ${error.message || "Unknown error occurred"}`
          );
      }
    }

    // Handle network errors
    if (
      error.message?.includes("network") ||
      error.message?.includes("fetch")
    ) {
      return new Error(
        "Network error. Please check your internet connection and try again."
      );
    }

    // Handle validation errors
    if (
      error.message?.includes("required") ||
      error.message?.includes("invalid")
    ) {
      return new Error(`Validation error: ${error.message}`);
    }

    // Default error handling
    return new Error(
      error.message || "An unexpected error occurred while processing intents."
    );
  }

  /**
   * Get active intents count for a user (automated + pending)
   * @param userId - The user ID to count active intents for
   * @returns Promise<number>
   */
  async getActiveIntentsCount(userId: string): Promise<number> {
    try {
      const response = await this.getUserIntents(userId);
      return response.automated + response.pendingApproval;
    } catch (error) {
      console.error("Error getting active intents count:", error);
      return 0; // Return 0 on error to prevent dashboard from breaking
    }
  }

  /**
   * Check if Firebase connection is healthy
   * @returns Promise<boolean>
   */
  async checkConnectionHealth(): Promise<boolean> {
    try {
      // Try to read from a test collection to verify connection
      const testQuery = query(
        collection(db, IntentService.COLLECTION_NAME),
        limit(1)
      );
      await getDocs(testQuery);
      return true;
    } catch (error) {
      console.error("Firebase connection health check failed:", error);
      return false;
    }
  }
}

// Export singleton instance
export const intentService = new IntentService();
