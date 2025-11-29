import { NextRequest, NextResponse } from "next/server";
import {
  crossChainOpportunitiesService,
  OpportunityFilters,
} from "@/lib/services/cross-chain-opportunities-service";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    // Get organization ID from headers
    const organizationId = request.headers.get("x-organization-id");
    if (!organizationId) {
      return NextResponse.json(
        { error: "Organization ID is required" },
        { status: 400 }
      );
    }

    // Parse filters from query parameters
    const filters: OpportunityFilters = {};

    const minApy = searchParams.get("minApy");
    if (minApy) filters.minApy = parseFloat(minApy);

    const maxRisk = searchParams.get("maxRisk");
    if (maxRisk && ["LOW", "MEDIUM", "HIGH"].includes(maxRisk)) {
      filters.maxRisk = maxRisk as "LOW" | "MEDIUM" | "HIGH";
    }

    const categories = searchParams.get("categories");
    if (categories) {
      filters.categories = categories
        .split(",")
        .filter((c) =>
          ["LENDING", "STAKING", "LIQUIDITY", "YIELD_FARMING"].includes(c)
        ) as ("LENDING" | "STAKING" | "LIQUIDITY" | "YIELD_FARMING")[];
    }

    const chains = searchParams.get("chains");
    if (chains) {
      filters.chains = chains.split(",");
    }

    const minAmount = searchParams.get("minAmount");
    if (minAmount) filters.minAmount = parseFloat(minAmount);

    const maxGasFees = searchParams.get("maxGasFees");
    if (maxGasFees) filters.maxGasFees = parseFloat(maxGasFees);

    // Mock portfolio and tokens data for now
    // In a real implementation, you would fetch this from your database
    const mockPortfolio = {
      totalValue: 15420.5,
      totalValueChange24h: 234.8,
      totalValueChangePercent: 1.55,
      activeChains: {
        count: 3,
        chains: [
          { name: "Ethereum", value: 8500, percentage: 55.1, symbol: "ETH" },
          { name: "Polygon", value: 4200, percentage: 27.2, symbol: "MATIC" },
          { name: "Arbitrum", value: 2720.5, percentage: 17.7, symbol: "ARB" },
        ],
      },
      currentYield: {
        percentage: 3.2,
        change: 0.1,
        changePercent: 3.2,
      },
      lastUpdated: new Date().toISOString(),
    };

    const mockTokensChains = [
      {
        name: "Ethereum",
        symbol: "ETH",
        totalValue: 8500,
        totalValueChange24h: 2.1,
        tokenCount: 4,
        tokens: [
          {
            symbol: "ETH",
            name: "Ethereum",
            balance: 3.2,
            value: 6400,
            valueChange24h: 1.8,
            priceChange24h: 1.8,
            chain: "Ethereum",
          },
          {
            symbol: "USDC",
            name: "USD Coin",
            balance: 1500,
            value: 1500,
            valueChange24h: 0.1,
            priceChange24h: 0.1,
            chain: "Ethereum",
          },
          {
            symbol: "BTC",
            name: "Bitcoin",
            balance: 0.15,
            value: 600,
            valueChange24h: 2.3,
            priceChange24h: 2.3,
            chain: "Ethereum",
          },
        ],
      },
      {
        name: "Polygon",
        symbol: "MATIC",
        totalValue: 4200,
        totalValueChange24h: 1.5,
        tokenCount: 3,
        tokens: [
          {
            symbol: "MATIC",
            name: "Polygon",
            balance: 2800,
            value: 2520,
            valueChange24h: 1.2,
            priceChange24h: 1.2,
            chain: "Polygon",
          },
          {
            symbol: "USDC",
            name: "USD Coin",
            balance: 1000,
            value: 1000,
            valueChange24h: 0.1,
            priceChange24h: 0.1,
            chain: "Polygon",
          },
          {
            symbol: "ETH",
            name: "Ethereum",
            balance: 0.34,
            value: 680,
            valueChange24h: 1.8,
            priceChange24h: 1.8,
            chain: "Polygon",
          },
        ],
      },
    ];

    // Generate opportunities
    const opportunities = crossChainOpportunitiesService.generateOpportunities(
      mockPortfolio,
      mockTokensChains,
      filters
    );

    return NextResponse.json({
      opportunities,
      totalCount: opportunities.length,
      filters: filters,
      generatedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error fetching cross-chain opportunities:", error);
    return NextResponse.json(
      { error: "Failed to fetch cross-chain opportunities" },
      { status: 500 }
    );
  }
}
