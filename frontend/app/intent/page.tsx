"use client";

import { useState } from "react";
import { toast } from "sonner";
import * as React from "react";
import GlitchText from "@/components/animations/glitch";
import Link from "next/link";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Bot,
  User,
  Loader2,
  CheckCircle,
  AlertCircle,
  ArrowRight,
  Wallet,
  ExternalLink,
  Copy,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { parseAptosIntent } from "@/lib/aptos/intent-parser";
import { executeAptosIntent } from "@/lib/aptos/strategy-executor";
import { getAptosAddress, getAptBalance, getAptosPublicKey } from "@/lib/aptos/wallet";
import { turnkeyApi } from "@/lib/auth/api";
import { AptosStrategyCard } from "@/components/aptos/strategy-card";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
  swapIntent?: SwapIntent;
  swapResult?: {
    explorerUrl?: string;
    transactionHash?: string;
  };
};

type SwapIntent = {
  action: string;
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  amount: string;
  fromAddress: string;
  destinationAddress: string;
  crossChain: boolean;
  ready: boolean;
};

type TokenInfo = {
  symbol: string;
  decimals: number;
};

type Quote = {
  type: string;
  effectiveAmountIn64: string;
  expectedAmountOut: number;
  priceImpact: number | null;
  minAmountOut: number;
  eta: number;
  etaSeconds: number;
  fromToken: TokenInfo;
  toToken: TokenInfo;
  fromChain: string;
  toChain: string;
  slippageBps: number;
  bridgeFee: number;
  gasless: boolean;
  price: number;
  priceStat: {
    ratio: number;
    status: "GOOD" | "NORMAL" | "BAD";
  } | null;
};

export default function IntentPage() {
  const router = useRouter();

  const { user, getWalletAccounts } = useAuth();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      role: "assistant",
      content:
        "Hi! I'm your DeFi swap assistant. I can help you swap tokens across different blockchains including Ethereum, BSC, Polygon, Avalanche, Arbitrum, Optimism, Base, and Solana. I can automatically detect your wallet addresses, so you just need to tell me what you want to swap! What would you like to swap today?",
      timestamp: new Date(),
    },
  ]);

  const [inputMessage, setInputMessage] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [currentSwapIntent, setCurrentSwapIntent] = useState<SwapIntent | null>(
    null
  );
  const [quote, setQuote] = useState<Quote | null>(null);
  const [isGettingQuote, setIsGettingQuote] = useState(false);
  const [isExecutingSwap, setIsExecutingSwap] = useState(false);
  const [walletAccounts, setWalletAccounts] = useState<{
    ethereum?: { address: string; balance?: number };
    solana?: { address: string; balance?: number };
  }>({});
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false);

  // Aptos State
  const [aptosAddress, setAptosAddress] = useState<string | null>(null);
  const [aptosPublicKey, setAptosPublicKey] = useState<string | null>(null);
  const [aptBalance, setAptBalance] = useState(0);
  const [aptosStrategies, setAptosStrategies] = useState<any[]>([]);

  // Load Aptos wallet
  React.useEffect(() => {
    async function loadAptosWallet() {
      if (user?.wallets) {
        try {
          const address = await getAptosAddress(
            getWalletAccounts,
            user.wallets
          );

          if (address) {
            setAptosAddress(address);
            console.log("Aptos address loaded:", address);

            const balance = await getAptBalance(address);
            setAptBalance(balance);

            const pubKey = await getAptosPublicKey(
              getWalletAccounts,
              user.wallets
            );
            setAptosPublicKey(pubKey);

            // Load strategies
            await loadAptosStrategies(address);
          }
        } catch (error) {
          console.error("Error loading Aptos wallet:", error);
        }
      }
    }

    loadAptosWallet();
  }, [user?.wallets, getWalletAccounts]);

  // Load Aptos strategies
  const loadAptosStrategies = async (address: string) => {
    try {
      const response = await fetch(`/api/aptos/strategies?address=${address}`);
      const data = await response.json();

      if (data.success) {
        setAptosStrategies(data.strategies || []);
      }
    } catch (error) {
      console.error("Error loading strategies:", error);
    }
  };

  // Authentication check
  React.useEffect(() => {
    if (!user) {
      toast.error("Please login to use the swap feature");
      router.push("/login");
      return;
    }
  }, [user, router]);

  // Memoize loader to satisfy hook dependency and avoid stale closures
  const loadWalletAccounts = React.useCallback(async () => {
    if (!user?.wallets || user.wallets.length === 0) return;

    setIsLoadingAccounts(true);
    try {
      const accounts: {
        ethereum?: { address: string; balance?: number };
        solana?: { address: string; balance?: number };
      } = {};

      for (const wallet of user.wallets) {
        try {
          const response = await getWalletAccounts(wallet.walletId);
          if (response?.accounts) {
            response.accounts.forEach(
              (account: {
                addressFormat: string;
                address: string;
                balance?: number;
              }) => {
                if (account.addressFormat === "ADDRESS_FORMAT_ETHEREUM") {
                  accounts.ethereum = {
                    address: account.address,
                    balance: account.balance || 0,
                  };
                } else if (account.addressFormat === "ADDRESS_FORMAT_SOLANA") {
                  accounts.solana = {
                    address: account.address,
                    balance: account.balance || 0,
                  };
                }
              }
            );
          }
        } catch (error) {
          console.error(
            `Error loading accounts for wallet ${wallet.walletId}:`,
            error
          );
        }
      }

      setWalletAccounts(accounts);
      console.log("Loaded wallet accounts:", accounts);
    } catch (error) {
      console.error("Error loading wallet accounts:", error);
    } finally {
      setIsLoadingAccounts(false);
    }
  }, [user?.wallets, getWalletAccounts]);

  // Load wallet accounts when user is available
  React.useEffect(() => {
    if (user?.wallets && user.wallets.length > 0) {
      loadWalletAccounts();
    }
  }, [user?.wallets, loadWalletAccounts]);

  // (moved into useCallback above)

  const getWalletAddress = (chain: string): string | null => {
    const chainType = chain === "solana" ? "solana" : "ethereum";
    return walletAccounts[chainType]?.address || null;
  };

  const handleAptosMessage = async (message: string) => {
    if (!aptosAddress || !aptosPublicKey) {
      return false;
    }

    // Try parsing as Aptos intent
    const aptosIntent = await parseAptosIntent(message, aptosAddress);

    if (aptosIntent) {
      setIsLoading(true);

      // Add user message if not already added
      setMessages((prev) => {
        if (prev[prev.length - 1].role === "user" && prev[prev.length - 1].content === message) {
          return prev;
        }
        return [...prev, {
          id: Date.now().toString(),
          role: "user",
          content: message,
          timestamp: new Date(),
        }];
      });

      // Add processing message
      setMessages((prev) => [...prev, {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: `🔄 Processing Aptos intent: ${aptosIntent.description}`,
        timestamp: new Date(),
      }]);

      try {
        const result = await executeAptosIntent(
          aptosIntent,
          aptosAddress,
          aptosPublicKey,
          turnkeyApi.signRawPayload
        );

        if (result.success) {
          setMessages((prev) => [...prev, {
            id: (Date.now() + 2).toString(),
            role: "assistant",
            content: `✅ Strategy created successfully!\n\n**Transaction Hash:** \`${result.transactionHash}\`\n\n[View on Explorer](https://explorer.aptoslabs.com/txn/${result.transactionHash}?network=testnet)`,
            timestamp: new Date(),
          }]);

          // Reload strategies
          await loadAptosStrategies(aptosAddress);
        } else {
          setMessages((prev) => [...prev, {
            id: (Date.now() + 2).toString(),
            role: "assistant",
            content: `❌ Failed to create strategy: ${result.error}`,
            timestamp: new Date(),
          }]);
        }
      } catch (error) {
        setMessages((prev) => [...prev, {
          id: (Date.now() + 2).toString(),
          role: "assistant",
          content: `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`,
          timestamp: new Date(),
        }]);
      }

      setIsLoading(false);
      return true; // Handled as Aptos intent
    }

    return false; // Not an Aptos intent
  };

  const sendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: "user",
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    const messageContent = inputMessage.trim();
    setInputMessage("");

    // Try Aptos first
    const handledByAptos = await handleAptosMessage(messageContent);
    if (handledByAptos) return;

    setIsLoading(true);

    try {
      // Check if user is confirming a swap
      const isConfirmation =
        quote &&
        currentSwapIntent &&
        (messageContent.toLowerCase() === "yes" ||
          messageContent.toLowerCase() === "confirm" ||
          messageContent.toLowerCase() === "proceed" ||
          messageContent.toLowerCase() === "y");

      if (isConfirmation) {
        // Execute the swap directly
        setIsLoading(false);
        await executeSwap();
        return;
      }

      // Build conversation history for context
      const conversationHistory = messages.map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Add wallet information to the message context
      const walletInfo = {
        ethereumAddress: walletAccounts.ethereum?.address,
        solanaAddress: walletAccounts.solana?.address,
      };

      const response = await fetch("/api/chat/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: messageContent,
          conversationHistory,
          walletInfo,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const swapIntent = data.swapIntent;

        // Auto-fill wallet addresses if swap intent is detected
        if (swapIntent && !swapIntent.fromAddress) {
          const fromAddress = getWalletAddress(swapIntent.fromChain);
          if (fromAddress) {
            swapIntent.fromAddress = fromAddress;
          }
        }

        // For same-chain swaps, auto-fill destination address
        // For cross-chain swaps, only fill if user hasn't provided one
        if (swapIntent && !swapIntent.destinationAddress) {
          if (!swapIntent.crossChain) {
            // Same chain - use same address
            const toAddress = getWalletAddress(swapIntent.toChain);
            if (toAddress) {
              swapIntent.destinationAddress = toAddress;
            }
          }
          // For cross-chain swaps, leave empty - user must provide
        }

        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response,
          timestamp: new Date(),
          swapIntent,
        };

        setMessages((prev) => [...prev, assistantMessage]);

        // If we have a complete swap intent with addresses, store it
        if (
          data.isReady &&
          swapIntent?.fromAddress &&
          swapIntent?.destinationAddress
        ) {
          setCurrentSwapIntent(swapIntent);
          // Auto-get quote
          setTimeout(() => getQuote(swapIntent), 1000);
        }
      } else {
        throw new Error(data.error || "Failed to send message");
      }
    } catch (error) {
      console.error("Error sending message:", error);
      toast.error("Failed to send message. Please try again.");

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const getQuote = async (swapIntent: SwapIntent) => {
    if (!swapIntent || !user?.organizationId) return;

    setIsGettingQuote(true);

    try {
      // First, get tokens for the chains to find the contract addresses
      const [fromTokensRes, toTokensRes] = await Promise.all([
        fetch(`/api/intent/tokens?chain=${swapIntent.fromChain}`),
        fetch(`/api/intent/tokens?chain=${swapIntent.toChain}`),
      ]);

      const [fromTokensData, toTokensData] = await Promise.all([
        fromTokensRes.json(),
        toTokensRes.json(),
      ]);

      if (!fromTokensData.success || !toTokensData.success) {
        throw new Error("Failed to load tokens");
      }

      // Find token contracts by symbol
      const fromToken = fromTokensData.tokens.find(
        (t: { symbol: string; contract: string }) =>
          t.symbol.toLowerCase() === swapIntent.fromToken.toLowerCase()
      );

      const toToken = toTokensData.tokens.find(
        (t: { symbol: string; contract: string }) =>
          t.symbol.toLowerCase() === swapIntent.toToken.toLowerCase()
      );

      if (!fromToken) {
        throw new Error(
          `Token ${swapIntent.fromToken} not found on ${swapIntent.fromChain}. Please check the token symbol or try a different token.`
        );
      }

      if (!toToken) {
        throw new Error(
          `Token ${swapIntent.toToken} not found on ${swapIntent.toChain}. Please check the token symbol or try a different token.`
        );
      }

      // Get quote
      const quoteResponse = await fetch("/api/intent/quote", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amountIn: swapIntent.amount,
          fromToken: fromToken.contract,
          toToken: toToken.contract,
          fromChain: swapIntent.fromChain,
          toChain: swapIntent.toChain,
          slippageBps: 100, // 1% slippage
          userOrganizationId: user.organizationId,
        }),
      });

      const quoteData = await quoteResponse.json();

      if (quoteData.success && quoteData.quote.length > 0) {
        setQuote(quoteData.quote[0]);

        // Add quote message
        const quoteMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: `Great! I found a quote for your swap. You'll send ${swapIntent.amount} ${swapIntent.fromToken} on ${swapIntent.fromChain} and receive approximately ${quoteData.quote[0].expectedAmountOut.toFixed(6)} ${quoteData.quote[0].toToken.symbol} on ${swapIntent.toChain}. Would you like to proceed with this swap?`,
          timestamp: new Date(),
        };
        setMessages((prev) => [...prev, quoteMessage]);
      } else {
        throw new Error("No quotes available for this swap");
      }
    } catch (error) {
      console.error("Error getting quote:", error);
      toast.error("Failed to get quote");

      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `Sorry, I couldn't get a quote for this swap. ${error instanceof Error ? error.message : "Please try again."}`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsGettingQuote(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
    return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  };

  const executeSwap = async () => {
    if (!quote || !currentSwapIntent || !user?.organizationId) return;

    setIsExecutingSwap(true);

    // Add processing message
    const processingMessage: Message = {
      id: Date.now().toString(),
      role: "assistant",
      content:
        "🔄 Processing your swap... Please wait while I execute the transaction.",
      timestamp: new Date(),
    };
    setMessages((prev) => [...prev, processingMessage]);

    try {
      const response = await fetch("/api/intent/swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          quote,
          originAddress: currentSwapIntent.fromAddress,
          destinationAddress: currentSwapIntent.destinationAddress,
          userOrganizationId: user.organizationId,
        }),
      });

      const data = await response.json();

      if (data.success) {
        const successMessage: Message = {
          id: Date.now().toString(),
          role: "assistant",
          content: `🎉 Swap executed successfully! 

**Transaction Details:**
- Sent: ${currentSwapIntent.amount} ${currentSwapIntent.fromToken} on ${currentSwapIntent.fromChain}
- Received: ~${quote.expectedAmountOut.toFixed(6)} ${quote.toToken.symbol} on ${currentSwapIntent.toChain}
- To Address: ${currentSwapIntent.destinationAddress.slice(0, 8)}...${currentSwapIntent.destinationAddress.slice(-8)}

Your swap is complete! 🚀`,
          timestamp: new Date(),
          swapResult: {
            explorerUrl: data.result?.explorerUrl,
            transactionHash: data.result?.transactionHash,
          },
        };
        setMessages((prev) => [...prev, successMessage]);

        // Reset state
        setQuote(null);
        setCurrentSwapIntent(null);

        toast.success("Swap executed successfully!");
      } else {
        throw new Error(data.error || "Swap failed");
      }
    } catch (error) {
      console.error("Error executing swap:", error);
      toast.error("Failed to execute swap");

      const errorMessage: Message = {
        id: Date.now().toString(),
        role: "assistant",
        content: `❌ Sorry, the swap failed. ${error instanceof Error ? error.message : "Please try again."}

You can try again with a new swap request.`,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsExecutingSwap(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };
  const getPriceStatusColor = (status: string | undefined) => {
    switch (status) {
      case "GOOD":
        return "text-green-500";
      case "NORMAL":
        return "text-yellow-500";
      case "BAD":
        return "text-red-500";
      default:
        return "text-gray-500";
    }
  };
  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-b from-black via-zinc-950 to-black text-white">
      <section className="px-4 py-10 md:py-12">
        <div className="container mx-auto max-w-6xl">
          <div className="text-center mb-12">
            <motion.h1
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-6xl md:text-7xl font-light tracking-tight mb-4"
            >
              Turn words into
              <br />
              <span
                style={{ fontFamily: "var(--font-instrument-serif)" }}
                className="text-transparent bg-clip-text bg-gradient-to-r from-[#ADFEB9] to-emerald-300 italic"
              >
                powerful strategies.
              </span>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-xl text-gray-400 mt-6 mb-8 max-w-2xl mx-auto"
            >
              Express your financial goals in simple language, and we&apos;ll
              handle the complexity. No gas. No code. No limits.
            </motion.p>
          </div>

          <div className="rounded-2xl border w-full border-[#ADFEB9]/20 bg-gradient-to-b from-zinc-900/30 to-black p-8 overflow-hidden shadow-[0_0_25px_rgba(0,0,0,0.3)]">
            <div className="flex flex-col md:flex-row gap-8">
              <div className="flex-1">
                <div>
                  <div className="relative">
                    <div className="absolute -inset-1 bg-gradient-to-r from-[#ADFEB9]/10 to-emerald-900/10 rounded-xl blur-xl"></div>
                    <div className="relative h-[800px]">
                      <div className="lg:col-span-2">
                        <Card className="border-gray-800 bg-gray-900/30 h-[800px] flex flex-col">
                          <CardHeader>
                            <CardTitle className="text-[#ADFEB9] border-b flex items-center gap-2">
                              {" "}
                              <motion.h2
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5 }}
                                className="text-xl md:text-3xl text-transparent bg-clip-text bg-gradient-to-r from-[#ADFEB9] to-emerald-300 mb-6"
                                style={{
                                  fontFamily: "var(--font-instrument-serif)",
                                }}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="text-[#ADFEB9] animate-pulse">
                                    •
                                  </span>
                                  <GlitchText
                                    text="AptoPilot Agent"
                                    className="text-transparent bg-clip-text bg-gradient-to-r from-[#ADFEB9] to-emerald-300 hover:cursor-pointer"
                                  />
                                </div>
                              </motion.h2>
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="flex-1 flex flex-col overflow-hidden">
                            <ScrollArea className="flex-1 pr-4">
                              <div className="space-y-4 p-2">
                                {messages.map((message) => (
                                  <div
                                    key={message.id}
                                    className={`flex gap-3 w-full ${message.role === "user"
                                      ? "justify-end"
                                      : "justify-start"
                                      }`}
                                  >
                                    <div
                                      className={`flex gap-3 max-w-[85%] min-w-0 ${message.role === "user"
                                        ? "flex-row-reverse"
                                        : "flex-row"
                                        }`}
                                    >
                                      <div
                                        className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${message.role === "user"
                                          ? "bg-[#ADFEB9]"
                                          : "bg-gray-700"
                                          }`}
                                      >
                                        {message.role === "user" ? (
                                          <User className="w-4 h-4" />
                                        ) : (
                                          <Bot className="w-4 h-4" />
                                        )}
                                      </div>
                                      <div
                                        className={`rounded-lg p-3 min-w-0 break-words overflow-hidden ${message.role === "user"
                                          ? "bg-[#ADFEB9] text-black"
                                          : "bg-gray-800 text-gray-100"
                                          }`}
                                      >
                                        <p className="text-sm whitespace-pre-wrap break-words overflow-wrap-anywhere">
                                          {message.content}
                                        </p>

                                        {/* Swap Intent Display */}
                                        {message.swapIntent && (
                                          <div className="mt-2 p-2 bg-gray-700/50 rounded text-xs">
                                            <p className="font-semibold text-[#ADFEB9]">
                                              Swap Intent Detected:
                                            </p>
                                            <p className="break-words">
                                              {message.swapIntent.amount}{" "}
                                              {message.swapIntent.fromToken}
                                            </p>
                                            <p className="break-words">
                                              {message.swapIntent.fromChain} →{" "}
                                              {message.swapIntent.toChain}
                                            </p>
                                            {message.swapIntent.fromAddress && (
                                              <p className="text-green-400">
                                                ✓ Wallet addresses detected
                                              </p>
                                            )}
                                          </div>
                                        )}

                                        {/* Swap Result Display with Buttons */}
                                        {message.swapResult && (
                                          <div className="mt-3 space-y-2">
                                            {message.swapResult.explorerUrl && (
                                              <Button
                                                onClick={() =>
                                                  window.open(
                                                    message.swapResult!
                                                      .explorerUrl,
                                                    "_blank"
                                                  )
                                                }
                                                className="w-full bg-blue-600 hover:bg-blue-700 text-white text-xs py-2 h-8"
                                                size="sm"
                                              >
                                                <ExternalLink className="w-3 h-3 mr-2" />
                                                View on Explorer
                                              </Button>
                                            )}
                                            {message.swapResult
                                              .transactionHash && (
                                                <Button
                                                  onClick={() =>
                                                    copyToClipboard(
                                                      message.swapResult!
                                                        .transactionHash!,
                                                      "Transaction hash"
                                                    )
                                                  }
                                                  className="w-full bg-gray-600 hover:bg-gray-700 text-white text-xs py-2 h-8"
                                                  size="sm"
                                                >
                                                  <Copy className="w-3 h-3 mr-2" />
                                                  Copy Transaction Hash
                                                </Button>
                                              )}
                                          </div>
                                        )}

                                        <p className="text-xs opacity-70 mt-1">
                                          {message.timestamp.toLocaleTimeString()}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                                {isLoading && (
                                  <div className="flex gap-3 justify-start">
                                    <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center">
                                      <Bot className="w-4 h-4" />
                                    </div>
                                    <div className="bg-gray-800 rounded-lg p-3">
                                      <div className="flex items-center gap-2">
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                        <span className="text-sm">
                                          Thinking...
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </ScrollArea>

                            <div className="mt-4 flex gap-2 flex-shrink-0">
                              <Input
                                value={inputMessage}
                                onChange={(e) =>
                                  setInputMessage(e.target.value)
                                }
                                onKeyPress={handleKeyPress}
                                placeholder={
                                  quote && currentSwapIntent
                                    ? "Type 'yes' to confirm the swap..."
                                    : "Type your message..."
                                }
                                disabled={isLoading || isExecutingSwap}
                                className="bg-gray-800 border-gray-700 text-white placeholder:text-gray-400"
                              />
                              <Button
                                onClick={sendMessage}
                                disabled={
                                  isLoading ||
                                  isExecutingSwap ||
                                  !inputMessage.trim()
                                }
                                className="bg-[#ADFEB9] hover:bg-[#ADFEB9]/90 text-black flex-shrink-0"
                              >
                                <Send className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                {/* Aptos Wallet Status */}
                <Card className="border-gray-800 bg-gray-900/30">
                  <CardHeader>
                    <CardTitle className="text-orange-500 text-sm flex items-center gap-2">
                      <span className="text-2xl">🟠</span>
                      Aptos Wallet
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {aptosAddress ? (
                      <div className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">Balance:</span>
                          <span className="font-mono">{aptBalance.toFixed(4)} APT</span>
                        </div>
                        <div className="text-xs text-gray-500 font-mono">
                          {aptosAddress.slice(0, 8)}...{aptosAddress.slice(-6)}
                        </div>
                        <a
                          href={`https://explorer.aptoslabs.com/account/${aptosAddress}?network=testnet`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-400 hover:underline"
                        >
                          View on Explorer →
                        </a>
                      </div>
                    ) : (
                      <span className="text-sm text-gray-400">No Aptos wallet found</span>
                    )}
                  </CardContent>
                </Card>

                {/* Wallet Status */}
                <Card className="border-gray-800 bg-gray-900/30">
                  <CardHeader>
                    <CardTitle className="text-orange-500 text-sm flex items-center gap-2">
                      <Wallet className="w-4 h-4" />
                      Wallet Status
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {isLoadingAccounts ? (
                      <div className="flex items-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">Loading wallets...</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">
                            Ethereum:
                          </span>
                          <span
                            className={`text-xs ${walletAccounts.ethereum ? "text-green-400" : "text-red-400"}`}
                          >
                            {walletAccounts.ethereum
                              ? "✓ Connected"
                              : "✗ Not found"}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-gray-400">Solana:</span>
                          <span
                            className={`text-xs ${walletAccounts.solana ? "text-green-400" : "text-red-400"}`}
                          >
                            {walletAccounts.solana
                              ? "✓ Connected"
                              : "✗ Not found"}
                          </span>
                        </div>
                        {walletAccounts.ethereum && (
                          <p className="text-xs text-gray-500 font-mono break-all">
                            ETH: {walletAccounts.ethereum.address.slice(0, 6)}
                            ...
                            {walletAccounts.ethereum.address.slice(-4)}
                          </p>
                        )}
                        {walletAccounts.solana && (
                          <p className="text-xs text-gray-500 font-mono break-all">
                            SOL: {walletAccounts.solana.address.slice(0, 6)}...
                            {walletAccounts.solana.address.slice(-4)}
                          </p>
                        )}
                      </>
                    )}
                  </CardContent>
                </Card>

                {/* Active Strategies */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <span>Active Strategies</span>
                    <Badge variant="outline">{aptosStrategies.length}</Badge>
                  </h3>

                  {aptosStrategies.length === 0 ? (
                    <p className="text-sm text-gray-400">
                      No active strategies. Try: &quot;I want safe yield on my APT token&quot;
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {aptosStrategies.map((strategy) => (
                        <AptosStrategyCard
                          key={strategy.id}
                          strategy={strategy}
                          onPause={async (id) => {
                            // Handle pause
                            console.log("Pause strategy", id);
                          }}
                          onResume={async (id) => {
                            // Handle resume
                            console.log("Resume strategy", id);
                          }}
                          onCancel={async (id) => {
                            // Handle cancel
                            console.log("Cancel strategy", id);
                          }}
                          isLoading={isLoading}
                        />
                      ))}
                    </div>
                  )}
                </div>

                {/* Current Intent */}
                {currentSwapIntent && (
                  <Card className="border-gray-800 bg-gray-900/30">
                    <CardHeader>
                      <CardTitle className="text-orange-500 text-sm">
                        Current Swap Intent
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Amount:</span>
                        <span className="font-semibold">
                          {currentSwapIntent.amount}{" "}
                          {currentSwapIntent.fromToken}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Route:</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {currentSwapIntent.fromChain}
                          </Badge>
                          <ArrowRight className="w-3 h-3" />
                          <Badge variant="outline" className="text-xs">
                            {currentSwapIntent.toChain}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">Type:</span>
                        <Badge
                          variant={
                            currentSwapIntent.crossChain
                              ? "default"
                              : "secondary"
                          }
                        >
                          {currentSwapIntent.crossChain
                            ? "Cross-chain"
                            : "Same-chain"}
                        </Badge>
                      </div>
                      {currentSwapIntent.fromAddress && (
                        <div className="text-xs text-green-400">
                          ✓ Using your wallet addresses
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}

                {/* Quote Details */}
                {quote && (
                  <Card className="border-gray-800 bg-gray-900/30">
                    <CardHeader>
                      <CardTitle className="text-orange-500 text-sm flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Quote Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">You Send:</span>
                        <span className="font-semibold">
                          {parseFloat(quote.effectiveAmountIn64) /
                            Math.pow(10, quote.fromToken.decimals)}{" "}
                          {quote.fromToken.symbol}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">
                          You Receive:
                        </span>
                        <span className="font-semibold text-green-500">
                          {quote.expectedAmountOut.toFixed(6)}{" "}
                          {quote.toToken.symbol}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">
                          Price Impact:
                        </span>
                        <span
                          className={`font-semibold ${(quote.priceImpact ?? 0) > 5
                            ? "text-red-500"
                            : (quote.priceImpact ?? 0) > 1
                              ? "text-yellow-500"
                              : "text-green-500"
                            }`}
                        >
                          {quote.priceImpact
                            ? `${quote.priceImpact.toFixed(2)}%`
                            : "N/A"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">
                          Bridge Fee:
                        </span>
                        <span className="font-semibold">
                          ${quote.bridgeFee?.toFixed(4) ?? "0.0000"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">
                          Est. Time:
                        </span>
                        <span className="font-semibold">
                          {formatTime(quote.etaSeconds)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-400">
                          Price Status:
                        </span>
                        <span
                          className={`font-semibold ${getPriceStatusColor(quote.priceStat?.status)}`}
                        >
                          {quote.priceStat?.status ?? "NORMAL"}
                        </span>
                      </div>

                      {quote.gasless && (
                        <div className="bg-green-900/20 border border-green-500/20 rounded-lg p-2">
                          <p className="text-green-400 text-xs font-semibold">
                            ✨ Gasless Transaction
                          </p>
                        </div>
                      )}

                      <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-2 mt-4">
                        <p className="text-blue-400 text-xs font-semibold">
                          💬 Type &quot;yes&quot; in chat to execute this swap
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Loading States */}
                {isGettingQuote && (
                  <Card className="border-gray-800 bg-gray-900/30">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="w-5 h-5 animate-spin text-orange-500" />
                        <span className="text-sm">Getting quote...</span>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Help Card */}
                <Card className="border-gray-800 bg-gray-900/30">
                  <CardHeader>
                    <CardTitle className="text-orange-500 text-sm flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      How to Use
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs text-gray-400">
                    <p>• Tell me what token you want to swap</p>
                    <p>• Specify the source and destination chains</p>
                    <p>• Provide the amount you want to swap</p>
                    <p>• I&apos;ll automatically use your wallet addresses</p>
                    <p>• Type &quot;yes&quot; to confirm and execute swaps</p>
                    <p className="mt-3 text-orange-400">
                      Example: &quot;Swap 0.001 SOL to TRUMP&quot;
                    </p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          <div className="mt-16">
            <div
              className="text-2xl mb-8 flex items-center gap-2"
              style={{ fontFamily: "var(--font-instrument-serif)" }}
            >
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600">
                <GlitchText
                  text="Intent History"
                  className="text-transparent bg-clip-text bg-gradient-to-r from-orange-500 to-orange-600 hover:cursor-pointer"
                />
              </span>
            </div>

            <div className="rounded-2xl border border-orange-900/20 bg-gradient-to-b from-zinc-900/30 to-black p-6 shadow-[0_0_25px_rgba(0,0,0,0.3)]">
              {/* // TODO: Display Intent History */}
            </div>
          </div>
        </div>
      </section>

      <div className="border-b border-zinc-800/50 mt-12"></div>

      <footer className="py-8 px-4">
        <div className="container mx-auto max-w-5xl text-center">
          <p className="text-gray-500 text-sm font-light">
            Need help? Visit our{" "}
            <Link
              href="#"
              className="text-orange-500 hover:text-orange-400 transition-colors"
            >
              documentation
            </Link>{" "}
            or{" "}
            <Link
              href="#"
              className="text-orange-500 hover:text-orange-400 transition-colors"
            >
              contact support
            </Link>
          </p>
        </div>
      </footer>
    </div>
  );
}
