import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";

// Types for the unified dashboard data
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

export interface TokenData {
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
  tokens: TokenData[];
}

export interface TokensChainsData {
  chains: ChainData[];
}

export interface IntentData {
  id: string;
  type: string;
  status: "automated" | "pending" | "completed";
  createdAt: string;
  description: string;
}

export interface IntentsData {
  totalCount: number;
  automated: number;
  pendingApproval: number;
  intents: IntentData[];
}

export interface TransactionData {
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
}

export interface TransactionsData {
  transactions: TransactionData[];
}

export interface OpportunityData {
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
}

export interface CrossChainOpportunitiesData {
  opportunities: OpportunityData[];
  totalCount: number;
  generatedAt: string;
}

// Wallet balance types for header
export interface WalletBalance {
  balance: number;
  address: string;
  exists: boolean;
  usdValue: number;
}

// Unified dashboard state
export interface UnifiedDashboardState {
  // Portfolio data (used by header and portfolio overview)
  portfolio: PortfolioData | null;
  
  // Detailed tokens and chains data
  tokensChains: TokensChainsData | null;
  
  // Other dashboard sections
  intents: IntentsData | null;
  transactions: TransactionsData | null;
  crossChainOpportunities: CrossChainOpportunitiesData | null;
  
  // Wallet data for header (derived from portfolio data)
  walletData: {
    totalValue: number;
    totalValueChange24h: number;
    eth: WalletBalance;
    sol: WalletBalance;
    sui: WalletBalance;
    aptos: WalletBalance;
    lastUpdated: string;
    multiChainData: unknown; // Keep for backward compatibility
  };
  
  // Loading and error states
  loading: boolean;
  error: string | null;
  lastFetch: string | null;
}

const initialState: UnifiedDashboardState = {
  portfolio: null,
  tokensChains: null,
  intents: null,
  transactions: null,
  crossChainOpportunities: null,
  walletData: {
    totalValue: 0,
    totalValueChange24h: 0,
    eth: { balance: 0, address: "", exists: false, usdValue: 0 },
    sol: { balance: 0, address: "", exists: false, usdValue: 0 },
    sui: { balance: 0, address: "", exists: false, usdValue: 0 },
    aptos: { balance: 0, address: "", exists: false, usdValue: 0 },
    lastUpdated: "",
    multiChainData: null,
  },
  loading: false,
  error: null,
  lastFetch: null,
};

// Async thunk for fetching all dashboard data in one call
export const fetchUnifiedDashboardData = createAsyncThunk(
  "unifiedDashboard/fetchAllData",
  async (params: {
    organizationId: string;
    wallets?: unknown[];
    getWalletAccounts?: (walletId: string) => Promise<unknown>;
  }) => {
    const { organizationId, wallets, getWalletAccounts } = params;

    // Fetch all dashboard data from the unified API
    const response = await fetch("/api/dashboard/unified", {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-organization-id": organizationId,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.error || `HTTP ${response.status}: ${response.statusText}`
      );
    }

    const unifiedData = await response.json();

    // Extract wallet addresses for header display (if wallets are provided)
    let ethWallet = { balance: 0, address: "", exists: false, usdValue: 0 };
    let solWallet = { balance: 0, address: "", exists: false, usdValue: 0 };
    let suiWallet = { balance: 0, address: "", exists: false, usdValue: 0 };
    let aptosWallet = { balance: 0, address: "", exists: false, usdValue: 0 };

    if (wallets && getWalletAccounts && Array.isArray(wallets) && wallets.length > 0) {
      console.log("Processing wallets for unified dashboard:", wallets);
      // Get addresses from Turnkey wallets for display purposes
      for (const wallet of wallets) {
        const w = wallet as { walletId: string };
        console.log("Processing wallet:", w);
        try {
          const response = await getWalletAccounts(w.walletId) as {
            success?: boolean;
            accounts?: unknown[]
          };

          if (response?.success && response?.accounts && Array.isArray(response.accounts)) {
            console.log(`Processing accounts for wallet ${w.walletId}:`, response.accounts);
            response.accounts.forEach((account: unknown) => {
              const acc = account as { addressFormat: string; address: string };
              console.log(`Account found:`, acc);
              if (acc.addressFormat === "ADDRESS_FORMAT_ETHEREUM") {
                ethWallet = {
                  balance: 0, // Will be calculated from portfolio data
                  address: acc.address,
                  exists: true,
                  usdValue: 0, // Will be calculated from portfolio data
                };
                console.log(`ETH wallet set:`, ethWallet);
              } else if (acc.addressFormat === "ADDRESS_FORMAT_SOLANA") {
                solWallet = {
                  balance: 0, // Will be calculated from portfolio data
                  address: acc.address,
                  exists: true,
                  usdValue: 0, // Will be calculated from portfolio data
                };
                console.log(`SOL wallet set:`, solWallet);
              } else if (acc.addressFormat === "ADDRESS_FORMAT_SUI") {
                suiWallet = {
                  balance: 0,
                  address: acc.address,
                  exists: true,
                  usdValue: 0,
                };
                console.log(`SUI wallet set:`, suiWallet);
              } else if (acc.addressFormat === "ADDRESS_FORMAT_APTOS") {
                aptosWallet = {
                  balance: 0,
                  address: acc.address,
                  exists: true,
                  usdValue: 0,
                };
                console.log(`APTOS wallet set:`, aptosWallet);
              }
            });
          } else {
            console.log(`No valid accounts found for wallet ${w.walletId}:`, response);
          }
        } catch (error) {
          console.error(`Failed to load wallet ${w.walletId}:`, error);
        }
      }
    } else {
      console.log("No wallets provided to unified dashboard or wallets array is empty:", wallets);
    }
    
    console.log("Final wallet states before return:", { ethWallet, solWallet, suiWallet });

    // Calculate wallet balances from portfolio and tokens data
    if (unifiedData.portfolio && unifiedData.tokensChains) {
      // Calculate EVM total from active chains
      const evmChains = ["Ethereum", "Base", "BNB Smart Chain", "Polygon", "Arbitrum", "Optimism"];
      let evmTotalValue = 0;
      let evmNativeBalance = 0;

      evmChains.forEach((chainName) => {
        const chainData = unifiedData.tokensChains.chains.find((c: ChainData) => c.name === chainName);
        if (chainData) {
          evmTotalValue += chainData.totalValue;
          
          // Find native token balance
          const nativeToken = chainData.tokens.find((token: TokenData) => {
            const symbol = token.symbol.toLowerCase();
            return symbol === "eth" || symbol === "bnb" || symbol === "matic" || 
                   symbol === "op" || symbol === "arb";
          });
          
          if (nativeToken && chainName === "Ethereum") {
            evmNativeBalance += nativeToken.balance;
          }
        }
      });

      // Update ETH wallet
      if (ethWallet.exists) {
        ethWallet.balance = evmNativeBalance;
        ethWallet.usdValue = evmTotalValue;
      }

      // Update Solana wallet
      const solanaChain = unifiedData.tokensChains.chains.find((c: ChainData) => c.name === "Solana");
      if (solanaChain && solWallet.exists) {
        const solToken = solanaChain.tokens.find((token: TokenData) => token.symbol === "SOL");
        if (solToken) {
          solWallet.balance = solToken.balance;
          solWallet.usdValue = solToken.value;
        }
      }

      // Update Aptos wallet
      const aptosChain = unifiedData.tokensChains.chains.find((c: ChainData) => c.name === "Aptos");
      if (aptosChain && aptosWallet.exists) {
        const aptToken = aptosChain.tokens.find((token: TokenData) => token.symbol === "APT");
        if (aptToken) {
          aptosWallet.balance = aptToken.balance;
        }
        aptosWallet.usdValue = aptosChain.totalValue;
      }
    }

    return {
      ...unifiedData,
      walletData: {
        totalValue: unifiedData.portfolio?.totalValue || 0,
        totalValueChange24h: unifiedData.portfolio?.totalValueChange24h || 0,
        eth: ethWallet,
        sol: solWallet,
        sui: suiWallet,
        aptos: aptosWallet,
        lastUpdated: unifiedData.portfolio?.lastUpdated || new Date().toISOString(),
        multiChainData: unifiedData.tokensChains, // For backward compatibility
      },
    };
  }
);

const unifiedDashboardSlice = createSlice({
  name: "unifiedDashboard",
  initialState,
  reducers: {
    clearDashboardData: () => {
      return { ...initialState };
    },
    setDashboardError: (state, action: PayloadAction<string>) => {
      state.error = action.payload;
      state.loading = false;
    },
    clearDashboardError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUnifiedDashboardData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUnifiedDashboardData.fulfilled, (state, action) => {
        state.loading = false;
        state.error = null;
        state.portfolio = action.payload.portfolio;
        state.tokensChains = action.payload.tokensChains;
        state.intents = action.payload.intents;
        state.transactions = action.payload.transactions;
        state.crossChainOpportunities = action.payload.crossChainOpportunities;
        state.walletData = action.payload.walletData;
        state.lastFetch = new Date().toISOString();
      })
      .addCase(fetchUnifiedDashboardData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || "Failed to fetch dashboard data";
      });
  },
});

export const { 
  clearDashboardData, 
  setDashboardError, 
  clearDashboardError 
} = unifiedDashboardSlice.actions;

export default unifiedDashboardSlice.reducer;