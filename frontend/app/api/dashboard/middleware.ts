import { NextRequest } from "next/server";
import databaseService from "@/lib/services/mongo/database";
import { User, WalletAccount } from "@/lib/services/firebase/schema";

export type AuthenticatedUser = User;

/**
 * Authentication middleware for dashboard endpoints
 * Extracts user information from request headers and validates authentication
 */
export async function authenticateUser(
  request: NextRequest
): Promise<AuthenticatedUser | null> {
  try {
    // Try multiple authentication methods

    // Method 1: Organization ID from headers (primary method)
    const organizationId = request.headers.get("x-organization-id");
    if (organizationId) {
      const user =
        await databaseService.getUserByOrganizationId(organizationId);
      if (user) {
        return user as AuthenticatedUser;
      }
    }

    // Method 2: Authorization header with bearer token
    const authHeader = request.headers.get("authorization");
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      // In a real implementation, you would validate the JWT token here
      // For now, we'll treat it as an organization ID
      const user = await databaseService.getUserByOrganizationId(token);
      if (user) {
        return user as AuthenticatedUser;
      }
    }

    // Method 3: User ID from headers (fallback)
    const userId = request.headers.get("x-user-id");
    if (userId) {
      const user = await databaseService.getUserById(userId);
      if (user) {
        return user as AuthenticatedUser;
      }
    }

    // Method 4: Email from headers (for development/testing)
    const userEmail = request.headers.get("x-user-email");
    if (userEmail) {
      const user = await databaseService.getUserByWallet(userEmail);
      if (user) {
        return user as AuthenticatedUser;
      }
    }

    return null;
  } catch (error) {
    console.error("Authentication error:", error);
    return null;
  }
}

/**
 * Check if user session is valid
 */
export function isSessionValid(user: AuthenticatedUser): boolean {
  if (!user.sessionExpiry) {
    return false;
  }

  return new Date() < user.sessionExpiry;
}

/**
 * Get user wallet addresses for multi-chain operations
 * Enhanced to properly map chain-specific addresses
 */
export async function getUserWalletAddresses(userId: string) {
  try {
    const wallets = await databaseService.getWalletsByUserId(userId);

    if (wallets.length === 0) {
      console.warn(`No wallets found for user: ${userId}`);
      return null;
    }

    // Get accounts from ALL wallets, not just the first one
    const allAccounts: WalletAccount[] = [];
    for (const wallet of wallets) {
      const accounts = await databaseService.getWalletAccountsByWalletId(
        wallet.walletId
      );

      if (accounts.length > 0) {
        allAccounts.push(...accounts);
      }
    }

    if (allAccounts.length === 0) {
      console.warn(`No accounts found across all wallets for user: ${userId}`);
      return null;
    }

    const accounts = allAccounts;

    // Map accounts by address format for chain-specific resolution
    const addressMap = {
      ethereum: null as string | null,
      solana: null as string | null,
      sui: null as string | null,
      aptos: null as string | null,
    };

    // Find chain-specific addresses
    accounts.forEach((account) => {
      switch (account.addressFormat) {
        case "ADDRESS_FORMAT_ETHEREUM":
          addressMap.ethereum = account.address;
          break;
        case "ADDRESS_FORMAT_SOLANA":
          addressMap.solana = account.address;
          break;
        case "ADDRESS_FORMAT_SUI":
          addressMap.sui = account.address;
          break;
        case "ADDRESS_FORMAT_APTOS":
          addressMap.aptos = account.address;
          break;
      }
    });

    // Use primary address as fallback for missing chain-specific addresses
    const primaryAddress = accounts[0].address;

    const result = {
      primaryAddress,
      walletId: wallets[0].walletId, // Use first wallet ID for compatibility
      accounts: accounts,
      chainAddresses: {
        ethereum: addressMap.ethereum || primaryAddress,
        solana: addressMap.solana || null,
        sui: addressMap.sui || primaryAddress,
        aptos: addressMap.aptos || null,
      },
      // Additional metadata for better error handling
      metadata: {
        totalAccounts: accounts.length,
        supportedChains: accounts.map((acc) => acc.addressFormat),
        walletName: `Multi-wallet (${wallets.length} wallets)`,
        createdAt: wallets[0].createdAt,
        walletCount: wallets.length,
      },
    };

    return result;
  } catch (error) {
    console.error("Error getting user wallet addresses:", error);
    return null;
  }
}

/**
 * Standard error responses
 */
export const AuthErrors = {
  UNAUTHORIZED: { error: "Unauthorized", code: "AUTH_001" },
  SESSION_EXPIRED: { error: "Session expired", code: "AUTH_002" },
  INVALID_TOKEN: { error: "Invalid token", code: "AUTH_003" },
  NO_WALLET: { error: "No wallet found", code: "AUTH_004" },
} as const;
