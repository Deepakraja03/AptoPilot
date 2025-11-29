export interface TokenBalance {
  symbol: string;
  balance: number;
  balanceUSD: number;
  percentage: number;
  chain: string;
  contractAddress?: string;
}

export interface ChainBalance {
  balance: number;
  percentage: number;
  tokens: TokenBalance[];
}

export interface PortfolioData {
  totalBalance: number;
  totalBalanceUSD: number;
  tokens: TokenBalance[];
  chains: Record<string, ChainBalance>;
  recommendations: {
    type: string;
    message: string;
    priority: "high" | "medium" | "low";
  }[];
}

export const SUPPORTED_CHAINS = {
  ethereum: {
    name: "Ethereum",
    symbol: "ETH",
    rpc: "https://eth.llamarpc.com",
  },
  bsc: { name: "BSC", symbol: "BNB", rpc: "https://bsc-dataseed.binance.org" },
  polygon: { name: "Polygon", symbol: "MATIC", rpc: "https://polygon-rpc.com" },
  avalanche: {
    name: "Avalanche",
    symbol: "AVAX",
    rpc: "https://api.avax.network/ext/bc/C/rpc",
  },
  arbitrum: {
    name: "Arbitrum",
    symbol: "ETH",
    rpc: "https://arb1.arbitrum.io/rpc",
  },
  optimism: {
    name: "Optimism",
    symbol: "ETH",
    rpc: "https://mainnet.optimism.io",
  },
  base: { name: "Base", symbol: "ETH", rpc: "https://mainnet.base.org" },
  solana: {
    name: "Solana",
    symbol: "SOL",
    rpc: "https://api.mainnet-beta.solana.com",
  },
};

export function formatBalance(balance: number, decimals: number = 6): string {
  if (balance === 0) return "0";
  if (balance < 0.000001) return "<0.000001";
  return balance.toFixed(decimals);
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
