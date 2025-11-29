import { NextRequest, NextResponse } from "next/server";

/**
 * Test endpoint to verify dashboard API endpoints are working
 * This endpoint can be used to test authentication and basic functionality
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const baseUrl = request.nextUrl.origin;

        // Test headers that would be sent by a real client
        const testHeaders = {
            'x-organization-id': 'test-org-123',
            'Content-Type': 'application/json',
        };

        const endpoints = [
            '/api/dashboard/portfolio',
            '/api/dashboard/intents',
            '/api/dashboard/transactions'
        ];

        const results = await Promise.allSettled(
            endpoints.map(async (endpoint) => {
                try {
                    const response = await fetch(`${baseUrl}${endpoint}`, {
                        method: 'GET',
                        headers: testHeaders,
                    });

                    return {
                        endpoint,
                        status: response.status,
                        ok: response.ok,
                        statusText: response.statusText,
                    };
                } catch (error) {
                    return {
                        endpoint,
                        status: 500,
                        ok: false,
                        error: error instanceof Error ? error.message : 'Unknown error',
                    };
                }
            })
        );

        const testResults = results.map((result, index) => {
            const baseResult = {
                endpoint: endpoints[index],
            };

            if (result.status === 'fulfilled') {
                return { ...baseResult, ...result.value };
            } else {
                return { ...baseResult, error: result.reason };
            }
        });

        return NextResponse.json({
            message: "Dashboard API endpoints test completed",
            timestamp: new Date().toISOString(),
            results: testResults,
        });
    } catch (error) {
        console.error("Test endpoint error:", error);
        return NextResponse.json(
            {
                error: "Test failed",
                message: error instanceof Error ? error.message : 'Unknown error'
            },
            { status: 500 }
        );
    }
}