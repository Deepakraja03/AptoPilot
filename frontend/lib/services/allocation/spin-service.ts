import databaseService from "@/lib/services/firebase/database";
import { UserAllocation, SpinHistory } from "@/lib/services/firebase/schema";

export interface SpinEligibility {
  canSpin: boolean;
  hasSwapHistory: boolean;
  spinsRemainingToday: number;
  totalAllocation: number;
  reason?: string;
}

export interface SpinResult {
  success: boolean;
  allocation: number;
  segment: string;
  newTotalAllocation: number;
  spinHistory: SpinHistory;
  error?: string;
}

export class SpinService {
  private static readonly MAX_DAILY_SPINS = 1;
  private static readonly TOKEN_NAME = "Intent Sol";
  private static readonly CONTRACT_ADDRESS =
    "6Ape7PCZZvEQkPxvMDJhAnZ8Ro9FFGbNuRa3o6VUyk6y"; // Placeholder

  /**
   * Check if a user is eligible to spin the wheel
   */
  async checkSpinEligibility(
    userId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userAddress: string
  ): Promise<SpinEligibility> {
    try {
      // Check if user has swap history
      const swapTransactions =
        await databaseService.getSwapTransactionsByUserId(userId);
      const completedSwaps = swapTransactions.filter(
        (tx) => tx.status === "completed"
      );

      if (completedSwaps.length === 0) {
        return {
          canSpin: false,
          hasSwapHistory: false,
          spinsRemainingToday: 0,
          totalAllocation: 0,
          reason:
            "No completed swaps found. Complete at least one swap to be eligible.",
        };
      }

      // Check daily spin limit
      const todaySpinCount = await databaseService.getTodaySpinCount(userId);
      const spinsRemainingToday = Math.max(
        0,
        SpinService.MAX_DAILY_SPINS - todaySpinCount
      );

      // Get user's current allocation
      const userAllocation =
        await databaseService.getUserAllocationByUserId(userId);
      const totalAllocation = userAllocation?.totalAllocation || 0;

      const canSpin = spinsRemainingToday > 0;

      return {
        canSpin,
        hasSwapHistory: true,
        spinsRemainingToday,
        totalAllocation,
        reason: canSpin
          ? undefined
          : "Daily spin limit reached. Come back tomorrow!",
      };
    } catch (error) {
      console.error("Error checking spin eligibility:", error);
      return {
        canSpin: false,
        hasSwapHistory: false,
        spinsRemainingToday: 0,
        totalAllocation: 0,
        reason: "Error checking eligibility. Please try again.",
      };
    }
  }

  /**
   * Process a spin result and update user allocation
   */
  async processSpin(
    userId: string,
    userAddress: string,
    segment: string,
    allocation: number
  ): Promise<SpinResult> {
    try {
      // Double-check eligibility before processing
      const eligibility = await this.checkSpinEligibility(userId, userAddress);
      if (!eligibility.canSpin) {
        return {
          success: false,
          allocation: 0,
          segment,
          newTotalAllocation: eligibility.totalAllocation,
          spinHistory: {} as SpinHistory,
          error: eligibility.reason || "Not eligible to spin",
        };
      }

      // Create spin history record
      const spinHistory = await databaseService.createSpinHistory({
        userId,
        userAddress,
        allocationWon: allocation,
        spinDate: new Date(),
        spinResult: segment,
      });

      // Update or create user allocation
      const userAllocation =
        await databaseService.getUserAllocationByUserId(userId);

      if (userAllocation) {
        // Update existing allocation
        const newTotalAllocation = userAllocation.totalAllocation + allocation;
        const newTotalSpins = userAllocation.totalSpins + 1;

        await databaseService.updateUserAllocation(userAllocation.id, {
          totalAllocation: newTotalAllocation,
          totalSpins: newTotalSpins,
          lastSpinDate: new Date(),
        });

        return {
          success: true,
          allocation,
          segment,
          newTotalAllocation,
          spinHistory,
        };
      } else {
        // Create new allocation record
        const newUserAllocation = await databaseService.createUserAllocation({
          userId,
          userAddress,
          totalAllocation: allocation,
          totalSpins: 1,
          lastSpinDate: new Date(),
        });

        return {
          success: true,
          allocation,
          segment,
          newTotalAllocation: newUserAllocation.totalAllocation,
          spinHistory,
        };
      }
    } catch (error) {
      console.error("Error processing spin:", error);
      return {
        success: false,
        allocation: 0,
        segment,
        newTotalAllocation: 0,
        spinHistory: {} as SpinHistory,
        error:
          error instanceof Error ? error.message : "Failed to process spin",
      };
    }
  }

  /**
   * Get user's spin history
   */
  async getUserSpinHistory(userId: string): Promise<SpinHistory[]> {
    try {
      return await databaseService.getSpinHistoryByUserId(userId);
    } catch (error) {
      console.error("Error fetching spin history:", error);
      return [];
    }
  }

  /**
   * Get leaderboard data
   */
  async getLeaderboard(limit: number = 10): Promise<UserAllocation[]> {
    try {
      return await databaseService.getLeaderboard(limit);
    } catch (error) {
      console.error("Error fetching leaderboard:", error);
      return [];
    }
  }

  /**
   * Get token information
   */
  getTokenInfo() {
    return {
      name: SpinService.TOKEN_NAME,
      contractAddress: SpinService.CONTRACT_ADDRESS,
      symbol: "ISOL",
      description:
        "Intent Sol is the native token of the AptoPilot ecosystem, rewarding early users who participate in cross-chain swaps and DeFi activities.",
    };
  }

  /**
   * Initialize user allocation if they have swap history but no allocation record
   */
  async initializeUserAllocation(
    userId: string,
    userAddress: string
  ): Promise<UserAllocation | null> {
    try {
      // Check if user already has allocation
      const existingAllocation =
        await databaseService.getUserAllocationByUserId(userId);
      if (existingAllocation) {
        return existingAllocation;
      }

      // Check if user has swap history
      const swapTransactions =
        await databaseService.getSwapTransactionsByUserId(userId);
      const completedSwaps = swapTransactions.filter(
        (tx) => tx.status === "completed"
      );

      if (completedSwaps.length > 0) {
        // Create initial allocation record with 0 tokens
        return await databaseService.createUserAllocation({
          userId,
          userAddress,
          totalAllocation: 0,
          totalSpins: 0,
        });
      }

      return null;
    } catch (error) {
      console.error("Error initializing user allocation:", error);
      return null;
    }
  }
}

export const spinService = new SpinService();
