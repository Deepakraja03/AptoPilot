import { 
  MultiChainWalletData, 
  ProcessedWalletData, 
  ProcessedTokenBalance, 
  SupportedChain,
  goldRushService 
} from '../goldrush';

// Dashboard-specific interfaces based on the design document
export interface DashboardPortfolio {
  totalValue: number;
  totalValueChange24h: number;
  totalValueChangePercent: number;
  activeChains: ChainDistribution[];
  currentYield: YieldMetrics;
  lastUpdated: Date;
}

export interface ChainDistribution {
  chainId: string;
  name: string;
  symbol: string;
  value: number;
  percentage: number;
  tokenCount: number;
  color: string;
}

export interface YieldMetrics {
  percentage: number;
  change: number;
  changePercent: number;
  period: '24h' | '7d' | '30d';
}

// Chain color mapping for consistent UI
const CHAIN_COLORS: Record<SupportedChain, string> = {
  ETHEREUM: '#627EEA',
  BASE: '#0052FF',
  BSC: '#F3BA2F',
  SOLANA: '#9945FF',
  POLYGON: '#8247E5',
  ARBITRUM: '#28A0F0',
  OPTIMISM: '#FF0420',
};

/**
 * Service class for processing dashboard data and calculations
 * Handles portfolio aggregation, yield calculations, and chain distribution
 */
export class DashboardDataService {
  private static instance: DashboardDataService;

  private constructor() {}

  public static getInstance(): DashboardDataService {
    if (!DashboardDataService.instance) {
      DashboardDataService.instance = new DashboardDataService();
    }
    return DashboardDataService.instance;
  }

  /**
   * Aggregate portfolio data from multi-chain wallet data
   * Requirements: 1.1, 1.3, 2.1, 2.2
   */
  public aggregatePortfolioData(walletData: MultiChainWalletData): DashboardPortfolio {
    const activeChains = this.identifyActiveChains(walletData);
    const chainDistribution = this.calculateChainDistribution(walletData, activeChains);
    const yieldMetrics = this.calculateYield(walletData);

    // Calculate total value change percentage
    const totalValueChangePercent = walletData.totalValue > 0 
      ? (walletData.totalValueChange24h / (walletData.totalValue - walletData.totalValueChange24h)) * 100
      : 0;

    return {
      totalValue: walletData.totalValue,
      totalValueChange24h: walletData.totalValueChange24h,
      totalValueChangePercent,
      activeChains: chainDistribution,
      currentYield: yieldMetrics,
      lastUpdated: new Date(walletData.lastUpdated),
    };
  }

  /**
   * Identify active chains with non-zero balances
   * Requirements: 2.1, 2.2
   */
  public identifyActiveChains(walletData: MultiChainWalletData): SupportedChain[] {
    const activeChains: SupportedChain[] = [];

    Object.entries(walletData.chains).forEach(([chain, chainData]) => {
      if (chainData && chainData.totalValue > 0) {
        activeChains.push(chain as SupportedChain);
      }
    });

    return activeChains;
  }

  /**
   * Calculate chain distribution percentages
   * Requirements: 2.1, 2.2, 3.1, 3.2
   */
  public calculateChainDistribution(
    walletData: MultiChainWalletData, 
    activeChains: SupportedChain[]
  ): ChainDistribution[] {
    if (walletData.totalValue === 0) {
      return [];
    }

    const distribution: ChainDistribution[] = [];

    activeChains.forEach(chain => {
      const chainData = walletData.chains[chain];
      if (chainData && chainData.totalValue > 0) {
        const percentage = (chainData.totalValue / walletData.totalValue) * 100;

        // Include all chains with any balance (user preference to show all chains)
        distribution.push({
          chainId: chain,
          name: goldRushService.getChainDisplayName(chain),
          symbol: goldRushService.getNativeTokenSymbol(chain),
          value: chainData.totalValue,
          percentage,
          tokenCount: chainData.tokenBalances.length,
          color: CHAIN_COLORS[chain] || '#6B7280',
        });
      }
    });

    // Sort by value (highest first)
    distribution.sort((a, b) => b.value - a.value);

    // Group small chains under "Others" if there are more than 5 chains
    if (distribution.length > 5) {
      const mainChains = distribution.slice(0, 4);
      const otherChains = distribution.slice(4);
      
      const othersValue = otherChains.reduce((sum, chain) => sum + chain.value, 0);
      const othersPercentage = otherChains.reduce((sum, chain) => sum + chain.percentage, 0);
      const othersTokenCount = otherChains.reduce((sum, chain) => sum + chain.tokenCount, 0);

      mainChains.push({
        chainId: 'others',
        name: 'Others',
        symbol: 'OTHER',
        value: othersValue,
        percentage: othersPercentage,
        tokenCount: othersTokenCount,
        color: '#6B7280',
      });

      return mainChains;
    }

    return distribution;
  }

  /**
   * Calculate yield based on 24-hour price changes
   * Requirements: 3.1, 3.2
   */
  public calculateYield(walletData: MultiChainWalletData): YieldMetrics {
    if (walletData.totalValue === 0) {
      return {
        percentage: 0,
        change: 0,
        changePercent: 0,
        period: '24h',
      };
    }

    // Calculate yield percentage based on 24h change
    const previousValue = walletData.totalValue - walletData.totalValueChange24h;
    const yieldPercentage = previousValue > 0
      ? (walletData.totalValueChange24h / previousValue) * 100
      : 0;

    // For now, we only have 24h data, so change metrics are the same
    return {
      percentage: yieldPercentage,
      change: walletData.totalValueChange24h,
      changePercent: yieldPercentage,
      period: '24h',
    };
  }

  /**
   * Calculate advanced yield metrics with additional periods
   * Requirements: 3.1, 3.2
   */
  public calculateAdvancedYield(
    walletData: MultiChainWalletData,
    period: '24h' | '7d' | '30d' = '24h'
  ): YieldMetrics & {
    annualizedYield: number;
    volatility: number;
    sharpeRatio: number;
  } {
    const baseYield = this.calculateYield(walletData);

    // Calculate annualized yield (simple approximation)
    let annualizedYield = 0;
    if (period === '24h' && baseYield.percentage !== 0) {
      annualizedYield = Math.pow(1 + baseYield.percentage / 100, 365) - 1;
    } else if (period === '7d' && baseYield.percentage !== 0) {
      annualizedYield = Math.pow(1 + baseYield.percentage / 100, 52) - 1;
    } else if (period === '30d' && baseYield.percentage !== 0) {
      annualizedYield = Math.pow(1 + baseYield.percentage / 100, 12) - 1;
    }

    // Simple volatility calculation (would need historical data for accuracy)
    const volatility = Math.abs(baseYield.percentage) * 2; // Simplified estimate

    // Sharpe ratio (simplified, assuming risk-free rate of 3%)
    const riskFreeRate = 3; // 3% annual
    const sharpeRatio = annualizedYield > 0
      ? (annualizedYield - riskFreeRate) / (volatility / 100)
      : 0;

    return {
      ...baseYield,
      annualizedYield: annualizedYield * 100,
      volatility,
      sharpeRatio,
    };
  }

  /**
   * Calculate portfolio metrics for a specific chain
   * Utility function for chain-specific calculations
   */
  public calculateChainMetrics(chainData: ProcessedWalletData): {
    totalValue: number;
    totalValueChange24h: number;
    topTokens: ProcessedTokenBalance[];
    yieldPercentage: number;
  } {
    const totalValue = chainData.totalValue;
    const totalValueChange24h = chainData.totalValueChange24h;
    
    // Get top 3 tokens by value
    const topTokens = chainData.tokenBalances
      .sort((a, b) => b.value - a.value)
      .slice(0, 3);

    // Calculate yield percentage for this chain
    const previousValue = totalValue - totalValueChange24h;
    const yieldPercentage = previousValue > 0 
      ? (totalValueChange24h / previousValue) * 100 
      : 0;

    return {
      totalValue,
      totalValueChange24h,
      topTokens,
      yieldPercentage,
    };
  }

  /**
   * Format currency values for display
   * Utility function for consistent formatting
   */
  public formatCurrency(value: number, decimals: number = 2): string {
    if (value === 0) return '$0.00';
    
    if (Math.abs(value) >= 1000000) {
      return `$${(value / 1000000).toFixed(1)}M`;
    } else if (Math.abs(value) >= 1000) {
      return `$${(value / 1000).toFixed(1)}K`;
    } else {
      return `$${value.toFixed(decimals)}`;
    }
  }

  /**
   * Format percentage values for display
   * Utility function for consistent percentage formatting
   */
  public formatPercentage(value: number, decimals: number = 2): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(decimals)}%`;
  }

  /**
   * Get chain color for consistent UI theming
   */
  public getChainColor(chain: SupportedChain): string {
    return CHAIN_COLORS[chain] || '#6B7280';
  }

  /**
   * Get all available chain colors for UI components
   */
  public getAllChainColors(): Record<SupportedChain, string> {
    return { ...CHAIN_COLORS };
  }

  /**
   * Calculate portfolio risk metrics
   * Requirements: 3.1, 3.2
   */
  public calculateRiskMetrics(walletData: MultiChainWalletData): {
    concentrationRisk: number; // 0-100, higher is riskier
    chainRisk: number; // 0-100, based on number of chains
    volatilityRisk: number; // 0-100, based on price changes
    overallRisk: 'LOW' | 'MEDIUM' | 'HIGH';
  } {
    const activeChains = this.identifyActiveChains(walletData);
    const chainDistribution = this.calculateChainDistribution(walletData, activeChains);

    // Concentration risk (based on largest holding percentage)
    const largestHolding = chainDistribution.length > 0
      ? Math.max(...chainDistribution.map(c => c.percentage))
      : 0;
    const concentrationRisk = Math.min(100, largestHolding * 1.5);

    // Chain risk (fewer chains = higher risk)
    const chainRisk = activeChains.length === 0 ? 100
      : Math.max(0, 100 - (activeChains.length * 15));

    // Volatility risk (based on 24h changes)
    const volatilityRisk = Math.min(100, Math.abs(walletData.totalValueChange24h / walletData.totalValue) * 1000);

    // Overall risk assessment
    const avgRisk = (concentrationRisk + chainRisk + volatilityRisk) / 3;
    const overallRisk = avgRisk > 70 ? 'HIGH' : avgRisk > 40 ? 'MEDIUM' : 'LOW';

    return {
      concentrationRisk,
      chainRisk,
      volatilityRisk,
      overallRisk,
    };
  }

  /**
   * Generate portfolio insights and recommendations
   * Requirements: 3.1, 3.2
   */
  public generatePortfolioInsights(walletData: MultiChainWalletData): {
    insights: string[];
    recommendations: string[];
    alerts: string[];
  } {
    const insights: string[] = [];
    const recommendations: string[] = [];
    const alerts: string[] = [];

    const activeChains = this.identifyActiveChains(walletData);
    const chainDistribution = this.calculateChainDistribution(walletData, activeChains);
    const riskMetrics = this.calculateRiskMetrics(walletData);
    const summary = this.getPortfolioSummary(walletData);

    // Generate insights
    if (activeChains.length > 1) {
      insights.push(`Your portfolio is diversified across ${activeChains.length} chains`);
    } else if (activeChains.length === 1) {
      insights.push('Your portfolio is concentrated in a single chain');
    }

    if (summary.diversificationScore > 70) {
      insights.push('Your portfolio shows good diversification');
    } else if (summary.diversificationScore < 30) {
      insights.push('Your portfolio has low diversification');
    }

    // Generate recommendations
    if (riskMetrics.concentrationRisk > 70) {
      recommendations.push('Consider diversifying your largest holding across multiple chains');
    }

    if (activeChains.length < 3 && walletData.totalValue > 1000) {
      recommendations.push('Consider expanding to additional blockchain networks');
    }

    if (riskMetrics.overallRisk === 'HIGH') {
      recommendations.push('Your portfolio has high risk - consider rebalancing');
    }

    // Generate alerts
    if (walletData.totalValueChange24h < -walletData.totalValue * 0.1) {
      alerts.push('Portfolio down more than 10% in 24h');
    }

    if (chainDistribution.some(c => c.percentage > 80)) {
      alerts.push('Over 80% of portfolio in single chain');
    }

    return {
      insights,
      recommendations,
      alerts,
    };
  }

  /**
   * Validate portfolio data integrity
   * Ensures data consistency and handles edge cases
   */
  public validatePortfolioData(walletData: MultiChainWalletData): {
    isValid: boolean;
    errors: string[];
  } {
    const errors: string[] = [];

    // Check if total value matches sum of chain values
    const calculatedTotal = Object.values(walletData.chains)
      .filter(chain => chain !== null)
      .reduce((sum, chain) => sum + (chain?.totalValue || 0), 0);

    const tolerance = 0.01; // Allow small floating point differences
    if (Math.abs(calculatedTotal - walletData.totalValue) > tolerance) {
      errors.push(`Total value mismatch: calculated ${calculatedTotal}, reported ${walletData.totalValue}`);
    }

    // Check for negative values
    if (walletData.totalValue < 0) {
      errors.push('Total value cannot be negative');
    }

    // Check for invalid timestamps
    const lastUpdated = new Date(walletData.lastUpdated);
    if (isNaN(lastUpdated.getTime())) {
      errors.push('Invalid lastUpdated timestamp');
    }

    // Check chain data consistency
    Object.entries(walletData.chains).forEach(([chain, chainData]) => {
      if (chainData) {
        if (chainData.totalValue < 0) {
          errors.push(`Chain ${chain} has negative total value`);
        }
        
        // Verify token balances sum matches chain total
        const tokenSum = chainData.tokenBalances.reduce((sum, token) => sum + token.value, 0);
        if (Math.abs(tokenSum - chainData.totalValue) > tolerance) {
          errors.push(`Chain ${chain} token sum mismatch`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  }

  /**
   * Get portfolio summary statistics
   * Provides additional insights for dashboard display
   */
  public getPortfolioSummary(walletData: MultiChainWalletData): {
    totalTokens: number;
    totalChains: number;
    largestHolding: { chain: string; value: number; percentage: number } | null;
    smallestHolding: { chain: string; value: number; percentage: number } | null;
    diversificationScore: number; // 0-100, higher is more diversified
  } {
    const activeChains = this.identifyActiveChains(walletData);
    const chainDistribution = this.calculateChainDistribution(walletData, activeChains);
    
    const totalTokens = Object.values(walletData.chains)
      .filter(chain => chain !== null)
      .reduce((sum, chain) => sum + (chain?.tokenBalances.length || 0), 0);

    let largestHolding = null;
    let smallestHolding = null;

    if (chainDistribution.length > 0) {
      const sorted = [...chainDistribution].sort((a, b) => b.value - a.value);
      largestHolding = {
        chain: sorted[0].name,
        value: sorted[0].value,
        percentage: sorted[0].percentage,
      };
      smallestHolding = {
        chain: sorted[sorted.length - 1].name,
        value: sorted[sorted.length - 1].value,
        percentage: sorted[sorted.length - 1].percentage,
      };
    }

    // Calculate diversification score (higher when holdings are more evenly distributed)
    const diversificationScore = this.calculateDiversificationScore(chainDistribution);

    return {
      totalTokens,
      totalChains: activeChains.length,
      largestHolding,
      smallestHolding,
      diversificationScore,
    };
  }

  /**
   * Calculate diversification score based on chain distribution
   * Uses Herfindahl-Hirschman Index concept
   */
  private calculateDiversificationScore(distribution: ChainDistribution[]): number {
    if (distribution.length === 0) return 0;
    if (distribution.length === 1) return 0;

    // Calculate HHI (sum of squared percentages)
    const hhi = distribution.reduce((sum, chain) => {
      const marketShare = chain.percentage / 100;
      return sum + (marketShare * marketShare);
    }, 0);

    // Convert to diversification score (0-100, where 100 is perfectly diversified)
    const maxHHI = 1; // When all holdings are in one chain
    const minHHI = 1 / distribution.length; // When holdings are perfectly distributed
    
    const normalizedScore = (maxHHI - hhi) / (maxHHI - minHHI);
    return Math.max(0, Math.min(100, normalizedScore * 100));
  }
}

// Export singleton instance
export const dashboardDataService = DashboardDataService.getInstance();
export default dashboardDataService;