"use client";

import { useCallback, useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useAppDispatch, useAppSelector } from "@/lib/store/hooks";
import { 
  fetchUnifiedDashboardData,
  clearDashboardData
} from "@/lib/store/unifiedDashboardSlice";

interface UseUnifiedDashboardOptions {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

export function useUnifiedDashboard(options: UseUnifiedDashboardOptions = {}) {
  const { autoRefresh = false, refreshInterval = 60000 } = options;
  
  const dispatch = useAppDispatch();
  const { user, getWalletAccounts } = useAuth();
  
  // Get state from Redux
  const dashboardState = useAppSelector((state) => state.unifiedDashboard);
  
  const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<Date | null>(null);

  // Fetch all dashboard data in one call
  const refreshAllData = useCallback(async (forceWallets?: unknown[]) => {
    if (!user?.organizationId) return;
    
    const now = new Date();
    
    // Check cooldown (1 minute) - but allow override with forceWallets
    if (!forceWallets && lastRefreshRef.current && 
        now.getTime() - lastRefreshRef.current.getTime() < 60000) {
      console.log("Refresh on cooldown, skipping...");
      return;
    }
    
    lastRefreshRef.current = now;
    
    try {
      const walletsToUse = forceWallets || user.wallets || [];
      console.log("Refreshing unified dashboard with wallets:", walletsToUse);
      await dispatch(fetchUnifiedDashboardData({
        organizationId: user.organizationId,
        wallets: walletsToUse,
        getWalletAccounts
      })).unwrap();
    } catch (error) {
      console.error("Failed to fetch unified dashboard data:", error);
    }
  }, [dispatch, user?.organizationId, user?.wallets, getWalletAccounts]);

  // Clear all data (useful for logout)
  const clearAllData = useCallback(() => {
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
      const shouldFetch = !dashboardState.lastFetch ||
        (new Date().getTime() - new Date(dashboardState.lastFetch).getTime()) > 300000; // 5 minutes

      if (shouldFetch) {
        refreshAllData();
      }
    }
  }, [user?.organizationId, refreshAllData]);

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

  // Calculate if we can refresh (not on cooldown)
  const canRefresh = !lastRefreshRef.current || 
    (new Date().getTime() - lastRefreshRef.current.getTime()) >= 60000;

  const refreshCooldown = lastRefreshRef.current ? 
    Math.max(0, 60 - Math.floor((new Date().getTime() - lastRefreshRef.current.getTime()) / 1000)) : 0;

  // Enhanced loading states
  const isInitialLoading = dashboardState.loading && !dashboardState.lastFetch;
  const isRefreshing = dashboardState.loading && !!dashboardState.lastFetch;

  return {
    // State
    dashboardData: dashboardState,
    isLoading: dashboardState.loading,
    isInitialLoading,
    isRefreshing,
    error: dashboardState.error,
    canRefresh,
    refreshCooldown,
    
    // Actions
    refreshAllData,
    clearAllData,
    
    // Individual data sections for backward compatibility
    walletData: dashboardState.walletData,
    portfolio: dashboardState.portfolio,
    intents: dashboardState.intents,
    transactions: dashboardState.transactions,
    tokensChains: dashboardState.tokensChains,
    crossChainOpportunities: dashboardState.crossChainOpportunities,
    
    // Legacy compatibility for existing components
    loading: {
      portfolio: dashboardState.loading,
      intents: dashboardState.loading,
      transactions: dashboardState.loading,
      tokensChains: dashboardState.loading,
      crossChainOpportunities: dashboardState.loading,
    },
    lastFetch: {
      portfolio: dashboardState.lastFetch,
      intents: dashboardState.lastFetch,
      transactions: dashboardState.lastFetch,
      tokensChains: dashboardState.lastFetch,
      crossChainOpportunities: dashboardState.lastFetch,
    },
  };
}