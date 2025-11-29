import { RootState } from "./store";

export const selectUser = (state: RootState) => state.auth.user;
export const selectIsAuthenticated = (state: RootState) => !!state.auth.user;
export const selectAuthLoading = (state: RootState) => state.auth.isLoading;
export const selectAuthError = (state: RootState) => state.auth.error;

export const getChainIdFromName = (chainName: string): string => {
  const chainMap: Record<string, string> = {
    "eth-mainnet": "1",
    ethereum: "1",
    "ethereum-mainnet": "1",
    mainnet: "1",

    "base-mainnet": "8453",
    base: "8453",
    "base-mainnet-beta": "8453",

    "bsc-mainnet": "56",
    bsc: "56",
    binance: "56",
    "binance-smart-chain": "56",
    "binance-smart-chain-mainnet": "56",

    "solana-mainnet": "solana",
    solana: "solana",
    "mainnet-beta": "solana",
  };

  const normalizedName = chainName.toLowerCase().replace(/[^a-z0-9]/g, "");

  if (chainMap[chainName.toLowerCase()]) {
    return chainMap[chainName.toLowerCase()];
  }

  for (const [key, value] of Object.entries(chainMap)) {
    if (key.replace(/[^a-z0-9]/g, "") === normalizedName) {
      return value;
    }
  }
  return chainName;
};
