import {
  PortfolioData,
  TokenBalance,
  ChainData,
} from "@/lib/hooks/use-dashboard-data";

export interface CrossChainOpportunity {
  id: string;
  title: string;
  description: string;
  chain: string;
  protocol: string;
  apy: number;
  potentialGain: number;
  potentialGainPercent: number;
  currentHolding: {
    amount: number;
    symbol: string;
    chain: string;
    value: number;
  };
  targetToken: string;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  category: "LENDING" | "STAKING" | "LIQUIDITY" | "YIELD_FARMING";
  minimumAmount: number;
  estimatedGasFeesUSD: number;
  timeToComplete: string; // e.g., "5-10 minutes"
  requirements: string[];
  tags: string[];
}

export interface OpportunityFilters {
  minApy?: number;
  maxRisk?: "LOW" | "MEDIUM" | "HIGH";
  categories?: CrossChainOpportunity["category"][];
  chains?: string[];
  minAmount?: number;
  maxGasFees?: number;
}

export class CrossChainOpportunitiesService {
  private static instance: CrossChainOpportunitiesService;

  private constructor() {}

  public static getInstance(): CrossChainOpportunitiesService {
    if (!CrossChainOpportunitiesService.instance) {
      CrossChainOpportunitiesService.instance =
        new CrossChainOpportunitiesService();
    }
    return CrossChainOpportunitiesService.instance;
  }

  /**
   * Generate cross-chain opportunities based on user's portfolio
   */
  public generateOpportunities(
    portfolio: PortfolioData,
    tokensChains: ChainData[],
    filters?: OpportunityFilters
  ): CrossChainOpportunity[] {
    const opportunities: CrossChainOpportunity[] = [];

    // Generate opportunities based on current holdings
    tokensChains.forEach((chain) => {
      chain.tokens.forEach((token) => {
        // Skip tokens with very low value
        if (token.value < 10) return;

        // Generate lending opportunities
        const lendingOpps = this.generateLendingOpportunities(token, chain);
        opportunities.push(...lendingOpps);

        // Generate staking opportunities
        const stakingOpps = this.generateStakingOpportunities(token, chain);
        opportunities.push(...stakingOpps);

        // Generate liquidity opportunities
        const liquidityOpps = this.generateLiquidityOpportunities(token, chain);
        opportunities.push(...liquidityOpps);
      });
    });

    // Apply filters
    const filteredOpportunities = this.applyFilters(opportunities, filters);

    // Sort by potential gain (highest first)
    filteredOpportunities.sort(
      (a, b) => b.potentialGainPercent - a.potentialGainPercent
    );

    // Return top 3 opportunities
    return filteredOpportunities.slice(0, 3);
  }

  private generateLendingOpportunities(
    token: TokenBalance,
    chain: ChainData
  ): CrossChainOpportunity[] {
    const opportunities: CrossChainOpportunity[] = [];

    // Define lending protocols and their APYs for different chains
    const lendingProtocols = this.getLendingProtocols();

    Object.entries(lendingProtocols).forEach(([targetChain, protocols]) => {
      if (targetChain === chain.name) return; // Skip same chain

      protocols.forEach((protocol) => {
        const tokenSupport = protocol.supportedTokens.find(
          (t) =>
            t.symbol === token.symbol ||
            this.isEquivalentToken(token.symbol, t.symbol)
        );

        if (tokenSupport) {
          const currentYield = this.estimateCurrentYield(token, chain);
          const potentialGain = tokenSupport.apy - currentYield;

          if (potentialGain > 0.5) {
            // Only show if gain is > 0.5%
            opportunities.push({
              id: `lending-${targetChain}-${protocol.name}-${token.symbol}`,
              title: `${token.symbol} Lending on ${targetChain}`,
              description: `Lend your ${token.symbol} on ${targetChain} for higher yields`,
              chain: targetChain,
              protocol: protocol.name,
              apy: tokenSupport.apy,
              potentialGain: (token.value * potentialGain) / 100,
              potentialGainPercent: potentialGain,
              currentHolding: {
                amount: token.balance,
                symbol: token.symbol,
                chain: chain.name,
                value: token.value,
              },
              targetToken: token.symbol,
              riskLevel: protocol.riskLevel,
              category: "LENDING",
              minimumAmount: tokenSupport.minimumAmount,
              estimatedGasFeesUSD: this.estimateGasFees(
                chain.name,
                targetChain
              ),
              timeToComplete: this.estimateTransferTime(
                chain.name,
                targetChain
              ),
              requirements: [
                `Minimum ${tokenSupport.minimumAmount} ${token.symbol}`,
                `Bridge from ${chain.name} to ${targetChain}`,
                "Connect wallet to protocol",
              ],
              tags: ["Cross-chain", "Lending", "DeFi"],
            });
          }
        }
      });
    });

    return opportunities;
  }

  private generateStakingOpportunities(
    token: TokenBalance,
    chain: ChainData
  ): CrossChainOpportunity[] {
    const opportunities: CrossChainOpportunity[] = [];

    // Focus on native tokens and major tokens for staking
    if (!this.isStakableToken(token.symbol)) return opportunities;

    const stakingProtocols = this.getStakingProtocols();

    Object.entries(stakingProtocols).forEach(([targetChain, protocols]) => {
      if (targetChain === chain.name) return;

      protocols.forEach((protocol) => {
        const tokenSupport = protocol.supportedTokens.find(
          (t) =>
            t.symbol === token.symbol ||
            this.isEquivalentToken(token.symbol, t.symbol)
        );

        if (tokenSupport) {
          const currentYield = this.estimateCurrentYield(token, chain);
          const potentialGain = tokenSupport.apy - currentYield;

          if (potentialGain > 0.3) {
            opportunities.push({
              id: `staking-${targetChain}-${protocol.name}-${token.symbol}`,
              title: `${token.symbol} Staking on ${targetChain}`,
              description: `Stake your ${token.symbol} on ${targetChain} for enhanced rewards`,
              chain: targetChain,
              protocol: protocol.name,
              apy: tokenSupport.apy,
              potentialGain: (token.value * potentialGain) / 100,
              potentialGainPercent: potentialGain,
              currentHolding: {
                amount: token.balance,
                symbol: token.symbol,
                chain: chain.name,
                value: token.value,
              },
              targetToken: token.symbol,
              riskLevel: protocol.riskLevel,
              category: "STAKING",
              minimumAmount: tokenSupport.minimumAmount,
              estimatedGasFeesUSD: this.estimateGasFees(
                chain.name,
                targetChain
              ),
              timeToComplete: this.estimateTransferTime(
                chain.name,
                targetChain
              ),
              requirements: [
                `Minimum ${tokenSupport.minimumAmount} ${token.symbol}`,
                `Bridge from ${chain.name} to ${targetChain}`,
                "Lock period may apply",
              ],
              tags: ["Cross-chain", "Staking", "Rewards"],
            });
          }
        }
      });
    });

    return opportunities;
  }

  private generateLiquidityOpportunities(
    token: TokenBalance,
    chain: ChainData
  ): CrossChainOpportunity[] {
    const opportunities: CrossChainOpportunity[] = [];

    const liquidityProtocols = this.getLiquidityProtocols();

    Object.entries(liquidityProtocols).forEach(([targetChain, protocols]) => {
      if (targetChain === chain.name) return;

      protocols.forEach((protocol) => {
        const pairs = protocol.pairs.filter((pair) =>
          pair.tokens.some(
            (t) => t === token.symbol || this.isEquivalentToken(token.symbol, t)
          )
        );

        pairs.forEach((pair) => {
          const currentYield = this.estimateCurrentYield(token, chain);
          const potentialGain = pair.apy - currentYield;

          if (potentialGain > 1.0) {
            // Higher threshold for LP due to impermanent loss risk
            opportunities.push({
              id: `liquidity-${targetChain}-${protocol.name}-${pair.name}`,
              title: `${pair.name} LP on ${targetChain}`,
              description: `Provide liquidity for ${pair.name} on ${targetChain}`,
              chain: targetChain,
              protocol: protocol.name,
              apy: pair.apy,
              potentialGain: (token.value * potentialGain) / 100,
              potentialGainPercent: potentialGain,
              currentHolding: {
                amount: token.balance,
                symbol: token.symbol,
                chain: chain.name,
                value: token.value,
              },
              targetToken: pair.name,
              riskLevel: "HIGH", // LP always has higher risk
              category: "LIQUIDITY",
              minimumAmount: pair.minimumAmount,
              estimatedGasFeesUSD: this.estimateGasFees(
                chain.name,
                targetChain
              ),
              timeToComplete: this.estimateTransferTime(
                chain.name,
                targetChain
              ),
              requirements: [
                `Need both tokens in pair: ${pair.tokens.join(" + ")}`,
                `Bridge from ${chain.name} to ${targetChain}`,
                "Impermanent loss risk applies",
              ],
              tags: ["Cross-chain", "Liquidity", "High-yield", "High-risk"],
            });
          }
        });
      });
    });

    return opportunities;
  }

  private applyFilters(
    opportunities: CrossChainOpportunity[],
    filters?: OpportunityFilters
  ): CrossChainOpportunity[] {
    if (!filters) return opportunities;

    return opportunities.filter((opp) => {
      if (filters.minApy && opp.apy < filters.minApy) return false;
      if (
        filters.maxRisk &&
        this.getRiskLevel(opp.riskLevel) > this.getRiskLevel(filters.maxRisk)
      )
        return false;
      if (filters.categories && !filters.categories.includes(opp.category))
        return false;
      if (filters.chains && !filters.chains.includes(opp.chain)) return false;
      if (filters.minAmount && opp.currentHolding.value < filters.minAmount)
        return false;
      if (filters.maxGasFees && opp.estimatedGasFeesUSD > filters.maxGasFees)
        return false;
      return true;
    });
  }

  private getRiskLevel(risk: "LOW" | "MEDIUM" | "HIGH"): number {
    return { LOW: 1, MEDIUM: 2, HIGH: 3 }[risk];
  }

  private isStakableToken(symbol: string): boolean {
    const stakableTokens = [
      "ETH",
      "BTC",
      "MATIC",
      "AVAX",
      "SOL",
      "DOT",
      "ATOM",
    ];
    return stakableTokens.includes(symbol);
  }

  private isEquivalentToken(token1: string, token2: string): boolean {
    const equivalents: Record<string, string[]> = {
      ETH: ["WETH", "stETH"],
      BTC: ["WBTC", "renBTC"],
      USDC: ["USDC.e", "axlUSDC"],
      USDT: ["USDT.e", "axlUSDT"],
    };

    return Object.values(equivalents).some(
      (group) => group.includes(token1) && group.includes(token2)
    );
  }

  // eslint-disable-next-line
  private estimateCurrentYield(token: TokenBalance, chain: ChainData): number {
    // Simple estimation based on 24h price change
    return Math.max(0, (token.priceChange24h * 365) / 100);
  }

  private estimateGasFees(fromChain: string, toChain: string): number {
    const baseFees: Record<string, number> = {
      Ethereum: 25,
      Polygon: 2,
      Arbitrum: 5,
      Optimism: 5,
      Base: 3,
      Avalanche: 8,
    };

    return (baseFees[fromChain] || 10) + (baseFees[toChain] || 10);
  }

  private estimateTransferTime(fromChain: string, toChain: string): string {
    if (fromChain === "Ethereum" || toChain === "Ethereum") {
      return "10-15 minutes";
    }
    return "5-10 minutes";
  }

  // Mock data for protocols - in real implementation, this would come from APIs
  private getLendingProtocols() {
    return {
      Polygon: [
        {
          name: "Aave",
          riskLevel: "LOW" as const,
          supportedTokens: [
            { symbol: "USDC", apy: 8.3, minimumAmount: 100 },
            { symbol: "USDT", apy: 7.8, minimumAmount: 100 },
            { symbol: "ETH", apy: 4.2, minimumAmount: 0.1 },
          ],
        },
      ],
      Arbitrum: [
        {
          name: "Compound",
          riskLevel: "LOW" as const,
          supportedTokens: [
            { symbol: "USDC", apy: 7.9, minimumAmount: 100 },
            { symbol: "ETH", apy: 4.5, minimumAmount: 0.1 },
          ],
        },
      ],
      Optimism: [
        {
          name: "Aave",
          riskLevel: "LOW" as const,
          supportedTokens: [
            { symbol: "USDC", apy: 8.1, minimumAmount: 100 },
            { symbol: "ETH", apy: 4.3, minimumAmount: 0.1 },
          ],
        },
      ],
    };
  }

  private getStakingProtocols() {
    return {
      Ethereum: [
        {
          name: "Lido",
          riskLevel: "MEDIUM" as const,
          supportedTokens: [{ symbol: "ETH", apy: 5.8, minimumAmount: 0.01 }],
        },
      ],
      Polygon: [
        {
          name: "Polygon Staking",
          riskLevel: "MEDIUM" as const,
          supportedTokens: [{ symbol: "MATIC", apy: 6.2, minimumAmount: 1 }],
        },
      ],
    };
  }

  private getLiquidityProtocols() {
    return {
      Arbitrum: [
        {
          name: "SushiSwap",
          pairs: [
            {
              name: "BTC/ETH",
              tokens: ["BTC", "ETH"],
              apy: 12.4,
              minimumAmount: 100,
            },
            {
              name: "USDC/ETH",
              tokens: ["USDC", "ETH"],
              apy: 9.8,
              minimumAmount: 200,
            },
          ],
        },
      ],
      Polygon: [
        {
          name: "QuickSwap",
          pairs: [
            {
              name: "USDC/USDT",
              tokens: ["USDC", "USDT"],
              apy: 8.7,
              minimumAmount: 200,
            },
            {
              name: "ETH/MATIC",
              tokens: ["ETH", "MATIC"],
              apy: 11.2,
              minimumAmount: 150,
            },
          ],
        },
      ],
    };
  }
}

export const crossChainOpportunitiesService =
  CrossChainOpportunitiesService.getInstance();
