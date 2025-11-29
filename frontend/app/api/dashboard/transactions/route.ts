import { NextRequest, NextResponse } from "next/server";
import goldRushService, {
  SupportedChain,
  ProcessedTransaction,
} from "@/lib/goldrush";
import { authenticateUser, AuthErrors } from "../middleware";

interface TransactionsResponse {
  transactions: Array<{
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
    // Additional fields for swap transactions
    fromToken?: string;
    toToken?: string;
    fromAmount?: number;
    toAmount?: number;
  }>;
}

// Get user wallet addresses from their wallets for multi-chain operations
async function getUserMultiChainAddresses(
  userId: string
): Promise<Record<SupportedChain, string | null>> {
  try {
    const { getUserWalletAddresses } = await import("../middleware");
    const walletInfo = await getUserWalletAddresses(userId);

    if (!walletInfo) {
      return {
        ETHEREUM: null,
        BASE: null,
        BSC: null,
        SOLANA: null,
        POLYGON: null,
        ARBITRUM: null,
        OPTIMISM: null,
      };
    }

    // Enhanced: Use chain-specific addresses with proper fallbacks
    const { chainAddresses, primaryAddress } = walletInfo;

    // Map chain-specific addresses where available, fallback to primary
    return {
      // EVM chains use Ethereum address
      ETHEREUM: chainAddresses?.ethereum || primaryAddress,
      BASE: chainAddresses?.ethereum || primaryAddress,
      BSC: chainAddresses?.ethereum || primaryAddress,
      POLYGON: chainAddresses?.ethereum || primaryAddress,
      ARBITRUM: chainAddresses?.ethereum || primaryAddress,
      OPTIMISM: chainAddresses?.ethereum || primaryAddress,
      // Use actual Solana address from user's wallet
      SOLANA: chainAddresses?.solana || null,
    };
  } catch {
    return {
      ETHEREUM: null,
      BASE: null,
      BSC: null,
      SOLANA: null,
      POLYGON: null,
      ARBITRUM: null,
      OPTIMISM: null,
    };
  }
}

// Get recent cross-chain transactions
async function getRecentTransactions(
  walletAddresses: Record<SupportedChain, string | null>,
  limit: number = 5
): Promise<TransactionsResponse> {
  try {
    const allTransactions: (ProcessedTransaction & {
      chain: SupportedChain;
      chainName?: string;
    })[] = [];

    // Fetch transactions from all chains
    const chainPromises = Object.entries(walletAddresses)
      .filter(([, address]) => address !== null)
      .map(async ([chainKey, address]) => {
        try {
          const chain = chainKey as SupportedChain;
          const walletData = await goldRushService.getWalletBalances(
            address!,
            chain
          );

          return walletData.recentTransactions.map(
            (tx: ProcessedTransaction) => ({
              ...tx,
              chain,
              chainName: goldRushService.getChainDisplayName(chain),
            })
          );
        } catch {
          return [];
        }
      });

    const chainResults = await Promise.allSettled(chainPromises);

    chainResults.forEach((result) => {
      if (result.status === "fulfilled") {
        allTransactions.push(...result.value);
      }
    });

    // Sort by timestamp (most recent first) and limit
    allTransactions.sort(
      (a, b) =>
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    const limitedTransactions = allTransactions.slice(0, limit);

    // Format transactions for response
    const formattedTransactions = limitedTransactions.map(
      (
        tx: ProcessedTransaction & {
          chain: SupportedChain;
          chainName?: string;
        },
        index
      ) => ({
        id: tx.hash || `tx_${index}`,
        hash: tx.hash || "",
        type: tx.type as "sent" | "received" | "swap",
        fromChain: tx.chainName || "Unknown",
        toChain: tx.chainName || "Unknown", // For cross-chain, this would be different
        amount: tx.value || 0,
        symbol:
          tx.primaryToken || goldRushService.getNativeTokenSymbol(tx.chain), // Use primaryToken if available
        timestamp: tx.timestamp,
        status: tx.successful ? ("completed" as const) : ("failed" as const),
        description: tx.description || "Transaction",
        // Include swap token information
        fromToken: tx.fromToken,
        toToken: tx.toToken,
        fromAmount: tx.fromAmount,
        toAmount: tx.toAmount,
      })
    );

    return {
      transactions: formattedTransactions,
    };
  } catch {
    return {
      transactions: [],
    };
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate user
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json(AuthErrors.UNAUTHORIZED, { status: 401 });
    }

    // Get query parameters
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "5", 10);

    // Get user's wallet addresses
    const walletAddresses = await getUserMultiChainAddresses(user.id);

    // Get recent transactions
    const transactionsData = await getRecentTransactions(
      walletAddresses,
      limit
    );



    return NextResponse.json(transactionsData);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
