"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { BiWallet } from "react-icons/bi";
import { SiEthereum, SiSolana } from "react-icons/si";
import { useAuth } from "@/lib/auth";
import { customWallet } from "@/config/turnkey";

interface WalletConnectionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export default function WalletConnectionDialog({
  open,
  onOpenChange,
  onSuccess,
}: WalletConnectionDialogProps) {
  const [loadingWallet, setLoadingWallet] = useState<string | null>(null);
  const [error, setError] = useState("");
  const { loginOrSignupWithWallet, loginWithSolanaWallet } = useAuth();

  const handleEVMWalletConnect = async (walletType: string) => {
    setLoadingWallet(walletType);
    setError("");

    try {
      // Check if MetaMask is available
      if (typeof window.ethereum === "undefined") {
        throw new Error("MetaMask is not installed. Please install MetaMask to continue.");
      }

      // Request account access
      await window.ethereum.request({ method: "eth_requestAccounts" });

      await loginOrSignupWithWallet({
        walletProvider: window.ethereum,
        createSubOrgParams: {
          customWallet: {
            ...customWallet,
            walletName: `EVM-Wallet-${Date.now()}`,
          },
        },
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error("EVM wallet connection error:", err);
      // If the error is about wallet label uniqueness, we can consider it non-critical
      if (err instanceof Error && err.message.includes("wallet label must be unique")) {
        console.log("Wallet already exists, continuing with login");
        onSuccess?.();
        onOpenChange(false);
        return;
      }
      
      const errorMessage = err instanceof Error ? err.message : "Failed to connect wallet";
      setError(errorMessage);
    } finally {
      setLoadingWallet(null);
    }
  };

  const handleSolanaWalletConnect = async () => {
    setLoadingWallet("solana");
    setError("");

    try {
      // Check if Phantom wallet is available
      if (typeof window.solana === "undefined") {
        throw new Error("Phantom wallet is not installed. Please install Phantom to continue.");
      }

      const solanaWallet = window.solana;
      
      await loginWithSolanaWallet({
        walletProvider: solanaWallet,
        createSubOrgParams: {
          customWallet: {
            ...customWallet,
            walletName: `Solana-Wallet-${Date.now()}`,
            walletAccounts: [
              {
                curve: "CURVE_ED25519" as const,
                pathFormat: "PATH_FORMAT_BIP32" as const,
                path: "m/44'/501'/0'/0'",
                addressFormat: "ADDRESS_FORMAT_SOLANA" as const,
              },
            ],
          },
        },
      });

      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      console.error("Solana wallet connection error:", err);
      // If the error is about wallet label uniqueness, we can consider it non-critical
      if (err instanceof Error && err.message.includes("wallet label must be unique")) {
        console.log("Wallet already exists, continuing with login");
        onSuccess?.();
        onOpenChange(false);
        return;
      }
      
      const errorMessage = err instanceof Error ? err.message : "Failed to connect Solana wallet";
      setError(errorMessage);
    } finally {
      setLoadingWallet(null);
    }
  };

  const walletOptions = [
    {
      id: "metamask",
      name: "MetaMask",
      icon: SiEthereum,
      description: "Connect with MetaMask wallet",
      type: "evm",
      onClick: () => handleEVMWalletConnect("metamask"),
    },
    {
      id: "phantom",
      name: "Phantom",
      icon: SiSolana,
      description: "Connect with Phantom wallet",
      type: "solana",
      onClick: handleSolanaWalletConnect,
    },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white text-xl font-semibold flex items-center gap-2">
            <BiWallet className="h-6 w-6 text-[#FA4C15]" />
            Connect Wallet
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-4">
          {error && (
            <div className="bg-red-950/50 border border-red-800/50 text-red-400 p-3 rounded-lg text-sm">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                <div>{error}</div>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {walletOptions.map((wallet) => {
              const Icon = wallet.icon;
              const isLoading = loadingWallet === wallet.id;

              return (
                <Button
                  key={wallet.id}
                  onClick={wallet.onClick}
                  disabled={isLoading || loadingWallet !== null}
                  className="w-full h-16 bg-gray-800/50 border border-gray-700 hover:bg-gray-700 hover:border-[#FA4C15]/50 text-white rounded-lg transition-all duration-200 flex items-center justify-between p-4"
                  variant="outline"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 flex items-center justify-center">
                      {isLoading ? (
                        <div className="w-6 h-6 border-2 border-gray-400 border-t-[#FA4C15] rounded-full animate-spin" />
                      ) : (
                        <Icon className="w-6 h-6 text-[#FA4C15]" />
                      )}
                    </div>
                    <div className="text-left">
                      <div className="font-medium">{wallet.name}</div>
                      <div className="text-sm text-gray-400">{wallet.description}</div>
                    </div>
                  </div>
                  <div className="text-xs text-gray-500 uppercase font-mono">
                    {wallet.type}
                  </div>
                </Button>
              );
            })}
          </div>

          <div className="pt-4 border-t border-gray-800">
            <p className="text-xs text-gray-500 text-center leading-relaxed">
              By connecting a wallet, you agree to our{" "}
              <span className="text-[#FA4C15] hover:text-[#FA4C15]/80 cursor-pointer">
                Terms of Service
              </span>{" "}
              and{" "}
              <span className="text-[#FA4C15] hover:text-[#FA4C15]/80 cursor-pointer">
                Privacy Policy
              </span>
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
