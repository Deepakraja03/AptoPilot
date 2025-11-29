"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/lib/auth";
import {
  CrossChainOpportunity,
  OpportunityFilters,
} from "@/lib/services/cross-chain-opportunities-service";

// Type definitions for API responses
export interface PortfolioData {
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
}

export interface IntentsData {
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
}

export interface TransactionsData {
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
    // Additional fields for swap transactions
    fromToken?: string;
    toToken?: string;
    fromAmount?: number;
    toAmount?: number;
  }>;
}

export interface TokenBalance {
  symbol: string;
  name: string;
  balance: number;
  value: number;
  valueChange24h: number;
  priceChange24h: number;
  logoUrl?: string;
  chain: string;
}

export interface ChainData {
  name: string;
  symbol: string;
  totalValue: number;
  totalValueChange24h: number;
  tokenCount: number;
  logoUrl?: string;
  tokens: TokenBalance[];
}

export interface TokensChainsData {
  chains: ChainData[];
}

export interface CrossChainOpportunitiesData {
  opportunities: CrossChainOpportunity[];
  totalCount: number;
  filters?: OpportunityFilters;
  generatedAt: string;
}

export interface DashboardState {
  portfolio: PortfolioData | null;
  intents: IntentsData | null;
  transactions: TransactionsData | null;
  tokensChains: TokensChainsData | null;
  crossChainOpportunities: CrossChainOpportunitiesData | null;
  loading: {
    portfolio: boolean;
    intents: boolean;
    transactions: boolean;
    tokensChains: boolean;
    crossChainOpportunities: boolean;
  };
  error: {
    portfolio: string | null;
    intents: string | null;
    transactions: string | null;
    tokensChains: string | null;
    crossChainOpportunities: string | null;
  };
  lastFetch: {
    portfolio: Date | null;
    intents: Date | null;
    transactions: Date | null;
    tokensChains: Date | null;
    crossChainOpportunities: Date | null;
  };
}

// Custom hook for fetching dashboard data
export function useDashboardData(
  options: {
    autoRefresh?: boolean;
    refreshInterval?: number; // in milliseconds
    retryAttempts?: number;
  } = {}
) {
  const { user } = useAuth();
  const {
    autoRefresh = true,
    refreshInterval = 30000, // 30 seconds
    retryAttempts = 3,
  } = options;

  const [state, setState] = useState<DashboardState>({
    portfolio: null,
    intents: null,
    transactions: null,
    tokensChains: null,
    crossChainOpportunities: null,
    loading: {
      portfolio: false,
      intents: false,
      transactions: false,
      tokensChains: false,
      crossChainOpportunities: false,
    },
    error: {
      portfolio: null,
      intents: null,
      transactions: null,
      tokensChains: null,
      crossChainOpportunities: null,
    },
    lastFetch: {
      portfolio: null,
      intents: null,
      transactions: null,
      tokensChains: null,
      crossChainOpportunities: null,
    },
  });

  const retryCountRef = useRef({
    portfolio: 0,
    intents: 0,
    transactions: 0,
    tokensChains: 0,
    crossChainOpportunities: 0,
  });

  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Generic fetch function with error handling and retry logic
  const fetchData = useCallback(
    async <T>(
      endpoint: string,
      // eslint-disable-next-line
      dataType: keyof DashboardState["loading"]
    ): Promise<T | null> => {
      if (!user) {
        throw new Error("User not authenticated");
      }

      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          "x-organization-id": user.organizationId || "",
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `HTTP ${response.status}: ${response.statusText}`
        );
      }

      const data = await response.json();
      return data as T;
    },
    [user]
  );

  // Fetch portfolio data
  const fetchPortfolio = useCallback(async () => {
    if (!user) return;

    setState((prev) => ({
      ...prev,
      loading: { ...prev.loading, portfolio: true },
      error: { ...prev.error, portfolio: null },
    }));

    try {
      const data = await fetchData<PortfolioData>(
        "/api/dashboard/portfolio",
        "portfolio"
      );

      setState((prev) => ({
        ...prev,
        portfolio: data,
        loading: { ...prev.loading, portfolio: false },
        lastFetch: { ...prev.lastFetch, portfolio: new Date() },
      }));
      retryCountRef.current.portfolio = 0;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch portfolio data";

      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, portfolio: false },
        error: { ...prev.error, portfolio: errorMessage },
      }));

      // Retry logic
      if (retryCountRef.current.portfolio < retryAttempts) {
        retryCountRef.current.portfolio++;
        setTimeout(
          () => fetchPortfolio(),
          2000 * retryCountRef.current.portfolio
        );
      }
    }
  }, [user, fetchData, retryAttempts]);

  // Fetch intents data
  const fetchIntents = useCallback(async () => {
    if (!user) return;

    setState((prev) => ({
      ...prev,
      loading: { ...prev.loading, intents: true },
      error: { ...prev.error, intents: null },
    }));

    try {
      const data = await fetchData<IntentsData>(
        "/api/dashboard/intents",
        "intents"
      );

      setState((prev) => ({
        ...prev,
        intents: data,
        loading: { ...prev.loading, intents: false },
        lastFetch: { ...prev.lastFetch, intents: new Date() },
      }));
      retryCountRef.current.intents = 0;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch intents data";

      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, intents: false },
        error: { ...prev.error, intents: errorMessage },
      }));

      // Retry logic
      if (retryCountRef.current.intents < retryAttempts) {
        retryCountRef.current.intents++;
        setTimeout(() => fetchIntents(), 2000 * retryCountRef.current.intents);
      }
    }
  }, [user, fetchData, retryAttempts]);

  // Fetch transactions data
  const fetchTransactions = useCallback(
    async (limit: number = 5) => {
      if (!user) return;

      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, transactions: true },
        error: { ...prev.error, transactions: null },
      }));

      try {
        const data = await fetchData<TransactionsData>(
          `/api/dashboard/transactions?limit=${limit}`,
          "transactions"
        );

        setState((prev) => ({
          ...prev,
          transactions: data,
          loading: { ...prev.loading, transactions: false },
          lastFetch: { ...prev.lastFetch, transactions: new Date() },
        }));
        retryCountRef.current.transactions = 0;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to fetch transactions data";

        setState((prev) => ({
          ...prev,
          loading: { ...prev.loading, transactions: false },
          error: { ...prev.error, transactions: errorMessage },
        }));

        // Retry logic
        if (retryCountRef.current.transactions < retryAttempts) {
          retryCountRef.current.transactions++;
          setTimeout(
            () => fetchTransactions(limit),
            2000 * retryCountRef.current.transactions
          );
        }
      }
    },
    [user, fetchData, retryAttempts]
  );

  // Fetch tokens and chains data
  const fetchTokensChains = useCallback(async () => {
    if (!user) return;

    setState((prev) => ({
      ...prev,
      loading: { ...prev.loading, tokensChains: true },
      error: { ...prev.error, tokensChains: null },
    }));

    try {
      const data = await fetchData<TokensChainsData>(
        "/api/dashboard/tokens-chains",
        "tokensChains"
      );

      setState((prev) => ({
        ...prev,
        tokensChains: data,
        loading: { ...prev.loading, tokensChains: false },
        lastFetch: { ...prev.lastFetch, tokensChains: new Date() },
      }));
      retryCountRef.current.tokensChains = 0;
    } catch (error) {
      const errorMessage =
        error instanceof Error
          ? error.message
          : "Failed to fetch tokens and chains data";

      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, tokensChains: false },
        error: { ...prev.error, tokensChains: errorMessage },
      }));

      // Retry logic
      if (retryCountRef.current.tokensChains < retryAttempts) {
        retryCountRef.current.tokensChains++;
        setTimeout(
          () => fetchTokensChains(),
          2000 * retryCountRef.current.tokensChains
        );
      }
    }
  }, [user, fetchData, retryAttempts]);

  // Fetch cross-chain opportunities data
  const fetchCrossChainOpportunities = useCallback(
    async (filters?: OpportunityFilters) => {
      if (!user) return;

      setState((prev) => ({
        ...prev,
        loading: { ...prev.loading, crossChainOpportunities: true },
        error: { ...prev.error, crossChainOpportunities: null },
      }));

      try {
        // Build query parameters
        const params = new URLSearchParams();
        if (filters?.minApy) params.append("minApy", filters.minApy.toString());
        if (filters?.maxRisk) params.append("maxRisk", filters.maxRisk);
        if (filters?.categories)
          params.append("categories", filters.categories.join(","));
        if (filters?.chains) params.append("chains", filters.chains.join(","));
        if (filters?.minAmount)
          params.append("minAmount", filters.minAmount.toString());
        if (filters?.maxGasFees)
          params.append("maxGasFees", filters.maxGasFees.toString());

        const queryString = params.toString();
        const endpoint = `/api/dashboard/cross-chain-opportunities${queryString ? `?${queryString}` : ""}`;

        const data = await fetchData<CrossChainOpportunitiesData>(
          endpoint,
          "crossChainOpportunities"
        );

        setState((prev) => ({
          ...prev,
          crossChainOpportunities: data,
          loading: { ...prev.loading, crossChainOpportunities: false },
          lastFetch: { ...prev.lastFetch, crossChainOpportunities: new Date() },
        }));
        retryCountRef.current.crossChainOpportunities = 0;
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to fetch cross-chain opportunities data";

        setState((prev) => ({
          ...prev,
          loading: { ...prev.loading, crossChainOpportunities: false },
          error: { ...prev.error, crossChainOpportunities: errorMessage },
        }));

        // Retry logic
        if (retryCountRef.current.crossChainOpportunities < retryAttempts) {
          retryCountRef.current.crossChainOpportunities++;
          setTimeout(
            () => fetchCrossChainOpportunities(filters),
            2000 * retryCountRef.current.crossChainOpportunities
          );
        }
      }
    },
    [user, fetchData, retryAttempts]
  );

  // Fetch all data
  const fetchAllData = useCallback(() => {
    Promise.all([
      fetchPortfolio(),
      fetchIntents(),
      fetchTransactions(),
      fetchTokensChains(),
      fetchCrossChainOpportunities(),
    ]).catch(() => {
      // Silently handle errors - individual functions handle their own error states
    });
  }, [
    fetchPortfolio,
    fetchIntents,
    fetchTransactions,
    fetchTokensChains,
    fetchCrossChainOpportunities,
    user?.id,
  ]);

  // Retry specific data type
  const retry = useCallback(
    (dataType: keyof DashboardState["loading"]) => {
      retryCountRef.current[dataType] = 0;
      switch (dataType) {
        case "portfolio":
          fetchPortfolio();
          break;
        case "intents":
          fetchIntents();
          break;
        case "transactions":
          fetchTransactions();
          break;
        case "tokensChains":
          fetchTokensChains();
          break;
        case "crossChainOpportunities":
          fetchCrossChainOpportunities();
          break;
      }
    },
    [
      fetchPortfolio,
      fetchIntents,
      fetchTransactions,
      fetchTokensChains,
      fetchCrossChainOpportunities,
    ]
  );

  // Setup auto-refresh
  useEffect(() => {
    if (autoRefresh && user) {
      const setupRefresh = () => {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
        refreshTimeoutRef.current = setTimeout(() => {
          fetchAllData();
          setupRefresh();
        }, refreshInterval);
      };

      setupRefresh();

      return () => {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
      };
    }
  }, [autoRefresh, refreshInterval, user, fetchAllData]);

  // Initial data fetch
  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user, fetchAllData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  return {
    ...state,
    fetchAllData,
    fetchPortfolio,
    fetchIntents,
    fetchTransactions,
    fetchTokensChains,
    fetchCrossChainOpportunities,
    retry,
    isLoading:
      state.loading.portfolio ||
      state.loading.intents ||
      state.loading.transactions ||
      state.loading.tokensChains ||
      state.loading.crossChainOpportunities,
    hasError: !!(
      state.error.portfolio ||
      state.error.intents ||
      state.error.transactions ||
      state.error.tokensChains ||
      state.error.crossChainOpportunities
    ),
  };
}
