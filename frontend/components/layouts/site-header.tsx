/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React, { useEffect, useState } from "react";
import { MainNav } from "@/components/layouts/main-nav";
import { Logo } from "@/components/ui/logo";
import { MobileNav } from "./mobile-nav";
// import Link from "next/link";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ChevronDown,
  Wallet,
  Plus,
  User,
  LogOut,
  Copy,
  DollarSign,
  QrCode,
  ArrowDownToLine,
  ArrowUpFromLine,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import QRCode from "qrcode";
import { ethers } from "ethers";
import {
  Connection,
  PublicKey,
  LAMPORTS_PER_SOL,
  SystemProgram,
  Transaction,
} from "@solana/web3.js";
// Removed unused imports - now using Redux for wallet data
import Link from "next/link";
import { useUnifiedDashboard } from "@/lib/hooks/use-unified-dashboard";

declare global {
  interface Window {
    solana?: {
      isPhantom?: boolean;
      publicKey?: {
        toString: () => string;
        toBase58: () => string;
      };
      connect: () => Promise<void>;
      disconnect: () => Promise<void>;
      signTransaction: (transaction: any) => Promise<any>;
      signAllTransactions: (transactions: any[]) => Promise<any[]>;
      on: (event: string, callback: (...args: any[]) => void) => void;
    };
  }
}
export function SiteHeader() {
  const { user, logout, fetchUserWallets, createWallet } = useAuth();

  const [isCreatingWallet, setIsCreatingWallet] = useState(false);

  // Modal states
  const [showQRModal, setShowQRModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [currentWallet, setCurrentWallet] = useState<{
    type: string;
    address: string;
  } | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState("");

  // Transaction states
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawAddress, setWithdrawAddress] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  // Use unified dashboard for wallet data
  const {
    walletData,
    refreshAllData,
    isLoading: isLoadingWallets,
  } = useUnifiedDashboard();
  const walletBalances = walletData;
  const multiChainData = walletData.multiChainData;
  const isRefreshing = isLoadingWallets;

  // Wallet data is now managed by Redux - no need for local loading logic

  const handleRefreshWalletData = async () => {
    try {
      await fetchUserWallets();
      await refreshAllData();
      toast.success("Wallet data refreshed");
    } catch (error) {
      console.error("Failed to refresh wallet data:", error);
      toast.error("Failed to refresh wallet data");
    }
  };
  const handleCreateEthereumWallet = async () => {
    if (isCreatingWallet || walletBalances.eth.exists) return;

    try {
      setIsCreatingWallet(true);
      const walletName = `EVM-Wallet-${Date.now()}`;
      const accounts = [
        {
          curve: "CURVE_SECP256K1",
          pathFormat: "PATH_FORMAT_BIP32",
          path: "m/44'/60'/0'/0/0",
          addressFormat: "ADDRESS_FORMAT_ETHEREUM",
        },
      ];

      await createWallet(walletName, accounts);
      toast.success(
        "EVM wallet created successfully (supports all EVM chains)"
      );
      await handleRefreshWalletData();
    } catch (error) {
      console.error("Failed to create EVM wallet:", error);
      toast.error("Failed to create EVM wallet");
    } finally {
      setIsCreatingWallet(false);
    }
  };

  const handleCreateSolanaWallet = async () => {
    if (isCreatingWallet || walletBalances.sol.exists) return;

    try {
      setIsCreatingWallet(true);
      const walletName = `SOL-Wallet-${Date.now()}`;
      const accounts = [
        {
          curve: "CURVE_ED25519",
          pathFormat: "PATH_FORMAT_BIP32",
          path: "m/44'/501'/0'/0'",
          addressFormat: "ADDRESS_FORMAT_SOLANA",
        },
      ];

      await createWallet(walletName, accounts);
      toast.success("Solana wallet created successfully");
      await handleRefreshWalletData();
    } catch (error) {
      console.error("Failed to create Solana wallet:", error);
      toast.error("Failed to create Solana wallet");
    } finally {
      setIsCreatingWallet(false);
    }
  };

  const handleCreateSuiWallet = async () => {
    if (isCreatingWallet || walletBalances.sui?.exists) return;

    try {
      setIsCreatingWallet(true);
      const walletName = `SUI-Wallet-${Date.now()}`;
      const accounts = [
        {
          curve: "CURVE_ED25519",
          pathFormat: "PATH_FORMAT_BIP32",
          path: "m/44'/784'/0'/0'/0'",
          addressFormat: "ADDRESS_FORMAT_SUI",
        },
      ];

      await createWallet(walletName, accounts);
      toast.success("Sui wallet created successfully");
      await handleRefreshWalletData();
    } catch (error) {
      console.error("Failed to create Sui wallet:", error);
      toast.error("Failed to create Sui wallet");
    } finally {
      setIsCreatingWallet(false);
    }
  };

  const handleCopyAddress = (address: string, type: string) => {
    navigator.clipboard.writeText(address);
    toast.success(`${type} address copied to clipboard`);
  };

  const handleShowQR = async (address: string, type: string) => {
    try {
      setCurrentWallet({ type, address });
      const qrUrl = await QRCode.toDataURL(address, {
        width: 256,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      setQrCodeUrl(qrUrl);
      setShowQRModal(true);
    } catch (error) {
      console.error("Failed to generate QR code:", error);
      toast.error("Failed to generate QR code");
    }
  };

  const handleDeposit = (type: string, address: string) => {
    setCurrentWallet({ type, address });
    setShowDepositModal(true);
  };

  const handleWithdraw = (type: string, address: string) => {
    setCurrentWallet({ type, address });
    setWithdrawAmount("");
    setWithdrawAddress("");
    setShowWithdrawModal(true);
  };

  const executeEthereumWithdraw = async () => {
    if (!currentWallet || !withdrawAmount || !withdrawAddress) return;

    try {
      setIsProcessing(true);

      // Check if MetaMask is available
      if (typeof window.ethereum === "undefined") {
        throw new Error("MetaMask is not installed");
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      await provider.send("eth_requestAccounts", []);
      const signer = await provider.getSigner();

      const signerAddress = await signer.getAddress();
      if (signerAddress.toLowerCase() !== currentWallet.address.toLowerCase()) {
        throw new Error(
          "Please connect the correct wallet address in MetaMask"
        );
      }

      const amountInWei = ethers.parseEther(withdrawAmount);

      const tx = await signer.sendTransaction({
        to: withdrawAddress,
        value: amountInWei,
        gasLimit: 21000,
      });

      toast.success(`Transaction sent: ${tx.hash}`);
      await tx.wait();
      toast.success("Ethereum withdrawal completed!");

      setShowWithdrawModal(false);
      await handleRefreshWalletData();
    } catch (error: any) {
      console.error("Ethereum withdrawal failed:", error);
      toast.error(error.message || "Ethereum withdrawal failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const executeSolanaWithdraw = async () => {
    if (!currentWallet || !withdrawAmount || !withdrawAddress) return;

    try {
      setIsProcessing(true);

      // Check if Phantom wallet is available
      if (!window.solana || !window.solana.isPhantom) {
        throw new Error("Phantom wallet is not installed");
      }

      await window.solana.connect();
      const connection = new Connection(
        `https://mainnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}`
      );

      const fromPubkey = new PublicKey(currentWallet.address);
      const toPubkey = new PublicKey(withdrawAddress);
      const lamports = parseFloat(withdrawAmount) * LAMPORTS_PER_SOL;

      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey,
          toPubkey,
          lamports,
        })
      );

      const { blockhash } = await connection.getLatestBlockhash();
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      const signedTransaction =
        await window.solana.signTransaction(transaction);
      const signature = await connection.sendRawTransaction(
        signedTransaction.serialize()
      );

      toast.success(`Transaction sent: ${signature}`);
      await connection.confirmTransaction(signature);
      toast.success("Solana withdrawal completed!");

      setShowWithdrawModal(false);
      await handleRefreshWalletData();
    } catch (error: any) {
      console.error("Solana withdrawal failed:", error);
      toast.error(error.message || "Solana withdrawal failed");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleWithdrawSubmit = async () => {
    if (!currentWallet) return;

    if (currentWallet.type === "ETH") {
      await executeEthereumWithdraw();
    } else if (currentWallet.type === "SOL") {
      await executeSolanaWithdraw();
    }
  };

  // Track if we've already initiated wallet loading to prevent duplicates
  const [walletLoadInitiated, setWalletLoadInitiated] = useState(false);

  useEffect(() => {
    if (user?.organizationId && !walletLoadInitiated) {
      setWalletLoadInitiated(true);

      // Proper sequencing: fetch wallets first, then accounts, then dashboard data
      const loadWalletData = async () => {
        try {
          console.log("Starting wallet data load sequence...");

          // Step 1: Fetch user wallets from Turnkey
          await fetchUserWallets();
          console.log("Wallets fetched, waiting for accounts...");

          // Step 2: Small delay to ensure wallet accounts are properly created
          await new Promise((resolve) => setTimeout(resolve, 1500));

          // Step 3: Get the latest wallets directly from fetchUserWallets result
          const latestWalletsResponse = await fetchUserWallets();
          console.log("Latest wallets response:", latestWalletsResponse);

          // Step 4: Pass wallets directly to refreshAllData to bypass Redux timing issues
          const walletsToPass = latestWalletsResponse || user?.wallets || [];
          console.log("Wallets to pass to unified dashboard:", walletsToPass);
          await refreshAllData(walletsToPass);
          console.log("Dashboard data refreshed successfully");
        } catch (error) {
          console.error("Failed to load wallet data on login:", error);
          // Reset flag to allow retry
          setWalletLoadInitiated(false);

          // Retry once after a delay if it fails
          setTimeout(async () => {
            try {
              console.log("Retrying wallet data load...");
              setWalletLoadInitiated(true);
              const retryWallets = await fetchUserWallets();
              await refreshAllData(retryWallets);
            } catch (retryError) {
              console.error("Retry failed:", retryError);
              setWalletLoadInitiated(false);
            }
          }, 2000);
        }
      };

      loadWalletData();
    }

    // Reset flag when user logs out
    if (!user?.organizationId) {
      setWalletLoadInitiated(false);
    }
  }, [user?.organizationId]);

  return (
    <>
      <header className="sticky top-0 z-50 w-full border-b bg-black rounded-t-2xl backdrop-blur-sm">
        <div className="flex h-16 items-center justify-between w-full px-5 md:px-10 lg:px-10">
          <Logo />

          {user && (
            <>
              <MainNav />
              <MobileNav />
            </>
          )}

          <div className="md:flex hidden items-center gap-4">
            {user ? (
              <div className="flex items-center gap-3">
                {/* Total Value Display */}
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-900/50 rounded-lg border border-gray-800">
                  <DollarSign className="w-4 h-4 text-green-400" />
                  <div className="flex flex-col">
                    {isLoadingWallets || isRefreshing ? (
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-4 bg-gray-700 rounded animate-pulse"></div>
                        <RefreshCw className="w-3 h-3 text-blue-400 animate-spin" />
                      </div>
                    ) : (
                      <>
                        <span className="text-white font-medium">
                          ${walletBalances.totalValue.toFixed(2)}
                        </span>
                        {/* <span className="text-xs text-gray-400">
                          Multi-chain total
                        </span> */}
                        {/* {walletBalances.totalValueChange24h !== 0 && (
                          <span className={`text-xs ${walletBalances.totalValueChange24h >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {walletBalances.totalValueChange24h >= 0 ? '+' : ''}${walletBalances.totalValueChange24h.toFixed(2)} (24h)
                          </span>
                        )} */}
                      </>
                    )}
                  </div>
                </div>

                {/* Wallet Dropdown */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="bg-[#ADFEB9] hover:bg-opacity-90 text-black border-none"
                    >
                      <Wallet className="w-4 h-4 mr-2" />
                      Wallets
                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-80 bg-black border-gray-800">
                    {isLoadingWallets ? (
                      <div className="p-4 text-center text-gray-400">
                        <div className="flex items-center justify-center gap-2">
                          <RefreshCw className="w-4 h-4 animate-spin" />
                          Loading wallets...
                        </div>
                      </div>
                    ) : (
                      <>
                        {/* EVM Chains Wallet Section */}
                        {walletBalances.eth.exists && (
                          <div className="p-3 border-b border-gray-800">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-gradient-to-r from-blue-500 to-purple-500 flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">
                                    E
                                  </span>
                                </div>
                                <div className="flex flex-col">
                                  <span className="text-white font-medium">
                                    EVM Chains
                                  </span>
                                  {/* <span className="text-gray-400 text-xs">
                                    ETH • BASE • BSC • POLYGON • ARB • OP
                                  </span> */}
                                </div>
                              </div>
                              <div className="text-right">
                                <div className="text-white font-medium">
                                  ${walletBalances.eth.usdValue.toFixed(2)}
                                </div>
                                <div className="text-gray-400 text-xs">
                                  Multi-chain balance
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-gray-400 text-sm font-mono">
                                {walletBalances.eth.address.slice(0, 6)}...
                                {walletBalances.eth.address.slice(-4)}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleCopyAddress(
                                    walletBalances.eth.address,
                                    "ETH"
                                  )
                                }
                                className="text-gray-400 hover:text-white p-1"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>

                            {/* Token Balances Display
                            {(() => {
                              // Get all EVM chain tokens from multiChainData
                              const evmChains = ['ETHEREUM', 'BASE', 'BSC', 'POLYGON', 'ARBITRUM', 'OPTIMISM'];
                              const allTokens = new Map();
                              
                              // Aggregate tokens across all EVM chains
                              evmChains.forEach(chain => {
                                const chainData = multiChainData?.chains?.[chain];
                                if (chainData?.tokenBalances) {
                                  chainData.tokenBalances.forEach(token => {
                                    const key = token.symbol;
                                    if (allTokens.has(key)) {
                                      const existing = allTokens.get(key);
                                      existing.uiAmount += token.uiAmount;
                                      existing.value += token.value;
                                    } else {
                                      allTokens.set(key, { ...token });
                                    }
                                  });
                                }
                              });
                              
                              const topTokens = Array.from(allTokens.values())
                                .sort((a, b) => b.value - a.value)
                                .slice(0, 3);
                              
                              return topTokens.length > 0 && (
                                <div className="mb-3 space-y-1">
                                  <div className="text-xs text-gray-400 mb-1">Top Holdings:</div>
                                  {topTokens.map((token, index) => (
                                    <div key={`${token.symbol}-${index}`} className="flex justify-between items-center text-xs">
                                      <span className="text-gray-300">{token.symbol}</span>
                                      <div className="text-right">
                                        <div className="text-white">{token.uiAmount.toFixed(4)}</div>
                                        <div className="text-gray-400">${token.value.toFixed(2)}</div>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            })()} */}

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleDeposit(
                                    "ETH",
                                    walletBalances.eth.address
                                  )
                                }
                                className="flex-1 text-xs bg-green-900/30 text-green-400 border-green-700 hover:bg-green-900/50"
                              >
                                <ArrowDownToLine className="w-3 h-3 mr-1" />
                                Deposit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleWithdraw(
                                    "ETH",
                                    walletBalances.eth.address
                                  )
                                }
                                className="flex-1 text-xs bg-[#ADFEB9]/30 text-[#ADFEB9] border-[#ADFEB9] hover:bg-[#ADFEB9]/50"
                              >
                                <ArrowUpFromLine className="w-3 h-3 mr-1" />
                                Withdraw
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Solana Wallet Section */}
                        {walletBalances.sol.exists && (
                          <div className="p-3 border-b border-gray-800">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center gap-2">
                                <div className="w-6 h-6 rounded-full bg-purple-500 flex items-center justify-center">
                                  <span className="text-white text-xs font-bold">
                                    S
                                  </span>
                                </div>
                                <span className="text-white font-medium">
                                  Solana
                                </span>
                              </div>
                              <div className="text-right">
                                <div className="text-white font-medium">
                                  ${walletBalances.sol.usdValue.toFixed(2)}
                                </div>
                                <div className="text-gray-400 text-xs">
                                  Total value
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center justify-between mb-3">
                              <span className="text-gray-400 text-sm font-mono">
                                {walletBalances.sol.address.slice(0, 6)}...
                                {walletBalances.sol.address.slice(-4)}
                              </span>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() =>
                                  handleCopyAddress(
                                    walletBalances.sol.address,
                                    "SOL"
                                  )
                                }
                                className="text-gray-400 hover:text-white p-1"
                              >
                                <Copy className="w-3 h-3" />
                              </Button>
                            </div>

                            {/* Token Balances Display */}
                            {(() => {
                              // multiChainData is now tokensChains structure
                              const tokensData = multiChainData as any;
                              if (!tokensData || !tokensData.chains)
                                return null;

                              const solanaChain = tokensData.chains.find(
                                (chain: any) => chain.name === "Solana"
                              );
                              const topTokens = solanaChain?.tokens
                                ? [...solanaChain.tokens]
                                    .sort((a: any, b: any) => b.value - a.value)
                                    .slice(0, 3)
                                : [];

                              return (
                                topTokens.length > 0 && (
                                  <div className="mb-3 space-y-1">
                                    <div className="text-xs text-gray-400 mb-1">
                                      Top Holdings:
                                    </div>
                                    {topTokens.map(
                                      (token: any, index: number) => (
                                        <div
                                          key={`${token.symbol}-${index}`}
                                          className="flex justify-between items-center text-xs"
                                        >
                                          <span className="text-gray-300">
                                            {token.symbol}
                                          </span>
                                          <div className="text-right">
                                            <div className="text-white">
                                              {token.balance.toFixed(4)}
                                            </div>
                                            <div className="text-gray-400">
                                              ${token.value.toFixed(2)}
                                            </div>
                                          </div>
                                        </div>
                                      )
                                    )}
                                  </div>
                                )
                              );
                            })()}

                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleDeposit(
                                    "SOL",
                                    walletBalances.sol.address
                                  )
                                }
                                className="flex-1 text-xs bg-green-900/30 text-green-400 border-green-700 hover:bg-green-900/50"
                              >
                                <ArrowDownToLine className="w-3 h-3 mr-1" />
                                Deposit
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleWithdraw(
                                    "SOL",
                                    walletBalances.sol.address
                                  )
                                }
                                className="flex-1 text-xs bg-[#ADFEB9]/30 text-[#ADFEB9] border-[#ADFEB9] hover:bg-[#ADFEB9]/50"
                              >
                                <ArrowUpFromLine className="w-3 h-3 mr-1" />
                                Withdraw
                              </Button>
                            </div>
                          </div>
                        )}

                        {/* Create SUI Wallet Option */}
                        <div className="p-3">
                          <Button
                            onClick={handleCreateSuiWallet}
                            disabled={isCreatingWallet}
                            className="w-full text-white bg-gray-800 hover:bg-gray-700 border border-gray-600"
                            variant="outline"
                          >
                            <Plus className="w-4 h-4 mr-2" />
                            {isCreatingWallet
                              ? "Creating..."
                              : "Create SUI Wallet"}
                          </Button>
                        </div>

                        {/* Wallet Creation Options for missing wallets */}
                        <div className="p-2 border-t border-gray-800 space-y-1">
                          {!walletBalances.eth.exists && (
                            <DropdownMenuItem
                              onClick={handleCreateEthereumWallet}
                              disabled={isCreatingWallet}
                              className="text-white hover:bg-gray-800"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              {isCreatingWallet
                                ? "Creating..."
                                : "Create EVM Wallet"}
                            </DropdownMenuItem>
                          )}

                          {!walletBalances.sol.exists && (
                            <DropdownMenuItem
                              onClick={handleCreateSolanaWallet}
                              disabled={isCreatingWallet}
                              className="text-white hover:bg-gray-800"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              {isCreatingWallet
                                ? "Creating..."
                                : "Create SOL Wallet"}
                            </DropdownMenuItem>
                          )}

                          {/* Refresh Balances Option */}
                          <DropdownMenuItem
                            onClick={() => refreshAllData()}
                            disabled={isRefreshing || isLoadingWallets}
                            className="text-blue-400 hover:bg-gray-800"
                          >
                            <RefreshCw
                              className={`w-4 h-4 mr-2 ${isRefreshing ? "animate-spin" : ""}`}
                            />
                            {isRefreshing
                              ? "Refreshing..."
                              : "Refresh Balances"}
                          </DropdownMenuItem>
                        </div>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="outline"
                      className="bg-gray-900/50 hover:bg-gray-800 hover:text-white text-white border-gray-700"
                    >
                      <User className="w-4 h-4 mr-2" />
                      {user?.email?.startsWith("0x")
                        ? `${user.email.slice(0, 6)}...`
                        : /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(
                              user?.email || ""
                            )
                          ? `${user.email.slice(0, 4)}...`
                          : user?.email?.split("@")[0] || "User"}

                      <ChevronDown className="w-4 h-4 ml-2" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent className="w-56 bg-black border-gray-800">
                    <DropdownMenuItem
                      onClick={logout}
                      className="text-red-400 hover:bg-gray-800"
                    >
                      <LogOut className="w-4 h-4 mr-2" />
                      Logout
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 text-sm font-medium">
                  <Link
                    href="/faucet"
                    className="text-white hover:bg-[#ADFEB9] px-3 py-2 rounded-md transition-colors"
                  >
                    Faucet
                  </Link>
                  <Link
                    href="/test-swap"
                    className="text-white hover:bg-[#ADFEB9] px-3 py-2 rounded-md transition-colors"
                  >
                    Swap
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </header>
      {/* QR Code Modal */}
      <Dialog open={showQRModal} onOpenChange={setShowQRModal}>
        <DialogContent className="bg-black border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="w-5 h-5" />
              {currentWallet?.type} Address QR Code
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Scan this QR code to get the wallet address
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center space-y-4">
            {qrCodeUrl && (
              <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
            )}
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-2">Address:</p>
              <p className="font-mono text-sm break-all bg-gray-900 p-2 rounded">
                {currentWallet?.address}
              </p>
            </div>
            <Button
              onClick={() =>
                currentWallet &&
                handleCopyAddress(currentWallet.address, currentWallet.type)
              }
              className="w-full"
            >
              <Copy className="w-4 h-4 mr-2" />
              Copy Address
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Deposit Modal */}
      <Dialog open={showDepositModal} onOpenChange={setShowDepositModal}>
        <DialogContent className="bg-black border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowDownToLine className="w-5 h-5 text-green-400" />
              Deposit {currentWallet?.type}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Send {currentWallet?.type} to this address to deposit funds
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="text-center">
              <p className="text-sm text-gray-400 mb-2">Deposit Address:</p>
              <div className="bg-gray-900 p-3 rounded-lg">
                <p className="font-mono text-sm break-all">
                  {currentWallet?.address}
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() =>
                  currentWallet &&
                  handleCopyAddress(currentWallet.address, currentWallet.type)
                }
                className="flex-1"
              >
                <Copy className="w-4 h-4 mr-2" />
                Copy Address
              </Button>
              <Button
                onClick={() =>
                  currentWallet &&
                  handleShowQR(currentWallet.address, currentWallet.type)
                }
                variant="outline"
                className="flex-1"
              >
                <QrCode className="w-4 h-4 mr-2" />
                Show QR
              </Button>
            </div>
            <div className="bg-yellow-900/20 border border-yellow-700 p-3 rounded-lg">
              <p className="text-yellow-400 text-sm">
                ⚠️ Only send {currentWallet?.type} to this address. Sending
                other tokens may result in permanent loss.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Withdraw Modal */}
      <Dialog open={showWithdrawModal} onOpenChange={setShowWithdrawModal}>
        <DialogContent className="bg-black border-gray-800 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ArrowUpFromLine className="w-5 h-5 text-[#ADFEB9]" />
              Withdraw {currentWallet?.type}
            </DialogTitle>
            <DialogDescription className="text-gray-400">
              Send {currentWallet?.type} from your wallet to another address
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="withdraw-address">Recipient Address</Label>
              <Input
                id="withdraw-address"
                placeholder={`Enter ${currentWallet?.type} address`}
                value={withdrawAddress}
                onChange={(e) => setWithdrawAddress(e.target.value)}
                className="bg-gray-900 mt-2 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label htmlFor="withdraw-amount">Amount</Label>
              <Input
                id="withdraw-amount"
                type="number"
                step="0.000001"
                placeholder={`Enter amount in ${currentWallet?.type}`}
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                className="bg-gray-900 mt-2 border-gray-700 text-white"
              />
            </div>
            <div className="bg-red-900/20 border border-red-700 p-3 rounded-lg">
              <p className="text-red-400 text-sm">
                ⚠️ Double-check the recipient address. Transactions cannot be
                reversed.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setShowWithdrawModal(false)}
                variant="outline"
                className="flex-1"
                disabled={isProcessing}
              >
                Cancel
              </Button>
              <Button
                onClick={handleWithdrawSubmit}
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                disabled={!withdrawAddress || !withdrawAmount || isProcessing}
              >
                {isProcessing ? "Processing..." : "Withdraw"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
