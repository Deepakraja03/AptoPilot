"use client";
import React from "react";

type Chain = {
  chainId: string;
  name: string;
  value: number;
  percentage: number;
  color: string;
  symbol?: string;
  tokenCount?: number;
};

export function PortfolioOverview({
  chains = [],
  totalValue = 0,
}: {
  chains: Chain[];
  totalValue: number;
  loading?: boolean;
  error?: boolean;
  errorMessage?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="rounded-xl border border-gray-800 bg-gray-900/30 p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold">Aptos Portfolio</h3>
        <div className="text-[#ADFEB9] font-medium">${totalValue.toFixed(2)}</div>
      </div>
      <div className="space-y-2">
        {chains.length === 0 ? (
          <div className="text-gray-400 text-sm">No Aptos assets found.</div>
        ) : (
          chains.map((c) => (
            <div key={c.chainId} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span className="inline-block w-2 h-2 rounded-full" style={{ background: c.color }} />
                <span>{c.name}</span>
              </div>
              <div className="text-gray-300">${c.value.toFixed(2)} ({c.percentage.toFixed(2)}%)</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
