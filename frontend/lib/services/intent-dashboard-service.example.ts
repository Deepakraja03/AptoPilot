/**
 * Example usage of IntentService for dashboard integration
 * This file demonstrates how to use the IntentService in the dashboard
 */

import { intentService, DashboardIntent } from './intent-dashboard-service';

// Example: Create a new intent
export async function createExampleIntent(userId: string): Promise<DashboardIntent> {
    const newIntent = await intentService.createIntent({
        userId,
        type: 'swap',
        status: 'automated',
        description: 'Swap 100 USDC to ETH on Ethereum',
        fromChain: 'ethereum',
        toChain: 'ethereum',
        amount: 100,
        symbol: 'USDC',
    });

    console.log('Created intent:', newIntent);
    return newIntent;
}

// Example: Get user intents for dashboard
export async function getDashboardIntents(userId: string) {
    try {
        const intentsResponse = await intentService.getUserIntents(userId);

        console.log('Dashboard intents:', {
            totalCount: intentsResponse.totalCount,
            automated: intentsResponse.automated,
            pendingApproval: intentsResponse.pendingApproval,
            intents: intentsResponse.intents,
        });

        return intentsResponse;
    } catch (error) {
        console.error('Error fetching dashboard intents:', error);
        // Return empty response on error to prevent dashboard from breaking
        return {
            totalCount: 0,
            automated: 0,
            pendingApproval: 0,
            intents: [],
        };
    }
}

// Example: Update intent status
export async function updateIntentStatus(intentId: string, status: 'automated' | 'pending' | 'completed' | 'failed') {
    try {
        await intentService.updateIntent(intentId, { status });
        console.log(`Intent ${intentId} status updated to ${status}`);
    } catch (error) {
        console.error('Error updating intent status:', error);
        throw error;
    }
}

// Example: Check Firebase connection health
export async function checkIntentServiceHealth(): Promise<boolean> {
    try {
        const isHealthy = await intentService.checkConnectionHealth();
        console.log('Intent service health:', isHealthy ? 'Healthy' : 'Unhealthy');
        return isHealthy;
    } catch (error) {
        console.error('Error checking intent service health:', error);
        return false;
    }
}

// Example: Get active intents count for dashboard metric
export async function getActiveIntentsMetric(userId: string): Promise<number> {
    try {
        const count = await intentService.getActiveIntentsCount(userId);
        console.log(`User ${userId} has ${count} active intents`);
        return count;
    } catch (error) {
        console.error('Error getting active intents count:', error);
        return 0; // Return 0 on error to prevent dashboard from breaking
    }
}