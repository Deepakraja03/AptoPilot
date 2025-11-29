"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { 
  fetchWalletData, 
  clearWalletData 
} from "@/lib/store/walletSlice";
import { 
  fetchAllDashboardData,
  fetchPortfolioData,
  fetchIntentsData,
  fetchTransactionsData,
  fetchTokensChainsData,
  fetchCrossChainOpportunitiesData,
  clearDashboardData,
  DashboardState
} from "@/lib/store/dashboardSlice";
import { OpportunityFilters } from "@/lib/services/cross-chain-opportunities-service";

interface UseReduxDashboardOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useReduxDashboard(options: UseReduxDashboardOptions = {}) {
  const { autoRefresh = false, refreshInterval = 60000 } = options;
  
  const dispatch = useAppDispatch();
  const { user, getWalletAccounts } = useAuth();
  
  // Get state from Redux (legacy - this hook is deprecated)
  const unifiedState = useAppSelector((state) => state.unifiedDashboard);
  const walletState = unifiedState.walletData;
  const dashboardState = unifiedState;
  
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<Date | null>(null);

  // Fetch wallet data
  const refreshWalletData = useCallback(async () => {
    if (!user?.wallets || !getWalletAccounts || !user?.organizationId) return;
    
    try {
      await dispatch(fetchWalletData({ 
        wallets: user.wallets, 
        getWalletAccounts,
        organizationId: user.organizationId
      })).unwrap();
    } catch (error) {
      console.error("Failed to fetch wallet data:", error);
    }
  }, [dispatch, user?.wallets, getWalletAccounts, user?.organizationId]);

  // Fetch dashboard data
  const refreshDashboardData = useCallback(async () => {
    if (!user?.organizationId) return;
    
    try {
      await dispatch(fetchAllDashboardData(user.organizationId)).unwrap();
    } catch (error) {
      console.error("Failed to fetch dashboard data:", error);
    }
  }, [dispatch, user?.organizationId]);

  // Fetch specific dashboard data types
  const refreshPortfolio = useCallback(async () => {
    if (!user?.organizationId) return;
    await dispatch(fetchPortfolioData(user.organizationId));
  }, [dispatch, user?.organizationId]);

  const refreshIntents = useCallback(async () => {
    if (!user?.organizationId) return;
    await dispatch(fetchIntentsData(user.organizationId));
  }, [dispatch, user?.organizationId]);

  const refreshTransactions = useCallback(async (limit = 5) => {
    if (!user?.organizationId) return;
    await dispatch(fetchTransactionsData({ organizationId: user.organizationId, limit }));
  }, [dispatch, user?.organizationId]);

  const refreshTokensChains = useCallback(async () => {
    if (!user?.organizationId) return;
    await dispatch(fetchTokensChainsData(user.organizationId));
  }, [dispatch, user?.organizationId]);

  const refreshCrossChainOpportunities = useCallback(async (filters?: OpportunityFilters) => {
    if (!user?.organizationId) return;
    await dispatch(fetchCrossChainOpportunitiesData({ 
      organizationId: user.organizationId, 
      filters 
    }));
  }, [dispatch, user?.organizationId]);

  // Refresh all data
  const refreshAllData = useCallback(async () => {
    const now = new Date();
    
    // Check cooldown (1 minute)
    if (lastRefreshRef.current && 
        now.getTime() - lastRefreshRef.current.getTime() < 60000) {
      console.log("Refresh on cooldown, skipping...");
      return;
    }
    
    lastRefreshRef.current = now;
    
    await Promise.all([
      refreshWalletData(),
      refreshDashboardData(),
    ]);
  }, [refreshWalletData, refreshDashboardData]);

  // Retry specific data type
  const retryDataType = useCallback((dataType: keyof DashboardState["loading"]) => {
    switch (dataType) {
      case "portfolio":
        refreshPortfolio();
        break;
      case "intents":
        refreshIntents();
        break;
      case "transactions":
        refreshTransactions();
        break;
      case "tokensChains":
        refreshTokensChains();
        break;
      case "crossChainOpportunities":
        refreshCrossChainOpportunities();
        break;
    }
  }, [
    refreshPortfolio,
    refreshIntents,
    refreshTransactions,
    refreshTokensChains,
    refreshCrossChainOpportunities,
  ]);

  // Clear all data (useful for logout)
  const clearAllData = useCallback(() => {
    dispatch(clearWalletData());
    dispatch(clearDashboardData());
  }, [dispatch]);

  // Auto-refresh setup
  useEffect(() => {
    if (autoRefresh && user) {
      const setupRefresh = () => {
        if (refreshTimeoutRef.current) {
          clearTimeout(refreshTimeoutRef.current);
        }
        refreshTimeoutRef.current = setTimeout(() => {
          refreshAllData();
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
  }, [autoRefresh, refreshInterval, user, refreshAllData]);

  // Initial data fetch
  useEffect(() => {
    if (user && user.organizationId) {
      // Only fetch if we don't have recent data
      const shouldFetch = !walletState.lastUpdated || 
        !dashboardState.lastFetch ||
        (new Date().getTime() - new Date(walletState.lastUpdated).getTime()) > 300000; // 5 minutes

      if (shouldFetch) {
        refreshAllData();
      }
    }
  }, [user?.organizationId, refreshAllData]); // Include refreshAllData but it's memoized

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current);
      }
    };
  }, []);

  // Clear data when user logs out
  useEffect(() => {
    if (!user) {
      clearAllData();
    }
  }, [user, clearAllData]);

  // Calculate combined loading state
  const isLoading = dashboardState.loading;

  // Calculate if we can refresh (not on cooldown)
  const canRefresh = !lastRefreshRef.current || 
    (new Date().getTime() - lastRefreshRef.current.getTime()) >= 60000;

  const refreshCooldown = lastRefreshRef.current ? 
    Math.max(0, 60 - Math.floor((new Date().getTime() - lastRefreshRef.current.getTime()) / 1000)) : 0;

  return {
    // State
    walletData: walletState,
    dashboardData: dashboardState,
    isLoading,
    canRefresh,
    refreshCooldown,
    
    // Actions
    refreshAllData,
    refreshWalletData,
    refreshDashboardData,
    refreshPortfolio,
    refreshIntents,
    refreshTransactions,
    refreshTokensChains,
    refreshCrossChainOpportunities,
    retryDataType,
    clearAllData,
    
    // Computed values for backward compatibility
    portfolio: dashboardState.portfolio,
    intents: dashboardState.intents,
    transactions: dashboardState.transactions,
    tokensChains: dashboardState.tokensChains,
    crossChainOpportunities: dashboardState.crossChainOpportunities,
    loading: dashboardState.loading,
    error: dashboardState.error,
    lastFetch: dashboardState.lastFetch,
  };
}