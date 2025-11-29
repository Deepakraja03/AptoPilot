import { fetchTokenPrices, getTokenPrice } from "./prices";

export interface TokenBalance {
  symbol: string;
  name: string;
  balance: number;
  balanceUSD: number;
  decimals: number;
  contractAddress?: string;
  logoUrl?: string;
  chain: string;
}

export interface ChainBalance {
  chain: string;
  nativeBalance: number;
  nativeBalanceUSD: number;
  tokens: TokenBalance[];
  totalBalanceUSD: number;
}

export interface WalletBalance {
  totalBalanceUSD: number;
  chains: ChainBalance[];
  lastUpdated: string;
}

export async function fetchSolanaBalance(
  address: string
): Promise<ChainBalance | null> {
  const heliusApiKey = process.env.NEXT_PUBLIC_HELIUS_API_KEY;

  if (!heliusApiKey) {
    console.warn("Helius API key not found");
    return null;
  }

  try {
    const solBalanceResponse = await fetch(
      `https://api.helius.xyz/v0/addresses/${address}/balances?api-key=${heliusApiKey}`
    );

    if (!solBalanceResponse.ok) {
      throw new Error(`Helius API error: ${solBalanceResponse.status}`);
    }

    const solBalanceData = await solBalanceResponse.json();

    const tokenResponse = await fetch(
      `https://api.helius.xyz/v0/addresses/${address}/tokens?api-key=${heliusApiKey}`
    );
    const tokenData = tokenResponse.ok
      ? await tokenResponse.json()
      : { tokens: [] };

    const tokens: TokenBalance[] = [];
    let totalBalanceUSD = 0;

    const solPrice = await getTokenPrice("SOL");
    if (solPrice === 0) {
      throw new Error("Unable to fetch SOL price - API unavailable");
    }

    const solBalance = solBalanceData.nativeBalance || 0;
    const solBalanceUSD = (solBalance / 1e9) * solPrice;

    tokens.push({
      symbol: "SOL",
      name: "Solana",
      balance: solBalance / 1e9,
      balanceUSD: solBalanceUSD,
      decimals: 9,
      chain: "solana",
      logoUrl:
        "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
    });

    totalBalanceUSD += solBalanceUSD;

    if (tokenData.tokens) {
      interface SolanaToken {
        symbol: string;
        name: string;
        amount: number;
        decimals: number;
        mint: string;
        logoURI?: string;
      }
      const tokenSymbols = (tokenData.tokens as SolanaToken[])
        .map((t) => t.symbol)
        .filter(Boolean);
      const tokenPrices = await fetchTokenPrices(tokenSymbols);

      for (const token of tokenData.tokens.slice(0, 10)) {
        const balance = token.amount / Math.pow(10, token.decimals);
        const tokenPrice = tokenPrices[token.symbol]?.price || 0;
        const balanceUSD = balance * tokenPrice;

        if (balanceUSD > 0.01) {
          tokens.push({
            symbol: token.symbol || "UNKNOWN",
            name: token.name || "Unknown Token",
            balance,
            balanceUSD,
            decimals: token.decimals,
            contractAddress: token.mint,
            chain: "solana",
            logoUrl: token.logoURI,
          });

          totalBalanceUSD += balanceUSD;
        }
      }
    }

    return {
      chain: "solana",
      nativeBalance: solBalance / 1e9,
      nativeBalanceUSD: solBalanceUSD,
      tokens,
      totalBalanceUSD,
    };
  } catch (error) {
    console.error("Error fetching Solana balance:", error);
    return null;
  }
}

export async function fetchEVMBalance(
  address: string,
  chainName: string = "eth-mainnet"
): Promise<ChainBalance | null> {
  const goldRushApiKey = process.env.NEXT_PUBLIC_GOLDRUSH_API_KEY;

  if (!goldRushApiKey) {
    console.warn("GoldRush API key not found");
    return null;
  }

  try {
    const response = await fetch(
      `https://api.covalenthq.com/v1/${chainName}/address/${address}/balances_v2/?key=${goldRushApiKey}`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`GoldRush API error: ${response.status}`);
    }

    const data = await response.json();

    if (!data.data || !data.data.items) {
      return null;
    }

    const tokens: TokenBalance[] = [];
    let totalBalanceUSD = 0;
    let nativeBalance = 0;
    let nativeBalanceUSD = 0;

    for (const item of data.data.items) {
      const balance =
        parseFloat(item.balance) / Math.pow(10, item.contract_decimals);
      const balanceUSD = parseFloat(item.quote || 0);

      if (balanceUSD > 0.01) {
        const token: TokenBalance = {
          symbol: item.contract_ticker_symbol,
          name: item.contract_name,
          balance,
          balanceUSD,
          decimals: item.contract_decimals,
          contractAddress: item.contract_address,
          chain: chainName,
          logoUrl: item.logo_url,
        };

        tokens.push(token);
        totalBalanceUSD += balanceUSD;

        if (item.native_token) {
          nativeBalance = balance;
          nativeBalanceUSD = balanceUSD;
        }
      }
    }

    return {
      chain: chainName,
      nativeBalance,
      nativeBalanceUSD,
      tokens,
      totalBalanceUSD,
    };
  } catch (error) {
    console.error(`Error fetching ${chainName} balance:`, error);
    return null;
  }
}

export async function fetchWalletBalance(walletInfo: {
  ethereumAddress?: string;
  solanaAddress?: string;
}): Promise<WalletBalance> {
  const chains: ChainBalance[] = [];
  let totalBalanceUSD = 0;

  if (walletInfo.solanaAddress) {
    const solanaBalance = await fetchSolanaBalance(walletInfo.solanaAddress);
    if (solanaBalance) {
      chains.push(solanaBalance);
      totalBalanceUSD += solanaBalance.totalBalanceUSD;
    }
  }

  if (walletInfo.ethereumAddress) {
    const ethBalance = await fetchEVMBalance(
      walletInfo.ethereumAddress,
      "eth-mainnet"
    );
    if (ethBalance) {
      chains.push(ethBalance);
      totalBalanceUSD += ethBalance.totalBalanceUSD;
    }

    const evmChains = [
      { name: "bsc-mainnet", display: "BSC" },
      { name: "matic-mainnet", display: "Polygon" },
      { name: "avalanche-mainnet", display: "Avalanche" },
      { name: "arbitrum-mainnet", display: "Arbitrum" },
      { name: "optimism-mainnet", display: "Optimism" },
      { name: "base-mainnet", display: "Base" },
    ];

    for (const chain of evmChains) {
      const chainBalance = await fetchEVMBalance(
        walletInfo.ethereumAddress,
        chain.name
      );
      if (chainBalance && chainBalance.totalBalanceUSD > 0.01) {
        chains.push(chainBalance);
        totalBalanceUSD += chainBalance.totalBalanceUSD;
      }
    }
  }

  return {
    totalBalanceUSD,
    chains,
    lastUpdated: new Date().toISOString(),
  };
}
