"use client";

import React, { useState, useEffect, useCallback, useRef, createContext, useContext } from "react";
import { useAuth } from "@/lib/auth";
import { goldRushService, type MultiChainWalletData, type SupportedChain } from "@/lib/goldrush";

interface WalletDataState {
  walletData: MultiChainWalletData | null;
  loading: boolean;
  error: string | null;
  lastFetch: Date | null;
}

interface WalletDataContextType extends WalletDataState {
  fetchWalletData: () => Promise<void>;
  refreshWalletData: () => Promise<void>;
  isLoading: boolean;
}

const WalletDataContext = createContext<WalletDataContextType | undefined>(undefined);

export function useSharedWalletData() {
  const context = useContext(WalletDataContext);
  if (!context) {
    throw new Error("useSharedWalletData must be used within a WalletDataProvider");
  }
  return context;
}

export function WalletDataProvider({ children }: { children: React.ReactNode }) {
  const { user, getWalletAccounts } = useAuth();
  const [state, setState] = useState<WalletDataState>({
    walletData: null,
    loading: false,
    error: null,
    lastFetch: null,
  });

  const retryCountRef = useRef(0);
  const maxRetries = 3;
  const cacheTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch wallet data with caching and deduplication
  const fetchWalletData = useCallback(async () => {
    if (!user?.wallets || user.wallets.length === 0) {
      setState({
        walletData: null,
        loading: false,
        error: null,
        lastFetch: null,
      });
      return;
    }

    // Prevent duplicate calls if already loading
    if (state.loading) {
      console.log("🔄 Wallet data fetch already in progress, skipping...");
      return;
    }

    // Check if we have recent data (within 2 minutes)
    if (state.walletData && state.lastFetch) {
      const timeSinceLastFetch = Date.now() - state.lastFetch.getTime();
      if (timeSinceLastFetch < 2 * 60 * 1000) { // 2 minutes
        console.log("🔄 Using cached wallet data");
        return;
      }
    }

    setState(prev => ({
      ...prev,
      loading: true,
      error: null,
    }));

    try {
      console.log("🔄 Fetching fresh wallet data...");

      // Get wallet addresses from user's wallets
      const addresses: Record<SupportedChain, string | null> = {
        ETHEREUM: null,
        BASE: null,
        BSC: null,
        SOLANA: null,
        POLYGON: null,
        ARBITRUM: null,
        OPTIMISM: null,
      };

      // Extract addresses from Turnkey wallets
      for (const wallet of user.wallets) {
        try {
          const response = await getWalletAccounts(wallet.walletId);
          if (response?.success && response?.accounts) {
            response.accounts.forEach((account: {
              address: string;
              addressFormat: string;
              path: string;
              publicKey: string;
            }) => {
              if (account.addressFormat === "ADDRESS_FORMAT_ETHEREUM") {
                const evmAddress = account.address;
                addresses.ETHEREUM = evmAddress;
                addresses.BASE = evmAddress;
                addresses.BSC = evmAddress;
                addresses.POLYGON = evmAddress;
                addresses.ARBITRUM = evmAddress;
                addresses.OPTIMISM = evmAddress;
              } else if (account.addressFormat === "ADDRESS_FORMAT_SOLANA") {
                addresses.SOLANA = account.address;
              }
            });
          }
        } catch (error) {
          console.error(`Failed to load wallet ${wallet.walletId}:`, error);
        }
      }

      // Fetch multi-chain wallet data from GoldRush
      const multiChainData = await goldRushService.getMultiChainWalletBalances(addresses);

      setState({
        walletData: multiChainData,
        loading: false,
        error: null,
        lastFetch: new Date(),
      });

      retryCountRef.current = 0;
      console.log("✅ Wallet data fetched successfully");
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Failed to fetch wallet data";
      console.error("❌ Failed to fetch wallet data:", error);

      setState(prev => ({
        ...prev,
        loading: false,
        error: errorMessage,
      }));

      // Retry logic
      if (retryCountRef.current < maxRetries) {
        retryCountRef.current++;
        const retryDelay = 2000 * retryCountRef.current;
        console.log(`🔄 Retrying wallet data fetch in ${retryDelay}ms (attempt ${retryCountRef.current}/${maxRetries})`);
        
        setTimeout(() => {
          fetchWalletData();
        }, retryDelay);
      }
    }
  }, [user, getWalletAccounts, state.loading, state.walletData, state.lastFetch]);

  // Force refresh (ignores cache)
  const refreshWalletData = useCallback(async () => {
    setState(prev => ({
      ...prev,
      walletData: null,
      lastFetch: null,
    }));
    await fetchWalletData();
  }, [fetchWalletData]);

  // Auto-fetch on user change
  useEffect(() => {
    if (user?.wallets) {
      fetchWalletData();
    }
  }, [user?.wallets, fetchWalletData]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (cacheTimeoutRef.current) {
        clearTimeout(cacheTimeoutRef.current);
      }
    };
  }, []);

  const contextValue: WalletDataContextType = {
    ...state,
    fetchWalletData,
    refreshWalletData,
    isLoading: state.loading,
  };

  return (
    <WalletDataContext.Provider value={contextValue}>
      {children}
    </WalletDataContext.Provider>
  );
}
