import { TurnkeyProviderConfig } from "@turnkey/react-wallet-kit";

export const customWallet = {
  walletName: `EVM Wallet-${Date.now()}`,
  walletAccounts: [
    {
      curve: "CURVE_SECP256K1" as const,
      pathFormat: "PATH_FORMAT_BIP32" as const,
      path: `m/44'/60'/0'/0/0`,
      addressFormat: "ADDRESS_FORMAT_ETHEREUM" as const,
    },
  ],
};

export const solanaWallet = {
  walletName: `Solana Wallet-${Date.now()}`,
  walletAccounts: [
    {
      curve: "CURVE_ED25519" as const,
      pathFormat: "PATH_FORMAT_BIP32" as const,
      path: "m/44'/501'/0'/0'",
      addressFormat: "ADDRESS_FORMAT_SOLANA" as const,
    },
  ],
};

// Aptos (ED25519, SLIP-0044 coin type 637)
export const aptosWallet = {
  walletName: `Aptos Wallet-${Date.now()}`,
  walletAccounts: [
    {
      curve: "CURVE_ED25519" as const,
      pathFormat: "PATH_FORMAT_BIP32" as const,
      path: "m/44'/637'/0'/0'/0'",
      addressFormat: "ADDRESS_FORMAT_APTOS" as const,
    },
  ],
};

export const turnkeyConfig: TurnkeyProviderConfig = {
  organizationId: process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID || "",
  apiBaseUrl: process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL,
  auth: {
    autoRefreshSession: true,
  },
};
