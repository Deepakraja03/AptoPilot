"use client";

import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";

import { PortfolioOverview } from "@/components/dashboard/portfolio-overview";
import { useAuth } from "@/lib/auth";
import { useUnifiedDashboard } from "@/lib/hooks/use-unified-dashboard";
import { dashboardDataService } from "@/lib/services/dashboard-data-service";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { SupportedChain } from "@/lib/goldrush";
import { DashboardLoading } from "@/components/ui/dashboard-loading";

export default function DashboardPage() {
  const { user, createWallet, fetchUserWallets } = useAuth();
  const router = useRouter();

  // Use unified dashboard hook (only what's needed)
  const { portfolio, walletData, lastFetch, refreshAllData, isInitialLoading, isRefreshing, canRefresh, refreshCooldown } =
    useUnifiedDashboard({
      autoRefresh: false, // Disable auto-refresh, only manual refresh
      refreshInterval: 60000, // 1 minute cooldown
    });

  useEffect(() => {
    if (!user) {
      router.push("/login");
    }
  }, [user, router]);

  // Convert portfolio data to chain data for PortfolioOverview (Aptos only)
  type ChainDatum = {
    chainId: string;
    name: string;
    value: number;
    percentage: number;
    color: string;
    symbol?: string;
    tokenCount?: number;
  };

  const chainData: ChainDatum[] =
    (portfolio?.activeChains.chains
      .filter((c) => (c.name || "").toLowerCase() === "aptos")
      .map((chain) => ({
        chainId: (chain.name || "aptos").toLowerCase(),
        name: chain.name || "Aptos",
        value: Number(chain.value || 0),
        percentage: Number(chain.percentage || 0),
        color:
          dashboardDataService.getChainColor(
            (chain.name || "APTOS").toUpperCase() as SupportedChain
          ) || "#ADFEB9",
        symbol: chain.symbol,
        tokenCount: 0,
      })) as ChainDatum[]) || [];

  // Handle manual refresh with cooldown
  const handleRefresh = () => {
    if (!canRefresh) return;
    refreshAllData();
  };

  // Detect Aptos wallet and offer creation when missing
  type WalletDataLike = { aptos?: { exists?: boolean; address?: string } } | undefined;
  type WalletItem = { addressFormat?: string; path?: string; chain?: string };
  const aptosFromDashboard = Boolean((walletData as WalletDataLike)?.aptos?.exists);
  const aptosFromUser = Array.isArray(user?.wallets)
    ? user!.wallets!.some((w: WalletItem) =>
        (w.addressFormat === "ADDRESS_FORMAT_APTOS") ||
        (typeof w.path === "string" && w.path.includes("/637/")) ||
        (typeof w.chain === "string" && w.chain.toLowerCase() === "aptos")
      )
    : false;
  const aptosExists = aptosFromDashboard || aptosFromUser;
  const [isCreating, setIsCreating] = useState(false);
  const handleCreateAptosWallet = async () => {
    if (isCreating || aptosExists) return;
    try {
      setIsCreating(true);
      const walletName = `APTOS-Wallet-${Date.now()}`;
      const accounts = [
        {
          curve: "CURVE_ED25519",
          pathFormat: "PATH_FORMAT_BIP32",
          path: "m/44'/637'/0'/0'/0'",
          addressFormat: "ADDRESS_FORMAT_APTOS",
        },
      ];
      await createWallet(walletName, accounts);
      const latestWallets = await fetchUserWallets();
      await refreshAllData(latestWallets); // bypass cooldown with fresh wallets
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-black text-white">
      <section className="px-4 py-10 md:py-12">
        <div className="container mx-auto max-w-5xl">
          <div className="text-center mb-12">
            <h1 className="text-7xl font-light tracking-tight mb-4">
              Aptos
              <br />
              <span style={{ fontFamily: "InstrumentSerif" }} className="text-[#ADFEB9] italic">
                Dashboard
              </span>
            </h1>
            <p className="text-xl text-gray-400 mt-6 mb-8 max-w-2xl mx-auto">
              Monitor your Aptos assets and discover new opportunities.
            </p>
          </div>

          <div className="rounded-2xl border border-gray-800 bg-gray-900/30 p-8 overflow-hidden">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-bold">Portfolio Overview</h2>
                <p className="text-gray-400">
                  {lastFetch.portfolio ? `Last updated: ${new Date(lastFetch.portfolio).toLocaleTimeString()}` : "Loading..."}
                </p>
              </div>
              <Button
                onClick={handleRefresh}
                disabled={!canRefresh || isRefreshing}
                size="sm"
                className="relative overflow-hidden bg-[#ADFEB9] hover:bg-[#9FE4AD] text-black font-medium border-none shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out transform hover:scale-105 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:scale-100 disabled:shadow-lg group"
              >
                <div className="absolute inset-0 bg-white/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <RefreshCw className={`h-4 w-4 mr-2 relative z-10 transition-transform duration-500 ease-in-out ${isRefreshing ? "animate-spin" : "group-hover:rotate-180"}`} />
                <span className="relative z-10 transition-all duration-200">
                  {refreshCooldown > 0 ? `Refresh (${refreshCooldown}s)` : isRefreshing ? "Refreshing..." : "Refresh"}
                </span>
              </Button>
            </div>

            {isInitialLoading ? (
              <DashboardLoading />
            ) : aptosExists ? (
              <PortfolioOverview chains={chainData} totalValue={portfolio?.totalValue || 0} />
            ) : (
              <div className="flex items-center justify-between p-6 border border-gray-800 rounded-xl bg-black/30">
                <div>
                  <h3 className="text-xl font-semibold">No Aptos wallet</h3>
                  <p className="text-gray-400 text-sm mt-1">Create an Aptos wallet to view your portfolio.</p>
                </div>
                <Button onClick={handleCreateAptosWallet} disabled={isCreating} className="bg-[#ADFEB9] text-black hover:bg-[#9FE4AD]">
                  {isCreating ? "Creating..." : "Create APTOS Wallet"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </section>

      <div className="border-b border-gray-800 mt-12" />

      <footer className="py-8 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          <p className="text-gray-500">
            Need help? Visit our <a href="#" className="text-[#ADFEB9] hover:underline">documentation</a> or
            {" "}
            <a href="#" className="text-[#ADFEB9] hover:underline">contact support</a>
          </p>
        </div>
      </footer>
    </div>
  );
}
