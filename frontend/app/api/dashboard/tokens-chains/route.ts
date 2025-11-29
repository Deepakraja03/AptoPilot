import { NextRequest, NextResponse } from 'next/server';
import { goldRushService, SupportedChain } from '@/lib/goldrush';
import { authenticateUser, AuthErrors } from '../middleware';

// Chain name mapping
const CHAIN_NAMES = {
  ETHEREUM: 'Ethereum',
  POLYGON: 'Polygon',
  BASE: 'Base',
  BSC: 'BNB Smart Chain',
  SOLANA: 'Solana',
  ARBITRUM: 'Arbitrum',
  OPTIMISM: 'Optimism',
} as const;

// Get user wallet addresses from their wallets for multi-chain operations
async function getUserMultiChainAddresses(userId: string): Promise<Record<SupportedChain, string | null>> {
  try {
    const { getUserWalletAddresses } = await import("../middleware");
    const walletInfo = await getUserWalletAddresses(userId);

    if (!walletInfo) {
      return {
        ETHEREUM: null,
        POLYGON: null,
        BASE: null,
        BSC: null,
        ARBITRUM: null,
        OPTIMISM: null,
        SOLANA: null,
      };
    }

    // Map wallet addresses to supported chains
    const multiChainAddresses: Record<SupportedChain, string | null> = {
      ETHEREUM: null,
      POLYGON: null,
      BASE: null,
      BSC: null,
      ARBITRUM: null,
      OPTIMISM: null,
      SOLANA: null, // Will be set from user's actual Solana address
    };

    // For each wallet account, map to appropriate chains based on address format
    walletInfo.accounts.forEach(account => {
      if (account.addressFormat === 'ADDRESS_FORMAT_ETHEREUM') {
        // Ethereum-compatible chains
        multiChainAddresses.ETHEREUM = account.address;
        multiChainAddresses.POLYGON = account.address;
        multiChainAddresses.BASE = account.address;
        multiChainAddresses.BSC = account.address;
        multiChainAddresses.ARBITRUM = account.address;
        multiChainAddresses.OPTIMISM = account.address;
      } else if (account.addressFormat === 'ADDRESS_FORMAT_SOLANA') {
        // Use actual Solana address from user's wallet
        multiChainAddresses.SOLANA = account.address;
      }
    });

    return multiChainAddresses;
  } catch {
    return {
      ETHEREUM: null,
      POLYGON: null,
      BASE: null,
      BSC: null,
      ARBITRUM: null,
      OPTIMISM: null,
      SOLANA: null,
    };
  }
}

export async function GET(request: NextRequest) {
  try {
    // Get authenticated user
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json(AuthErrors.UNAUTHORIZED, { status: 401 });
    }

    // Get user's wallet addresses
    const multiChainAddresses = await getUserMultiChainAddresses(user.id);

    // Convert to array format for processing, only include chains with addresses
    const walletAddresses = Object.entries(multiChainAddresses)
      .filter(([, address]) => address !== null)
      .map(([chain, address]) => ({
        address: address!,
        chain: chain as SupportedChain,
      }));



    // Get all supported chains and fetch data for each
    const allSupportedChains = goldRushService.getSupportedChains();

    const chainDataPromises = allSupportedChains.map(async (chainKey) => {
      try {
        // Find wallet address for this chain
        const wallet = walletAddresses.find(w => w.chain === chainKey);

        if (!wallet || !wallet.address) {
          // Return empty chain data for chains without wallet addresses
          return {
            name: CHAIN_NAMES[chainKey] || chainKey,
            symbol: goldRushService.getNativeTokenSymbol(chainKey),
            totalValue: 0,
            totalValueChange24h: 0,
            tokenCount: 0,
            logoUrl: undefined,
            tokens: [],
          };
        }

        const walletData = await goldRushService.forceRefreshWalletBalances(
          wallet.address,
          wallet.chain
        );

        // Process balances into our format - include tokens with balance (even if USD value is 0)
        const tokens = walletData.tokenBalances
          .filter(token => {
            // Include tokens with balance > 0, regardless of USD value for now
            // This helps debug Solana tokens that might not have proper pricing
            return token.balance > 0;
          })
          .map(token => ({
            symbol: token.symbol || 'Unknown',
            name: token.name || 'Unknown Token',
            balance: token.uiAmount || 0, // Use uiAmount for display (human-readable balance)
            value: token.value || 0,
            valueChange24h: token.valueChange24h || 0,
            priceChange24h: token.priceChange24h || 0,
            logoUrl: token.logoUrl,
            chain: wallet.chain,
          }))
          .sort((a, b) => b.value - a.value); // Sort by value descending

        const totalValue = tokens.reduce((sum, token) => sum + token.value, 0);
        const totalValueChange24h = tokens.length > 0 ?
          tokens.reduce((sum, token) => sum + token.valueChange24h, 0) / tokens.length : 0;

        return {
          name: CHAIN_NAMES[wallet.chain] || wallet.chain,
          symbol: goldRushService.getNativeTokenSymbol(wallet.chain),
          totalValue,
          totalValueChange24h,
          tokenCount: tokens.length,
          logoUrl: undefined, // Could add chain logos later
          tokens,
        };
      } catch {
        // Return empty chain data for failed chains
        return {
          name: CHAIN_NAMES[chainKey] || chainKey,
          symbol: goldRushService.getNativeTokenSymbol(chainKey),
          totalValue: 0,
          totalValueChange24h: 0,
          tokenCount: 0,
          logoUrl: undefined,
          tokens: [],
        };
      }
    });

    const chains = await Promise.all(chainDataPromises);

    // Return all chains (including those with 0 balance)
    return NextResponse.json({
      chains: chains,
    });

  } catch {
    return NextResponse.json(
      {
        error: 'Failed to fetch tokens and chains data'
      },
      { status: 500 }
    );
  }
}
