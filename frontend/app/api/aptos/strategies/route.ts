/**
 * API Route: Get User Strategies
 * GET /api/aptos/strategies?address=0x...
 */

import { NextRequest, NextResponse } from "next/server";
import { getUserStrategies, getStrategy } from "@/lib/aptos/contract-interface";
import { APTOS_CONFIG } from "@/lib/aptos/config";

export async function GET(request: NextRequest) {
    try {
        const { searchParams } = new URL(request.url);
        const address = searchParams.get("address");

        if (!address) {
            return NextResponse.json(
                { success: false, error: "Address is required" },
                { status: 400 }
            );
        }

        // Get user's strategy IDs
        const strategyIds = await getUserStrategies(address);

        // Fetch details for each strategy
        const strategies = await Promise.all(
            strategyIds.map(async (id) => {
                const strategy = await getStrategy(id);
                if (!strategy) return null;

                // Parse params from bytes
                let params = {};
                try {
                    const paramsString = new TextDecoder().decode(
                        new Uint8Array(strategy.params)
                    );
                    params = JSON.parse(paramsString);
                } catch (e) {
                    console.error("Error parsing strategy params:", e);
                }

                // Get strategy type name
                const strategyTypeName = Object.keys(APTOS_CONFIG.strategyTypes).find(
                    (key) =>
                        APTOS_CONFIG.strategyTypes[
                        key as keyof typeof APTOS_CONFIG.strategyTypes
                        ] === strategy.strategyType
                );

                // Get status name
                const statusName = Object.keys(APTOS_CONFIG.strategyStatus).find(
                    (key) =>
                        APTOS_CONFIG.strategyStatus[
                        key as keyof typeof APTOS_CONFIG.strategyStatus
                        ] === strategy.status
                );

                return {
                    ...strategy,
                    params,
                    strategyTypeName,
                    statusName,
                };
            })
        );

        // Filter out null strategies
        const validStrategies = strategies.filter((s) => s !== null);

        return NextResponse.json({
            success: true,
            strategies: validStrategies,
            count: validStrategies.length,
        });
    } catch (error) {
        console.error("Error fetching strategies:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
