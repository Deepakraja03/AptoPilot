export const BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
export const EVM_Referral_Address = process.env.NEXT_PUBLIC_EVM_ADDRESS || "";
export const SOL_Referral_Address = process.env.NEXT_PUBLIC_SOL_ADDRESS || "";
export const DEFAULT_REFERRER_BPS = 50;
// Referrer configuration for Mayan Swap
export interface ReferrerConfig {
  address: string;
  bps: number; // basis points (0-50)
}

// Default referrer configuration
export const DEFAULT_REFERRER_CONFIG: ReferrerConfig = {
  address: process.env.NEXT_PUBLIC_EVM_ADDRESS || "",
  bps: 25, // 25 basis points = 0.25%
};

// Validate referrer BPS (must be between 0 and 50)
export function validateReferrerBps(bps: number): boolean {
  return bps >= 0 && bps <= 50;
}

// Get referrer configuration based on chain
export function getReferrerConfig(
  chain: "ethereum" | "solana" | "base" | "arbitrum" | "polygon"
): ReferrerConfig {
  let referrerAddress: string;

  switch (chain) {
    case "solana":
      referrerAddress = process.env.NEXT_PUBLIC_SOL_ADDRESS || "";
      break;
    case "ethereum":
    case "base":
    case "arbitrum":
    case "polygon":
    default:
      referrerAddress = process.env.NEXT_PUBLIC_EVM_ADDRESS || "";
      break;
  }

  return {
    address: referrerAddress,
    bps: DEFAULT_REFERRER_CONFIG.bps,
  };
}
