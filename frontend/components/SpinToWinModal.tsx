"use client";

import React, { useState, useEffect } from "react";
import { Wheel } from "react-custom-roulette";

import { Button } from "@/components/ui/button";
import { useWallet } from "@solana/wallet-adapter-react";
import { CustomWalletButton } from "@/components/CustomWalletButton";

interface SpinToWinModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const data = [
  {
    option: "0.1 ISOL",
    style: { backgroundColor: "#ADFEB9", textColor: "white" },
  },
  {
    option: "0.5 ISOL",
    style: { backgroundColor: "#1a1a1a", textColor: "white" },
  },
  {
    option: "1.0 ISOL",
    style: { backgroundColor: "#ADFEB9", textColor: "white" },
  },
  {
    option: "2.5 ISOL",
    style: { backgroundColor: "#1a1a1a", textColor: "white" },
  },
  {
    option: "0.2 ISOL",
    style: { backgroundColor: "#ADFEB9", textColor: "white" },
  },
  {
    option: "0.8 ISOL",
    style: { backgroundColor: "#1a1a1a", textColor: "white" },
  },
];

export const SpinToWinModal: React.FC<SpinToWinModalProps> = ({
  isOpen,
  onClose,
}) => {
  const [mustSpin, setMustSpin] = useState(false);
  const [prizeNumber, setPrizeNumber] = useState(0);
  const [hasSpun, setHasSpun] = useState(false);
  const [claimedPoints, setClaimedPoints] = useState<string | null>(null);
  const [isWhitelisted, setIsWhitelisted] = useState(false);
  const [whitelistLoading, setWhitelistLoading] = useState(false);
  const [canSpin, setCanSpin] = useState(true);
  const [spinMessage, setSpinMessage] = useState<string>("");
  const [userTotalPoints, setUserTotalPoints] = useState<number>(0);
  const [whitelistMessage, setWhitelistMessage] = useState<string>("");
  const [nextSpinTime, setNextSpinTime] = useState<string>("");
  const [liveCountdown, setLiveCountdown] = useState<string>("");
  const [lastSpinTime, setLastSpinTime] = useState<Date | null>(null);
  const { connected, publicKey } = useWallet();

  // Calculate next spin time based on user's last spin
  const calculateNextSpinTime = () => {
    if (!lastSpinTime) return "24h 0m";

    const now = new Date();
    const nextSpinTime = new Date(lastSpinTime.getTime() + 24 * 60 * 60 * 1000); // 24 hours from last spin

    const timeUntilNext = nextSpinTime.getTime() - now.getTime();

    if (timeUntilNext <= 0) return "0m"; // Can spin now

    const hoursUntilNext = Math.floor(timeUntilNext / (1000 * 60 * 60));
    const minutesUntilNext = Math.floor(
      (timeUntilNext % (1000 * 60 * 60)) / (1000 * 60)
    );

    if (hoursUntilNext === 0) {
      return `${minutesUntilNext}m`;
    } else {
      return `${hoursUntilNext}h ${minutesUntilNext}m`;
    }
  };

  // Live countdown timer
  useEffect(() => {
    if (!canSpin && isOpen) {
      const updateCountdown = () => {
        setLiveCountdown(calculateNextSpinTime());
      };

      updateCountdown();
      const interval = setInterval(updateCountdown, 60000); // Update every minute

      return () => clearInterval(interval);
    }
  }, [canSpin, isOpen]);

  const handleSpinClick = () => {
    if (!mustSpin) {
      const newPrizeNumber = Math.floor(Math.random() * data.length);
      setPrizeNumber(newPrizeNumber);
      setMustSpin(true);
    }
  };

  const handleSpinComplete = () => {
    setMustSpin(false);
    setHasSpun(true);
  };

  const handleClaimPoints = () => {
    const wonPrize = data[prizeNumber].option;
    setClaimedPoints(wonPrize);
  };

  const handleWalletConnected = async (walletAddress: string) => {
    if (!claimedPoints) return;

    setWhitelistLoading(true);
    try {
      const response = await fetch("/api/whitelist", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          walletAddress,
          points: claimedPoints,
        }),
      });

      const result = await response.json();
      if (result.success) {
        setIsWhitelisted(true);
        setWhitelistMessage(result.message);
        setNextSpinTime(calculateNextSpinTime());
        if (result.data?.totalPoints) {
          setUserTotalPoints(result.data.totalPoints);
        }
      } else {
        setWhitelistMessage(result.error || "Error processing request");
      }
    } catch (error) {
      console.error("Error whitelisting wallet:", error);
      setWhitelistMessage("Error connecting to server");
    } finally {
      setWhitelistLoading(false);
    }
  };

  // Check if user can spin when modal opens or wallet connects
  useEffect(() => {
    if (isOpen && connected && publicKey) {
      const checkSpinAvailability = async () => {
        try {
          const response = await fetch(
            `/api/can-spin?address=${publicKey.toString()}`
          );
          const result = await response.json();

          if (!result.canSpin) {
            setCanSpin(false);
            setSpinMessage(result.message || "You've already spun today!");

            // Set last spin time from userData
            if (result.userData?.timestamp) {
              const spinTime = result.userData.timestamp.seconds
                ? new Date(result.userData.timestamp.seconds * 1000)
                : new Date(result.userData.timestamp);
              setLastSpinTime(spinTime);
            }

            // If user has data, show their total points
            if (result.userData) {
              const totalPoints =
                result.userData.totalPoints ||
                (typeof result.userData.points === "string"
                  ? parseFloat(result.userData.points.replace(" ISOL", ""))
                  : result.userData.points || 0);
              setUserTotalPoints(totalPoints);
            }
          } else {
            setCanSpin(true);
            setSpinMessage("");

            // If user has data but can spin, show their total points
            if (result.userData) {
              const totalPoints =
                result.userData.totalPoints ||
                (typeof result.userData.points === "string"
                  ? parseFloat(result.userData.points.replace(" ISOL", ""))
                  : result.userData.points || 0);
              setUserTotalPoints(totalPoints);
            }
          }
        } catch (error) {
          console.error("Error checking spin availability:", error);
        }
      };

      checkSpinAvailability();
    }
  }, [isOpen, connected, publicKey]);

  // Check wallet status when wallet connects (with or without claimed points)
  useEffect(() => {
    if (connected && publicKey) {
      const walletAddress = publicKey.toString();

      const checkWalletStatus = async () => {
        try {
          const checkResponse = await fetch(
            `/api/whitelist?address=${walletAddress}`
          );
          const checkResult = await checkResponse.json();

          if (checkResult.isWhitelisted && checkResult.data) {
            setIsWhitelisted(true);

            // Handle both old and new schema
            const totalPoints =
              checkResult.data.totalPoints ||
              (typeof checkResult.data.points === "string"
                ? parseFloat(checkResult.data.points.replace(" ISOL", ""))
                : checkResult.data.points || 0);

            setUserTotalPoints(totalPoints);
            setWhitelistMessage(
              `You're already whitelisted! Total points: ${totalPoints} ISOL`
            );
          }

          // If user has claimed points but not whitelisted yet, add them
          if (claimedPoints && !checkResult.isWhitelisted) {
            await handleWalletConnected(walletAddress);
          }
        } catch (error) {
          console.error("Error checking wallet status:", error);
        }
      };

      checkWalletStatus();
    }
  }, [connected, publicKey, claimedPoints]);

  const handleClose = () => {
    setMustSpin(false);
    setHasSpun(false);
    setClaimedPoints(null);
    setPrizeNumber(0);
    setIsWhitelisted(false);
    setWhitelistLoading(false);
    onClose();
  };

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <style jsx global>{`
        .wallet-adapter-modal-wrapper {
          z-index: 9999 !important;
        }
        .wallet-adapter-modal-overlay {
          z-index: 9998 !important;
        }
        .wallet-adapter-modal {
          z-index: 9999 !important;
        }
      `}</style>

      {/* Custom Modal Overlay */}
      <div
        className="fixed inset-0 bg-opacity-50 backdrop-blur-xs flex items-center justify-center z-50 p-4"
        onClick={handleOverlayClick}
      >
        <div className="bg-black border border-gray-800 text-white max-w-md w-full mx-auto rounded-lg relative">
          {/* Close Button */}
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl z-10"
          >
            ×
          </button>

          {/* Header */}
          <div className="p-6 pb-0">
            <h2 className="text-2xl font-bold text-center text-[#ADFEB9]">
              Spin & Win ISOL Tokens!
            </h2>
          </div>

          <div className="flex flex-col items-center space-y-6 p-4">
            {!claimedPoints ? (
              <>
                {/* Show daily limit message if user can't spin */}
                {!canSpin && spinMessage && (
                  <div className="text-center space-y-4 p-4 bg-yellow-900/20 border border-yellow-600 rounded-lg">
                    <div className="text-yellow-400 font-semibold">
                      ⏰ Daily Limit Reached
                    </div>
                    <div className="text-sm text-yellow-300">{spinMessage}</div>
                    <div className="text-xs text-gray-400">
                      Next spin in: {liveCountdown || calculateNextSpinTime()}
                    </div>
                    {userTotalPoints > 0 && (
                      <div className="text-sm text-green-400">
                        Your total points: {userTotalPoints} ISOL
                      </div>
                    )}
                  </div>
                )}

                {/* Show wheel only if user can spin */}
                {canSpin && (
                  <>
                    <div className="relative">
                      <Wheel
                        mustStartSpinning={mustSpin}
                        prizeNumber={prizeNumber}
                        data={data}
                        onStopSpinning={handleSpinComplete}
                        backgroundColors={["#ADFEB9", "#1a1a1a"]}
                        textColors={["white"]}
                        outerBorderColor="#ADFEB9"
                        outerBorderWidth={4}
                        innerBorderColor="#333"
                        innerBorderWidth={2}
                        radiusLineColor="#ADFEB9"
                        radiusLineWidth={2}
                        fontSize={14}
                        textDistance={60}
                      />
                    </div>

                    {!hasSpun ? (
                      <Button
                        onClick={handleSpinClick}
                        disabled={mustSpin || !canSpin}
                        className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 text-lg font-semibold disabled:bg-gray-600 disabled:cursor-not-allowed"
                      >
                        {mustSpin ? "Spinning..." : "SPIN NOW!"}
                      </Button>
                    ) : (
                      <div className="text-center space-y-4">
                        <div className="text-xl font-bold text-[#ADFEB9]">
                          🎉 You won {data[prizeNumber].option}! 🎉
                        </div>
                        <Button
                          onClick={handleClaimPoints}
                          className="bg-orange-500 hover:bg-orange-600 text-white px-8 py-3 text-lg font-semibold"
                        >
                          Claim Points
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </>
            ) : (
              <div className="text-center space-y-6">
                <div className="text-xl font-bold text-green-500">
                  ✅ Points Claimed: {claimedPoints}
                </div>

                <div className="space-y-4">
                  <p className="text-gray-300">
                    Connect your wallet to whitelist for the airdrop!
                  </p>

                  <div className="bg-gray-900 p-4 rounded-lg space-y-2">
                    <h3 className="font-semibold text-[#ADFEB9]">
                      Intent Sol (ISOL)
                    </h3>
                    <p className="text-sm text-gray-400">
                      Intent Sol is the native token of the AptoPilot ecosystem,
                      rewarding early users who participate in cross-chain swaps
                      and DeFi activities.
                    </p>
                    <div className="text-xs text-gray-500">
                      <p>Contract Address:</p>
                      <a
                        href="https://explorer.solana.com/address/6Ape7PCZZvEQkPxvMDJhAnZ8Ro9FFGbNuRa3o6VUyk6y?cluster=devnet"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[#ADFEB9] hover:text-[#ADFEB9] break-all"
                      >
                        6Ape7PCZZvEQkPxvMDJhAnZ8Ro9FFGbNuRa3o6VUyk6y
                      </a>
                    </div>
                  </div>

                  {!connected ? (
                    <div className="flex justify-center">
                      <CustomWalletButton
                        onConnected={handleWalletConnected}
                        className="px-8 py-3 text-lg font-semibold"
                      />
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="text-green-500 font-semibold">
                        ✅ Wallet Connected!
                      </div>
                      <div className="text-sm text-gray-400">
                        Address: {publicKey?.toString().slice(0, 8)}...
                        {publicKey?.toString().slice(-8)}
                      </div>

                      {whitelistLoading ? (
                        <div className="text-sm text-yellow-400">
                          🔄 Adding to whitelist...
                        </div>
                      ) : whitelistMessage ? (
                        <div className="space-y-2">
                          <div className="text-sm text-green-400">
                            ✅ {whitelistMessage}
                          </div>
                          <div className="text-xs text-gray-400 bg-gray-800 p-2 rounded">
                            🕐{" "}
                            {nextSpinTime || "Next spin available in 24 hours"}
                          </div>
                        </div>
                      ) : isWhitelisted ? (
                        <div className="text-sm text-green-400">
                          ✅ You&apos;re now whitelisted for the airdrop!
                        </div>
                      ) : (
                        <div className="text-sm text-[#ADFEB9]">
                          ⏳ Processing whitelist...
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};
