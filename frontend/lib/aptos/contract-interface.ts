/**
 * Aptos Contract Interface
 * Type-safe interactions with deployed smart contracts
 */

import {
    Aptos,
    InputGenerateTransactionPayloadData,
    InputEntryFunctionData,
} from "@aptos-labs/ts-sdk";
import { aptosClient } from "./wallet";
import { APTOS_CONFIG, getFunctionId } from "./config";

/**
 * Strategy data structure from contract
 */
export interface Strategy {
    id: number;
    owner: string;
    strategyType: number;
    params: number[]; // JSON-encoded as bytes
    status: number;
    createdAt: number;
    lastExecuted: number;
    executionCount: number;
    intervalSeconds: number;
    maxExecutions: number;
}

/**
 * Build payload for creating a strategy
 */
export function buildCreateStrategyPayload(
    strategyType: number,
    params: string, // JSON string
    intervalSeconds: number,
    maxExecutions: number = 0
): InputEntryFunctionData {
    // Convert JSON string to bytes
    const paramsBytes = Array.from(new TextEncoder().encode(params));

    return {
        function: getFunctionId("strategyRegistry", "create_strategy") as `${string}::${string}::${string}`,
        typeArguments: [],
        functionArguments: [
            strategyType,
            paramsBytes,
            intervalSeconds,
            maxExecutions,
        ],
    };
}

/**
 * Build payload for pausing a strategy
 */
export function buildPauseStrategyPayload(strategyId: number): InputEntryFunctionData {
    return {
        function: getFunctionId("strategyRegistry", "pause_strategy") as `${string}::${string}::${string}`,
        typeArguments: [],
        functionArguments: [strategyId],
    };
}

/**
 * Build payload for resuming a strategy
 */
export function buildResumeStrategyPayload(strategyId: number): InputEntryFunctionData {
    return {
        function: getFunctionId("strategyRegistry", "resume_strategy") as `${string}::${string}::${string}`,
        typeArguments: [],
        functionArguments: [strategyId],
    };
}

/**
 * Build payload for cancelling a strategy
 */
export function buildCancelStrategyPayload(strategyId: number): InputEntryFunctionData {
    return {
        function: getFunctionId("strategyRegistry", "cancel_strategy") as `${string}::${string}::${string}`,
        typeArguments: [],
        functionArguments: [strategyId],
    };
}

/**
 * Build payload for supplying to lending protocol
 */
export function buildSupplyPayload<T extends string>(
    coinType: T,
    amount: number
): InputEntryFunctionData {
    return {
        function: getFunctionId("lending", "supply") as `${string}::${string}::${string}`,
        typeArguments: [coinType],
        functionArguments: [amount],
    };
}

/**
 * Build payload for withdrawing from lending protocol
 */
export function buildWithdrawPayload<T extends string>(
    coinType: T,
    amount: number
): InputEntryFunctionData {
    return {
        function: getFunctionId("lending", "withdraw") as `${string}::${string}::${string}`,
        typeArguments: [coinType],
        functionArguments: [amount],
    };
}

/**
 * Build payload for borrowing from lending protocol
 */
export function buildBorrowPayload<T extends string>(
    coinType: T,
    amount: number
): InputEntryFunctionData {
    return {
        function: getFunctionId("lending", "borrow") as `${string}::${string}::${string}`,
        typeArguments: [coinType],
        functionArguments: [amount],
    };
}

/**
 * Build payload for repaying borrowed assets
 */
export function buildRepayPayload<T extends string>(
    coinType: T,
    amount: number
): InputEntryFunctionData {
    return {
        function: getFunctionId("lending", "repay") as `${string}::${string}::${string}`,
        typeArguments: [coinType],
        functionArguments: [amount],
    };
}

/**
 * Build payload for token swap
 */
export function buildSwapPayload<TIn extends string, TOut extends string>(
    coinTypeIn: TIn,
    coinTypeOut: TOut,
    amountIn: number,
    minAmountOut: number
): InputEntryFunctionData {
    return {
        function: getFunctionId("dexRouter", "swap_exact_in") as `${string}::${string}::${string}`,
        typeArguments: [coinTypeIn, coinTypeOut],
        functionArguments: [amountIn, minAmountOut],
    };
}

/**
 * Get user's strategies from contract
 */
export async function getUserStrategies(userAddress: string): Promise<number[]> {
    try {
        const result = await aptosClient.view({
            payload: {
                function: getFunctionId("strategyRegistry", "get_user_strategies") as `${string}::${string}::${string}`,
                typeArguments: [],
                functionArguments: [userAddress],
            },
        });

        return result[0] as number[];
    } catch (error) {
        console.error("Error fetching user strategies:", error);
        return [];
    }
}

/**
 * Get strategy details from contract
 */
export async function getStrategy(strategyId: number): Promise<Strategy | null> {
    try {
        const result = await aptosClient.view({
            payload: {
                function: getFunctionId("strategyRegistry", "get_strategy") as `${string}::${string}::${string}`,
                typeArguments: [],
                functionArguments: [strategyId],
            },
        });

        // Result is a tuple of strategy fields
        const [
            id,
            owner,
            strategyType,
            params,
            status,
            createdAt,
            lastExecuted,
            executionCount,
            intervalSeconds,
            maxExecutions,
        ] = result as [
            number,
            string,
            number,
            number[],
            number,
            number,
            number,
            number,
            number,
            number
        ];

        return {
            id,
            owner,
            strategyType,
            params,
            status,
            createdAt,
            lastExecuted,
            executionCount,
            intervalSeconds,
            maxExecutions,
        };
    } catch (error) {
        console.error("Error fetching strategy:", error);
        return null;
    }
}

/**
 * Check if strategy can be executed
 */
export async function canExecuteStrategy(strategyId: number): Promise<boolean> {
    try {
        const result = await aptosClient.view({
            payload: {
                function: getFunctionId("strategyRegistry", "can_execute") as `${string}::${string}::${string}`,
                typeArguments: [],
                functionArguments: [strategyId],
            },
        });

        return result[0] as boolean;
    } catch (error) {
        console.error("Error checking strategy execution:", error);
        return false;
    }
}

/**
 * Get total number of strategies
 */
export async function getTotalStrategies(): Promise<number> {
    try {
        const result = await aptosClient.view({
            payload: {
                function: getFunctionId("strategyRegistry", "get_total_strategies") as `${string}::${string}::${string}`,
                typeArguments: [],
                functionArguments: [],
            },
        });

        return result[0] as number;
    } catch (error) {
        console.error("Error fetching total strategies:", error);
        return 0;
    }
}

/**
 * Simulate transaction before submission
 */
export async function simulateTransaction(
    sender: string,
    payload: InputEntryFunctionData
) {
    try {
        const transaction = await aptosClient.transaction.build.simple({
            sender,
            data: payload,
        });

        const simulation = await aptosClient.transaction.simulate.simple({
            signerPublicKey: sender as any, // Will be replaced with actual public key
            transaction,
        });

        return simulation;
    } catch (error) {
        console.error("Error simulating transaction:", error);
        throw error;
    }
}
