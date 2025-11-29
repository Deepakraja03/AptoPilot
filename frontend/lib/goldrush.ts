/* eslint-disable @typescript-eslint/no-explicit-any */
import { Connection, PublicKey } from "@solana/web3.js";

// Use server-side environment variables for API keys (more secure)
const GOLDRUSH_API_KEY =
  process.env.GOLDRUSH_API_KEY || process.env.NEXT_PUBLIC_GOLDRUSH_API_KEY;
const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;

// Chain ID mappings for GoldRush API
export const CHAIN_IDS = {
  ETHEREUM: 1,
  BASE: 8453,
  BSC: 56,
  SOLANA: 1399811149,
  POLYGON: 137,
  ARBITRUM: 42161,
  OPTIMISM: 10,
} as const;

export type SupportedChain = keyof typeof CHAIN_IDS;

export interface GoldRushTokenBalance {
  contract_decimals: number;
  contract_name: string;
  contract_ticker_symbol: string;
  contract_address: string;
  supports_erc: string[] | null;
  logo_url: string;
  balance: string;
  balance_24h: string;
  quote_rate: number;
  quote_rate_24h: number;
  quote: number;
  quote_24h: number;
  nft_data: any[] | null;
  native_token?: boolean;
}

export interface GoldRushWalletBalance {
  address: string;
  updated_at: string;
  next_update_at: string;
  quote_currency: string;
  chain_id: number;
  chain_name: string;
  items: GoldRushTokenBalance[];
  pagination: {
    has_more: boolean;
    page_number: number;
    page_size: number;
    total_count: number;
  };
}

export interface GoldRushResponse {
  data: GoldRushWalletBalance;
  error: boolean;
  error_message: string | null;
  error_code: number | null;
}

export interface ProcessedTokenBalance {
  mint: string;
  symbol: string;
  name: string;
  balance: number;
  uiAmount: number;
  decimals: number;
  price: number;
  priceChange24h: number;
  value: number;
  valueChange24h: number;
  logoUrl: string;
}

export interface GoldRushTransaction {
  block_signed_at: string;
  block_height: number;
  tx_hash: string;
  tx_offset: number;
  successful: boolean;
  from_address: string;
  from_address_label: string | null;
  to_address: string;
  to_address_label: string | null;
  value: string;
  value_quote: number;
  gas_offered: number;
  gas_spent: number;
  gas_price: number;
  fees_paid: string;
  gas_quote: number;
  gas_quote_rate: number;
  log_events: any[];
}

export interface GoldRushTransactionsResponse {
  address: string;
  updated_at: string;
  next_update_at: string;
  quote_currency: string;
  chain_id: number;
  chain_name: string;
  items: GoldRushTransaction[];
  pagination: {
    has_more: boolean;
    page_number: number;
    page_size: number;
    total_count: number;
  };
}

export interface ProcessedTransaction {
  hash: string;
  timestamp: string;
  blockHeight: number;
  successful: boolean;
  fromAddress: string;
  toAddress: string;
  value: number;
  valueUSD: number;
  gasUsed: number;
  gasFee: number;
  gasFeeUSD: number;
  type: "sent" | "received" | "swap" | "unknown";
  description: string;
  // Primary token involved in the transaction
  primaryToken?: string;
  // Additional fields for swap transactions
  fromToken?: string;
  toToken?: string;
  fromAmount?: number;
  toAmount?: number;
}

export interface ProcessedWalletData {
  address: string;
  chain: SupportedChain;
  totalValue: number;
  totalValueChange24h: number;
  tokenBalances: ProcessedTokenBalance[];
  recentTransactions: ProcessedTransaction[];
  lastUpdated: string;
}

export interface MultiChainWalletData {
  totalValue: number;
  totalValueChange24h: number;
  chains: Record<SupportedChain, ProcessedWalletData | null>;
  lastUpdated: string;
}

class GoldRushService {
  private static instance: GoldRushService;
  private readonly baseUrl = "https://api.covalenthq.com/v1";
  private readonly apiKey = GOLDRUSH_API_KEY;
  private readonly heliusapiKey = HELIUS_API_KEY;
  private cache: Map<string, { data: ProcessedWalletData; timestamp: number }> =
    new Map();
  private readonly cacheTimeout = 5 * 60 * 1000; // 5 minutes
  private readonly maxRetries = 3;
  private readonly retryDelay = 1000; // 1 second

  private constructor() {
    // Initialize service silently
  }

  /**
   * Sleep utility for retries
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Fetch with retry logic
   */
  private async fetchWithRetry(
    url: string,
    options: RequestInit,
    retries = this.maxRetries
  ): Promise<Response> {
    try {
      const response = await fetch(url, options);

      // If rate limited, wait and retry
      if (response.status === 429 && retries > 0) {
        await this.sleep(this.retryDelay);
        return this.fetchWithRetry(url, options, retries - 1);
      }

      return response;
    } catch (error) {
      if (retries > 0) {
        await this.sleep(this.retryDelay);
        return this.fetchWithRetry(url, options, retries - 1);
      }
      throw error;
    }
  }

  public static getInstance(): GoldRushService {
    if (!GoldRushService.instance) {
      GoldRushService.instance = new GoldRushService();
    }
    return GoldRushService.instance;
  }

  /**
   * Get wallet token balances for a specific chain
   */
  async getWalletBalances(
    address: string,
    chain: SupportedChain = "SOLANA"
  ): Promise<ProcessedWalletData> {
    try {
      console.log(`🔍 GoldRush: Fetching wallet balances for ${chain} address: ${address}`);
      
      // Check cache first
      const cacheKey = `${chain.toLowerCase()}_${address}`;
      const cached = this.cache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
        console.log(`🔍 GoldRush: Using cached data for ${chain}`);
        return cached.data;
      }

      if (!this.apiKey && chain !== "SOLANA") {
        console.log(`🔍 GoldRush: No API key available for ${chain}`);
        return {
          address,
          chain,
          totalValue: 0,
          totalValueChange24h: 0,
          tokenBalances: [],
          recentTransactions: [],
          lastUpdated: new Date().toISOString(),
        };
      }

      if (!this.isChainSupported(chain)) {
        throw new Error(`Unsupported chain: ${chain}`);
      }

      // Fetch both balances and transactions in parallel
      const [balancesData, transactionsData] = await Promise.allSettled([
        this.fetchWalletBalances(address, chain),
        this.fetchWalletTransactions(address, chain, 10), // Get last 10 transactions per chain to ensure we have enough for aggregation
      ]);

      let processedData: ProcessedWalletData;

      if (balancesData.status === "fulfilled") {
        console.log(`🔍 GoldRush: Successfully fetched balances for ${chain}`);
        processedData = this.processWalletData(balancesData.value, chain);
        console.log(`🔍 GoldRush: Processed data for ${chain}:`, {
          totalValue: processedData.totalValue,
          tokenCount: processedData.tokenBalances.length,
          tokens: processedData.tokenBalances.map(t => ({ symbol: t.symbol, balance: t.uiAmount, value: t.value }))
        });
      } else {
        console.log(`🔍 GoldRush: Failed to fetch balances for ${chain}:`, balancesData.reason);
        processedData = {
          address,
          chain,
          totalValue: 0,
          totalValueChange24h: 0,
          tokenBalances: [],
          recentTransactions: [],
          lastUpdated: new Date().toISOString(),
        };
      }

      // Add transactions if available
      if (transactionsData.status === "fulfilled") {
        processedData.recentTransactions = this.processTransactions(
          transactionsData.value,
          address,
          chain
        );
      } else {
        processedData.recentTransactions = [];
      }

      // Cache the result
      this.cache.set(cacheKey, {
        data: processedData,
        timestamp: Date.now(),
      });

      return processedData;
    } catch {
      // Return empty data instead of throwing to prevent app crash
      return {
        address,
        chain,
        totalValue: 0,
        totalValueChange24h: 0,
        tokenBalances: [],
        recentTransactions: [],
        lastUpdated: new Date().toISOString(),
      };
    }
  }

  /**
   * Fetch wallet balances from appropriate API based on chain
   */
  private async fetchWalletBalances(
    address: string,
    chain: SupportedChain
  ): Promise<GoldRushWalletBalance> {
    if (chain === "SOLANA") {
      console.log(`🔍 GoldRush: Fetching Solana balances for ${address}`);
      
      // Try GoldRush first for Solana balances (better token metadata and pricing)
      if (this.apiKey) {
        try {
          console.log(`🔍 GoldRush: Trying GoldRush API for Solana`);
          const chainId = CHAIN_IDS[chain];
          const url = `${this.baseUrl}/${chainId}/address/${address}/balances_v2/`;

          const response = await this.fetchWithRetry(url, {
            method: "GET",
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            throw new Error(
              `GoldRush API error for ${chain}: ${response.status} ${response.statusText}`
            );
          }

          const result: GoldRushResponse = await response.json();

          if (result.error) {
            throw new Error(
              `GoldRush API error for ${chain}: ${result.error_message}`
            );
          }

          console.log(`🔍 GoldRush: Successfully fetched from GoldRush API for Solana`);
          return result.data;
        } catch (error) {
          console.log(`🔍 GoldRush: GoldRush API failed for Solana, falling back to Helius:`, error);
          // Fall back to Helius API
        }
      } else {
        console.log(`🔍 GoldRush: No GoldRush API key, trying Helius for Solana`);
      }

      // Fall back to Helius API for Solana balances
      if (this.heliusapiKey) {
        try {
          const heliusUrl = `https://api.helius.xyz/v0/addresses/${address}/balances?api-key=${this.heliusapiKey}`;

          const response = await fetch(heliusUrl, {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
            },
          });

          if (!response.ok) {
            return await this.fetchSolanaBalancesViaRPC(address);
          }

          const heliusData = await response.json();
          console.log(`🔍 GoldRush: Successfully fetched from Helius API for Solana`);
          console.log(`🔍 GoldRush: Helius data:`, {
            nativeBalance: heliusData.nativeBalance,
            tokenCount: heliusData.tokens?.length || 0,
            totalValue: heliusData.totalValue
          });

          // Transform Helius response to match GoldRush format
          const transformedData: GoldRushWalletBalance = {
            address: address,
            updated_at: new Date().toISOString(),
            next_update_at: new Date(Date.now() + 300000).toISOString(), // 5 minutes from now
            quote_currency: "USD",
            chain_id: CHAIN_IDS[chain],
            chain_name: "solana-mainnet",
            items: heliusData.tokens
              ? heliusData.tokens.map((token: any) => ({
                  contract_decimals: token.decimals || 9,
                  contract_name:
                    token.tokenAccount?.mint || token.mint || "Unknown",
                  contract_ticker_symbol: token.symbol || "UNKNOWN",
                  contract_address:
                    token.tokenAccount?.mint || token.mint || token.address,
                  supports_erc: null,
                  logo_url: token.logoURI || null,
                  native_token:
                    token.mint === "So11111111111111111111111111111111111111112",
                  is_spam: false,
                  balance: token.amount || "0",
                  balance_24h: "0",
                  quote_rate: token.price || 0,
                  quote_rate_24h: 0,
                  quote: token.value || 0,
                  quote_24h: 0,
                  nft_data: null,
                }))
              : [],
            pagination: {
              has_more: false,
              page_number: 1,
              page_size: heliusData.tokens ? heliusData.tokens.length : 0,
              total_count: heliusData.tokens ? heliusData.tokens.length : 0,
            },
          };

          // Add native SOL balance if not already included
          if (heliusData.nativeBalance !== undefined) {
            const solBalance = {
              contract_decimals: 9,
              contract_name: "Solana",
              contract_ticker_symbol: "SOL",
              contract_address: "So11111111111111111111111111111111111111112",
              supports_erc: null,
              logo_url: "",
              native_token: true,
              is_spam: false,
              balance: heliusData.nativeBalance.toString(),
              balance_24h: "0",
              quote_rate:
                heliusData.nativeBalance > 0
                  ? (heliusData.totalValue || 0) /
                    (heliusData.nativeBalance / 1e9)
                  : 0,
              quote_rate_24h: 0,
              quote:
                heliusData.nativeBalance > 0
                  ? (heliusData.nativeBalance / 1e9) *
                    ((heliusData.totalValue || 0) /
                      (heliusData.nativeBalance / 1e9))
                  : 0,
              quote_24h: 0,
              nft_data: null,
            };

            // Check if SOL is already in the items array
            const hasSol = transformedData.items.some(
              (item) =>
                item.contract_address ===
                  "So11111111111111111111111111111111111111112" ||
                item.native_token
            );

            if (!hasSol) {
              transformedData.items.unshift(solBalance);
            }
          }

          return transformedData;
        } catch {
          return await this.fetchSolanaBalancesViaRPC(address);
        }
      }

      // Final fallback to RPC if no API keys available
      return await this.fetchSolanaBalancesViaRPC(address);
    } else {
      // Use GoldRush for EVM chains
      const chainId = CHAIN_IDS[chain];
      const url = `${this.baseUrl}/${chainId}/address/${address}/balances_v2/`;

      const response = await this.fetchWithRetry(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `GoldRush API error for ${chain}: ${response.status} ${response.statusText}`
        );
      }

      const result: GoldRushResponse = await response.json();

      if (result.error) {
        throw new Error(
          `GoldRush API error for ${chain}: ${result.error_message}`
        );
      }

      return result.data;
    }
  }

  /**
   * Fallback method to fetch Solana balances using RPC connection
   */
  private async fetchSolanaBalancesViaRPC(
    address: string
  ): Promise<GoldRushWalletBalance> {
    try {
      // Create connection using HELIUS RPC endpoint
      const rpcUrl = this.heliusapiKey 
        ? `https://mainnet.helius-rpc.com/?api-key=${this.heliusapiKey}`
        : 'https://api.mainnet-beta.solana.com';
      
      console.log(`🔍 GoldRush: Using RPC URL: ${rpcUrl.replace(this.heliusapiKey || '', '[API_KEY]')}`);
      
      const connection = new Connection(rpcUrl);
      const publicKey = new PublicKey(address);

      // Get native SOL balance
      const balance = await connection.getBalance(publicKey);
      console.log(`🔍 GoldRush: SOL balance (lamports): ${balance}`);

      // Get SOL price from CoinGecko
      const solPrice = await this.getSOLPrice();
      const uiAmount = balance / Math.pow(10, 9); // Convert lamports to SOL
      const usdValue = uiAmount * solPrice;
      
      console.log(`🔍 GoldRush: SOL balance: ${uiAmount} SOL, Price: $${solPrice}, Value: $${usdValue}`);

      // For now, we'll just return the SOL balance
      // In a full implementation, you'd also fetch SPL token balances
      const transformedData: GoldRushWalletBalance = {
        address: address,
        updated_at: new Date().toISOString(),
        next_update_at: new Date(Date.now() + 300000).toISOString(),
        quote_currency: "USD",
        chain_id: CHAIN_IDS.SOLANA,
        chain_name: "solana-mainnet",
        items: [
          {
            contract_decimals: 9,
            contract_name: "Solana",
            contract_ticker_symbol: "SOL",
            contract_address: "So11111111111111111111111111111111111111112",
            supports_erc: null,
            logo_url: "",
            native_token: true,
            balance: balance.toString(),
            balance_24h: "0",
            quote_rate: solPrice,
            quote_rate_24h: solPrice, // Using same price for 24h ago as fallback
            quote: usdValue,
            quote_24h: usdValue, // Using same value for 24h ago as fallback
            nft_data: null,
          },
        ],
        pagination: {
          has_more: false,
          page_number: 1,
          page_size: 1,
          total_count: 1,
        },
      };

      console.log(`🔍 GoldRush: RPC fallback successful, returning data with ${transformedData.items.length} items`);
      return transformedData;
    } catch (error) {
      console.log(`🔍 GoldRush: RPC fallback failed:`, error);
      throw error;
    }
  }

  /**
   * Get current SOL price from CoinGecko
   */
  private async getSOLPrice(): Promise<number> {
    try {
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=solana&vs_currencies=usd');
      const data = await response.json();
      return data.solana?.usd || 150; // Fallback to $150 if API fails
    } catch {
      return 150; // Fallback price
    }
  }

  /**
   * Fetch wallet transactions from appropriate API based on chain
   */
  private async fetchWalletTransactions(
    address: string,
    chain: SupportedChain,
    limit: number = 5
  ): Promise<any[]> {
    try {
      if (chain === "SOLANA") {
        // Use Helius for Solana transactions
        if (!this.heliusapiKey) {
          return [];
        }

        const heliusUrl = `https://api.helius.xyz/v0/addresses/${address}/transactions?limit=${limit}&api-key=${this.heliusapiKey}`;

        const response = await fetch(heliusUrl, {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          return [];
        }

        const txs: any[] = await response.json();

        const parsed = txs.map((tx) => ({
          signature: tx.signature,
          slot: tx.slot,
          timestamp: tx.timestamp,
          fee: tx.fee,
          type: tx.type,
          source: tx.source,
          description: tx.description,
          feePayer: tx.feePayer,
          tokenTransfers: tx.tokenTransfers || [],
          nativeTransfers: tx.nativeTransfers || [],
          accountData: tx.accountData || [],
        }));

        return parsed;
      } else {
        // Use GoldRush for EVM chains
        const chainId = CHAIN_IDS[chain];
        // Try the correct GoldRush API endpoint for transactions
        const url = `${this.baseUrl}/${chainId}/address/${address}/transactions_v3/?page-size=${limit}&no-logs=false`;

        const response = await this.fetchWithRetry(url, {
          method: "GET",
          headers: {
            Authorization: `Bearer ${this.apiKey}`,
            "Content-Type": "application/json",
          },
        });

        if (!response.ok) {
          return [];
        }

        const result = await response.json();

        if (result.error) {
          return [];
        }

        if (!result.data || !result.data.items) {
          // Try alternative endpoint format
          const altUrl = `${this.baseUrl}/${chainId}/address/${address}/transactions_v2/?page-size=${limit}`;

          try {
            const altResponse = await this.fetchWithRetry(altUrl, {
              method: "GET",
              headers: {
                Authorization: `Bearer ${this.apiKey}`,
                "Content-Type": "application/json",
              },
            });

            if (altResponse.ok) {
              const altResult = await altResponse.json();
              if (altResult.data && altResult.data.items) {
                return altResult.data.items;
              }
            }
          } catch {
            // Alternative endpoint failed
          }

          return [];
        }

        return result.data?.items || [];
      }
    } catch {
      return [];
    }
  }

  /**
   * Process transactions data from different APIs based on chain
   */
  private processTransactions(
    transactions: any[],
    userAddress: string,
    chain: SupportedChain
  ): ProcessedTransaction[] {

    let processedTransactions: ProcessedTransaction[];

    if (chain === "SOLANA") {
      processedTransactions = this.processSolanaTransactions(
        transactions,
        userAddress
      );
    } else {
      processedTransactions = this.processEvmTransactions(
        transactions,
        userAddress
      );
    }

    // Filter out promotional/spam transactions
    const filteredTransactions = processedTransactions.filter((tx) => {
      // Remove zero-value transactions (likely promotional)
      if (tx.value === 0 || tx.value < 0.0001) {
        return false;
      }

      // Remove transactions with promotional token names
      if (
        tx.primaryToken &&
        (tx.primaryToken.includes("http") ||
          tx.primaryToken.includes("www") ||
          tx.primaryToken.includes(".com") ||
          tx.primaryToken.includes("wr.do") ||
          tx.primaryToken.includes("claim") ||
          tx.primaryToken.includes("voucher") ||
          tx.primaryToken.length > 20)
      ) {
        return false;
      }

      return true;
    });

    return filteredTransactions;
  }

  /**
   * Process Solana transactions from Helius API
   */
  private processSolanaTransactions(
    transactions: any[],
    userAddress: string
  ): ProcessedTransaction[] {
    return transactions.map((tx) => {
      // Handle Helius transaction structure
      const fee = tx.fee || 0;
      const gasFee = fee / Math.pow(10, 9); // Convert lamports to SOL

      // Get transaction type and description from Helius data
      let type: ProcessedTransaction["type"] = "unknown";
      const description = tx.description || "Transaction";
      let fromToken: string | undefined;
      let toToken: string | undefined;
      let fromAmount: number | undefined;
      let toAmount: number | undefined;
      let primaryToken = "SOL"; // Default to native token

      // Map Helius transaction types to our types
      if (tx.type) {
        switch (tx.type.toUpperCase()) {
          case "SWAP":
            type = "swap";
            // Extract swap information from token transfers
            if (tx.tokenTransfers && tx.tokenTransfers.length >= 2) {
              const tokenIn = tx.tokenTransfers.find(
                (transfer: any) => transfer.fromUserAccount === userAddress
              );
              const tokenOut = tx.tokenTransfers.find(
                (transfer: any) => transfer.toUserAccount === userAddress
              );

              if (tokenIn) {
                fromToken = tokenIn.mint || "Unknown";
                fromAmount = tokenIn.tokenAmount || 0;
                primaryToken = fromToken || "Unknown"; // Use input token as primary
              }
              if (tokenOut) {
                toToken = tokenOut.mint || "Unknown";
                toAmount = tokenOut.tokenAmount || 0;
              }
            }
            break;
          case "TRANSFER":
            // Check for token transfers first
            if (tx.tokenTransfers && tx.tokenTransfers.length > 0) {
              const userTokenTransfer = tx.tokenTransfers.find(
                (transfer: any) =>
                  transfer.fromUserAccount === userAddress ||
                  transfer.toUserAccount === userAddress
              );
              if (userTokenTransfer) {
                primaryToken = userTokenTransfer.mint || "Unknown";
                type =
                  userTokenTransfer.fromUserAccount === userAddress
                    ? "sent"
                    : "received";
              }
            } else if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
              // Determine if sent or received based on native transfers
              const userTransfer = tx.nativeTransfers.find(
                (transfer: any) =>
                  transfer.fromUserAccount === userAddress ||
                  transfer.toUserAccount === userAddress
              );
              if (userTransfer) {
                type =
                  userTransfer.fromUserAccount === userAddress
                    ? "sent"
                    : "received";
                // Keep primaryToken as "SOL" for native transfers
              }
            }
            break;
          default:
            type = "unknown";
        }
      }

      // Calculate transaction value from native transfers
      let value = 0;
      if (tx.nativeTransfers && tx.nativeTransfers.length > 0) {
        const userTransfers = tx.nativeTransfers.filter(
          (transfer: any) =>
            transfer.fromUserAccount === userAddress ||
            transfer.toUserAccount === userAddress
        );

        // Sum up the amounts for user-related transfers
        value = userTransfers.reduce((sum: number, transfer: any) => {
          const amount = transfer.amount || 0;
          return sum + amount / Math.pow(10, 9); // Convert lamports to SOL
        }, 0);
      }

      // Get addresses from fee payer and account data
      const fromAddress = tx.feePayer || userAddress;
      const toAddress =
        tx.accountData && tx.accountData.length > 1
          ? tx.accountData[1].account
          : userAddress;

      return {
        hash: tx.signature || "",
        timestamp: tx.timestamp
          ? new Date(tx.timestamp * 1000).toISOString()
          : new Date().toISOString(),
        blockHeight: tx.slot || 0,
        successful: !tx.transactionError,
        fromAddress,
        toAddress,
        value,
        valueUSD: 0, // Helius doesn't provide USD values directly
        gasUsed: 0, // Not available in Helius format
        gasFee,
        gasFeeUSD: 0, // Not available in Helius format
        type,
        description,
        // Include primary token information
        primaryToken,
        // Include swap token information
        fromToken,
        toToken,
        fromAmount,
        toAmount,
      };
    });
  }

  /**
   * Process EVM transactions from GoldRush API
   */
  private processEvmTransactions(
    transactions: any[],
    userAddress: string
  ): ProcessedTransaction[] {
    return transactions.map((tx) => {
      // Handle GoldRush EVM transaction structure
      const gasFee = parseFloat(tx.fees_paid || "0") / Math.pow(10, 18); // Convert wei to ETH
      const value = parseFloat(tx.value || "0") / Math.pow(10, 18); // Convert wei to ETH

      // Determine transaction type
      let type: ProcessedTransaction["type"] = "unknown";
      if (tx.from_address?.toLowerCase() === userAddress.toLowerCase()) {
        type = "sent";
      } else if (tx.to_address?.toLowerCase() === userAddress.toLowerCase()) {
        type = "received";
      }

      // Extract token information from log events for ERC-20 transfers
      let primaryToken = "ETH"; // Default to native token
      let transferAmount = value;

      // Check for ERC-20 transfer events
      if (tx.log_events && tx.log_events.length > 0) {
        const transferEvent = tx.log_events.find(
          (event: any) =>
            event.decoded?.name?.toLowerCase() === "transfer" &&
            event.sender_contract_ticker_symbol
        );

        if (transferEvent) {
          primaryToken = transferEvent.sender_contract_ticker_symbol;
          // Try to get the transfer amount
          if (transferEvent.decoded?.params) {
            const valueParam = transferEvent.decoded.params.find(
              (p: any) => p.name?.toLowerCase() === "value"
            );
            if (valueParam?.value) {
              const decimals = transferEvent.sender_contract_decimals || 18;
              transferAmount =
                parseFloat(valueParam.value) / Math.pow(10, decimals);
            }
          }

          // Check for promotional/spam transactions with suspicious token names
          if (
            primaryToken &&
            (primaryToken.includes("http") ||
              primaryToken.includes("www") ||
              primaryToken.includes(".com") ||
              primaryToken.includes("wr.do") ||
              primaryToken.length > 20)
          ) {
            primaryToken = "PROMO"; // Mark as promotional
          }
        }
      }

      // Check for swap transactions and extract token information
      let fromToken: string | undefined;
      let toToken: string | undefined;
      let fromAmount: number | undefined;
      let toAmount: number | undefined;

      if (tx.log_events && tx.log_events.length > 0) {
        const swapEvent = tx.log_events.find(
          (event: any) =>
            event.decoded?.name?.toLowerCase().includes("swap") ||
            event.decoded?.name?.toLowerCase().includes("exchange") ||
            event.decoded?.name?.toLowerCase().includes("trade")
        );

        if (swapEvent) {
          type = "swap";

          // Try to extract token information from swap event
          if (swapEvent.decoded?.params) {
            const params = swapEvent.decoded.params;

            // Common swap event parameter patterns
            const tokenInParam = params.find(
              (p: any) =>
                p.name?.toLowerCase().includes("tokein") ||
                p.name?.toLowerCase().includes("token0") ||
                p.name?.toLowerCase().includes("from")
            );

            const tokenOutParam = params.find(
              (p: any) =>
                p.name?.toLowerCase().includes("tokenout") ||
                p.name?.toLowerCase().includes("token1") ||
                p.name?.toLowerCase().includes("to")
            );

            const amountInParam = params.find(
              (p: any) =>
                p.name?.toLowerCase().includes("amountin") ||
                p.name?.toLowerCase().includes("amount0") ||
                p.name?.toLowerCase().includes("value")
            );

            const amountOutParam = params.find(
              (p: any) =>
                p.name?.toLowerCase().includes("amountout") ||
                p.name?.toLowerCase().includes("amount1")
            );

            if (tokenInParam?.value) fromToken = tokenInParam.value;
            if (tokenOutParam?.value) toToken = tokenOutParam.value;
            if (amountInParam?.value)
              fromAmount = parseFloat(amountInParam.value) / Math.pow(10, 18);
            if (amountOutParam?.value)
              toAmount = parseFloat(amountOutParam.value) / Math.pow(10, 18);
          }

          // Try to extract token symbols from transfer events
          const transferEvents = tx.log_events.filter(
            (event: any) => event.decoded?.name?.toLowerCase() === "transfer"
          );

          if (transferEvents.length >= 2) {
            // First transfer is usually token in, second is token out
            const tokenInTransfer = transferEvents[0];
            const tokenOutTransfer = transferEvents[transferEvents.length - 1];

            if (tokenInTransfer.sender_contract_ticker_symbol) {
              fromToken = tokenInTransfer.sender_contract_ticker_symbol;
            }
            if (tokenOutTransfer.sender_contract_ticker_symbol) {
              toToken = tokenOutTransfer.sender_contract_ticker_symbol;
            }
          }
        }
      }

      return {
        hash: tx.tx_hash || "",
        timestamp: tx.block_signed_at || new Date().toISOString(),
        blockHeight: tx.block_height || 0,
        successful: tx.successful !== false,
        fromAddress: tx.from_address || "",
        toAddress: tx.to_address || "",
        value: transferAmount || value,
        valueUSD: tx.value_quote || 0,
        gasUsed: tx.gas_spent || 0,
        gasFee,
        gasFeeUSD: tx.gas_quote || 0,
        type,
        description: this.generateTransactionDescription(
          type,
          transferAmount || value
        ),
        // Include primary token information
        primaryToken,
        // Include swap token information
        fromToken,
        toToken,
        fromAmount,
        toAmount,
      };
    });
  }

  /**
   * Generate transaction description
   */
  private generateTransactionDescription(
    type: ProcessedTransaction["type"],
    value: number
  ): string {
    // Check for promotional/spam transactions
    if (value === 0 || value < 0.0001) {
      return "Promotional Transaction";
    }

    switch (type) {
      case "sent":
        return `Sent ${value.toFixed(4)} tokens`;
      case "received":
        return `Received ${value.toFixed(4)} tokens`;
      case "swap":
        return "Token swap";
      default:
        return "Transaction";
    }
  }

  /**
   * Process raw GoldRush data into our format
   */
  private processWalletData(
    data: GoldRushWalletBalance,
    chain: SupportedChain
  ): ProcessedWalletData {
    console.log(`🔍 GoldRush: Processing wallet data for ${chain}, ${data.items.length} items`);
    
    const tokenBalances: ProcessedTokenBalance[] = [];
    let totalValue = 0;
    let totalValueChange24h = 0;

    data.items.forEach((item, index) => {
      console.log(`🔍 GoldRush: Processing item ${index + 1}:`, {
        symbol: item.contract_ticker_symbol,
        balance: item.balance,
        quote: item.quote,
        decimals: item.contract_decimals
      });
      
      // Skip tokens with zero balance
      if (!item.balance || item.balance === "0") {
        console.log(`🔍 GoldRush: Skipping ${item.contract_ticker_symbol} - zero balance`);
        return;
      }

      const decimals = item.contract_decimals;
      const rawBalance = parseFloat(item.balance);
      const uiAmount = rawBalance / Math.pow(10, decimals);

      // Skip very small balances (dust) - but be more lenient for debugging
      if (uiAmount < 0.000001) {
        console.log(`🔍 GoldRush: Skipping ${item.contract_ticker_symbol} - dust amount: ${uiAmount}`);
        return;
      }

      const price = item.quote_rate || 0;
      const priceChange24h =
        ((item.quote_rate - (item.quote_rate_24h || 0)) /
          (item.quote_rate_24h || 1)) *
        100;
      const value = item.quote || 0;
      const valueChange24h = (item.quote || 0) - (item.quote_24h || 0);

      // Handle native tokens specially based on chain
      let mint = item.contract_address;
      if (chain === "SOLANA") {
        const isSOL =
          item.contract_address === "11111111111111111111111111111111" ||
          item.contract_ticker_symbol === "SOL";
        mint = isSOL
          ? "So11111111111111111111111111111111111111112"
          : item.contract_address;
      } else if (chain === "ETHEREUM") {
        const isETH =
          item.contract_address ===
            "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ||
          item.contract_ticker_symbol === "ETH";
        mint = isETH ? "ETH" : item.contract_address;
      } else if (chain === "BASE") {
        const isETH =
          item.contract_address ===
            "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ||
          item.contract_ticker_symbol === "ETH";
        mint = isETH ? "ETH" : item.contract_address;
      } else if (chain === "BSC") {
        const isBNB =
          item.contract_address ===
            "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee" ||
          item.contract_ticker_symbol === "BNB";
        mint = isBNB ? "BNB" : item.contract_address;
      }

      const tokenBalance = {
        mint,
        symbol: item.contract_ticker_symbol || "UNKNOWN",
        name:
          item.contract_name || item.contract_ticker_symbol || "Unknown Token",
        balance: rawBalance,
        uiAmount,
        decimals,
        price,
        priceChange24h,
        value,
        valueChange24h,
        logoUrl: item.logo_url || "",
      };

      console.log(`🔍 GoldRush: Adding token:`, {
        symbol: tokenBalance.symbol,
        uiAmount: tokenBalance.uiAmount,
        value: tokenBalance.value,
        price: tokenBalance.price
      });

      tokenBalances.push(tokenBalance);

      totalValue += value;
      totalValueChange24h += valueChange24h;
    });

    // Sort by value (highest first)
    tokenBalances.sort((a, b) => b.value - a.value);

    const result = {
      address: data.address,
      chain,
      totalValue,
      totalValueChange24h,
      tokenBalances,
      recentTransactions: [], // Will be populated by the main method
      lastUpdated: data.updated_at,
    };

    console.log(`🔍 GoldRush: Final processed data for ${chain}:`, {
      totalValue: result.totalValue,
      tokenCount: result.tokenBalances.length,
      tokens: result.tokenBalances.map(t => ({ symbol: t.symbol, value: t.value }))
    });

    return result;
  }

  /**
   * Get wallet balances across multiple chains for a single address
   */
  async getMultiChainWalletBalances(
    addresses: Record<SupportedChain, string | null>
  ): Promise<MultiChainWalletData> {
    const promises: Promise<ProcessedWalletData | null>[] = [];
    const chainOrder: SupportedChain[] = [];

    // Create promises for each chain that has an address
    Object.entries(addresses).forEach(([chain, address]) => {
      const chainKey = chain as SupportedChain;
      if (address && CHAIN_IDS[chainKey]) {
        promises.push(this.getWalletBalances(address, chainKey));
        chainOrder.push(chainKey);
      }
    });

    const results = await Promise.allSettled(promises);

    let totalValue = 0;
    let totalValueChange24h = 0;
    const chains: Record<SupportedChain, ProcessedWalletData | null> = {
      ETHEREUM: null,
      BASE: null,
      BSC: null,
      SOLANA: null,
      POLYGON: null,
      ARBITRUM: null,
      OPTIMISM: null,
    };

    results.forEach((result, index) => {
      const chain = chainOrder[index];
      if (result.status === "fulfilled" && result.value) {
        chains[chain] = result.value;
        totalValue += result.value.totalValue;
        totalValueChange24h += result.value.totalValueChange24h;
      } else {
        const address = addresses[chain];
        if (address) {
          chains[chain] = {
            address,
            chain,
            totalValue: 0,
            totalValueChange24h: 0,
            tokenBalances: [],
            recentTransactions: [],
            lastUpdated: new Date().toISOString(),
          };
        }
      }
    });

    return {
      totalValue,
      totalValueChange24h,
      chains,
      lastUpdated: new Date().toISOString(),
    };
  }

  /**
   * Get multiple wallet balances (for multiple wallets on same chain)
   */
  async getMultipleWalletBalances(
    addresses: string[],
    chain: SupportedChain = "SOLANA"
  ): Promise<ProcessedWalletData[]> {
    const promises = addresses.map((address) =>
      this.getWalletBalances(address, chain)
    );
    const results = await Promise.allSettled(promises);

    const successfulResults: ProcessedWalletData[] = [];

    results.forEach((result, index) => {
      if (result.status === "fulfilled") {
        successfulResults.push(result.value);
      } else {
        // Add empty data for failed wallets
        successfulResults.push({
          address: addresses[index],
          chain,
          totalValue: 0,
          totalValueChange24h: 0,
          tokenBalances: [],
          lastUpdated: new Date().toISOString(),
          recentTransactions: [],
        });
      }
    });

    return successfulResults;
  }

  /**
   * Get supported chains
   */
  getSupportedChains(): SupportedChain[] {
    return Object.keys(CHAIN_IDS) as SupportedChain[];
  }

  /**
   * Check if a chain is supported
   */
  isChainSupported(chain: string): chain is SupportedChain {
    return chain in CHAIN_IDS;
  }

  /**
   * Get chain name for display
   */
  getChainDisplayName(chain: SupportedChain): string {
    const names: Record<SupportedChain, string> = {
      ETHEREUM: "Ethereum",
      BASE: "Base",
      BSC: "BNB Smart Chain",
      SOLANA: "Solana",
      POLYGON: "Polygon",
      ARBITRUM: "Arbitrum",
      OPTIMISM: "Optimism",
    };
    return names[chain] || chain;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache stats
   */
  getCacheStats(): { size: number; keys: string[] } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
    };
  }

  /**
   * Force refresh wallet data (bypass cache)
   */
  async forceRefreshWalletBalances(
    address: string,
    chain: SupportedChain = "SOLANA"
  ): Promise<ProcessedWalletData> {
    const cacheKey = `${chain.toLowerCase()}_${address}`;
    this.cache.delete(cacheKey);
    return this.getWalletBalances(address, chain);
  }

  /**
   * Force refresh multi-chain wallet data (bypass cache)
   */
  async forceRefreshMultiChainWalletBalances(
    addresses: Record<SupportedChain, string | null>
  ): Promise<MultiChainWalletData> {
    // Clear cache for all addresses
    Object.entries(addresses).forEach(([chain, address]) => {
      if (address) {
        const cacheKey = `${chain.toLowerCase()}_${address}`;
        this.cache.delete(cacheKey);
      }
    });
    return this.getMultiChainWalletBalances(addresses);
  }

  /**
   * Get native token symbol for chain
   */
  getNativeTokenSymbol(chain: SupportedChain): string {
    const symbols: Record<SupportedChain, string> = {
      ETHEREUM: "ETH",
      BASE: "ETH",
      BSC: "BNB",
      SOLANA: "SOL",
      POLYGON: "MATIC",
      ARBITRUM: "ETH",
      OPTIMISM: "ETH",
    };
    return symbols[chain] || "UNKNOWN";
  }

  /**
   * Get chain explorer URL
   */
  getExplorerUrl(chain: SupportedChain): string {
    const explorers: Record<SupportedChain, string> = {
      ETHEREUM: "https://etherscan.io",
      BASE: "https://basescan.org",
      BSC: "https://bscscan.com",
      SOLANA: "https://solscan.io",
      POLYGON: "https://polygonscan.com",
      ARBITRUM: "https://arbiscan.io",
      OPTIMISM: "https://optimistic.etherscan.io",
    };
    return explorers[chain] || "";
  }
}

// Export singleton instance
export const goldRushService = GoldRushService.getInstance();
export default goldRushService;
