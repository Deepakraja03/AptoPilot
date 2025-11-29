/* eslint-disable @typescript-eslint/no-explicit-any */
import {
  fetchQuote,
  swapFromSolana,
  createSwapFromSuiMoveCalls,
  getSwapFromEvmTxPayload,
  Quote,
  ReferrerAddresses,
  ChainName,
  Erc20Permit,
} from "@mayanfinance/swap-sdk";
import { ethers } from "ethers";
import { Connection, Transaction, VersionedTransaction } from "@solana/web3.js";
import { SuiClient } from "@mysten/sui/client";
import { tokenCacheService } from "../token-cache";
import { nonceManager } from "../nonce-manager";
import { BASE_URL } from "@/lib/constant";
import { EnhancedGasFeeManager } from "./enhanced-gas-handler";

// Enhanced Types
interface Token {
  contract: string;
  symbol: string;
  decimals: number;
  name: string;
  logoURI?: string;
  chainName?: string;
}

interface Chain {
  name: string;
  chainId: number;
  rpcUrl: string;
  nativeCurrency: {
    name: string;
    symbol: string;
    decimals: number;
  };
}

interface SwapParams {
  amountIn: string;
  fromToken: Token | string;
  toToken: Token | string;
  fromChain: ChainName;
  toChain: ChainName;
  slippageBps?: number | string;
  gasDrop?: number;
  referrer?: string;
  referrerBps?: number;
}

interface SwapResult {
  success: boolean;
  transactionHash?: string;
  orderHash?: string;
  error?: string;
  gasUsed?: string;
  effectiveGasPrice?: string;
}

interface WalletConnections {
  evmProvider?: ethers.JsonRpcProvider;
  solanaWalletAddress?: string;
  evmSigner?: ethers.Signer;
  evmAddress?: string;
  solanaConnection?: Connection;
  solanaWallet?: any;
  suiClient?: SuiClient;
  suiKeypair?: any;
  // For Turnkey signing
  walletId?: string;
  userOrganizationId?: string;
}

export class MayanFinanceSwap {
  private apiBaseUrl = "https://explorer-api.mayan.finance";
  private priceApiUrl = "https://price-api.mayan.finance";
  private walletConnections: WalletConnections;

  // Cache for signer addresses to avoid repeated API calls
  private signerAddressCache = new Map<string, string>();

  // RPC URL mapping with fallbacks
  private getRpcUrl(chainId: number): string {
    const rpcUrls: { [key: number]: string[] } = {
      1: [
        "https://mempool.merkle.io/rpc/eth/pk_mbs_164a0daad0a610ad3aace0b4a99e93da",
        "https://ethereum.publicnode.com",
        "https://rpc.ankr.com/eth",
      ],
      8453: [
        "https://mempool.merkle.io/rpc/base/pk_mbs_164a0daad0a610ad3aace0b4a99e93da",
        "https://mainnet.base.org",
        "https://base.publicnode.com",
      ],
      56: [
        "https://mempool.merkle.io/rpc/bsc/pk_mbs_164a0daad0a610ad3aace0b4a99e93da",
        "https://bsc-dataseed1.binance.org/",
        "https://rpc.ankr.com/bsc",
      ].filter((url): url is string => typeof url === "string" && !!url),
      137: [
        `https://polygon-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`,
      ].filter((url): url is string => typeof url === "string" && !!url),
      43114: [
        `https://avalanche-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`,
        "https://api.avax.network/ext/bc/C/rpc",
        "https://rpc.ankr.com/avalanche",
      ].filter((url): url is string => typeof url === "string" && !!url),
      42161: [
        `https://arbitrum-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`,
        "https://arbitrum.publicnode.com",
        "https://rpc.ankr.com/arbitrum",
      ].filter((url): url is string => typeof url === "string" && !!url),
      10: [
        `https://optimism-mainnet.infura.io/v3/${process.env.NEXT_PUBLIC_INFURA_PROJECT_ID}`,
        "https://optimism.publicnode.com",
        "https://rpc.ankr.com/optimism",
      ].filter((url): url is string => typeof url === "string" && !!url),
    };

    const urls = rpcUrls[chainId] || [];
    return (
      urls[0] ||
      "https://mempool.merkle.io/rpc/eth/pk_mbs_164a0daad0a610ad3aace0b4a99e93da"
    );
  }

  // Helper function to get numeric chain ID from chain name
  private getChainId(chainName: string): number {
    const chainMap: { [key: string]: number } = {
      ethereum: 1,
      bsc: 56,
      polygon: 137,
      avalanche: 43114,
      arbitrum: 42161,
      optimism: 10,
      base: 8453,
      solana: 0,
    };
    const chainId = chainMap[chainName.toLowerCase()];
    if (!chainId && chainName.toLowerCase() !== "solana") {
      console.warn(`Unknown chain: ${chainName}, defaulting to Ethereum (1)`);
      return 1;
    }
    return chainId || 1;
  }

  // Create a reliable provider with fallback support
  private async createReliableProvider(
    chainId: number
  ): Promise<ethers.JsonRpcProvider> {
    const rpcUrls: { [key: number]: string[] } = {
      1: [
        "https://ethereum.publicnode.com",
        "https://rpc.ankr.com/eth",
        "https://cloudflare-eth.com",
      ],
      8453: [
        "https://mainnet.base.org",
        "https://base.publicnode.com",
        "https://rpc.ankr.com/base",
      ],
      56: [
        "https://bsc-dataseed1.binance.org/",
        "https://rpc.ankr.com/bsc",
        "https://bsc-dataseed2.binance.org/",
      ],
    };

    const urls = rpcUrls[chainId] || ["https://ethereum.publicnode.com"];

    // Try each URL until one works
    for (let i = 0; i < urls.length; i++) {
      const rpcUrl = urls[i];
      try {
        console.log(
          `🔗 Trying RPC ${i + 1}/${urls.length} for chain ${chainId}: ${rpcUrl.substring(0, 50)}...`
        );

        const provider = new ethers.JsonRpcProvider(rpcUrl, chainId, {
          staticNetwork: ethers.Network.from(chainId),
        });

        // Test the provider with a timeout
        const blockNumberPromise = provider.getBlockNumber();
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Connection timeout")), 10000)
        );

        await Promise.race([blockNumberPromise, timeoutPromise]);
        console.log(
          `✅ Successfully connected to RPC ${i + 1} for chain ${chainId}`
        );

        return provider;
      } catch (error) {
        console.error(
          `❌ RPC ${i + 1}/${urls.length} failed for chain ${chainId}:`,
          error instanceof Error ? error.message : String(error)
        );

        // Continue to next URL
        continue;
      }
    }

    throw new Error(`Unable to connect to any RPC for chain ${chainId}`);
  }

  // Helper function to wait for transaction receipt via Merkle
  private async waitForTransactionReceipt(
    transactionHash: string,
    chainId: number
  ): Promise<any> {
    console.log(`⏳ Waiting for transaction receipt: ${transactionHash}`);

    const maxAttempts = 30;
    let attempts = 0;

    while (attempts < maxAttempts) {
      try {
        const response = await fetch("/api/merkle/transaction-receipt", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            transactionHash,
            chainId,
          }),
        });

        if (response.ok) {
          const receiptData = await response.json();
          if (receiptData.receipt) {
            console.log("✅ Transaction confirmed:", {
              hash: receiptData.receipt.transactionHash,
              blockNumber: receiptData.receipt.blockNumber,
              gasUsed: receiptData.receipt.gasUsed,
            });
            return receiptData.receipt;
          }
        }

        await new Promise((resolve) => setTimeout(resolve, 10000));
        attempts++;
        console.log(
          `⏳ Attempt ${attempts}/${maxAttempts} - Still waiting for confirmation...`
        );
      } catch (error) {
        console.error("Error checking transaction receipt:", error);
        attempts++;
        await new Promise((resolve) => setTimeout(resolve, 10000));
      }
    }

    console.warn("⚠️ Transaction receipt timeout - returning null");
    return null;
  }

  constructor(walletConnections?: WalletConnections) {
    this.walletConnections = walletConnections || {};

    if (
      walletConnections?.evmProvider &&
      (walletConnections?.evmSigner || walletConnections?.walletId)
    ) {
      console.log("✅ EVM wallet connection established");
    }

    if (
      walletConnections?.solanaConnection &&
      walletConnections?.solanaWallet
    ) {
      console.log("✅ Solana wallet connection established");
    }

    if (walletConnections?.suiClient && walletConnections?.suiKeypair) {
      console.log("✅ Sui wallet connection established");
    }
  }

  // Update wallet connections
  setWalletConnections(connections: WalletConnections): void {
    this.walletConnections = { ...this.walletConnections, ...connections };
  }

  // Fetch available chains with enhanced error handling
  async getChains(): Promise<Chain[]> {
    try {
      const response = await fetch(`${this.priceApiUrl}/v3/chains`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const chains = await response.json();
      return chains;
    } catch (error) {
      console.error("Error fetching chains:", error);
      throw new Error(
        `Failed to fetch chains: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // Fetch available tokens with filtering
  async getTokens(chainName?: string): Promise<Token[]> {
    try {
      if (!chainName) {
        throw new Error("Chain name is required");
      }

      const tokens = await tokenCacheService.getTokens(chainName);

      return tokens.map((token) => ({
        contract: token.contract || token.address || token.mint || "",
        symbol: token.symbol || "",
        decimals: token.decimals || 18,
        name: token.name || token.symbol || "",
        logoURI: token.logoURI || token.image || "",
        chainName: token.chainName || chainName,
        standard: token.standard,
      }));
    } catch (error) {
      console.error("Error fetching tokens:", error);
      throw new Error(
        `Failed to fetch tokens: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // Add method to get cache stats
  getTokenCacheStats() {
    return tokenCacheService.getCacheStats();
  }

  // Add method to refresh tokens
  async refreshTokens(chainName: string): Promise<Token[]> {
    const tokens = await tokenCacheService.refreshChain(chainName);
    return tokens.map((token) => ({
      contract: token.contract || token.address || token.mint || "",
      symbol: token.symbol || "",
      decimals: token.decimals || 18,
      name: token.name || token.symbol || "",
      logoURI: token.logoURI || token.image || "",
      chainName: token.chainName || chainName,
      standard: token.standard,
    }));
  }

  // Enhanced token search with fuzzy matching
  async searchTokens(query: string, chainName?: string): Promise<Token[]> {
    try {
      let url = `${
        this.priceApiUrl
      }/v3/tokens/search?query=${encodeURIComponent(query)}`;
      if (chainName) {
        url += `&chain=${chainName}`;
      }

      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const tokens = await response.json();
      return tokens;
    } catch (error) {
      console.error("Error searching tokens:", error);
      throw new Error(
        `Failed to search tokens: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // Enhanced quote fetching with validation
  async getQuote(params: SwapParams): Promise<Quote[]> {
    try {
      this.validateSwapParams(params);

      const fromTokenContract =
        typeof params.fromToken === "string"
          ? params.fromToken
          : params.fromToken.contract;

      const toTokenContract =
        typeof params.toToken === "string"
          ? params.toToken
          : params.toToken.contract;

      const quotes = await fetchQuote({
        amountIn64: params.amountIn,
        fromToken: fromTokenContract,
        toToken: toTokenContract,
        fromChain: params.fromChain,
        toChain: params.toChain,
        slippageBps: Number(params.slippageBps) || "auto",
        gasDrop: params.gasDrop || 0,
        referrer: params.referrer,
        referrerBps: params.referrerBps || 0,
      });

      if (!quotes || quotes.length === 0) {
        throw new Error("No quotes available for the given parameters");
      }

      return quotes;
    } catch (error) {
      console.error("Error fetching quote:", error);

      let errorMessage = "Unknown error";

      if (error && typeof error === "object") {
        if ("message" in error && error.message) {
          errorMessage = error.message as string;
        } else if (error instanceof Error) {
          errorMessage = error.message;
        } else if ("error" in error && error.error) {
          errorMessage = error.error as string;
        }
      }

      throw new Error(`Failed to get quote: ${errorMessage}`);
    }
  }

  // Get on-chain quote with better error handling
  async getOnChainQuote(params: SwapParams): Promise<any> {
    try {
      this.validateSwapParams(params);

      // Handle both string and Token object formats
      const fromTokenContract =
        typeof params.fromToken === "string"
          ? params.fromToken
          : params.fromToken.contract;

      const toTokenContract =
        typeof params.toToken === "string"
          ? params.toToken
          : params.toToken.contract;

      const queryParams = new URLSearchParams({
        amountIn: params.amountIn,
        fromToken: fromTokenContract,
        toToken: toTokenContract,
        fromChain: params.fromChain,
        toChain: params.toChain,
        slippageBps: params.slippageBps?.toString() || "auto",
        gasDrop: params.gasDrop?.toString() || "0",
        ...(params.referrer && { referrer: params.referrer }),
        ...(params.referrerBps && {
          referrerBps: params.referrerBps.toString(),
        }),
      });

      const response = await fetch(
        `${this.priceApiUrl}/v3/quote/on-chain?${queryParams}`
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error("Error fetching on-chain quote:", error);
      throw new Error(
        `Failed to get on-chain quote: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // Enhanced address resolution with better error handling
  private async resolveSignerAddress(
    signer: any,
    fallbackAddress?: string
  ): Promise<string> {
    // 1. Try pre-cached address first
    if (this.walletConnections.evmAddress) {
      // Normalize the address to checksum format
      const normalizedAddress = ethers.getAddress(
        this.walletConnections.evmAddress
      );
      console.log(
        "✅ Using pre-cached EVM address (normalized):",
        normalizedAddress
      );
      return normalizedAddress;
    }

    // 2. Use fallback address if provided (skip Turnkey call)
    if (fallbackAddress && ethers.isAddress(fallbackAddress)) {
      // Normalize the address to checksum format
      const normalizedAddress = ethers.getAddress(fallbackAddress);
      console.log(
        "🔄 Using provided fallback address (normalized):",
        normalizedAddress
      );
      this.walletConnections.evmAddress = normalizedAddress;
      return normalizedAddress;
    }

    // 3. Only try to fetch from signer as last resort
    try {
      console.log("🔍 Attempting to fetch signer address...");
      await new Promise((resolve) => setTimeout(resolve, 1000));

      let signerToUse = signer;
      if (signer.connect && this.walletConnections.evmProvider) {
        signerToUse = signer.connect(this.walletConnections.evmProvider);
      }

      const address = await signerToUse.getAddress();
      // Normalize the address to checksum format
      const normalizedAddress = ethers.getAddress(address);
      console.log(
        "✅ Successfully fetched signer address (normalized):",
        normalizedAddress
      );

      this.walletConnections.evmAddress = normalizedAddress;
      return normalizedAddress;
    } catch (error) {
      console.warn(
        "⚠️ Failed to fetch signer address:",
        error instanceof Error ? error.message : "Unknown error"
      );

      // Check if this is a Turnkey "private key not found" error
      if (
        error instanceof Error &&
        error.message.includes("private key") &&
        error.message.includes("not found")
      ) {
        throw new Error(
          "Wallet private key not found in Turnkey. Please ensure the wallet exists for this user organization."
        );
      }

      throw new Error(
        "Unable to resolve signer address and no valid fallback provided"
      );
    }
  }

  // Enhanced EVM swap execution with better error handling
  async swapFromEvmChain(
    quote: Quote,
    originWalletAddress: string,
    destinationWalletAddress: string,
    referrerAddress?: string
  ): Promise<any> {
    if (
      (!this.walletConnections.evmSigner && !this.walletConnections.walletId) ||
      !this.walletConnections.evmProvider
    ) {
      throw new Error("EVM wallet connection not configured");
    }

    try {
      const signer = this.walletConnections.evmSigner;
      const signerChainId = this.getChainId(quote.fromChain);

      // Create a reliable provider for this chain
      let provider;
      try {
        provider = await this.createReliableProvider(signerChainId);
      } catch (providerError) {
        console.error("❌ Failed to create reliable provider:", providerError);
        throw new Error(
          "Unable to connect to blockchain network. Please check your internet connection and try again."
        );
      }

      // Initialize enhanced gas fee manager
      const gasFeeManager = new EnhancedGasFeeManager();

      // Use the provided origin address directly to avoid Turnkey calls
      const signerAddress = await this.resolveSignerAddress(
        signer,
        originWalletAddress
      );

      const referrerAddresses: ReferrerAddresses | undefined = referrerAddress
        ? { evm: referrerAddress }
        : undefined;

      console.log("🔄 Executing EVM swap with address:", signerAddress);
      console.log(
        "🔗 Using chain ID",
        signerChainId,
        "for chain",
        quote.fromChain
      );

      // Validate origin address (should be EVM format)
      if (!ethers.isAddress(signerAddress)) {
        throw new Error(
          `Invalid signer address: ${signerAddress}. Please ensure the wallet is properly connected.`
        );
      }

      // Validate destination address based on destination chain
      let validDestinationAddress = destinationWalletAddress;

      if (quote.toChain === "solana") {
        if (ethers.isAddress(destinationWalletAddress)) {
          if (!this.walletConnections.solanaWalletAddress) {
            throw new Error(
              "Solana destination address required for cross-chain swap to Solana. Please connect your Solana wallet."
            );
          }
          validDestinationAddress = this.walletConnections.solanaWalletAddress;
          console.log(
            "🔄 Using Solana address for destination:",
            validDestinationAddress
          );
        } else {
          // Validate it's a proper Solana address (basic validation)
          try {
            if (
              validDestinationAddress.length < 32 ||
              validDestinationAddress.length > 44
            ) {
              throw new Error("Invalid Solana address length");
            }
            const base58Regex = /^[1-9A-HJ-NP-Za-km-z]+$/;
            if (!base58Regex.test(validDestinationAddress)) {
              throw new Error("Invalid Solana address format");
            }
          } catch (validationError) {
            throw new Error(
              `Invalid Solana destination address: ${validDestinationAddress}. ${validationError}`
            );
          }
        }
      } else {
        // For EVM chains, validate as Ethereum address
        if (!ethers.isAddress(validDestinationAddress)) {
          throw new Error(
            `Invalid destination address: ${validDestinationAddress}`
          );
        }
      }

      console.log("🔄 Getting transaction payload...");

      // Get transaction payload
      const txPayload = getSwapFromEvmTxPayload(
        quote,
        signerAddress,
        validDestinationAddress,
        referrerAddresses,
        signerAddress,
        signerChainId,
        null, // payload
        null, // permit
        undefined // options
      );

      console.log("📦 Got transaction payload:", {
        to: txPayload.to,
        value: txPayload.value,
        gasLimit: txPayload.gasLimit,
        data: txPayload.data ? `${txPayload.data.slice(0, 10)}...` : "none",
      });

      // Get optimized gas fees using the enhanced manager
      console.log("⛽ Getting optimized gas fees...");
      const optimizedFees = await gasFeeManager.getOptimizedGasFees(
        provider,
        signerChainId
      );

      // Use nonce manager to get a safe nonce that prevents conflicts
      const nonce = await nonceManager.getNextNonce(provider, signerAddress);

      // Create base transaction
      let populatedTx: any = {
        to: txPayload.to,
        value: txPayload.value || "0",
        data: txPayload.data,
        gasLimit: txPayload.gasLimit || "300000",
        nonce: nonce,
        chainId: signerChainId,
      };

      // Apply optimized gas fees
      populatedTx = gasFeeManager.applyGasFees(populatedTx, optimizedFees);

      console.log("📋 Transaction with optimized gas fees:", {
        to: populatedTx.to,
        value: populatedTx.value,
        gasLimit: populatedTx.gasLimit,
        nonce: populatedTx.nonce,
        chainId: populatedTx.chainId,
        type: populatedTx.type,
        ...(populatedTx.gasPrice && {
          gasPrice: ethers.formatUnits(populatedTx.gasPrice, "gwei") + " gwei",
        }),
        ...(populatedTx.maxFeePerGas && {
          maxFeePerGas:
            ethers.formatUnits(populatedTx.maxFeePerGas, "gwei") + " gwei",
        }),
        ...(populatedTx.maxPriorityFeePerGas && {
          maxPriorityFeePerGas:
            ethers.formatUnits(populatedTx.maxPriorityFeePerGas, "gwei") +
            " gwei",
        }),
      });

      // Validate fees before signing
      const feesValid = await gasFeeManager.validateGasFees(
        provider,
        signerChainId,
        populatedTx
      );
      if (!feesValid) {
        console.warn(
          "⚠️ Gas fees may still be insufficient, but proceeding with enhanced fees"
        );
      } else {
        console.log("✅ Gas fees validated and should be sufficient");
      }

      // Sign transaction
      let signedTx;
      try {
        console.log("🔐 Attempting to sign transaction...");

        if (
          this.walletConnections.walletId &&
          this.walletConnections.userOrganizationId
        ) {
          console.log("🔑 Using Turnkey for transaction signing...");

          const { serializeTransaction } = await import("@/lib/swap-utils");
          const serializedTx = await serializeTransaction(populatedTx);

          const { turnkeyApi } = await import("@/lib/auth/api");

          const signResult = await turnkeyApi.signTransaction({
            signWith: this.walletConnections.evmAddress!,
            unsignedTransaction: serializedTx,
            type: "TRANSACTION_TYPE_ETHEREUM",
          });

          if (!signResult.signedTransaction) {
            throw new Error("Failed to sign transaction with Turnkey");
          }

          signedTx = signResult.signedTransaction;

          if (!signedTx.startsWith("0x")) {
            signedTx = "0x" + signedTx;
          }

          console.log("✅ Transaction signed successfully with Turnkey");
        } else if (signer) {
          const connectedSigner = signer.connect
            ? signer.connect(provider)
            : signer;
          signedTx = await connectedSigner.signTransaction(populatedTx);
          console.log("✅ Transaction signed successfully with regular signer");
        } else {
          throw new Error(
            "No signing method available - neither Turnkey nor regular signer configured"
          );
        }
      } catch (signingError) {
        console.error("❌ Transaction signing failed:", signingError);

        if (
          signingError instanceof Error &&
          signingError.message.includes("private key") &&
          signingError.message.includes("not found")
        ) {
          throw new Error(
            "Wallet private key not found. The wallet may not exist in Turnkey for this user organization. Please contact support."
          );
        }

        throw new Error(
          `Transaction signing failed: ${signingError instanceof Error ? signingError.message : "Unknown error"}`
        );
      }

      // Execute via Merkle API
      console.log("🚀 Executing transaction via Merkle...");
      const merkleResponse = await fetch(
        `${BASE_URL}/api/merkle/execute-transaction`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            signedTransaction: signedTx,
            chainId: signerChainId,
            fromChain: quote.fromChain,
            toChain: quote.toChain,
          }),
        }
      );

      if (!merkleResponse.ok) {
        const errorData = await merkleResponse.json().catch(() => ({}));
        throw new Error(
          `Transaction execution failed: ${errorData.error || merkleResponse.statusText}`
        );
      }

      const merkleResult = await merkleResponse.json();
      console.log("✅ Transaction executed:", merkleResult.transactionHash);

      // Create transaction response
      const sentTx = {
        hash: merkleResult.transactionHash,
        wait: async () => {
          return await this.waitForTransactionReceipt(
            merkleResult.transactionHash,
            signerChainId
          );
        },
      };

      // Wait for confirmation
      const receipt = await sentTx.wait();

      if (receipt) {
        console.log("✅ Transaction confirmed:", {
          hash: receipt.hash,
          blockNumber: receipt.blockNumber,
          gasUsed: receipt.gasUsed?.toString(),
        });

        return {
          hash: sentTx.hash,
          fromChain: quote.fromChain,
          toChain: quote.toChain,
          status: "confirmed",
          receipt: receipt,
        };
      } else {
        console.log("⏳ Transaction sent but not yet confirmed:", sentTx.hash);

        return {
          hash: sentTx.hash,
          fromChain: quote.fromChain,
          toChain: quote.toChain,
          status: "pending",
          receipt: null,
        };
      }
    } catch (error) {
      console.error("Error executing EVM swap:", error);
      throw error;
    }
  }

  // Enhanced Solana swap execution
  async swapFromSolanaChain(
    quote: Quote,
    destinationWalletAddress: string,
    referrerAddresses?: ReferrerAddresses,
    customConnection?: Connection,
    customWallet?: any
  ): Promise<SwapResult> {
    try {
      const connection =
        customConnection || this.walletConnections.solanaConnection;
      const wallet = customWallet || this.walletConnections.solanaWallet;

      if (!connection || !wallet) {
        throw new Error("Solana connection and wallet are required");
      }

      const originWalletAddress = wallet.publicKey.toString();

      const signTransaction = async (
        transaction: Transaction | VersionedTransaction
      ) => {
        return await wallet.signTransaction(transaction);
      };

      const result = await swapFromSolana(
        quote,
        originWalletAddress,
        destinationWalletAddress,
        referrerAddresses,
        signTransaction,
        connection
      );

      return {
        success: true,
        transactionHash:
          result.signature ||
          (result.serializedTrx
            ? Buffer.from(result.serializedTrx).toString("base64")
            : undefined),
      };
    } catch (error) {
      console.error("Error executing Solana swap:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Enhanced Sui swap execution
  async swapFromSuiChain(
    quote: Quote,
    originWalletAddress: string,
    destinationWalletAddress: string,
    referrerAddresses?: ReferrerAddresses,
    customPayload?: Uint8Array | Buffer,
    options?: any,
    customSuiClient?: SuiClient,
    customKeypair?: any
  ): Promise<SwapResult> {
    try {
      const suiClient = customSuiClient || this.walletConnections.suiClient;
      const suiKeypair = customKeypair || this.walletConnections.suiKeypair;

      if (!suiClient || !suiKeypair) {
        throw new Error("Sui client and keypair are required");
      }

      const bridgeFromSuiMoveCalls = await createSwapFromSuiMoveCalls(
        quote,
        originWalletAddress,
        destinationWalletAddress,
        referrerAddresses,
        customPayload,
        suiClient,
        options
      );

      const result = await suiKeypair.signTransaction(bridgeFromSuiMoveCalls);

      return {
        success: true,
        transactionHash: result.digest || result.signature,
      };
    } catch (error) {
      console.error("Error executing Sui swap:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getEvmTxPayload(
    quote: Quote,
    swapperAddress: string,
    destinationWalletAddress: string,
    signerChainId: number | string,
    referrerAddress?: string,
    permit?: Erc20Permit,
    customPayload?: Uint8Array | Buffer,
    options?: { usdcPermitSignature?: string }
  ): Promise<any> {
    try {
      const referrerAddresses: ReferrerAddresses | null = referrerAddress
        ? { evm: referrerAddress }
        : null;

      const payload = getSwapFromEvmTxPayload(
        quote,
        swapperAddress,
        destinationWalletAddress,
        referrerAddresses,
        swapperAddress, // signerAddress
        signerChainId,
        customPayload || null,
        permit || null,
        options
      );
      return payload;
    } catch (error) {
      console.error("Error getting EVM tx payload:", error);
      throw new Error(
        `Failed to get EVM tx payload: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  // Validate swap parameters
  private validateSwapParams(params: SwapParams): void {
    if (!params.amountIn || params.amountIn === "0") {
      throw new Error("Amount in must be greater than 0");
    }

    const fromTokenContract =
      typeof params.fromToken === "string"
        ? params.fromToken
        : params.fromToken?.contract;

    const toTokenContract =
      typeof params.toToken === "string"
        ? params.toToken
        : params.toToken?.contract;

    if (!fromTokenContract) {
      throw new Error("From token contract address is required");
    }

    if (!toTokenContract) {
      throw new Error("To token contract address is required");
    }

    if (!params.fromChain) {
      throw new Error("From chain is required");
    }

    if (!params.toChain) {
      throw new Error("To chain is required");
    }

    if (
      params.fromChain === params.toChain &&
      fromTokenContract === toTokenContract
    ) {
      throw new Error("Cannot swap the same token on the same chain");
    }
  }

  // Auto-execute swap with proper user context
  async executeSwap(
    quote: Quote,
    originAddress: string,
    destinationAddress: string,
    referrerAddresses?: ReferrerAddresses,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    permit?: Erc20Permit
  ): Promise<SwapResult> {
    const fromChain = quote.fromChain.toLowerCase();

    try {
      if (fromChain === "solana") {
        return await this.swapFromSolanaChain(
          quote,
          destinationAddress,
          referrerAddresses,
          this.walletConnections.solanaConnection,
          this.walletConnections.solanaWallet
        );
      } else if (fromChain === "sui") {
        return await this.swapFromSuiChain(
          quote,
          originAddress,
          destinationAddress,
          referrerAddresses,
          undefined,
          undefined,
          this.walletConnections.suiClient,
          this.walletConnections.suiKeypair
        );
      } else {
        // EVM chains
        const result = await this.swapFromEvmChain(
          quote,
          originAddress,
          destinationAddress,
          referrerAddresses?.evm as string
        );

        return {
          success: true,
          transactionHash: result.hash,
          orderHash: result.orderHash,
        };
      }
    } catch (error) {
      console.error("Auto-execute swap failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  async getSupportedChains(): Promise<string[]> {
    try {
      const chains = await this.getChains();
      return chains.map((chain) => chain.name.toLowerCase());
    } catch (error) {
      console.error("Error getting supported chains:", error);
      // Fallback to known supported chains
      return [
        "ethereum",
        "bsc",
        "polygon",
        "avalanche",
        "arbitrum",
        "optimism",
        "base",
        "solana",
        "sui",
      ];
    }
  }

  // Check if chain is supported
  isChainSupported(chainName: string): boolean {
    const supportedChains = [
      "ethereum",
      "bsc",
      "polygon",
      "avalanche",
      "arbitrum",
      "optimism",
      "base",
      "solana",
      "sui",
    ];
    return supportedChains.includes(chainName.toLowerCase());
  }

  async estimateGas(
    quote: Quote,
    fromAddress: string,
    toAddress: string
  ): Promise<string> {
    try {
      if (!this.walletConnections.evmProvider) {
        throw new Error("EVM provider required for gas estimation");
      }

      const txPayload = await this.getEvmTxPayload(
        quote,
        fromAddress,
        toAddress,
        1 // Default to Ethereum mainnet
      );

      const gasEstimate =
        await this.walletConnections.evmProvider.estimateGas(txPayload);
      return gasEstimate.toString();
    } catch (error) {
      console.error("Error estimating gas:", error);
      return "21000"; // Default gas limit
    }
  }

  // Enhanced amount formatting with validation
  formatAmount(amount: string | number, decimals: number): string {
    try {
      const amountStr = amount.toString();
      const factor = BigInt(10 ** decimals);

      if (amountStr.includes(".")) {
        const [whole, decimal] = amountStr.split(".");
        const decimalPadded = decimal.padEnd(decimals, "0").slice(0, decimals);
        const wholeBig = BigInt(whole || "0");
        const decimalBig = BigInt(decimalPadded || "0");
        return (wholeBig * factor + decimalBig).toString();
      } else {
        return (BigInt(amountStr) * factor).toString();
      }
    } catch {
      throw new Error(`Invalid amount format: ${amount}`);
    }
  }

  // Enhanced amount parsing
  parseAmount(formattedAmount: string, decimals: number): string {
    try {
      const factor = BigInt(10 ** decimals);
      const amountBig = BigInt(formattedAmount);
      const whole = amountBig / factor;
      const remainder = amountBig % factor;

      if (remainder === BigInt(0)) {
        return whole.toString();
      } else {
        const decimalStr = remainder.toString().padStart(decimals, "0");
        return `${whole}.${decimalStr.replace(/0+$/, "")}`;
      }
    } catch {
      throw new Error(`Invalid formatted amount: ${formattedAmount}`);
    }
  }

  // Enhanced swap tracking with retry logic
  async trackSwap(
    transactionHash: string,
    maxRetries: number = 3
  ): Promise<any> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(
          `${this.apiBaseUrl}/v3/swap/trx/${transactionHash}`
        );

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const swapStatus = await response.json();
        return swapStatus;
      } catch (error) {
        console.error(`Error tracking swap (attempt ${i + 1}):`, error);
        if (i === maxRetries - 1) {
          throw new Error(
            `Failed to track swap after ${maxRetries} attempts: ${
              error instanceof Error ? error.message : "Unknown error"
            }`
          );
        }
        await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
      }
    }
  }

  async getTransactionStatus(txHash: string): Promise<any> {
    try {
      const response = await fetch(`${this.apiBaseUrl}/v3/trx/${txHash}`);

      if (!response.ok) {
        // If the transaction hasn't been indexed yet (404), return a pending status
        // rather than throwing an error
        if (response.status === 404) {
          console.log(
            `⏳ Transaction ${txHash} not yet indexed in Mayan system`
          );
          return {
            pending: true,
            confirmed: false,
            failed: false,
            hash: txHash,
            message:
              "Transaction not yet indexed in Mayan system - this is normal for new transactions",
            clientStatus: "PENDING_INDEXING",
          };
        }

        // For other HTTP errors, still throw
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log(
        `✅ Transaction ${txHash} found in Mayan system:`,
        result.clientStatus || "Status unknown"
      );
      return result;
    } catch (error) {
      console.error("Error getting transaction status:", error);

      // Instead of throwing immediately, return a pending status for network errors
      // This helps with temporary network issues
      if (error instanceof TypeError && error.message.includes("fetch")) {
        console.warn(
          "⚠️ Network error when checking transaction status, treating as pending"
        );
        return {
          pending: true,
          confirmed: false,
          failed: false,
          hash: txHash,
          message: "Network error when checking status - will retry",
          clientStatus: "NETWORK_ERROR",
        };
      }

      throw new Error(
        `Failed to get transaction status: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  }

  validateAddress(address: string, chain: string): boolean {
    try {
      switch (chain.toLowerCase()) {
        case "ethereum":
        case "bsc":
        case "polygon":
        case "avalanche":
        case "arbitrum":
        case "optimism":
        case "base":
          return ethers.isAddress(address);

        case "solana":
          // Basic Solana address validation (base58, 32-44 chars)
          return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);

        case "sui":
          // Basic Sui address validation (starts with 0x, 64 hex chars)
          return /^0x[a-fA-F0-9]{64}$/.test(address);

        default:
          return false;
      }
    } catch (error) {
      console.error("Error validating address:", error);
      return false;
    }
  }

  // Update wallet connections
  updateWalletConnections(connections: Partial<WalletConnections>): void {
    this.walletConnections = { ...this.walletConnections, ...connections };

    if (connections.evmProvider && connections.evmSigner) {
      console.log("✅ EVM wallet connection updated");
    }
    if (connections.solanaConnection && connections.solanaWallet) {
      console.log("✅ Solana wallet connection updated");
    }
    if (connections.suiClient && connections.suiKeypair) {
      console.log("✅ Sui wallet connection updated");
    }
  }
  async healthCheck(): Promise<{
    evm: boolean;
    solana: boolean;
    sui: boolean;
  }> {
    const health = {
      evm: false,
      solana: false,
      sui: false,
    };

    try {
      // Check EVM connection
      if (this.walletConnections.evmProvider) {
        await this.walletConnections.evmProvider.getBlockNumber();
        health.evm = true;
      }
    } catch (error) {
      console.error("EVM health check failed:", error);
    }

    try {
      // Check Solana connection
      if (this.walletConnections.solanaConnection) {
        await this.walletConnections.solanaConnection.getSlot();
        health.solana = true;
      }
    } catch (error) {
      console.error("Solana health check failed:", error);
    }

    try {
      // Check Sui connection
      if (this.walletConnections.suiClient) {
        await this.walletConnections.suiClient.getLatestSuiSystemState();
        health.sui = true;
      }
    } catch (error) {
      console.error("Sui health check failed:", error);
    }

    return health;
  }
}

export class MayanSwapExample {
  private mayanSwap: MayanFinanceSwap;

  constructor(walletConnections?: WalletConnections) {
    this.mayanSwap = new MayanFinanceSwap(walletConnections);
  }

  // Complete dynamic swap example
  async executeDynamicSwap(
    fromChain: ChainName,
    toChain: ChainName,
    fromTokenSymbol: string,
    toTokenSymbol: string,
    amount: string,
    userAddresses: {
      origin: string;
      destination: string;
    },
    options?: {
      slippageBps?: number;
      gasDrop?: number;
      referrer?: string;
      referrerBps?: number;
    }
  ): Promise<SwapResult> {
    try {
      // 1. Get available tokens
      const fromTokens = await this.mayanSwap.getTokens(fromChain);
      const toTokens = await this.mayanSwap.getTokens(toChain);

      // 2. Find tokens by symbol
      const fromToken = fromTokens.find(
        (t) => t.symbol.toLowerCase() === fromTokenSymbol.toLowerCase()
      );
      const toToken = toTokens.find(
        (t) => t.symbol.toLowerCase() === toTokenSymbol.toLowerCase()
      );

      if (!fromToken || !toToken) {
        throw new Error(
          `Token not found: ${fromTokenSymbol} or ${toTokenSymbol}`
        );
      }

      // 3. Format amount
      const formattedAmount = this.mayanSwap.formatAmount(
        amount,
        fromToken.decimals
      );

      // 4. Get quote
      const swapParams: SwapParams = {
        amountIn: formattedAmount,
        fromToken,
        toToken,
        fromChain,
        toChain,
        slippageBps: options?.slippageBps || 300,
        gasDrop: options?.gasDrop || 0,
        referrer: options?.referrer,
        referrerBps: options?.referrerBps || 0,
      };

      const quotes = await this.mayanSwap.getQuote(swapParams);

      if (quotes.length === 0) {
        throw new Error("No quotes available");
      }

      const bestQuote = quotes[0];
      console.log("Quote details:", {
        estimatedAmountOut: bestQuote.expectedAmountOut,
        priceImpact: bestQuote.priceImpact,
        gasless: bestQuote.gasless,
      });

      // 5. Execute swap
      const referrerAddresses: ReferrerAddresses | undefined = options?.referrer
        ? { evm: options.referrer, solana: options.referrer }
        : undefined;

      const result = await this.mayanSwap.executeSwap(
        bestQuote,
        userAddresses.origin,
        userAddresses.destination,
        referrerAddresses
      );

      console.log("Swap execution result:", result);
      return result;
    } catch (error) {
      console.error("Dynamic swap failed:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  // Monitor swap progress with real-time updates
  async monitorSwap(
    transactionHash: string,
    onUpdate?: (status: any) => void,
    maxWaitTime: number = 300000 // 5 minutes
  ): Promise<any> {
    const startTime = Date.now();
    const checkInterval = 10000; // 10 seconds

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const status = await this.mayanSwap.trackSwap(transactionHash);

        if (onUpdate) {
          onUpdate(status);
        }

        console.log(`Swap status: ${status.clientStatus}`);

        if (
          status.clientStatus === "COMPLETED" ||
          status.clientStatus === "REFUNDED"
        ) {
          return status;
        }

        await new Promise((resolve) => setTimeout(resolve, checkInterval));
      } catch (error) {
        console.error("Error monitoring swap:", error);
        await new Promise((resolve) => setTimeout(resolve, checkInterval));
      }
    }

    throw new Error("Swap monitoring timeout");
  }

  // Bulk swap operations
  async executeBulkSwaps(
    swapRequests: Array<{
      fromChain: ChainName;
      toChain: ChainName;
      fromToken: string;
      toToken: string;
      amount: string;
      userAddresses: { origin: string; destination: string };
    }>
  ): Promise<SwapResult[]> {
    const results: SwapResult[] = [];

    for (const request of swapRequests) {
      try {
        const result = await this.executeDynamicSwap(
          request.fromChain,
          request.toChain,
          request.fromToken,
          request.toToken,
          request.amount,
          request.userAddresses
        );
        results.push(result);

        // Add delay between swaps to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 2000));
      } catch (error) {
        results.push({
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    return results;
  }
}

export default MayanFinanceSwap;
