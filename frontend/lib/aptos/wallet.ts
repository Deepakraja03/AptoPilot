/**
 * Aptos Wallet Utilities
 * Handles wallet connection and interaction using Turnkey
 */

import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";
import { getCurrentNetwork } from "./config";

// Initialize Aptos client
const aptosConfig = new AptosConfig({
    network: Network.TESTNET, // Change to MAINNET for production
});

export const aptosClient = new Aptos(aptosConfig);

/**
 * Get Aptos wallet address from Turnkey accounts
 */
export const getAptosAddress = async (
    getWalletAccounts: (walletId: string) => Promise<any>,
    wallets: any[]
): Promise<string | null> => {
    if (!wallets || wallets.length === 0) return null;

    for (const wallet of wallets) {
        try {
            const response = await getWalletAccounts(wallet.walletId);
            if (response?.accounts) {
                const aptosAccount = response.accounts.find(
                    (account: { addressFormat: string }) =>
                        account.addressFormat === "ADDRESS_FORMAT_APTOS"
                );
                if (aptosAccount) {
                    return aptosAccount.address;
                }
            }
        } catch (error) {
            console.error(`Error loading accounts for wallet ${wallet.walletId}:`, error);
        }
    }

    return null;
};

/**
 * Get APT balance for an address
 */
export const getAptBalance = async (address: string): Promise<number> => {
    try {
        const resources = await aptosClient.getAccountResources({
            accountAddress: address,
        });

        const aptResource = resources.find(
            (r) => r.type === "0x1::coin::CoinStore<0x1::aptos_coin::AptosCoin>"
        );

        if (aptResource && "coin" in aptResource.data) {
            const coinData = aptResource.data.coin as { value: string };
            // APT has 8 decimals
            return parseInt(coinData.value) / 100000000;
        }

        return 0;
    } catch (error) {
        console.error("Error fetching APT balance:", error);
        return 0;
    }
};

/**
 * Get account info including sequence number
 */
export const getAccountInfo = async (address: string) => {
    try {
        const account = await aptosClient.getAccountInfo({
            accountAddress: address,
        });
        return account;
    } catch (error) {
        console.error("Error fetching account info:", error);
        return null;
    }
};

/**
 * Check if account exists on-chain
 */
export const accountExists = async (address: string): Promise<boolean> => {
    try {
        await aptosClient.getAccountInfo({
            accountAddress: address,
        });
        return true;
    } catch (error) {
        return false;
    }
};

/**
 * Get transaction by hash
 */
export const getTransaction = async (txHash: string) => {
    try {
        const transaction = await aptosClient.getTransactionByHash({
            transactionHash: txHash,
        });
        return transaction;
    } catch (error) {
        console.error("Error fetching transaction:", error);
        return null;
    }
};

/**
 * Wait for transaction confirmation
 */
export const waitForTransaction = async (
    txHash: string,
    options?: { timeoutSecs?: number; checkSuccess?: boolean }
) => {
    try {
        const result = await aptosClient.waitForTransaction({
            transactionHash: txHash,
            options: {
                timeoutSecs: options?.timeoutSecs || 30,
                checkSuccess: options?.checkSuccess !== false,
            },
        });
        return result;
    } catch (error) {
        console.error("Error waiting for transaction:", error);
        throw error;
    }
};

/**
 * Get explorer URL for transaction
 */
export const getExplorerUrl = (txHash: string): string => {
    const network = getCurrentNetwork();
    return `${network.explorerUrl}/txn/${txHash}?network=testnet`;
};

/**
 * Get explorer URL for account
 */
export const getAccountExplorerUrl = (address: string): string => {
    const network = getCurrentNetwork();
    return `${network.explorerUrl}/account/${address}?network=testnet`;
};

/**
 * Get Aptos public key from Turnkey wallet
 */
export const getAptosPublicKey = async (
    getWalletAccounts: (walletId: string) => Promise<any>,
    wallets: any[]
): Promise<any | null> => {
    if (!wallets || wallets.length === 0) return null;

    for (const wallet of wallets) {
        try {
            const response = await getWalletAccounts(wallet.walletId);
            if (response?.accounts) {
                const aptosAccount = response.accounts.find(
                    (account: { addressFormat: string; publicKey?: string }) =>
                        account.addressFormat === "ADDRESS_FORMAT_APTOS"
                );

                if (aptosAccount && aptosAccount.publicKey) {
                    // Return the hex public key - we'll convert it when needed
                    return aptosAccount.publicKey;
                }
            }
        } catch (error) {
            console.error(`Error loading accounts for wallet ${wallet.walletId}:`, error);
        }
    }

    return null;
};
