/**
 * Aptos Intent Parser
 * Parses natural language intents into Aptos-specific actions
 */

import { APTOS_CONFIG } from "./config";

export interface AptosIntent {
    type: "yield" | "dca" | "lending" | "borrow" | "swap" | "stake";
    action: string;
    token?: string;
    amount?: number;
    targetToken?: string;
    parameters?: {
        // For yield optimization
        minApy?: number;
        riskLevel?: "low" | "medium" | "high";
        autoMove?: boolean;

        // For DCA
        interval?: number; // in seconds
        totalAmount?: number;
        frequency?: string; // "daily", "weekly", "monthly"

        // For lending
        collateralToken?: string;
        collateralAmount?: number;
        borrowToken?: string;
        borrowAmount?: number;

        // For APY exit
        exitApy?: number;
    };
    strategyType?: number; // Maps to contract strategy type
    description?: string;
}

/**
 * Parse natural language intent for Aptos DeFi
 */
export async function parseAptosIntent(
    intent: string,
    userAddress?: string
): Promise<AptosIntent | null> {
    const lowerIntent = intent.toLowerCase();

    // Yield optimization patterns
    if (
        lowerIntent.includes("safe yield") ||
        lowerIntent.includes("earn") ||
        (lowerIntent.includes("yield") && lowerIntent.includes("move"))
    ) {
        return parseYieldIntent(intent);
    }

    // DCA patterns
    if (lowerIntent.includes("dca") || lowerIntent.includes("dollar cost")) {
        return parseDCAIntent(intent);
    }

    // Lending patterns
    if (lowerIntent.includes("supply") || lowerIntent.includes("deposit")) {
        return parseLendingIntent(intent);
    }

    // Borrowing patterns
    if (lowerIntent.includes("borrow") || lowerIntent.includes("loan")) {
        return parseBorrowIntent(intent);
    }

    // Swap patterns
    if (lowerIntent.includes("swap") || lowerIntent.includes("exchange")) {
        return parseSwapIntent(intent);
    }

    // Staking patterns
    if (lowerIntent.includes("stake")) {
        return parseStakeIntent(intent);
    }

    return null;
}

/**
 * Parse yield optimization intent
 * Example: "I want safe yield on my APT token, move if a better pool appears"
 */
function parseYieldIntent(intent: string): AptosIntent {
    const lowerIntent = intent.toLowerCase();

    // Extract token
    const token = extractToken(intent) || "APT";

    // Extract amount
    const amount = extractAmount(intent);

    // Determine risk level
    let riskLevel: "low" | "medium" | "high" = "medium";
    if (lowerIntent.includes("safe") || lowerIntent.includes("low risk")) {
        riskLevel = "low";
    } else if (lowerIntent.includes("high risk") || lowerIntent.includes("aggressive")) {
        riskLevel = "high";
    }

    // Check if auto-move is requested
    const autoMove =
        lowerIntent.includes("move") ||
        lowerIntent.includes("switch") ||
        lowerIntent.includes("better pool");

    // Minimum APY for safe yield (default 5%)
    const minApy = riskLevel === "low" ? 5 : riskLevel === "medium" ? 8 : 12;

    return {
        type: "yield",
        action: "create_yield_strategy",
        token,
        amount,
        strategyType: APTOS_CONFIG.strategyTypes.YIELD_OPT,
        parameters: {
            minApy,
            riskLevel,
            autoMove,
        },
        description: `Create yield optimization strategy for ${amount || "all"} ${token} with ${riskLevel} risk, minimum ${minApy}% APY${autoMove ? ", auto-move enabled" : ""}`,
    };
}

/**
 * Parse DCA intent
 * Example: "DCA 5 APT into USDC every week"
 */
function parseDCAIntent(intent: string): AptosIntent {
    const lowerIntent = intent.toLowerCase();

    // Extract tokens
    const fromToken = extractToken(intent) || "APT";
    const toToken = extractTargetToken(intent) || "USDC";

    // Extract amount
    const amount = extractAmount(intent);

    // Extract frequency
    let interval = 86400; // Default: daily (in seconds)
    let frequency = "daily";

    if (lowerIntent.includes("week")) {
        interval = 604800; // 7 days
        frequency = "weekly";
    } else if (lowerIntent.includes("month")) {
        interval = 2592000; // 30 days
        frequency = "monthly";
    } else if (lowerIntent.includes("hour")) {
        interval = 3600;
        frequency = "hourly";
    }

    return {
        type: "dca",
        action: "create_dca_strategy",
        token: fromToken,
        targetToken: toToken,
        amount,
        strategyType: APTOS_CONFIG.strategyTypes.DCA,
        parameters: {
            interval,
            frequency,
            totalAmount: amount,
        },
        description: `Create DCA strategy: ${amount || "auto"} ${fromToken} → ${toToken} ${frequency}`,
    };
}

/**
 * Parse lending/supply intent
 * Example: "Supply 10 APT to earn interest"
 */
function parseLendingIntent(intent: string): AptosIntent {
    const token = extractToken(intent) || "APT";
    const amount = extractAmount(intent);

    return {
        type: "lending",
        action: "supply",
        token,
        amount,
        description: `Supply ${amount || "all"} ${token} to lending protocol`,
    };
}

/**
 * Parse borrow intent
 * Example: "Borrow 100 USDC against my APT"
 */
function parseBorrowIntent(intent: string): AptosIntent {
    const lowerIntent = intent.toLowerCase();

    // Extract borrow token and amount
    const borrowToken = extractToken(intent) || "USDC";
    const borrowAmount = extractAmount(intent);

    // Extract collateral token
    let collateralToken = "APT";
    if (lowerIntent.includes("against")) {
        const afterAgainst = lowerIntent.split("against")[1];
        const extracted = extractToken(afterAgainst);
        if (extracted) collateralToken = extracted;
    }

    return {
        type: "borrow",
        action: "borrow",
        token: borrowToken,
        amount: borrowAmount,
        parameters: {
            collateralToken,
            borrowToken,
            borrowAmount,
        },
        description: `Borrow ${borrowAmount || "max"} ${borrowToken} using ${collateralToken} as collateral`,
    };
}

/**
 * Parse swap intent
 * Example: "Swap 5 APT for USDC"
 */
function parseSwapIntent(intent: string): AptosIntent {
    const fromToken = extractToken(intent) || "APT";
    const toToken = extractTargetToken(intent) || "USDC";
    const amount = extractAmount(intent);

    return {
        type: "swap",
        action: "swap",
        token: fromToken,
        targetToken: toToken,
        amount,
        description: `Swap ${amount || "all"} ${fromToken} for ${toToken}`,
    };
}

/**
 * Parse stake intent
 * Example: "Stake 10 APT"
 */
function parseStakeIntent(intent: string): AptosIntent {
    const token = extractToken(intent) || "APT";
    const amount = extractAmount(intent);

    return {
        type: "stake",
        action: "stake",
        token,
        amount,
        description: `Stake ${amount || "all"} ${token}`,
    };
}

/**
 * Extract token symbol from intent
 */
function extractToken(intent: string): string | null {
    const tokens = ["APT", "USDC", "USDT", "WETH", "BTC"];
    const upperIntent = intent.toUpperCase();

    for (const token of tokens) {
        if (upperIntent.includes(token)) {
            return token;
        }
    }

    return null;
}

/**
 * Extract target token (for swaps, DCA)
 */
function extractTargetToken(intent: string): string | null {
    const lowerIntent = intent.toLowerCase();
    const tokens = ["APT", "USDC", "USDT", "WETH", "BTC"];

    // Look for patterns like "to USDC", "into USDC", "for USDC"
    const patterns = [" to ", " into ", " for "];

    for (const pattern of patterns) {
        if (lowerIntent.includes(pattern)) {
            const afterPattern = lowerIntent.split(pattern)[1];
            for (const token of tokens) {
                if (afterPattern.toUpperCase().includes(token)) {
                    return token;
                }
            }
        }
    }

    return null;
}

/**
 * Extract amount from intent
 */
function extractAmount(intent: string): number | undefined {
    // Match patterns like "5 APT", "10.5 USDC", etc.
    const amountMatch = intent.match(/(\d+\.?\d*)\s*[A-Z]/);
    if (amountMatch) {
        return parseFloat(amountMatch[1]);
    }

    return undefined;
}
