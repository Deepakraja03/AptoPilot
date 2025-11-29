import { createSlice, createAsyncThunk, PayloadAction } from "@reduxjs/toolkit";
import { goldRushService, type SupportedChain, type MultiChainWalletData } from "@/lib/goldrush";

// Types
export interface WalletBalance {
    balance: number;
    address: string;
    exists: boolean;
    usdValue: number;
}

export interface WalletState {
    totalValue: number;
    totalValueChange24h: number;
    eth: WalletBalance;
    sol: WalletBalance;
    sui: WalletBalance;
    lastUpdated: string;
    multiChainData: MultiChainWalletData | null;
    loading: boolean;
    error: string | null;
}

const initialState: WalletState = {
    totalValue: 0,
    totalValueChange24h: 0,
    eth: { balance: 0, address: "", exists: false, usdValue: 0 },
    sol: { balance: 0, address: "", exists: false, usdValue: 0 },
    sui: { balance: 0, address: "", exists: false, usdValue: 0 },
    lastUpdated: "",
    multiChainData: null,
    loading: false,
    error: null,
};

// Async thunk for fetching wallet data - now uses the same API as portfolio
export const fetchWalletData = createAsyncThunk(
    "wallet/fetchWalletData",
    async (params: {
        wallets: unknown[],
        getWalletAccounts: (walletId: string) => Promise<unknown>,
        organizationId: string
    }) => {
        const { wallets, getWalletAccounts, organizationId } = params;

        if (!wallets || wallets.length === 0) {
            return initialState;
        }

        // Get addresses from Turnkey wallets for display purposes
        let ethWallet = { balance: 0, address: "", exists: false, usdValue: 0 };
        let solWallet = { balance: 0, address: "", exists: false, usdValue: 0 };
        let suiWallet = { balance: 0, address: "", exists: false, usdValue: 0 };

        // Get addresses from Turnkey wallets
        for (const wallet of wallets) {
            const w = wallet as { walletId: string };
            try {
                const response = await getWalletAccounts(w.walletId) as {
                    success?: boolean;
                    accounts?: unknown[]
                };

                if (response?.success && response?.accounts && Array.isArray(response.accounts)) {
                    response.accounts.forEach((account: unknown) => {
                        const acc = account as { addressFormat: string; address: string };
                        if (acc.addressFormat === "ADDRESS_FORMAT_ETHEREUM") {
                            ethWallet = {
                                balance: 0, // Will be updated from API
                                address: acc.address,
                                exists: true,
                                usdValue: 0, // Will be updated from API
                            };
                        } else if (acc.addressFormat === "ADDRESS_FORMAT_SOLANA") {
                            solWallet = {
                                balance: 0, // Will be updated from API
                                address: acc.address,
                                exists: true,
                                usdValue: 0, // Will be updated from API
                            };
                        } else if (acc.addressFormat === "ADDRESS_FORMAT_SUI") {
                            suiWallet = {
                                balance: 0,
                                address: acc.address,
                                exists: true,
                                usdValue: 0,
                            };
                        }
                    });
                }
            } catch (error) {
                console.error(`Failed to load wallet ${w.walletId}:`, error);
            }
        }

        // Fetch portfolio data from the same API endpoint that dashboard uses
        // This ensures consistent data between header and dashboard
        const response = await fetch("/api/dashboard/portfolio", {
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

        const portfolioData = await response.json();

        // Also fetch the underlying multichain data for detailed token info
        // We'll use the force refresh method to ensure fresh data
        const addresses: Record<SupportedChain, string | null> = {
            ETHEREUM: ethWallet.exists ? ethWallet.address : null,
            BASE: ethWallet.exists ? ethWallet.address : null,
            BSC: ethWallet.exists ? ethWallet.address : null,
            SOLANA: solWallet.exists ? solWallet.address : null,
            POLYGON: ethWallet.exists ? ethWallet.address : null,
            ARBITRUM: ethWallet.exists ? ethWallet.address : null,
            OPTIMISM: ethWallet.exists ? ethWallet.address : null,
        };

        const multiChainData = await goldRushService.forceRefreshMultiChainWalletBalances(addresses);

        // Calculate EVM total from multichain data
        let evmTotalValue = 0;
        let evmNativeBalance = 0;
        const evmChains: SupportedChain[] = [
            "ETHEREUM",
            "BASE",
            "BSC",
            "POLYGON",
            "ARBITRUM",
            "OPTIMISM",
        ];

        evmChains.forEach((chain) => {
            const chainData = multiChainData.chains[chain];
            if (chainData) {
                evmTotalValue += chainData.totalValue;

                const nativeToken = chainData.tokenBalances.find((token) => {
                    const symbol = token.symbol.toLowerCase();
                    return (
                        symbol === "eth" ||
                        symbol === "bnb" ||
                        symbol === "matic" ||
                        symbol === "op" ||
                        symbol === "arb" ||
                        token.mint === "ETH"
                    );
                });

                if (nativeToken && chain === "ETHEREUM") {
                    evmNativeBalance += nativeToken.uiAmount;
                }
            }
        });

        // Update wallet balances with calculated values
        if (ethWallet.exists) {
            ethWallet.balance = evmNativeBalance;
            ethWallet.usdValue = evmTotalValue;
        }

        // Update Solana wallet
        if (multiChainData.chains.SOLANA) {
            const solData = multiChainData.chains.SOLANA;
            const solToken = solData.tokenBalances.find(
                (token) =>
                    token.symbol === "SOL" ||
                    token.mint === "So11111111111111111111111111111111111111112"
            );
            solWallet.balance = solToken?.uiAmount || 0;
            solWallet.usdValue = solToken?.value || 0;
        }

        return {
            totalValue: portfolioData.totalValue,
            totalValueChange24h: portfolioData.totalValueChange24h,
            eth: ethWallet,
            sol: solWallet,
            sui: suiWallet,
            lastUpdated: portfolioData.lastUpdated,
            multiChainData,
        };
    }
);

const walletSlice = createSlice({
    name: "wallet",
    initialState,
    reducers: {
        clearWalletData: () => {
            return { ...initialState };
        },
        setWalletError: (state, action: PayloadAction<string>) => {
            state.error = action.payload;
            state.loading = false;
        },
    },
    extraReducers: (builder) => {
        builder
            .addCase(fetchWalletData.pending, (state) => {
                state.loading = true;
                state.error = null;
            })
            .addCase(fetchWalletData.fulfilled, (state, action) => {
                state.loading = false;
                state.error = null;
                Object.assign(state, action.payload);
            })
            .addCase(fetchWalletData.rejected, (state, action) => {
                state.loading = false;
                state.error = action.error.message || "Failed to fetch wallet data";
            });
    },
});

export const { clearWalletData, setWalletError } = walletSlice.actions;
export default walletSlice.reducer;