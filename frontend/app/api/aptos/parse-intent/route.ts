/**
 * API Route: Parse Aptos Intent
 * POST /api/aptos/parse-intent
 */

import { NextRequest, NextResponse } from "next/server";
import { parseAptosIntent } from "@/lib/aptos/intent-parser";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const { intent, userAddress } = body;

        if (!intent || typeof intent !== "string") {
            return NextResponse.json(
                { success: false, error: "Intent is required" },
                { status: 400 }
            );
        }

        // Parse the intent
        const parsedIntent = await parseAptosIntent(intent, userAddress);

        if (!parsedIntent) {
            return NextResponse.json(
                {
                    success: false,
                    error: "Could not parse intent. Please try rephrasing your request.",
                },
                { status: 400 }
            );
        }

        return NextResponse.json({
            success: true,
            intent: parsedIntent,
            message: parsedIntent.description,
        });
    } catch (error) {
        console.error("Error parsing Aptos intent:", error);
        return NextResponse.json(
            {
                success: false,
                error: error instanceof Error ? error.message : "Unknown error",
            },
            { status: 500 }
        );
    }
}
