"use client";

import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Button } from "@/components/ui/button";
import { WalletSelectionModal } from "@/components/WalletSelectionModal";

interface CustomWalletButtonProps {
  onConnected?: (publicKey: string) => void;
  className?: string;
}

export const CustomWalletButton: React.FC<CustomWalletButtonProps> = ({
  onConnected,
  className = "",
}) => {
  const { publicKey, wallet, disconnect, connecting, connected, connect } =
    useWallet();
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);

  const handleClick = async () => {
    if (connected) {
      // Disconnect wallet
      setIsDisconnecting(true);
      try {
        await disconnect();
      } catch (error) {
        console.error("Error disconnecting:", error);
      } finally {
        setIsDisconnecting(false);
      }
    } else if (wallet) {
      // Connect to selected wallet
      try {
        await connect();
      } catch (error) {
        console.error("Error connecting:", error);
      }
    } else {
      // Show wallet selection modal
      setShowWalletModal(true);
    }
  };

  // Call onConnected callback when wallet connects
  React.useEffect(() => {
    if (connected && publicKey && onConnected) {
      onConnected(publicKey.toString());
    }
  }, [connected, publicKey, onConnected]);

  const getButtonText = () => {
    if (connecting) return "Connecting...";
    if (isDisconnecting) return "Disconnecting...";
    if (connected && publicKey) {
      const address = publicKey.toString();
      return `${address.slice(0, 4)}...${address.slice(-4)}`;
    }
    return "Connect Wallet";
  };

  const getButtonStyle = () => {
    if (connected) {
      return "bg-green-600 hover:bg-green-700 text-white";
    }
    return "bg-orange-500 hover:bg-orange-600 text-white";
  };

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={connecting || isDisconnecting}
        className={`${getButtonStyle()} ${className}`}
      >
        {getButtonText()}
      </Button>

      <WalletSelectionModal
        isOpen={showWalletModal}
        onClose={() => setShowWalletModal(false)}
      />
    </>
  );
};
