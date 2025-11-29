import { NextRequest, NextResponse } from "next/server";
import goldRushService, { SupportedChain } from "@/lib/goldrush";
import { authenticateUser, AuthErrors } from "../middleware";

// Chain name mapping
const CHAIN_NAMES = {
  ETHEREUM: 'Ethereum',
  POLYGON: 'Polygon',
  BASE: 'Base',
  BSC: 'BNB Smart Chain',
  SOLANA: 'Solana',
  ARBITRUM: 'Arbitrum',
  OPTIMISM: 'Optimism',
} as const;

// Unified response interface that combines all dashboard data
interface UnifiedDashboardResponse {
  // Portfolio data (for header and portfolio overview)
  portfolio: {
    totalValue: number;
    totalValueChange24h: number;
    totalValueChangePercent: number;
    activeChains: {
      count: number;
      chains: Array<{
        name: string;
        value: number;
        percentage: number;
        symbol: string;
      }>;
    };
    currentYield: {
      percentage: number;
      change: number;
      changePercent: number;
    };
    lastUpdated: string;
  };

  // Detailed tokens and chains data
  tokensChains: {
    chains: Array<{
      name: string;
      symbol: string;
      totalValue: number;
      totalValueChange24h: number;
      tokenCount: number;
      logoUrl?: string;
      tokens: Array<{
        symbol: string;
        name: string;
        balance: number;
        value: number;
        valueChange24h: number;
        priceChange24h: number;
        logoUrl?: string;
        chain: string;
      }>;
    }>;
  };

  // Mock data for other sections (can be expanded later)
  intents: {
    totalCount: number;
    automated: number;
    pendingApproval: number;
    intents: Array<{
      id: string;
      type: string;
      status: "automated" | "pending" | "completed";
      createdAt: string;
      description: string;
    }>;
  };

  transactions: {
    transactions: Array<{
      id: string;
      hash: string;
      type: "sent" | "received" | "swap";
      fromChain: string;
      toChain: string;
      amount: number;
      symbol: string;
      timestamp: string;
      status: "pending" | "completed" | "failed";
      description: string;
      fromToken?: string;
      toToken?: string;
      fromAmount?: number;
      toAmount?: number;
    }>;
  };

  crossChainOpportunities: {
    opportunities: Array<{
      id: string;
      title: string;
      description: string;
      chain: string;
      protocol: string;
      apy: number;
      potentialGain: number;
      potentialGainPercent: number;
      currentHolding: {
        amount: number;
        symbol: string;
        chain: string;
        value: number;
      };
      targetToken: string;
      riskLevel: "LOW" | "MEDIUM" | "HIGH";
      category: "LENDING" | "STAKING" | "LIQUIDITY" | "YIELD_FARMING";
      minimumAmount: number;
      estimatedGasFeesUSD: number;
      timeToComplete: string;
      requirements: string[];
      tags: string[];
    }>;
    totalCount: number;
    generatedAt: string;
  };
}

// Get user wallet addresses from their wallets for multi-chain operations
async function getUserMultiChainAddresses(userId: string): Promise<Record<SupportedChain, string | null>> {
  try {
    const { getUserWalletAddresses } = await import("../middleware");
    const walletInfo = await getUserWalletAddresses(userId);

    if (!walletInfo) {
      return {
        ETHEREUM: null,
        BASE: null,
        BSC: null,
        SOLANA: null,
        POLYGON: null,
        ARBITRUM: null,
        OPTIMISM: null,
      };
    }

    // Enhanced: Use chain-specific addresses with proper fallbacks
    const { chainAddresses, primaryAddress } = walletInfo;

    // Map chain-specific addresses where available, fallback to primary
    const multiChainAddresses: Record<SupportedChain, string | null> = {
      // EVM chains use Ethereum address
      ETHEREUM: chainAddresses?.ethereum || primaryAddress,
      BASE: chainAddresses?.ethereum || primaryAddress,
      BSC: chainAddresses?.ethereum || primaryAddress,
      POLYGON: chainAddresses?.ethereum || primaryAddress,
      ARBITRUM: chainAddresses?.ethereum || primaryAddress,
      OPTIMISM: chainAddresses?.ethereum || primaryAddress,
      // Use actual Solana address from user's wallet
      SOLANA: chainAddresses?.solana || null,
    };

    return multiChainAddresses;
  } catch {
    return {
      ETHEREUM: null,
      BASE: null,
      BSC: null,
      SOLANA: null,
      POLYGON: null,
      ARBITRUM: null,
      OPTIMISM: null,
    };
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate user
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json(AuthErrors.UNAUTHORIZED, { status: 401 });
    }

    // Get user's wallet addresses
    const walletAddresses = await getUserMultiChainAddresses(user.id);

    // Fetch multi-chain portfolio data (force refresh to ensure fresh data)
    const multiChainData = await goldRushService.forceRefreshMultiChainWalletBalances(walletAddresses);

    // Calculate active chains for portfolio
    const activeChainsList = Object.entries(multiChainData.chains)
      .filter(([, chainData]) => chainData && chainData.totalValue > 0)
      .map(([chainKey, chainData]) => ({
        name: goldRushService.getChainDisplayName(chainKey as SupportedChain),
        value: chainData!.totalValue,
        percentage:
          multiChainData.totalValue > 0
            ? (chainData!.totalValue / multiChainData.totalValue) * 100
            : 0,
        symbol: goldRushService.getNativeTokenSymbol(chainKey as SupportedChain),
      }))
      .sort((a, b) => b.value - a.value);

    // Calculate current yield (24h change percentage)
    const currentYieldPercentage =
      multiChainData.totalValue > 0
        ? (multiChainData.totalValueChange24h /
          (multiChainData.totalValue - multiChainData.totalValueChange24h)) *
        100
        : 0;

    // Calculate total value change percentage
    const totalValueChangePercent =
      multiChainData.totalValue > 0
        ? (multiChainData.totalValueChange24h /
          (multiChainData.totalValue - multiChainData.totalValueChange24h)) *
        100
        : 0;

    // Build detailed tokens and chains data
    const detailedChains = await Promise.all(
      goldRushService.getSupportedChains().map(async (chainKey) => {
        try {
          // Find wallet address for this chain
          const address = walletAddresses[chainKey];

          if (!address) {
            // Return empty chain data for chains without wallet addresses
            return {
              name: CHAIN_NAMES[chainKey] || chainKey,
              symbol: goldRushService.getNativeTokenSymbol(chainKey),
              totalValue: 0,
              totalValueChange24h: 0,
              tokenCount: 0,
              logoUrl: undefined,
              tokens: [],
            };
          }

          // Use the data we already have from multiChainData to avoid duplicate calls
          const existingChainData = multiChainData.chains[chainKey];

          if (existingChainData) {
            // Process tokens from existing data
            const tokens = existingChainData.tokenBalances
              .filter(token => token.balance > 0)
              .map(token => ({
                symbol: token.symbol || 'Unknown',
                name: token.name || 'Unknown Token',
                balance: token.uiAmount || 0,
                value: token.value || 0,
                valueChange24h: token.valueChange24h || 0,
                priceChange24h: token.priceChange24h || 0,
                logoUrl: token.logoUrl,
                chain: chainKey,
              }))
              .sort((a, b) => b.value - a.value);

            return {
              name: CHAIN_NAMES[chainKey] || chainKey,
              symbol: goldRushService.getNativeTokenSymbol(chainKey),
              totalValue: existingChainData.totalValue,
              totalValueChange24h: existingChainData.totalValueChange24h,
              tokenCount: tokens.length,
              logoUrl: undefined,
              tokens,
            };
          }

          // Fallback to empty data if no existing data
          return {
            name: CHAIN_NAMES[chainKey] || chainKey,
            symbol: goldRushService.getNativeTokenSymbol(chainKey),
            totalValue: 0,
            totalValueChange24h: 0,
            tokenCount: 0,
            logoUrl: undefined,
            tokens: [],
          };
        } catch {
          // Return empty chain data for failed chains
          return {
            name: CHAIN_NAMES[chainKey] || chainKey,
            symbol: goldRushService.getNativeTokenSymbol(chainKey),
            totalValue: 0,
            totalValueChange24h: 0,
            tokenCount: 0,
            logoUrl: undefined,
            tokens: [],
          };
        }
      })
    );

    // Fetch real data from existing dashboard APIs
    let intentsData, transactionsData, opportunitiesData;

    try {
      // Fetch intents data
      const intentsResponse = await fetch(`${request.nextUrl.origin}/api/dashboard/intents`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": user.organizationId || "",
        },
      });
      intentsData = intentsResponse.ok ? await intentsResponse.json() : {
        totalCount: 0,
        automated: 0,
        pendingApproval: 0,
        intents: [],
      };
    } catch (error) {
      console.error("Failed to fetch intents data:", error);
      intentsData = {
        totalCount: 0,
        automated: 0,
        pendingApproval: 0,
        intents: [],
      };
    }

    try {
      // Fetch transactions data
      const transactionsResponse = await fetch(`${request.nextUrl.origin}/api/dashboard/transactions?limit=5`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": user.organizationId || "",
        },
      });
      transactionsData = transactionsResponse.ok ? await transactionsResponse.json() : {
        transactions: [],
      };
    } catch (error) {
      console.error("Failed to fetch transactions data:", error);
      transactionsData = {
        transactions: [],
      };
    }

    try {
      // Fetch cross-chain opportunities data
      const opportunitiesResponse = await fetch(`${request.nextUrl.origin}/api/dashboard/cross-chain-opportunities`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": user.organizationId || "",
        },
      });
      opportunitiesData = opportunitiesResponse.ok ? await opportunitiesResponse.json() : {
        opportunities: [],
        totalCount: 0,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      console.error("Failed to fetch opportunities data:", error);
      opportunitiesData = {
        opportunities: [],
        totalCount: 0,
        generatedAt: new Date().toISOString(),
      };
    }

    // Build unified response
    const unifiedResponse: UnifiedDashboardResponse = {
      portfolio: {
        totalValue: multiChainData.totalValue,
        totalValueChange24h: multiChainData.totalValueChange24h,
        totalValueChangePercent,
        activeChains: {
          count: activeChainsList.length,
          chains: activeChainsList,
        },
        currentYield: {
          percentage: currentYieldPercentage,
          change: multiChainData.totalValueChange24h,
          changePercent: currentYieldPercentage,
        },
        lastUpdated: multiChainData.lastUpdated,
      },
      tokensChains: {
        chains: detailedChains,
      },
      intents: intentsData,
      transactions: transactionsData,
      crossChainOpportunities: opportunitiesData,
    };

    return NextResponse.json(unifiedResponse);
  } catch (error) {
    console.error("Unified dashboard API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}