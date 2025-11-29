/* eslint-disable @typescript-eslint/no-explicit-any */
import { ethers } from "ethers";

interface NonceInfo {
  nonce: number;
  timestamp: number;
  pending: boolean;
}

/**
 * Nonce Manager to prevent nonce conflicts in concurrent transactions
 * This helps avoid the "nonce has already been used" error
 */
export class NonceManager {
  private static instance: NonceManager;
  private nonceCache = new Map<string, NonceInfo>();
  private readonly CACHE_EXPIRY = 60000; // 1 minute
  private readonly CLEANUP_INTERVAL = 30000; // 30 seconds

  private constructor() {
    // Start cleanup interval
    setInterval(() => {
      this.cleanup();
    }, this.CLEANUP_INTERVAL);
  }

  public static getInstance(): NonceManager {
    if (!NonceManager.instance) {
      NonceManager.instance = new NonceManager();
    }
    return NonceManager.instance;
  }

  /**
   * Get the next safe nonce for an address
   */
  public async getNextNonce(
    provider: ethers.JsonRpcProvider,
    address: string,
    offset: number = 0
  ): Promise<number> {
    const normalizedAddress = ethers.getAddress(address);
    const cacheKey = `${provider._network.chainId || "unknown"}-${normalizedAddress}`;

    // Get current nonces from blockchain
    const [confirmedNonce, pendingNonce] = await Promise.all([
      provider.getTransactionCount(normalizedAddress, "latest"),
      provider.getTransactionCount(normalizedAddress, "pending"),
    ]);

    // Get cached nonce info
    const cachedInfo = this.nonceCache.get(cacheKey);

    // Determine the safe nonce to use
    let safeNonce = Math.max(confirmedNonce, pendingNonce);

    // If we have cached info and it's recent, use the higher value
    if (cachedInfo && !this.isExpired(cachedInfo)) {
      safeNonce = Math.max(safeNonce, cachedInfo.nonce + 1);
    }

    // Apply optional offset to help avoid nonce conflicts
    if (offset > 0) {
      safeNonce += offset;
    }

    // Update cache with the nonce we're about to use
    this.nonceCache.set(cacheKey, {
      nonce: safeNonce,
      timestamp: Date.now(),
      pending: true,
    });

    console.log("🔍 Nonce management:", {
      address: normalizedAddress,
      confirmed: confirmedNonce,
      pending: pendingNonce,
      cached: cachedInfo?.nonce,
      using: safeNonce,
      offset: offset > 0 ? offset : undefined,
    });

    return safeNonce;
  }

  /**
   * Mark a nonce as confirmed (transaction mined)
   */
  public markNonceConfirmed(
    chainId: number,
    address: string,
    nonce: number
  ): void {
    const normalizedAddress = ethers.getAddress(address);
    const cacheKey = `${chainId}-${normalizedAddress}`;

    const cachedInfo = this.nonceCache.get(cacheKey);
    if (cachedInfo && cachedInfo.nonce === nonce) {
      cachedInfo.pending = false;
      cachedInfo.timestamp = Date.now();
    }
  }

  /**
   * Mark a nonce as failed (transaction failed or rejected)
   */
  public markNonceFailed(
    chainId: number,
    address: string,
    nonce: number
  ): void {
    const normalizedAddress = ethers.getAddress(address);
    const cacheKey = `${chainId}-${normalizedAddress}`;

    const cachedInfo = this.nonceCache.get(cacheKey);
    if (cachedInfo && cachedInfo.nonce === nonce) {
      // Delete this entry to force recalculation on next request
      this.nonceCache.delete(cacheKey);
    }
  }

  /**
   * Reset the nonce manager for an address to force recalculation
   * This is useful when we encounter nonce errors
   */
  public async resetNonce(
    provider: ethers.JsonRpcProvider,
    address: string
  ): Promise<void> {
    try {
      const normalizedAddress = ethers.getAddress(address);
      const cacheKey = `${provider._network.chainId || "unknown"}-${normalizedAddress}`;

      // Clear the cache entry for this address
      this.nonceCache.delete(cacheKey);

      // Get the current nonce from the blockchain
      const pendingNonce = await provider.getTransactionCount(
        normalizedAddress,
        "pending"
      );

      // Update the cache with the current pending nonce
      this.nonceCache.set(cacheKey, {
        nonce: pendingNonce,
        timestamp: Date.now(),
        pending: false,
      });

      console.log(`✅ Reset nonce for ${normalizedAddress} to ${pendingNonce}`);
    } catch (error) {
      console.error("❌ Failed to reset nonce:", error);
    }
  }

  /**
   * Clear cache for a specific address (useful for testing or manual reset)
   */
  public clearCache(chainId: number, address: string): void {
    const normalizedAddress = ethers.getAddress(address);
    const cacheKey = `${chainId}-${normalizedAddress}`;
    this.nonceCache.delete(cacheKey);
  }

  /**
   * Get cache statistics
   */
  public getCacheStats(): {
    totalEntries: number;
    pendingTransactions: number;
    expiredEntries: number;
  } {
    let pendingCount = 0;
    let expiredCount = 0;

    for (const info of this.nonceCache.values()) {
      if (info.pending) pendingCount++;
      if (this.isExpired(info)) expiredCount++;
    }

    return {
      totalEntries: this.nonceCache.size,
      pendingTransactions: pendingCount,
      expiredEntries: expiredCount,
    };
  }

  /**
   * Check if a cache entry is expired
   */
  private isExpired(info: NonceInfo): boolean {
    return Date.now() - info.timestamp > this.CACHE_EXPIRY;
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, info] of this.nonceCache.entries()) {
      if (now - info.timestamp > this.CACHE_EXPIRY) {
        this.nonceCache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired nonce cache entries`);
    }
  }
}

// Export singleton instance
export const nonceManager = NonceManager.getInstance();
