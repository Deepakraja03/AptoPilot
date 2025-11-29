export interface TokenPrice {
  symbol: string;
  price: number;
  change24h: number;
  lastUpdated: string;
}

export async function fetchTokenPrices(
  symbols: string[]
): Promise<Record<string, TokenPrice>> {
  try {
    const coinGeckoIds: Record<string, string> = {
      SOL: "solana",
      ETH: "ethereum",
      BTC: "bitcoin",
      USDC: "usd-coin",
      USDT: "tether",
      BNB: "binancecoin",
      MATIC: "matic-network",
      AVAX: "avalanche-2",
      UNI: "uniswap",
      LINK: "chainlink",
      ADA: "cardano",
      DOT: "polkadot",
    };

    const ids = symbols
      .map((symbol) => coinGeckoIds[symbol.toUpperCase()])
      .filter(Boolean);

    if (ids.length === 0) {
      return {};
    }

    const response = await fetch(
      `https://api.coingecko.com/api/v3/simple/price?ids=${ids.join(",")}&vs_currencies=usd&include_24hr_change=true`,
      {
        headers: {
          Accept: "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`CoinGecko API error: ${response.status}`);
    }

    const data = await response.json();
    const prices: Record<string, TokenPrice> = {};

    Object.entries(coinGeckoIds).forEach(([symbol, id]) => {
      if (data[id]) {
        prices[symbol] = {
          symbol,
          price: data[id].usd,
          change24h: data[id].usd_24h_change || 0,
          lastUpdated: new Date().toISOString(),
        };
      }
    });

    return prices;
  } catch (error) {
    console.error("Error fetching token prices:", error);
    return {};
  }
}

export async function getTokenPrice(symbol: string): Promise<number> {
  const prices = await fetchTokenPrices([symbol]);
  return prices[symbol.toUpperCase()]?.price || 0;
}

const FALLBACK_PRICES: Record<string, number> = {
  SOL: 0,
  ETH: 0,
  BTC: 0,
  USDC: 0,
  USDT: 0,
};

export function getFallbackPrice(symbol: string): number {
  return FALLBACK_PRICES[symbol.toUpperCase()] || 0;
}
