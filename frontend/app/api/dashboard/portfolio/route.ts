import { NextRequest, NextResponse } from "next/server";
import goldRushService, { SupportedChain } from "@/lib/goldrush";
import { authenticateUser, AuthErrors } from "../middleware";

interface PortfolioResponse {
  totalValue: number;
  totalValueChange24h: number;
  totalValueChangePercent: number;
  activeChains: {
    count: number;
    chains: Array<{
      name: string;
      value: number;
      percentage: number;
      symbol: string;
    }>;
  };
  currentYield: {
    percentage: number;
    change: number;
    changePercent: number;
  };
  lastUpdated: string;
}

// Basic address validation
function isValidAddress(address: string, chain: SupportedChain): boolean {
  if (!address || typeof address !== "string") {
    return false;
  }

  try {
    switch (chain) {
      case "SOLANA":
        // Solana addresses are base58 encoded and typically 32-44 characters
        return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
      case "ETHEREUM":
      case "BASE":
      case "BSC":
      case "POLYGON":
      case "ARBITRUM":
      case "OPTIMISM":
        // EVM addresses are 42 characters starting with 0x
        return /^0x[a-fA-F0-9]{40}$/.test(address);
      default:
        return false;
    }
  } catch {
    return false;
  }
}

// Get user wallet addresses from their wallets for multi-chain operations
async function getUserMultiChainAddresses(
  userId: string
): Promise<Record<SupportedChain, string | null>> {
  try {
    const { getUserWalletAddresses } = await import("../middleware");
    const walletInfo = await getUserWalletAddresses(userId);

    if (!walletInfo) {
      return {
        ETHEREUM: null,
        BASE: null,
        BSC: null,
        SOLANA: null,
        POLYGON: null,
        ARBITRUM: null,
        OPTIMISM: null,
      };
    }

    // Enhanced: Use chain-specific addresses with proper fallbacks
    const { chainAddresses, primaryAddress } = walletInfo;

    // Map chain-specific addresses where available, fallback to primary
    const multiChainAddresses: Record<SupportedChain, string | null> = {
      // EVM chains use Ethereum address
      ETHEREUM: chainAddresses?.ethereum || primaryAddress,
      BASE: chainAddresses?.ethereum || primaryAddress,
      BSC: chainAddresses?.ethereum || primaryAddress,
      POLYGON: chainAddresses?.ethereum || primaryAddress,
      ARBITRUM: chainAddresses?.ethereum || primaryAddress,
      OPTIMISM: chainAddresses?.ethereum || primaryAddress,
      // Use actual Solana address from user's wallet
      SOLANA: chainAddresses?.solana || null,
    };

    // Validate addresses before returning
    const validatedAddresses: Record<SupportedChain, string | null> = {
      ETHEREUM: null,
      BASE: null,
      BSC: null,
      SOLANA: null,
      POLYGON: null,
      ARBITRUM: null,
      OPTIMISM: null,
    };

    Object.entries(multiChainAddresses).forEach(([chain, address]) => {
      const isValid = address && isValidAddress(address, chain as SupportedChain);
      console.log(`🔍 Portfolio: Validating ${chain} address ${address}: ${isValid}`);
      
      if (isValid) {
        validatedAddresses[chain as SupportedChain] = address;
      } else {
        validatedAddresses[chain as SupportedChain] = null;
      }
    });

    return validatedAddresses;
  } catch {
    return {
      ETHEREUM: null,
      BASE: null,
      BSC: null,
      SOLANA: null,
      POLYGON: null,
      ARBITRUM: null,
      OPTIMISM: null,
    };
  }
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    // Authenticate user
    const user = await authenticateUser(request);
    if (!user) {
      return NextResponse.json(AuthErrors.UNAUTHORIZED, { status: 401 });
    }

    // Get user's wallet addresses
    const walletAddresses = await getUserMultiChainAddresses(user.id);

    // Fetch multi-chain portfolio data (force refresh to bypass cache)
    const multiChainData =
      await goldRushService.forceRefreshMultiChainWalletBalances(walletAddresses);



    // Calculate active chains
    const activeChainsList = Object.entries(multiChainData.chains)
      .filter(([, chainData]) => chainData && chainData.totalValue > 0)
      .map(([chainKey, chainData]) => ({
        name: goldRushService.getChainDisplayName(chainKey as SupportedChain),
        value: chainData!.totalValue,
        percentage:
          multiChainData.totalValue > 0
            ? (chainData!.totalValue / multiChainData.totalValue) * 100
            : 0,
        symbol: goldRushService.getNativeTokenSymbol(
          chainKey as SupportedChain
        ),
      }))
      .sort((a, b) => b.value - a.value);



    // Calculate current yield (24h change percentage)
    const currentYieldPercentage =
      multiChainData.totalValue > 0
        ? (multiChainData.totalValueChange24h /
            (multiChainData.totalValue - multiChainData.totalValueChange24h)) *
          100
        : 0;

    // Calculate total value change percentage
    const totalValueChangePercent =
      multiChainData.totalValue > 0
        ? (multiChainData.totalValueChange24h /
            (multiChainData.totalValue - multiChainData.totalValueChange24h)) *
          100
        : 0;

    const portfolioResponse: PortfolioResponse = {
      totalValue: multiChainData.totalValue,
      totalValueChange24h: multiChainData.totalValueChange24h,
      totalValueChangePercent,
      activeChains: {
        count: activeChainsList.length,
        chains: activeChainsList,
      },
      currentYield: {
        percentage: currentYieldPercentage,
        change: multiChainData.totalValueChange24h,
        changePercent: currentYieldPercentage,
      },
      lastUpdated: multiChainData.lastUpdated,
    };

    return NextResponse.json(portfolioResponse);
  } catch {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
