import { NextRequest, NextResponse } from "next/server";
import { authenticateUser, AuthErrors } from "../middleware";

// Aptos-only unified dashboard

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

// Get user wallet addresses (Aptos-only for this endpoint)
type MultiChainAddresses = { aptos?: string | null; APTOS?: string | null } & Record<string, string | null>;
async function getUserMultiChainAddresses(userId: string): Promise<MultiChainAddresses> {
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
        aptos: null,
        APTOS: null,
      };
    }

    // Enhanced: Use chain-specific addresses with proper fallbacks
    const { chainAddresses, primaryAddress } = walletInfo;
    type ChainAddresses = { ethereum?: string | null; solana?: string | null; sui?: string | null; aptos?: string | null };
    const ca = (chainAddresses || {}) as ChainAddresses;

    // Map chain-specific addresses where available, fallback to primary
    const multiChainAddresses: MultiChainAddresses = {
      // EVM chains use Ethereum address
      ETHEREUM: chainAddresses?.ethereum || primaryAddress,
      BASE: chainAddresses?.ethereum || primaryAddress,
      BSC: chainAddresses?.ethereum || primaryAddress,
      POLYGON: chainAddresses?.ethereum || primaryAddress,
      ARBITRUM: chainAddresses?.ethereum || primaryAddress,
      OPTIMISM: chainAddresses?.ethereum || primaryAddress,
      // Use actual Solana address from user's wallet
      SOLANA: ca.solana || null,
      // Extra: surface Aptos for downstream enrichment
      aptos: ca.aptos || null,
      APTOS: ca.aptos || null,
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
      aptos: null,
      APTOS: null,
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

    // Aptos-only mode: skip multi-chain aggregation from other chains

    // Build detailed tokens and chains data (use a broad type so we can append Aptos later)
    // Start with empty and append only Aptos (see below)
    const detailedChains: Array<{
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
    }> = [];

    // If Aptos address exists (or can be resolved), fetch APT balance and append an Aptos chain entry
    try {
      type MultiAddresses = Record<string, string | null> & { aptos?: string | null; APTOS?: string | null };
      const wa = walletAddresses as MultiAddresses;
      let aptosAddress = wa?.APTOS ?? wa?.aptos ?? null;

      // Fallback: resolve Aptos address directly from DB if not present in headers mapping
      if (!aptosAddress) {
        try {
          const db = await import("@/lib/services/mongo/database");
          const wallets = await db.default.getWalletsByUserId(user.id);
          for (const w of wallets) {
            const accounts = await db.default.getWalletAccountsByWalletId(w.walletId);
            const aptAcc = accounts.find((a: { addressFormat?: string }) => a.addressFormat === "ADDRESS_FORMAT_APTOS");
            if (aptAcc) {
              const a = aptAcc as { address?: string };
              aptosAddress = a.address || null;
              break;
            }
          }
        } catch {}
      }

      if (aptosAddress) {
        // Determine which network holds the balance (try env, then mainnet, then testnet)
        const candidateRpcs = Array.from(
          new Set([
            process.env.NEXT_PUBLIC_APTOS_RPC_URL,
            "https://fullnode.mainnet.aptoslabs.com/v1",
            "https://fullnode.testnet.aptoslabs.com/v1",
            "https://fullnode.devnet.aptoslabs.com/v1",
          ].filter(Boolean) as string[])
        );

        const coinStoreType = encodeURIComponent("0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>");
        let aptBalanceAPT = 0;
        for (const rpc of candidateRpcs) {
          try {
            const res = await fetch(`${rpc}/accounts/${aptosAddress}/resource/${coinStoreType}`, { cache: "no-store" });
            if (!res.ok) continue;
            type AptosCoinResource = { data?: { coin?: { value?: string } } };
            const json: AptosCoinResource = await res.json();
            const rawStr = json?.data?.coin?.value || "0"; // octas
            const bal = Number(rawStr) / 1e8; // 1 APT = 1e8 octas
            if (!Number.isNaN(bal)) {
              aptBalanceAPT = bal;
              console.log("Unified API Aptos balance resolved", { rpc, aptosAddress, aptBalanceAPT });
              break;
            }
          } catch {
            // try next rpc
          }
        }
        detailedChains.push({
          name: "Aptos",
          symbol: "APT",
          totalValue: 0, // USD not required in Aptos-only mode
          totalValueChange24h: 0,
          tokenCount: aptBalanceAPT > 0 ? 1 : 0,
          logoUrl: "",
          tokens: aptBalanceAPT > 0 ? [{
            symbol: "APT",
            name: "Aptos",
            balance: aptBalanceAPT,
            value: 0,
            valueChange24h: 0,
            priceChange24h: 0,
            logoUrl: "",
            chain: "APTOS",
          }] : [],
        });
      }
    } catch (aptErr) {
      console.warn("Failed to enrich Aptos chain in unified API:", aptErr);
    }

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

    // Aptos-only view: filter chains to Aptos only and compute portfolio from it
    const aptosOnlyChains = detailedChains.filter((c) => c.name === "Aptos");
    const aptTotalValue = aptosOnlyChains.reduce((sum, c) => sum + (c.totalValue || 0), 0);
    const aptActiveChains = aptosOnlyChains.map((c) => ({
      name: c.name,
      value: c.totalValue,
      percentage: aptTotalValue > 0 ? (c.totalValue / aptTotalValue) * 100 : 0,
      symbol: c.symbol,
    }));

    // Build unified response (Aptos only)
    const unifiedResponse: UnifiedDashboardResponse = {
      portfolio: {
        totalValue: aptTotalValue,
        totalValueChange24h: 0,
        totalValueChangePercent: 0,
        activeChains: {
          count: aptActiveChains.length,
          chains: aptActiveChains,
        },
        currentYield: {
          percentage: 0,
          change: 0,
          changePercent: 0,
        },
        lastUpdated: new Date().toISOString(),
      },
      tokensChains: {
        chains: aptosOnlyChains,
      },
      intents: intentsData || { totalCount: 0, automated: 0, pendingApproval: 0, intents: [] },
      transactions: transactionsData || { transactions: [] },
      crossChainOpportunities: opportunitiesData || { opportunities: [], totalCount: 0, generatedAt: new Date().toISOString() },
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