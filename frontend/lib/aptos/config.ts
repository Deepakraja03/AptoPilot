/**
 * Aptos Network and Contract Configuration
 */

export const APTOS_CONFIG = {
    // Network Configuration
    network: {
        testnet: {
            name: "Aptos Testnet",
            rpcUrl: "https://fullnode.testnet.aptoslabs.com/v1",
            explorerUrl: "https://explorer.aptoslabs.com",
            chainId: 2, // Testnet chain ID
        },
        mainnet: {
            name: "Aptos Mainnet",
            rpcUrl: "https://fullnode.mainnet.aptoslabs.com/v1",
            explorerUrl: "https://explorer.aptoslabs.com",
            chainId: 1, // Mainnet chain ID
        },
    },

    // Contract Addresses (deployed on testnet)
    contracts: {
        strategyRegistry:
            "0x649c0a6a035ba145736761a8d0cbce4c6f3bb188b013518d77aac3c18ae3b35d",
        lending:
            "0x649c0a6a035ba145736761a8d0cbce4c6f3bb188b013518d77aac3c18ae3b35d",
        dexRouter:
            "0x649c0a6a035ba145736761a8d0cbce4c6f3bb188b013518d77aac3c18ae3b35d",
        ariesBridge:
            "0x649c0a6a035ba145736761a8d0cbce4c6f3bb188b013518d77aac3c18ae3b35d",
        stakePool:
            "0x649c0a6a035ba145736761a8d0cbce4c6f3bb188b013518d77aac3c18ae3b35d",
    },

    // Module Names
    modules: {
        strategyRegistry: "strategy_registry",
        lending: "lending",
        dexRouter: "dex_router",
        ariesBridge: "aries_bridge",
        stakePool: "stake_pool",
    },

    // Strategy Types
    strategyTypes: {
        DCA: 1,
        APY_EXIT: 2,
        YIELD_OPT: 3,
    },

    // Strategy Status
    strategyStatus: {
        ACTIVE: 1,
        PAUSED: 2,
        COMPLETED: 3,
        CANCELLED: 4,
    },

    // Common Tokens
    tokens: {
        APT: {
            symbol: "APT",
            name: "Aptos Coin",
            decimals: 8,
            type: "0x1::aptos_coin::AptosCoin",
        },
        // Add more tokens as needed
    },
} as const;

// Helper to get current network config
export const getCurrentNetwork = () => {
    const isMainnet = process.env.NEXT_PUBLIC_APTOS_NETWORK === "mainnet";
    return isMainnet ? APTOS_CONFIG.network.mainnet : APTOS_CONFIG.network.testnet;
};

// Helper to build module address
export const getModuleAddress = (moduleName: keyof typeof APTOS_CONFIG.modules) => {
    return `${APTOS_CONFIG.contracts.strategyRegistry}::${APTOS_CONFIG.modules[moduleName]}`;
};

// Helper to build function identifier
export const getFunctionId = (
    moduleName: keyof typeof APTOS_CONFIG.modules,
    functionName: string
) => {
    return `${getModuleAddress(moduleName)}::${functionName}`;
};
