/* eslint-disable @typescript-eslint/no-explicit-any */
interface CachedTokens {
  tokens: any[];
  timestamp: number;
  expiresAt: number;
}

interface TokenStandard {
  chain: string;
  standards: string[];
}

class TokenCacheService {
  private cache = new Map<string, CachedTokens>();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes
  private readonly BASE_URL = "https://price-api.mayan.finance/v3/tokens";

  // Define all possible chain-standard combinations
  private readonly TOKEN_STANDARDS: TokenStandard[] = [
    { chain: "solana", standards: ["spl", "spl2022", "native"] },
    { chain: "ethereum", standards: ["erc20", "native"] },
    { chain: "bsc", standards: ["erc20", "native"] },
    { chain: "polygon", standards: ["erc20", "native"] },
    { chain: "avalanche", standards: ["erc20", "native"] },
    { chain: "arbitrum", standards: ["erc20", "native"] },
    { chain: "optimism", standards: ["erc20", "native"] },
    { chain: "base", standards: ["erc20", "native"] },
    { chain: "sui", standards: ["native"] },
  ];

  private getCacheKey(chain: string): string {
    return `tokens_${chain}`;
  }

  private isExpired(cachedData: CachedTokens): boolean {
    return Date.now() > cachedData.expiresAt;
  }

  private async fetchTokensForChain(chain: string): Promise<any[]> {
    const chainConfig = this.TOKEN_STANDARDS.find((c) => c.chain === chain);
    if (!chainConfig) {
      console.warn(`No token standards configured for chain: ${chain}`);
      return [];
    }

    const allTokens: any[] = [];
    const fetchPromises = chainConfig.standards.map(async (standard) => {
      try {
        const url = `${this.BASE_URL}?chain=${chain}&nonPortal=true&standard=${standard}`;
        console.log(`Fetching tokens from: ${url}`);

        const response = await fetch(url, {
          headers: {
            accept: "*/*",
            "User-Agent": "MayanSwap/1.0",
          },
        });

        if (!response.ok) {
          console.error(
            `Failed to fetch ${standard} tokens for ${chain}: ${response.status}`
          );
          return [];
        }

        const data = await response.json();
        console.log(`Raw response for ${chain}-${standard}:`, data);

        // Handle nested response format: {"chainName": [...]}
        let tokens = [];
        if (data && typeof data === "object") {
          // Check if response has chain as key
          if (data[chain] && Array.isArray(data[chain])) {
            tokens = data[chain];
          }
          // Check if response is directly an array
          else if (Array.isArray(data)) {
            tokens = data;
          }
          // Check for other possible chain name variations
          else {
            const chainKeys = Object.keys(data);
            const matchingKey = chainKeys.find(
              (key) =>
                key.toLowerCase() === chain.toLowerCase() || key === chain
            );
            if (matchingKey && Array.isArray(data[matchingKey])) {
              tokens = data[matchingKey];
            }
          }
        }

        console.log(
          `Processed ${tokens.length} ${standard} tokens for ${chain}`
        );

        return tokens.map((token) => ({
          ...token,
          standard,
          chainName: chain,
        }));
      } catch (error) {
        console.error(`Error fetching ${standard} tokens for ${chain}:`, error);
        return [];
      }
    });

    try {
      const results = await Promise.all(fetchPromises);
      results.forEach((tokens) => allTokens.push(...tokens));

      // Remove duplicates based on contract address
      const uniqueTokens = allTokens.reduce((acc, token) => {
        const key = token.contract || token.address || token.mint;
        if (
          key &&
          !acc.some((t: any) => (t.contract || t.address || t.mint) === key)
        ) {
          acc.push(token);
        }
        return acc;
      }, []);

      console.log(`Total unique tokens for ${chain}: ${uniqueTokens.length}`);
      return uniqueTokens;
    } catch (error) {
      console.error(`Error processing tokens for ${chain}:`, error);
      return [];
    }
  }

  async getTokens(chain: string): Promise<any[]> {
    const cacheKey = this.getCacheKey(chain);
    const cachedData = this.cache.get(cacheKey);

    // Return cached data if valid
    if (cachedData && !this.isExpired(cachedData)) {
      console.log(
        `Returning cached tokens for ${chain} (${cachedData.tokens.length} tokens)`
      );
      return cachedData.tokens;
    }

    // Fetch fresh data
    console.log(`Fetching fresh tokens for ${chain}...`);
    try {
      const tokens = await this.fetchTokensForChain(chain);
      console.log(
        `Fetched ${tokens.length} tokens for ${chain}:`,
        tokens.slice(0, 2)
      ); // Log first 2 tokens for debugging

      // Cache the results
      const cacheData: CachedTokens = {
        tokens,
        timestamp: Date.now(),
        expiresAt: Date.now() + this.CACHE_DURATION,
      };

      this.cache.set(cacheKey, cacheData);
      console.log(`Cached ${tokens.length} tokens for ${chain}`);

      return tokens;
    } catch (error) {
      console.error(`Failed to fetch tokens for ${chain}:`, error);

      // Return stale cache if available, otherwise empty array
      if (cachedData) {
        console.log(`Returning stale cache for ${chain}`);
        return cachedData.tokens;
      }

      return [];
    }
  }

  // Preload tokens for all chains
  async preloadAllChains(): Promise<void> {
    console.log("Preloading tokens for all chains...");
    const promises = this.TOKEN_STANDARDS.map(({ chain }) =>
      this.getTokens(chain).catch((error) => {
        console.error(`Failed to preload tokens for ${chain}:`, error);
        return [];
      })
    );

    await Promise.all(promises);
    console.log("Finished preloading tokens for all chains");
  }

  // Clear cache for a specific chain
  clearCache(chain?: string): void {
    if (chain) {
      this.cache.delete(this.getCacheKey(chain));
      console.log(`Cleared cache for ${chain}`);
    } else {
      this.cache.clear();
      console.log("Cleared all token cache");
    }
  }

  // Get cache stats
  getCacheStats(): {
    [chain: string]: { count: number; age: number; expires: number };
  } {
    const stats: {
      [chain: string]: { count: number; age: number; expires: number };
    } = {};

    this.cache.forEach((data, key) => {
      const chain = key.replace("tokens_", "");
      const now = Date.now();
      stats[chain] = {
        count: data.tokens.length,
        age: Math.floor((now - data.timestamp) / 1000), // seconds
        expires: Math.floor((data.expiresAt - now) / 1000), // seconds until expiry
      };
    });

    return stats;
  }

  // Force refresh a chain's tokens
  async refreshChain(chain: string): Promise<any[]> {
    this.clearCache(chain);
    return this.getTokens(chain);
  }
}

// Export singleton instance
export const tokenCacheService = new TokenCacheService();
