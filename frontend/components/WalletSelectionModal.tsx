/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import React from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import Image from "next/image";

interface WalletSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WalletSelectionModal: React.FC<WalletSelectionModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { wallets, select, connecting } = useWallet();

  const handleWalletSelect = async (walletName: string) => {
    try {
      select(walletName as any);
      onClose();
    } catch (error) {
      console.error("Error selecting wallet:", error);
    }
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Fallback wallet info for installation links
  const walletInstallInfo = [
    {
      name: "Phantom",
      url: "https://phantom.app/",
      icon: "https://phantom.app/img/phantom-logo.png",
      fallbackIcon: "P",
      bgColor: "bg-purple-600",
    },
    {
      name: "Solflare",
      url: "https://solflare.com/",
      icon: "https://solflare.com/img/logo.svg",
      fallbackIcon: "S",
      bgColor: "bg-orange-600",
    },
    {
      name: "Backpack",
      url: "https://backpack.app/",
      icon: "https://backpack.app/logo.png",
      fallbackIcon: "B",
      bgColor: "bg-gray-600",
    },
  ];

  if (!isOpen) return null;

  return (
    <>
      {/* Custom Modal Overlay */}
      <div
        className="fixed inset-0 bg-opacity-50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        onClick={handleOverlayClick}
      >
        <div className="bg-black border border-gray-800 text-white max-w-sm w-full mx-auto rounded-lg relative">
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl z-10"
          >
            ×
          </button>

          {/* Header */}
          <div className="p-6 pb-0">
            <h2 className="text-xl font-bold text-center text-[#ADFEB9]">
              Connect Wallet
            </h2>
          </div>

          <div className="space-y-3 p-6">
            {wallets.filter((wallet) => wallet.readyState === "Installed")
              .length > 0 ? (
              wallets
                .filter((wallet) => wallet.readyState === "Installed")
                .map((wallet) => (
                  <button
                    key={wallet.adapter.name}
                    onClick={() => handleWalletSelect(wallet.adapter.name)}
                    disabled={connecting}
                    className="w-full bg-gray-900 cursor-pointer hover:bg-gray-800 border border-gray-700 hover:border-orange-500 text-white p-4 rounded-lg flex items-center space-x-3 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="w-10 h-10 rounded-full flex items-center justify-center overflow-hidden bg-white">
                      {wallet.adapter.icon ? (
                        <Image
                          src={wallet.adapter.icon}
                          alt={`${wallet.adapter.name} icon`}
                          width={40}
                          height={40}
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <div className="w-full h-full bg-orange-500 flex items-center justify-center text-white font-bold text-sm">
                          {wallet.adapter.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="flex-1 text-left font-medium">
                      {wallet.adapter.name}
                    </span>
                    <span className="text-xs text-green-400 bg-green-400/10 px-2 py-1 rounded">
                      Detected
                    </span>
                  </button>
                ))
            ) : (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
                  <div className="w-8 h-8 border-2 border-gray-600 rounded"></div>
                </div>
                <p className="text-gray-400 mb-4 font-medium">
                  No Solana wallets detected
                </p>
                <p className="text-sm text-gray-500 mb-6">
                  Please install a Solana wallet to continue
                </p>
                <div className="space-y-3">
                  {walletInstallInfo.map((walletInfo) => (
                    <a
                      key={walletInfo.name}
                      href={walletInfo.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block bg-gray-900 hover:bg-gray-800 border border-gray-700 hover:border-orange-500 text-white px-4 py-3 rounded-lg transition-all duration-200 flex items-center space-x-3"
                    >
                      <div className="w-8 h-8 rounded-full flex items-center justify-center overflow-hidden bg-white">
                        <Image
                          src={walletInfo.icon}
                          alt={`${walletInfo.name} icon`}
                          width={32}
                          height={32}
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            // Fallback to text if image fails to load
                            const target = e.target as HTMLImageElement;
                            target.style.display = "none";
                            const parent = target.parentElement;
                            if (parent) {
                              parent.innerHTML = `<div class="w-full h-full ${walletInfo.bgColor} flex items-center justify-center text-white font-bold text-sm">${walletInfo.fallbackIcon}</div>`;
                            }
                          }}
                        />
                      </div>
                      <span>Install {walletInfo.name}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
