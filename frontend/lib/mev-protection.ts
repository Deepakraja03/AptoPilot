import { sendTransaction } from "./swap-utils";

interface RelayResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  provider: string;
  mevProtection: boolean;
  relayTime?: number;
}

const merkle = {
  name: "Merkle.io Private Mempool",
  supportedChains: [1, 56, 8453, 103], // Ethereum, BSC, Base
  endpoints: {
    1: "https://mempool.merkle.io/rpc/eth/pk_mbs_164a0daad0a610ad3aace0b4a99e93da",
    56: "https://mempool.merkle.io/rpc/bsc/pk_mbs_164a0daad0a610ad3aace0b4a99e93da",
    8453: "https://mempool.merkle.io/rpc/base/pk_mbs_164a0daad0a610ad3aace0b4a99e93da",
    103: "https://svm.merkle.io/pk_mbs_164a0daad0a610ad3aace0b4a99e93da", // optional: Solana
  },
  features: [
    "mev_protection",
    "private_mempool",
    "guaranteed_inclusion",
    "transaction_status_api",
    "auto_nonce_management",
  ],
  statusEndpoint: "https://mempool.merkle.io/transaction",
};

/**
 * Helper function to convert chain ID to chain name
 */
const getChainNameFromId = (chainId: number): string => {
  switch (chainId) {
    case 1:
      return "ETH_MAINNET";
    case 56:
      return "BSC_MAINNET";
    case 8453:
      return "BASE_MAINNET";
    case 103:
      return "SOLANA_MAINNET";
    default:
      return "ETH_MAINNET";
  }
};

/**
 * Fallback submission via regular RPC
 */
const submitViaRegularRpc = async (
  signedTransaction: string,
  chainId: number
): Promise<RelayResult> => {
  try {
    // Import your existing sendTransaction function

    const chainName = getChainNameFromId(chainId);

    const result = await sendTransaction(signedTransaction, chainName);

    return {
      success: result.status === "success" || result.status === "pending",
      transactionHash: result.txHash,
      provider: "regular_rpc",
      mevProtection: false,
    };
  } catch (error) {
    console.error("Regular RPC submission failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      provider: "regular_rpc",
      mevProtection: false,
    };
  }
};

/**
 * Submit transaction with MEV protection
 */
export const submitMevProtectedTransaction = async (
  signedTransaction: string,
  chainId: number,
  transactionType: "swap" | "approval" | "transfer" = "swap"
): Promise<RelayResult> => {
  const startTime = Date.now();

  try {
    return await submitViaMerkle(signedTransaction, chainId, transactionType);
  } catch {
    // Fallback to regular submission
    console.log("Falling back to regular RPC submission...");
    return await submitViaRegularRpc(signedTransaction, chainId);
  } finally {
    const relayTime = Date.now() - startTime;
    console.log(`MEV relay attempt took ${relayTime}ms`);
  }
};

/**
 * Submit transaction via Merkle.io Private Mempool
 */
const submitViaMerkle = async (
  signedTransaction: string,
  chainId: number,
  transactionType: "swap" | "approval" | "transfer"
): Promise<RelayResult> => {
  try {
    console.log(
      `🔒 Submitting ${transactionType} transaction via Merkle.io private mempool...`
    );

    const config = merkle;
    const endpoint = config.endpoints[chainId as keyof typeof config.endpoints];

    if (!endpoint) {
      throw new Error(
        `No Merkle.io endpoint configured for chainId ${chainId}`
      );
    }

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "AgentTheo/1.0",
      },
      body: JSON.stringify({
        jsonrpc: "2.0",
        method: "eth_sendRawTransaction",
        params: [
          signedTransaction,
          // Optional source tag for cashback/analytics
          `agent-theo-${transactionType}`,
        ],
        id: Date.now(),
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Merkle.io HTTP error: ${response.status} ${response.statusText}`
      );
    }

    const data = await response.json();

    if (data.error) {
      throw new Error(
        `Merkle.io RPC error: ${data.error.message} (Code: ${data.error.code})`
      );
    }

    console.log(
      `✅ Transaction submitted to Merkle.io private mempool: ${data.result}`
    );

    return {
      success: true,
      transactionHash: data.result,
      provider: "merkle",
      mevProtection: true,
      relayTime: Date.now(),
    };
  } catch (error) {
    console.error("❌ Merkle.io submission failed:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
      provider: "merkle",
      mevProtection: false,
    };
  }
};
