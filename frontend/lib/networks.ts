export interface Network {
  id: string;
  name: string;
  chainId?: number;
  explorerUrl: string;
  logo: string;
  walletType: "ethereum" | "solana";
}

export const ETHEREUM_NETWORKS: Network[] = [
  {
    id: "ethereum",
    name: "Ethereum Mainnet",
    chainId: 1,
    explorerUrl: "https://etherscan.io",
    logo: "/Header/eth.svg",
    walletType: "ethereum",
  },
  {
    id: "base",
    name: "Base Mainnet",
    chainId: 8453,
    explorerUrl: "https://basescan.org",
    logo: "/Header/base.png",
    walletType: "ethereum",
  },
  {
    id: "bsc",
    name: "BSC Mainnet",
    chainId: 56,
    explorerUrl: "https://bscscan.com",
    logo: "/Header/bsc.png",
    walletType: "ethereum",
  },
];

export const SOLANA_NETWORKS: Network[] = [
  {
    id: "solana",
    name: "Solana Mainnet",
    explorerUrl: "https://solscan.io",
    logo: "/Header/solana.png",
    walletType: "solana",
  },
];

export const ALL_NETWORKS = [...ETHEREUM_NETWORKS, ...SOLANA_NETWORKS];

export const getNetworksByWalletType = (
  walletType: "ethereum" | "solana"
): Network[] => {
  return walletType === "ethereum" ? ETHEREUM_NETWORKS : SOLANA_NETWORKS;
};

export const getDefaultNetwork = (
  walletType: "ethereum" | "solana"
): Network => {
  return walletType === "ethereum" ? ETHEREUM_NETWORKS[0] : SOLANA_NETWORKS[0];
};

export const getNetworkById = (id: string): Network | undefined => {
  return ALL_NETWORKS.find((network) => network.id === id);
};

export const getExplorerUrl = (address: string, network: Network): string => {
  if (network.walletType === "solana") {
    return `${network.explorerUrl}/account/${address}`;
  }
  return `${network.explorerUrl}/address/${address}`;
};
