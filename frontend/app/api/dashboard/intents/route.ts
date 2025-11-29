import { NextRequest, NextResponse } from "next/server";
import databaseService from "@/lib/services/firebase/database";
import { authenticateUser, AuthErrors } from "../middleware";

interface IntentsResponse {
  totalCount: number;
  automated: number;
  pendingApproval: number;
  intents: Array<{
    id: string;
    type: string;
    status: 'automated' | 'pending' | 'completed';
    createdAt: string;
    description: string;
  }>;
}

// Get user intents from swap transactions (representing intents)
async function getUserIntents(userId: string): Promise<IntentsResponse> {
  try {
    // Get user's swap transactions which represent their intents
    const swapTransactions = await databaseService.getSwapTransactionsByUserId(userId);

    // Map swap transactions to intents format
    const intents = swapTransactions.map(transaction => ({
      id: transaction.id,
      type: 'swap', // For now, all intents are swaps
      status: mapTransactionStatusToIntentStatus(transaction.status),
      createdAt: transaction.createdAt.toISOString(),
      description: generateIntentDescription(transaction),
    }));

    // Count different types of intents
    const automated = intents.filter(intent => intent.status === 'automated').length;
    const pendingApproval = intents.filter(intent => intent.status === 'pending').length;
    const totalCount = intents.length;

    return {
      totalCount,
      automated,
      pendingApproval,
      intents,
    };
  } catch (error) {
    console.error("Error getting user intents:", error);
    return {
      totalCount: 0,
      automated: 0,
      pendingApproval: 0,
      intents: [],
    };
  }
}

// Map transaction status to intent status
function mapTransactionStatusToIntentStatus(
  transactionStatus: string
): 'automated' | 'pending' | 'completed' {
  switch (transactionStatus) {
    case 'completed':
      return 'completed';
    case 'pending':
      return 'pending';
    case 'processing':
      return 'automated';
    default:
      return 'pending';
  }
}

// Generate intent description from transaction data
function generateIntentDescription(transaction: {
  fromToken?: string;
  toToken?: string;
  fromAmount?: string;
  type?: string;
}): string {
  if (transaction.fromToken && transaction.toToken) {
    return `Swap ${transaction.fromAmount || '0'} ${transaction.fromToken} to ${transaction.toToken}`;
  }
  return `${transaction.type || 'Transaction'} intent`;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate user
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json(AuthErrors.UNAUTHORIZED, { status: 401 });
    }

    // Get user's intents
    const intentsData = await getUserIntents(user.id);

    return NextResponse.json(intentsData);
  } catch (error) {
    console.error("Intents API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}