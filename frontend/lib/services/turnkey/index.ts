/* eslint-disable @typescript-eslint/no-explicit-any */

import { Turnkey } from "@turnkey/sdk-server";
import { ApiKeyStamper } from "@turnkey/api-key-stamper";
import { TurnkeyAccount } from "./types";
import { TurnkeyConnectionStatus } from "./types";
import { TurnkeyClient } from "@turnkey/http";
import elliptic from "elliptic";
import { BASE_URL } from "@/lib/constant";
import { Connection, VersionedTransaction, Transaction } from "@solana/web3.js";
import { TurnkeySigner } from "@turnkey/solana";
import { TurnkeySigner as EthersSigner } from "@turnkey/ethers";
import { ethers } from "ethers";
import { TransactionBlock } from "@mysten/sui.js";
import { SuiClient } from "@mysten/sui/client";
import databaseService from "../mongo/database";

if (typeof window === "undefined") {
  (async () => {
    const dotenv = await import("dotenv");
    const path = await import("path");
    // Support both CommonJS and ESM shapes
    const dotenvModule: any =
      dotenv && (dotenv as any).default ? (dotenv as any).default : dotenv;
    const pathModule: any =
      path && (path as any).default ? (path as any).default : path;
    if (
      typeof dotenvModule.config === "function" &&
      typeof pathModule.resolve === "function"
    ) {
      dotenvModule.config({ path: pathModule.resolve(process.cwd(), ".env") });
    }
  })();
}

const ec = new elliptic.ec("p256");

const validateTurnkeyConfig = () => {
  const requiredVars = {
    TURNKEY_API_PRIVATE_KEY: process.env.NEXT_PUBLIC_TURNKEY_API_PRIVATE_KEY,
    TURNKEY_API_PUBLIC_KEY: process.env.NEXT_PUBLIC_TURNKEY_API_PUBLIC_KEY,
    TURNKEY_ORGANIZATION_ID: process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID,
  };

  const missingVars = Object.entries(requiredVars)
    .filter(([, value]) => !value || value.trim() === "")
    .map(([key]) => key);

  if (missingVars.length > 0) {
    console.error(
      "❌ Missing required Turnkey environment variables:",
      missingVars
    );
    throw new Error(
      `Missing required Turnkey environment variables: ${missingVars.join(", ")}`
    );
  }

  const privateKey = process.env.NEXT_PUBLIC_TURNKEY_API_PRIVATE_KEY!;
  if (!/^[0-9a-fA-F]+$/.test(privateKey)) {
    console.error("❌ TURNKEY_API_PRIVATE_KEY must be a valid hex string");
    throw new Error("TURNKEY_API_PRIVATE_KEY must be a valid hex string");
  }

  console.log("✅ Turnkey configuration validated successfully");
};

validateTurnkeyConfig();

const turnkey = new Turnkey({
  defaultOrganizationId: process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID!, // ROOT ORG
  apiBaseUrl: "https://api.turnkey.com",
  apiPrivateKey: process.env.NEXT_PUBLIC_TURNKEY_API_PRIVATE_KEY!,
  apiPublicKey: process.env.NEXT_PUBLIC_TURNKEY_API_PUBLIC_KEY!,
});

const apiClient = turnkey.apiClient();

const turnkeyEVMSigner = new EthersSigner({
  client: apiClient,
  organizationId: process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID!,
  signWith: process.env.NEXT_PUBLIC_TURNKEY_API_PRIVATE_KEY!,
});

class TurnkeyService {
  /**
   * -------------------------------------------------
   * CONNECTION & UTILITY FUNCTIONS
   * -------------------------------------------------
   */

  // Solana connection setup
  getSolanaConnection = () => {
    const rpcUrl =
      process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
      `https://mainnet.helius-rpc.com/?api-key=${process.env.NEXT_PUBLIC_HELIUS_API_KEY}` ||
      "https://svm.merkle.io/pk_mbs_164a0daad0a610ad3aace0b4a99e93da";
    return new Connection(rpcUrl);
  };

  // EVM provider setup
  getEvmProvider = (chainId: number = 1) => {
    const rpcUrls: Record<number, string[]> = {
      1: [
        "https://mempool.merkle.io/rpc/eth/pk_mbs_164a0daad0a610ad3aace0b4a99e93da",
      ],
      56: [
        "https://mempool.merkle.io/rpc/bsc/pk_mbs_164a0daad0a610ad3aace0b4a99e93da",
      ],
      8453: [
        "https://mempool.merkle.io/rpc/base/pk_mbs_164a0daad0a610ad3aace0b4a99e93da",
      ],
      137: [
        process.env.POLYGON_RPC_URL,
        `https://polygon-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
        `https://polygon-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
        "https://polygon.publicnode.com",
        "https://rpc.ankr.com/polygon",
        "https://polygon-rpc.com",
      ].filter(Boolean) as string[],

      43114: [
        process.env.AVALANCHE_RPC_URL,
        "https://api.avax.network/ext/bc/C/rpc",
        "https://rpc.ankr.com/avalanche",
        "https://avalanche-c-chain.publicnode.com",
      ].filter(Boolean) as string[],

      42161: [
        process.env.ARBITRUM_RPC_URL,
        `https://arbitrum-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
        `https://arb-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
        "https://arbitrum.publicnode.com",
        "https://rpc.ankr.com/arbitrum",
        "https://arb1.arbitrum.io/rpc",
      ].filter(Boolean) as string[],

      10: [
        process.env.OPTIMISM_RPC_URL,
        `https://optimism-mainnet.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
        `https://opt-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`,
        "https://optimism.publicnode.com",
        "https://rpc.ankr.com/optimism",
        "https://mainnet.optimism.io",
      ].filter(Boolean) as string[],
    };

    const rpcUrlArr = rpcUrls[chainId];
    const rpcUrl = Array.isArray(rpcUrlArr) ? rpcUrlArr[0] : undefined;
    if (!rpcUrl) {
      throw new Error(`No RPC URL configured for chain ID ${chainId}`);
    }

    return new ethers.JsonRpcProvider(rpcUrl);
  };

  // Sui provider setup
  getSuiProvider = () => {
    return new SuiClient({
      url: "https://fullnode.mainnet.sui.io",
    });
  };
  /**
   * Test connection to the Turnkey API
   */
  async testConnection(): Promise<TurnkeyConnectionStatus> {
    const startTime = Date.now();
    try {
      const walletsResponse = await apiClient.getWallets({});
      return {
        success: true,
        message: `Connection successful. Found ${walletsResponse.wallets?.length || 0} wallets.`,
        responseTime: Date.now() - startTime,
      };
    } catch (error) {
      console.error("Turnkey connection test failed:", error);
      return {
        success: false,
        message: `Connection failed: ${error instanceof Error ? error.message : String(error)}`,
        responseTime: Date.now() - startTime,
      };
    }
  }

  /**
   * Get current user information
   */
  async getWhoami(): Promise<any> {
    try {
      const response = await apiClient.getWhoami({});
      return response;
    } catch (error) {
      console.error("Whoami error:", error);
      throw error;
    }
  }

  /**
   * -------------------------------------------------
   * ORGANIZATION & USER MANAGEMENT
   * -------------------------------------------------
   */

  /**
   * Get organization information
   */
  async getOrganization(): Promise<any> {
    try {
      const response = await apiClient.getOrganization({});
      return response;
    } catch (error) {
      console.error("Get organization error:", error);
      throw error;
    }
  }

  /**
   * Get organization configuration
   */
  async getOrganizationConfigs(): Promise<any> {
    try {
      const response = await apiClient.getOrganizationConfigs({});
      return response;
    } catch (error) {
      console.error("Get organization configs error:", error);
      throw error;
    }
  }

  /**
   * Get users in the organization
   */
  async getUsers(): Promise<any> {
    try {
      const response = await apiClient.getUsers({});
      return response;
    } catch (error) {
      console.error("Get users error:", error);
      throw error;
    }
  }

  /**
   * Get a specific user's details
   */
  async getUser(userId: string): Promise<any> {
    try {
      const response = await apiClient.getUser({ userId });
      return response;
    } catch (error) {
      console.error(`Get user error for ${userId}:`, error);
      throw error;
    }
  }

  /**
   * Create users - using proper API parameter structure
   */
  async createUsers(
    users: Array<{
      userName: string;
      userEmail?: string;
      userPhoneNumber?: string;
      apiKeys: Array<{
        apiKeyName: string;
        publicKey: string;
        curveType:
        | "API_KEY_CURVE_P256"
        | "API_KEY_CURVE_SECP256K1"
        | "API_KEY_CURVE_ED25519";
        expirationSeconds?: string;
      }>;
      authenticators: Array<{
        authenticatorName: string;
        challenge: string;
        attestation: {
          credentialId: string;
          clientDataJson: string;
          attestationObject: string;
          transports: Array<
            | "AUTHENTICATOR_TRANSPORT_BLE"
            | "AUTHENTICATOR_TRANSPORT_INTERNAL"
            | "AUTHENTICATOR_TRANSPORT_NFC"
            | "AUTHENTICATOR_TRANSPORT_USB"
            | "AUTHENTICATOR_TRANSPORT_HYBRID"
          >;
        };
      }>;
      oauthProviders: Array<any>;
      userTags: string[];
    }>
  ): Promise<any> {
    try {
      const response = await apiClient.createUsers({
        users,
        organizationId: turnkey.config.defaultOrganizationId,
      });
      return response;
    } catch (error) {
      console.error("Create users error:", error);
      throw error;
    }
  }

  /**
   * Create API-only users (simplified version)
   */
  async createApiOnlyUser(
    userName: string,
    apiKeyName: string,
    publicKey: string
  ): Promise<any> {
    try {
      const response = await apiClient.createApiOnlyUsers({
        apiOnlyUsers: [
          {
            userName,
            apiKeys: [
              {
                apiKeyName,
                publicKey,
              },
            ],
            userTags: [],
          },
        ],
      });
      return response;
    } catch (error) {
      console.error("Create API-only user error:", error);
      throw error;
    }
  }

  /**
   * Update user - correct parameter name is userName, not username
   */
  async updateUser(userId: string, userName?: string): Promise<any> {
    try {
      const response = await apiClient.updateUser({
        userId,
        userName,
      });
      return response;
    } catch (error) {
      console.error("Update user error:", error);
      throw error;
    }
  }

  /**
   * Delete users
   */
  async deleteUsers(userIds: string[]): Promise<any> {
    try {
      const response = await apiClient.deleteUsers({
        userIds,
      });
      return response;
    } catch (error) {
      console.error("Delete users error:", error);
      throw error;
    }
  }

  /**
   * Create a sub-organization - using proper parameters
   */
  async createSubOrganization(
    subOrganizationName: string,
    rootUsers: Array<{
      userName: string;
      userEmail?: string;
      userPhoneNumber?: string;
      apiKeys: Array<{
        apiKeyName: string;
        publicKey: string;
        curveType:
        | "API_KEY_CURVE_SECP256K1"
        | "API_KEY_CURVE_P256"
        | "API_KEY_CURVE_ED25519";
        expirationSeconds?: string;
      }>;
      authenticators: Array<{
        authenticatorName: string;
        challenge: string;
        attestation: {
          credentialId: string;
          clientDataJson: string;
          attestationObject: string;
          transports: Array<
            | "AUTHENTICATOR_TRANSPORT_BLE"
            | "AUTHENTICATOR_TRANSPORT_INTERNAL"
            | "AUTHENTICATOR_TRANSPORT_NFC"
            | "AUTHENTICATOR_TRANSPORT_USB"
            | "AUTHENTICATOR_TRANSPORT_HYBRID"
          >;
        };
      }>;
      oauthProviders: Array<{
        providerName: string;
        oidcToken: string;
      }>;
      userTags: string[];
    }>,
    rootQuorumThreshold: number
  ): Promise<any> {
    try {
      const response = await apiClient.createSubOrganization({
        subOrganizationName,
        rootUsers: rootUsers.map((user) => ({
          ...user,
          oauthProviders: user.oauthProviders.map((provider: any) => ({
            providerName: provider.providerName ?? provider.oidcName ?? "OIDC",
            oidcToken: provider.oidcToken,
          })),
        })),
        rootQuorumThreshold,
      });
      return response;
    } catch (error) {
      console.error("Create sub-organization error:", error);
      throw error;
    }
  }

  /**
   * Get sub-organization IDs
   */
  async getSubOrgIds(filterType: string, filterValue: string): Promise<any> {
    try {
      const response = await apiClient.getSubOrgIds({
        filterType,
        filterValue,
      });
      return response;
    } catch (error) {
      console.error("Get sub-organization IDs error:", error);
      throw error;
    }
  }

  /**
   * -------------------------------------------------
   * AUTHENTICATION & SESSIONS
   * -------------------------------------------------
   */

  /**
   * Initialize OTP authentication
   */
  async initOTPAuth(contact: string): Promise<{ otpId: string }> {
    try {
      console.log(`Initializing OTP authentication for contact: ${contact}`);
      console.log(
        `Using organization ID: ${process.env.NEXT_PUBLIC_TURNKEY_ORGANIZATION_ID}`
      );
      console.log(
        `Private key length: ${process.env.NEXT_PUBLIC_TURNKEY_API_PRIVATE_KEY?.length || 0}`
      );

      const response = await apiClient.initOtp({
        otpType: "OTP_TYPE_EMAIL",
        contact,
        otpLength: 6,
        expirationSeconds: "3600",
        alphanumeric: true,
      });

      console.log(`OTP initiation successful. OTP ID: ${response.otpId}`);
      return response;
    } catch (error) {
      console.error("OTP initiation error:", error);

      if (
        error instanceof Error &&
        error.message.includes("uint8array from invalid hex string")
      ) {
        throw new Error(
          "Invalid Turnkey API private key configuration. Please check TURNKEY_API_PRIVATE_KEY environment variable."
        );
      }

      throw new Error(
        `Failed to initialize OTP authentication: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Verify OTP
   */
  async verifyOTP(
    otpId: string,
    otpCode: string,
    email: string
  ): Promise<{ verificationToken: string; userId: string }> {
    try {
      console.log(
        `Starting OTP verification for email: ${email}, otpId: ${otpId}`
      );

      const subOrgIds = await apiClient.getSubOrgIds({
        filterType: "EMAIL",
        filterValue: email,
      });
      const orgId = subOrgIds.organizationIds[0];
      console.log(`Found organization ID: ${orgId}`);

      const getUsers = await apiClient.getUsers({
        organizationId: orgId,
      });

      if (!getUsers.users || getUsers.users.length === 0) {
        throw new Error(`No users found for email: ${email}`);
      }

      const userId = getUsers.users[0].userId;
      const apiKeyName = getUsers.users[0].apiKeys[0].apiKeyName;
      console.log(`Using API key name: ${apiKeyName}`);

      const verifyResponse = await apiClient.verifyOtp({
        otpId,
        otpCode,
      });

      console.log(
        `OTP verification response: ${JSON.stringify(verifyResponse)}`
      );
      console.log("OTP successfully verified");
      const verificationToken = verifyResponse.verificationToken;

      const compressedPublicKey =
        getUsers.users[0].apiKeys[0].credential.publicKey;
      const keyPoint = ec.keyFromPublic(compressedPublicKey, "hex").getPublic();
      const uncompressedPublicKey = keyPoint.encode("hex", false);
      console.log(`Uncompressed public key: ${uncompressedPublicKey}`);

      try {
        const uniquePolicyName = `OTP Auth Policy ${Date.now()}`;
        const createPolicy = await apiClient.createPolicy({
          policyName: uniquePolicyName,
          effect: "EFFECT_ALLOW",
          consensus: `approvers.any(user, user.id == '${userId}')`,
          condition: "activity.type == 'ACTIVITY_TYPE_OTP_AUTH'",
          notes: "Allow user to use OTP authentication",
          organizationId: orgId,
        });

        await apiClient.approveActivity({
          fingerprint: createPolicy.activity.fingerprint,
          organizationId: orgId,
        });

        console.log(
          `OTP Auth policy created and approved: ${createPolicy.policyId}`
        );
      } catch (policyError) {
        console.log("Policy creation/approval error:", policyError);
      }
      return {
        verificationToken: verificationToken,
        userId: userId,
      };
    } catch (error) {
      console.error("OTP verification error:", error);
      throw new Error("Failed to verify OTP");
    }
  }
  /**
   * OTP Authentication
   */
  async otpAuth(
    email: string,
    otpId: string,
    otpCode: string,
    expirationSeconds: string
  ): Promise<any> {
    const organizationData = await apiClient.getSubOrgIds({
      filterType: "EMAIL",
      filterValue: email,
    });
    const organizationId = organizationData.organizationIds[0];

    const getusers = await apiClient.getUsers({
      organizationId,
    });
    const targetPublicKey = getusers.users[0].apiKeys[0].credential.publicKey;
    const apiKeyName = getusers.users[0].apiKeys[0].apiKeyName;

    const response = await apiClient.otpAuth({
      otpId,
      otpCode,
      targetPublicKey,
      apiKeyName,
      expirationSeconds,
      organizationId,
    });
    console.log("response", response);
    return response;
  }

  /**
   * OTP Login
   */
  async otpLogin(email: string): Promise<{
    activity: any;
    credentialBundle: string;
    apiKeyId: string;
    organizationId: string;
    organizationName: string;
    userId: string;
    userName: string;
  }> {
    try {
      const organizationData = await apiClient.getSubOrgIds({
        filterType: "EMAIL",
        filterValue: email,
      });

      const user = await apiClient.getUsers({
        organizationId: organizationData.organizationIds[0],
      });

      const compressedPublicKey = user.users[0].apiKeys[0].credential.publicKey;
      const keyPoint = ec.keyFromPublic(compressedPublicKey, "hex").getPublic();
      const uncompressedPublicKey = keyPoint.encode("hex", false);

      const createReadandWriteSession = await apiClient.createReadWriteSession({
        targetPublicKey: uncompressedPublicKey,
        expirationSeconds: "3600",
      });

      return {
        activity: createReadandWriteSession.activity,
        credentialBundle: createReadandWriteSession.credentialBundle,
        apiKeyId: createReadandWriteSession.apiKeyId,
        organizationId: organizationData.organizationIds[0],
        organizationName: createReadandWriteSession.organizationName,
        userId: createReadandWriteSession.userId,
        userName: createReadandWriteSession.username,
      };
    } catch (error) {
      console.error("OTP login error:", error);
      throw error;
    }
  }

  async deleteSession(): Promise<any> {
    try {
      const response = await apiClient.deleteSubOrganization({
        organizationId: "e4bf70d5-c139-4afa-9011-391160f37285",
      });
      return response;
    } catch (error) {
      console.error("Delete session error:", error);
      throw error;
    }
  }

  async getMagicLinkTemplate(
    action: string,
    email: string,
    method: string
  ): Promise<string> {
    return `${BASE_URL}/email-${action}?userEmail=${email}&continueWith=${method}&credentialBundle=%s`;
  }

  /**
   * Email authentication
   */
  async emailAuth(
    email: string,
    targetPublicKey: string,
    apiKeyName: string,
    expirationSeconds: string = "86400"
  ): Promise<any> {
    try {
      const magicLinkTemplate = await this.getMagicLinkTemplate(
        "auth",
        email,
        "email"
      );

      const response = await apiClient.emailAuth({
        email,
        targetPublicKey,
        apiKeyName,
        expirationSeconds,
        organizationId: turnkey.config.defaultOrganizationId,
        emailCustomization: {
          magicLinkTemplate,
        },
      });
      return response;
    } catch (error) {
      console.error("Email auth error:", error);
      throw error;
    }
  }

  /**
   * Create API keys - with proper parameter structure
   */
  async createApiKeys(
    userId: string,
    apiKeys: Array<{
      apiKeyName: string;
      publicKey: string;
      curveType:
      | "API_KEY_CURVE_P256"
      | "API_KEY_CURVE_SECP256K1"
      | "API_KEY_CURVE_ED25519";
      expirationSeconds?: string;
    }>
  ): Promise<any> {
    try {
      const response = await apiClient.createApiKeys({
        userId,
        apiKeys,
      });
      return response;
    } catch (error) {
      console.error("Create API keys error:", error);
      throw error;
    }
  }

  /**
   * Get API keys
   */
  async getApiKeys(): Promise<any> {
    try {
      const response = await apiClient.getApiKeys({});
      return response;
    } catch (error) {
      console.error("Get API keys error:", error);
      throw error;
    }
  }

  /**
   * Delete API keys - needs userId
   */
  async deleteApiKeys(userId: string, apiKeyIds: string[]): Promise<any> {
    try {
      const response = await apiClient.deleteApiKeys({
        userId,
        apiKeyIds,
      });
      return response;
    } catch (error) {
      console.error("Delete API keys error:", error);
      throw error;
    }
  }

  /**
   * Create a read-only session
   */
  async createReadOnlySession(
    targetPublicKey: string,
    expirationSeconds: string = "3600"
  ): Promise<any> {
    try {
      const response = await apiClient.createReadOnlySession({
        targetPublicKey,
        expirationSeconds,
      });
      return response;
    } catch (error) {
      console.error("Create read-only session error:", error);
      throw error;
    }
  }

  /**
   * Create a read-write session
   */
  async createReadWriteSession(
    targetPublicKey: string,
    expirationSeconds: string = "3600"
  ): Promise<any> {
    try {
      const response = await apiClient.createReadWriteSession({
        targetPublicKey,
        expirationSeconds,
      });
      return response;
    } catch (error) {
      console.error("Create read-write session error:", error);
      throw error;
    }
  }

  /**
   * -------------------------------------------------
   * WALLET MANAGEMENT
   * -------------------------------------------------
   */

  /**
   * List all wallets
   */
  async listWallets(): Promise<any> {
    try {
      const response = await apiClient.getWallets({});
      return response;
    } catch (error) {
      console.error("List wallets error:", error);
      throw error;
    }
  }

  /**
   * Get wallet details
   */
  async getWallet(walletId: string): Promise<any> {
    try {
      const response = await apiClient.getWallet({ walletId });
      return response;
    } catch (error) {
      console.error(`Get wallet error for ${walletId}:`, error);
      throw error;
    }
  }

  /**
   * Create wallet with support for both Ethereum and Solana
   */
  async createWallet(
    walletName: string,
    accounts?: TurnkeyAccount[]
  ): Promise<any> {
    try {
      // Default to Ethereum if no accounts specified
      const defaultAccounts = [
        {
          curve: "CURVE_SECP256K1" as const,
          pathFormat: "PATH_FORMAT_BIP32" as const,
          path: "m/44'/60'/0'/0/0",
          addressFormat: "ADDRESS_FORMAT_ETHEREUM" as const,
        },
      ];

      const response = await apiClient.createWallet({
        walletName,
        accounts: accounts || defaultAccounts,
        mnemonicLength: 24,
      });

      const walletId = response?.activity?.result?.createWalletResult?.walletId;
      const addresses =
        response?.activity?.result?.createWalletResult?.addresses || [];

      if (!walletId) {
        throw new Error("No wallet ID returned from Turnkey API");
      }

      return {
        wallet: {
          walletId,
          addresses,
          walletName,
          accounts: accounts || defaultAccounts,
        },
        activity: response.activity,
      };
    } catch (error) {
      console.error("Create wallet error:", error);
      throw error;
    }
  }

  /**
   * Update wallet (e.g., rename)
   */
  async updateWallet(walletId: string, walletName: string): Promise<any> {
    try {
      const response = await apiClient.updateWallet({
        walletId,
        walletName,
      });
      return response;
    } catch (error) {
      console.error("Update wallet error:", error);
      throw error;
    }
  }

  /**
   * Delete wallets
   */
  async deleteWallets(walletIds: string[]): Promise<any> {
    try {
      const response = await apiClient.deleteWallets({
        walletIds,
      });
      return response;
    } catch (error) {
      console.error("Delete wallets error:", error);
      throw error;
    }
  }

  /**
   * Import a wallet
   */
  async importWallet(
    userId: string,
    walletName: string,
    encryptedBundle: string,
    accounts: TurnkeyAccount[],
    organizationId: string
  ): Promise<any> {
    try {
      const response = await apiClient.importWallet({
        userId,
        walletName,
        encryptedBundle,
        accounts,
        organizationId,
      });

      return response;
    } catch (error) {
      console.error("Import wallet error:", error);
      throw error;
    }
  }

  /**
   * Export a wallet
   */
  async exportWallet(walletId: string, targetPublicKey: string): Promise<any> {
    try {
      const response = await apiClient.exportWallet({
        walletId,
        targetPublicKey,
        language: "MNEMONIC_LANGUAGE_ENGLISH",
      });

      return response;
    } catch (error) {
      console.error("Export wallet error:", error);
      throw error;
    }
  }

  /**
   * Initialize wallet import - with proper parameter structure
   */
  async initImportWallet(userId: string): Promise<any> {
    try {
      const response = await apiClient.initImportWallet({ userId });
      return response;
    } catch (error) {
      console.error("Init import wallet error:", error);
      throw error;
    }
  }

  /**
   * Get wallet accounts
   */
  async getWalletAccounts(walletId: string): Promise<any> {
    try {
      const response = await apiClient.getWalletAccounts({ walletId });
      return response;
    } catch (error) {
      console.error("Get wallet accounts error:", error);
      throw error;
    }
  }

  /**
   * Get wallet account details - proper parameter structure
   */
  async getWalletAccount(walletId: string): Promise<any> {
    try {
      const response = await apiClient.getWalletAccount({
        organizationId: turnkey.config.defaultOrganizationId,
        walletId,
      });
      return response;
    } catch (error) {
      console.error("Get wallet account error:", error);
      throw error;
    }
  }

  /**
   * Create wallet accounts
   */
  async createWalletAccounts(
    walletId: string,
    accounts: TurnkeyAccount[]
  ): Promise<any> {
    try {
      const response = await apiClient.createWalletAccounts({
        walletId,
        accounts,
      });
      return response;
    } catch (error) {
      console.error("Create wallet accounts error:", error);
      throw error;
    }
  }

  /**
   * Export wallet account - correct parameter structure
   */
  async exportWalletAccount(
    walletId: string,
    accountId: string,
    targetPublicKey: string
  ): Promise<any> {
    try {
      const response = await apiClient.exportWalletAccount({
        organizationId: turnkey.config.defaultOrganizationId,
        address: accountId,
        targetPublicKey,
      });
      return response;
    } catch (error) {
      console.error("Export wallet account error:", error);
      throw error;
    }
  }

  /**
   * -------------------------------------------------
   * PRIVATE KEY MANAGEMENT
   * -------------------------------------------------
   */

  /**
   * Get private keys
   */
  async getPrivateKeys(organizationId: string): Promise<any> {
    try {
      const response = await apiClient.getPrivateKeys({
        organizationId: organizationId,
      });
      return response;
    } catch (error) {
      console.error("Get private keys error:", error);
      throw error;
    }
  }

  /**
   * Get a specific private key
   */
  async getPrivateKey(privateKeyId: string): Promise<any> {
    try {
      const response = await apiClient.getPrivateKey({ privateKeyId });
      return response;
    } catch (error) {
      console.error("Get private key error:", error);
      throw error;
    }
  }

  /**
   * Create private keys - with all required fields
   */
  async createPrivateKeys(
    privateKeyName: string,
    curve: "CURVE_SECP256K1" | "CURVE_ED25519",
    addressFormats: Array<
      | "ADDRESS_FORMAT_ETHEREUM"
      | "ADDRESS_FORMAT_UNCOMPRESSED"
      | "ADDRESS_FORMAT_COMPRESSED"
    > = ["ADDRESS_FORMAT_ETHEREUM"]
  ): Promise<any> {
    try {
      const response = await apiClient.createPrivateKeys({
        privateKeys: [
          {
            privateKeyName,
            curve,
            privateKeyTags: [],
            addressFormats,
          },
        ],
      });
      return response;
    } catch (error) {
      console.error("Create private keys error:", error);
      throw error;
    }
  }

  /**
   * Delete private keys
   */
  async deletePrivateKeys(privateKeyIds: string[]): Promise<any> {
    try {
      const response = await apiClient.deletePrivateKeys({
        privateKeyIds,
      });
      return response;
    } catch (error) {
      console.error("Delete private keys error:", error);
      throw error;
    }
  }

  /**
   * Export private key
   */
  async exportPrivateKey(
    privateKeyId: string,
    targetPublicKey: string
  ): Promise<any> {
    try {
      const response = await apiClient.exportPrivateKey({
        privateKeyId,
        targetPublicKey,
      });
      return response;
    } catch (error) {
      console.error("Export private key error:", error);
      throw error;
    }
  }

  /**
   * Import private key - correct parameter structure
   */
  async importPrivateKey(
    userId: string,
    privateKeyName: string,
    privateKeyBundle: string,
    curve: "CURVE_SECP256K1" | "CURVE_ED25519",
    addressFormats: Array<
      | "ADDRESS_FORMAT_ETHEREUM"
      | "ADDRESS_FORMAT_UNCOMPRESSED"
      | "ADDRESS_FORMAT_COMPRESSED"
    > = ["ADDRESS_FORMAT_ETHEREUM"]
  ): Promise<any> {
    try {
      const response = await apiClient.importPrivateKey({
        userId,
        privateKeyName,
        encryptedBundle: privateKeyBundle,
        curve,
        addressFormats,
      });
      return response;
    } catch (error) {
      console.error("Import private key error:", error);
      throw error;
    }
  }

  /**
   * Initialize private key import
   */
  async initImportPrivateKey(userId: string): Promise<any> {
    try {
      const response = await apiClient.initImportPrivateKey({ userId });
      return response;
    } catch (error) {
      console.error("Init import private key error:", error);
      throw error;
    }
  }

  /**
   * -------------------------------------------------
   * SIGNING OPERATIONS
   * -------------------------------------------------
   */

  /**
   * Sign a transaction
   */
  async signTransaction(
    signWith: string,
    unsignedTransaction: string,
    type: "TRANSACTION_TYPE_ETHEREUM" | "TRANSACTION_TYPE_SOLANA" | "TRANSACTION_TYPE_APTOS"
  ): Promise<any> {
    try {
      const response = await apiClient.signTransaction({
        signWith,
        unsignedTransaction,
        type: type,
      });

      return response;
    } catch (error) {
      console.error("Sign transaction error:", error);
      throw error;
    }
  }

  /**
   * Sign a raw payload
   */
  async signRawPayload(
    signWith: string,
    payload: string,
    encoding:
      | "PAYLOAD_ENCODING_HEXADECIMAL"
      | "PAYLOAD_ENCODING_TEXT_UTF8" = "PAYLOAD_ENCODING_HEXADECIMAL",
    hashFunction:
      | "HASH_FUNCTION_NO_OP"
      | "HASH_FUNCTION_SHA256"
      | "HASH_FUNCTION_KECCAK256"
      | "HASH_FUNCTION_NOT_APPLICABLE" = "HASH_FUNCTION_NO_OP"
  ): Promise<any> {
    try {
      const response = await apiClient.signRawPayload({
        signWith,
        payload,
        encoding,
        hashFunction,
      });
      return response;
    } catch (error) {
      console.error("Sign raw payload error:", error);
      throw error;
    }
  }

  /**
   * Sign multiple raw payloads
   */
  async signRawPayloads(
    signWith: string,
    payloads: string[],
    encoding:
      | "PAYLOAD_ENCODING_HEXADECIMAL"
      | "PAYLOAD_ENCODING_TEXT_UTF8" = "PAYLOAD_ENCODING_HEXADECIMAL",
    hashFunction:
      | "HASH_FUNCTION_NO_OP"
      | "HASH_FUNCTION_SHA256"
      | "HASH_FUNCTION_KECCAK256"
      | "HASH_FUNCTION_NOT_APPLICABLE" = "HASH_FUNCTION_NO_OP"
  ): Promise<any> {
    try {
      const response = await apiClient.signRawPayloads({
        signWith,
        payloads,
        encoding,
        hashFunction,
      });
      return response;
    } catch (error) {
      console.error("Sign raw payloads error:", error);
      throw error;
    }
  }

  /**
   * -------------------------------------------------
   * POLICY & SECURITY MANAGEMENT
   * -------------------------------------------------
   */

  /**
   * Get policies
   */
  async getPolicies(): Promise<any> {
    try {
      const response = await apiClient.getPolicies({});
      return response;
    } catch (error) {
      console.error("Get policies error:", error);
      throw error;
    }
  }

  /**
   * Get a specific policy
   */
  async getPolicy(policyId: string): Promise<any> {
    try {
      const response = await apiClient.getPolicy({ policyId });
      return response;
    } catch (error) {
      console.error("Get policy error:", error);
      throw error;
    }
  }

  /**
   * Create policy
   */
  async createPolicy(
    policyName: string,
    consensus: string,
    condition: string,
    notes?: string
  ): Promise<any> {
    try {
      const response = await apiClient.createPolicy({
        policyName,
        effect: "EFFECT_ALLOW" as const,
        consensus,
        condition,
        notes: notes || "Created via API",
      });
      return response;
    } catch (error) {
      console.error("Create policy error:", error);
      throw error;
    }
  }

  /**
   * Update policy
   */
  async updatePolicy(policyId: string, policyName?: string): Promise<any> {
    try {
      const response = await apiClient.updatePolicy({
        policyId,
        policyName,
      });
      return response;
    } catch (error) {
      console.error("Update policy error:", error);
      throw error;
    }
  }

  /**
   * Delete policy
   */
  async deletePolicy(policyId: string): Promise<any> {
    try {
      const response = await apiClient.deletePolicy({ policyId });
      return response;
    } catch (error) {
      console.error("Delete policy error:", error);
      throw error;
    }
  }

  /**
   * Get activities
   */
  async getActivities(): Promise<any> {
    try {
      const response = await apiClient.getActivities({});
      return response;
    } catch (error) {
      console.error("Get activities error:", error);
      throw error;
    }
  }

  /**
   * Get a specific activity
   */
  async getActivity(activityId: string): Promise<any> {
    try {
      const response = await apiClient.getActivity({ activityId });
      return response;
    } catch (error) {
      console.error("Get activity error:", error);
      throw error;
    }
  }

  /**
   * Approve activity
   */
  async approveActivity(fingerprint: string): Promise<any> {
    try {
      const response = await apiClient.approveActivity({ fingerprint });
      return response;
    } catch (error) {
      console.error("Approve activity error:", error);
      throw error;
    }
  }

  /**
   * Reject activity
   */
  async rejectActivity(fingerprint: string): Promise<any> {
    try {
      const response = await apiClient.rejectActivity({
        fingerprint,
      });
      return response;
    } catch (error) {
      console.error("Reject activity error:", error);
      throw error;
    }
  }

  /**
   * Execute Mayan Finance swap using Turnkey signing
   */
  async executeMayanSwap(
    userOrganizationId: string,
    fromChain: string,
    toChain: string,
    fromToken: string,
    toToken: string,
    amount: string,
    fromAddress: string,
    toAddress: string,
    slippageBps: number = 100
  ): Promise<any> {
    return this.executeSwap({
      userOrganizationId,
      fromChain,
      toChain,
      fromToken,
      toToken,
      amount,
      fromAddress,
      toAddress,
      slippageBps,
    });
  }

  /**
   * -------------------------------------------------
   * MAYAN FINANCE INTEGRATION
   * -------------------------------------------------
   */

  /**
   * Execute cross-chain swap with comprehensive chain support
   */
  async executeSwap(params: {
    userOrganizationId: string;
    fromChain: string;
    toChain: string;
    fromToken: string;
    toToken: string;
    amount: string;
    fromAddress: string;
    toAddress: string;
    slippageBps?: number;
  }): Promise<any> {
    const {
      userOrganizationId,
      fromChain,
      toChain,
      fromToken,
      toToken,
      amount,
      fromAddress,
      toAddress,
      slippageBps = 100,
    } = params;

    try {
      // Create user-specific signers from database (avoids rate limiting)
      const { solSigner, evmSigner, suiSigner } =
        await this.createUserSignersFromDatabase(userOrganizationId);

      // Setup wallet connections for all chains
      const walletConnections = {
        solanaConnection: this.getSolanaConnection(),
        solanaWallet: {
          signTransaction: solSigner.signTransaction.bind(solSigner),
          publicKey: { toString: () => fromAddress }, // For Solana compatibility
        },
        evmProvider: this.getEvmProvider(this.getChainIdFromChain(fromChain)),
        evmSigner: evmSigner,
        suiClient: this.getSuiProvider(),
        suiKeypair: {
          signTransaction: suiSigner.signTransaction.bind(suiSigner),
        },
      };

      // Import Mayan SDK
      const { MayanFinanceSwap } = await import("@/lib/services/mayanfinance");

      // Initialize Mayan Finance SDK with proper wallet connections
      const mayanSwap = new MayanFinanceSwap(walletConnections);

      // Get tokens for both chains
      const [fromTokens, toTokens] = await Promise.all([
        mayanSwap.getTokens(fromChain),
        mayanSwap.getTokens(toChain),
      ]);

      // Find the token objects by contract address
      const fromTokenObj = fromTokens.find(
        (t) => t.contract.toLowerCase() === fromToken.toLowerCase()
      );
      const toTokenObj = toTokens.find(
        (t) => t.contract.toLowerCase() === toToken.toLowerCase()
      );

      if (!fromTokenObj || !toTokenObj) {
        throw new Error(`Token not found: ${fromToken} or ${toToken}`);
      }

      // Format amount with proper decimals
      const formattedAmount = mayanSwap.formatAmount(
        amount,
        fromTokenObj.decimals
      );

      // Get quote
      const quote = await mayanSwap.getQuote({
        amountIn: formattedAmount,
        fromToken: fromTokenObj,
        toToken: toTokenObj,
        fromChain: fromChain as any,
        toChain: toChain as any,
        slippageBps,
      });

      if (!quote || quote.length === 0) {
        throw new Error("Failed to get quote from Mayan Finance");
      }

      // Execute swap with chain-specific handling
      const result = await mayanSwap.executeSwap(
        quote[0],
        fromAddress,
        toAddress,
        undefined, // referrerAddresses
        undefined // permit
      );

      return result;
    } catch (error) {
      console.error("Cross-chain swap error:", error);
      throw error;
    }
  }

  /**
   * Sign Solana transaction
   */
  async signSolanaTransaction(
    transaction: Transaction | VersionedTransaction,
    signerAddress: string
  ): Promise<Transaction | VersionedTransaction> {
    return await this.signSolanaTransaction(transaction, signerAddress);
  }

  /**
   * Sign Solana message
   */
  async signSolanaMessage(
    message: string,
    signerAddress: string
  ): Promise<Uint8Array> {
    return await this.signSolanaMessage(message, signerAddress);
  }

  /**
   * Execute EVM transaction using Turnkey signing
   */
  async executeEvmTransaction(
    transactionRequest: any,
    chainId: number = 1
  ): Promise<any> {
    try {
      const provider = this.getEvmProvider(chainId);
      const connectedSigner = turnkeyEVMSigner.connect(provider);

      // Send transaction
      const sentTx = await connectedSigner.sendTransaction(transactionRequest);

      return {
        hash: sentTx.hash,
        to: sentTx.to,
        value: sentTx.value?.toString(),
        gasLimit: sentTx.gasLimit?.toString(),
        gasPrice: sentTx.gasPrice?.toString(),
        nonce: sentTx.nonce,
        chainId: sentTx.chainId,
      };
    } catch (error) {
      console.error("EVM transaction error:", error);
      throw error;
    }
  }

  /**
   * Sign EVM transaction using Turnkey
   */
  async signEvmTransaction(
    transactionRequest: any,
    chainId: number = 1
  ): Promise<string> {
    try {
      const provider = this.getEvmProvider(chainId);
      const connectedSigner = turnkeyEVMSigner.connect(provider);

      return await connectedSigner.signTransaction(transactionRequest);
    } catch (error) {
      console.error("EVM transaction signing error:", error);
      throw error;
    }
  }

  /**
   * Sign message using Turnkey EVM signer
   */
  async signEvmMessage(message: string, chainId: number = 1): Promise<string> {
    try {
      const provider = this.getEvmProvider(chainId);
      const connectedSigner = turnkeyEVMSigner.connect(provider);

      return await connectedSigner.signMessage(message);
    } catch (error) {
      console.error("EVM message signing error:", error);
      throw error;
    }
  }

  /**
   * Get EVM address from Turnkey signer
   */
  async getEvmAddress(chainId: number = 1): Promise<string> {
    try {
      const provider = this.getEvmProvider(chainId);
      const connectedSigner = turnkeyEVMSigner.connect(provider);

      return await connectedSigner.getAddress();
    } catch (error) {
      console.error("Get EVM address error:", error);
      throw error;
    }
  }

  /**
   * Get EVM balance
   */
  async getEvmBalance(address: string, chainId: number = 1): Promise<string> {
    try {
      const provider = this.getEvmProvider(chainId);
      const balance = await provider.getBalance(address);

      return ethers.formatEther(balance);
    } catch (error) {
      console.error("Get EVM balance error:", error);
      throw error;
    }
  }

  /**
   * Execute ERC20 token transfer
   */
  async executeErc20Transfer(
    tokenAddress: string,
    toAddress: string,
    amount: string,
    chainId: number = 1
  ): Promise<any> {
    try {
      const provider = this.getEvmProvider(chainId);
      const connectedSigner = turnkeyEVMSigner.connect(provider);

      // ERC20 ABI for transfer function
      const erc20Abi = [
        "function transfer(address to, uint256 amount) returns (bool)",
        "function balanceOf(address owner) view returns (uint256)",
        "function decimals() view returns (uint8)",
      ];

      const tokenContract = new ethers.Contract(
        tokenAddress,
        erc20Abi,
        connectedSigner
      );

      // Get token decimals
      const decimals = await tokenContract.decimals();
      const parsedAmount = ethers.parseUnits(amount, decimals);

      // Execute transfer
      const tx = await tokenContract.transfer(toAddress, parsedAmount);

      return {
        hash: tx.hash,
        to: tx.to,
        value: tx.value?.toString(),
        gasLimit: tx.gasLimit?.toString(),
        gasPrice: tx.gasPrice?.toString(),
        nonce: tx.nonce,
        chainId: tx.chainId,
      };
    } catch (error) {
      console.error("ERC20 transfer error:", error);
      throw error;
    }
  }

  /**
   * Create user-specific Turnkey client
   */
  createUserClient(
    userOrganizationId: string,
    userCredentials?: {
      apiPrivateKey: string;
      apiPublicKey: string;
    }
  ): Turnkey {
    return new Turnkey({
      defaultOrganizationId: userOrganizationId, // USER'S SUB-ORG
      apiBaseUrl: "https://api.turnkey.com",
      apiPrivateKey:
        userCredentials?.apiPrivateKey ||
        process.env.NEXT_PUBLIC_TURNKEY_API_PRIVATE_KEY!,
      apiPublicKey:
        userCredentials?.apiPublicKey ||
        process.env.NEXT_PUBLIC_TURNKEY_API_PUBLIC_KEY!,
    });
  }

  // Cache for user signers with addresses to avoid API calls during execution
  private userSignerCache = new Map<string, any>();

  /**
   * Get user by organization ID from database
   */
  async getUserByOrganizationId(organizationId: string) {
    return await databaseService.getUserByOrganizationId(organizationId);
  }

  /**
   * Get wallet accounts by wallet ID from database
   */
  async getWalletAccountsByWalletId(walletId: string) {
    return await databaseService.getWalletAccountsByWalletId(walletId);
  }

  /**
   * Create user signers using database information only (no Turnkey API calls for addresses)
   * This avoids rate limiting issues by using cached wallet information
   */
  async createUserSignersFromDatabase(userOrganizationId: string) {
    // Check cache first
    const cacheKey = `signers_db_${userOrganizationId}`;
    if (this.userSignerCache.has(cacheKey)) {
      console.log(
        "🔄 Using cached database signers for user:",
        userOrganizationId
      );
      return this.userSignerCache.get(cacheKey);
    }

    console.log(
      "🔑 Creating new database signers for user:",
      userOrganizationId
    );

    try {
      // Get user and wallet information from database
      const user = await this.getUserByOrganizationId(userOrganizationId);
      if (!user || !user.wallets || user.wallets.length === 0) {
        throw new Error(
          `No wallets found in database for user organization: ${userOrganizationId}`
        );
      }

      const wallet = user.wallets[0]; // Use first wallet
      const walletId = wallet.walletId;

      // Get wallet accounts from database
      const walletAccounts =
        await databaseService.getWalletAccountsByWalletId(walletId);

      // Find addresses for different chains
      const evmAccount = walletAccounts.find(
        (account) => account.addressFormat === "ADDRESS_FORMAT_ETHEREUM"
      );
      const solanaAccount = walletAccounts.find(
        (account) => account.addressFormat === "ADDRESS_FORMAT_SOLANA"
      );
      const suiAccount = walletAccounts.find(
        (account) => account.addressFormat === "ADDRESS_FORMAT_SUI"
      );

      // Create user-specific API client for signing only
      const turnkeyClient = new TurnkeyClient(
        {
          baseUrl: process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL!,
        },
        new ApiKeyStamper({
          apiPublicKey: process.env.NEXT_PUBLIC_TURNKEY_API_PUBLIC_KEY!,
          apiPrivateKey: process.env.NEXT_PUBLIC_TURNKEY_API_PRIVATE_KEY!,
        })
      );

      // Create signers (for transaction signing only)
      const solSigner = new TurnkeySigner({
        client: turnkeyClient,
        organizationId: userOrganizationId,
      });

      const evmSigner = new EthersSigner({
        client: turnkeyClient,
        organizationId: userOrganizationId,
        signWith: walletId,
      });

      // Create Sui signer placeholder
      const suiSigner = {
        signTransaction: async () => {
          throw new Error("Sui signing not implemented yet");
        },
      };

      const signers = {
        solSigner,
        evmSigner,
        suiSigner,
        // Pre-cached addresses from database
        evmAddress: evmAccount?.address || null,
        solanaAddress: solanaAccount?.address || null,
        suiAddress: suiAccount?.address || null,
        walletId,
        // Helper method to get addresses
        getEvmAddress: async () => evmAccount?.address || null,
        getSolanaAddress: async () => solanaAccount?.address || null,
        getSuiAddress: async () => suiAccount?.address || null,
      };

      // Cache the signers for 10 minutes
      this.userSignerCache.set(cacheKey, signers);
      setTimeout(
        () => {
          this.userSignerCache.delete(cacheKey);
          console.log(
            "🗑️ Cleared cached database signers for user:",
            userOrganizationId
          );
        },
        10 * 60 * 1000
      );

      return signers;
    } catch (error) {
      console.error("Failed to create user signers from database:", error);
      throw new Error(
        `Failed to create database signers: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  async createUserSigners(userOrganizationId: string) {
    // Check cache first
    const cacheKey = `signers_${userOrganizationId}`;
    if (this.userSignerCache.has(cacheKey)) {
      console.log("🔄 Using cached signers for user:", userOrganizationId);
      return this.userSignerCache.get(cacheKey);
    }

    console.log("🔑 Creating new signers for user:", userOrganizationId);

    try {
      // Try to get user's wallet information from database first
      let walletId: string | null = null;

      try {
        const user = await this.getUserByOrganizationId(userOrganizationId);
        if (user && user.wallets && user.wallets.length > 0) {
          walletId = user.wallets[0].walletId;
          console.log("🔑 Found wallet ID from database:", walletId);
        }
      } catch (dbError) {
        console.warn("⚠️ Could not get wallet from database:", dbError);
      }

      // If no wallet found in database, try to get from Turnkey API
      if (!walletId) {
        console.log(
          "🔍 Fetching wallets from Turnkey API for organization:",
          userOrganizationId
        );

        // Create a temporary client for the user's organization to list wallets
        const tempClient = new TurnkeyClient(
          {
            baseUrl: process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL!,
          },
          new ApiKeyStamper({
            apiPublicKey: process.env.NEXT_PUBLIC_TURNKEY_API_PUBLIC_KEY!,
            apiPrivateKey: process.env.NEXT_PUBLIC_TURNKEY_API_PRIVATE_KEY!,
          })
        );

        const walletsResponse = await tempClient.getWallets({
          organizationId: userOrganizationId,
        });

        if (walletsResponse.wallets && walletsResponse.wallets.length > 0) {
          walletId = walletsResponse.wallets[0].walletId;
          console.log("🔑 Found wallet ID from Turnkey API:", walletId);
        } else {
          throw new Error(
            `No wallets found for user organization: ${userOrganizationId}. Please create a wallet first.`
          );
        }
      }

      // Create user-specific API client
      const turnkeyClient = new TurnkeyClient(
        {
          baseUrl: process.env.NEXT_PUBLIC_TURNKEY_API_BASE_URL!,
        },
        new ApiKeyStamper({
          apiPublicKey: process.env.NEXT_PUBLIC_TURNKEY_API_PUBLIC_KEY!,
          apiPrivateKey: process.env.NEXT_PUBLIC_TURNKEY_API_PRIVATE_KEY!,
        })
      );

      // Create Solana signer
      const solSigner = new TurnkeySigner({
        client: turnkeyClient,
        organizationId: userOrganizationId,
      });

      // Create EVM signer with the correct wallet ID
      const evmSigner = new EthersSigner({
        client: turnkeyClient,
        organizationId: userOrganizationId,
        signWith: walletId, // Use wallet ID instead of API private key
      });

      // Try to pre-fetch EVM address with rate limiting handling
      let evmAddress: string | null = null;
      try {
        console.log("🔍 Pre-fetching EVM address for caching...");

        // Add delay to avoid rate limiting
        await new Promise((resolve) => setTimeout(resolve, 200));

        evmAddress = await evmSigner.getAddress();
        console.log("✅ EVM address cached:", evmAddress);
      } catch (error) {
        console.warn(
          "⚠️ Could not pre-fetch EVM address (will fetch on-demand):",
          error instanceof Error ? error.message : "Unknown error"
        );
        // Don't throw error - address will be fetched on-demand
      }

      // Create Sui signer
      const suiSigner = {
        signTransaction: async () => {
          throw new Error("Sui signing not implemented yet");
        },
      };

      const signers = {
        solSigner,
        evmSigner,
        suiSigner,
        evmAddress, // May be null if pre-fetch failed
        // Add helper method to get address on-demand
        getEvmAddress: async () => {
          if (evmAddress) return evmAddress;
          try {
            evmAddress = await evmSigner.getAddress();
            return evmAddress;
          } catch (error) {
            console.error("Failed to get EVM address on-demand:", error);
            throw error;
          }
        },
      };

      // Cache the signers for 10 minutes
      this.userSignerCache.set(cacheKey, signers);
      setTimeout(
        () => {
          this.userSignerCache.delete(cacheKey);
          console.log(
            "🗑️ Cleared cached signers for user:",
            userOrganizationId
          );
        },
        10 * 60 * 1000
      );

      return signers;
    } catch (error) {
      console.error("Failed to create user signers:", error);
      throw new Error(
        `Failed to create signers: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }

  /**
   * Execute user transaction with proper context
   */
  async executeUserTransaction(
    userOrganizationId: string,
    transactionType: "solana" | "evm",
    transactionData: any
  ): Promise<any> {
    const { solSigner, evmSigner } =
      await this.createUserSignersFromDatabase(userOrganizationId);

    if (transactionType === "solana") {
      // Use user's SOL signer
      return await solSigner.signTransaction(
        transactionData.transaction,
        transactionData.address
      );
    } else {
      // Use user's EVM signer
      const provider = this.getEvmProvider(transactionData.chainId);
      const connectedSigner = evmSigner.connect(provider);
      return await connectedSigner.sendTransaction(
        transactionData.transactionRequest
      );
    }
  }

  /**
   * Execute Sui transaction using Turnkey signing
   */
  async executeSuiTransaction(
    userOrganizationId: string,
    transactionBlock: TransactionBlock,
    suiAddress: string,
    publicKeyHex: string
  ): Promise<any> {
    try {
      const { suiSigner } =
        await this.createUserSignersFromDatabase(userOrganizationId);
      // Use JsonRpcProvider for building the transaction block

      // Build the transaction
      const txBytes = await transactionBlock.build();

      // Sign the transaction
      const signature = await suiSigner.signTransaction(
        txBytes,
        suiAddress,
        publicKeyHex
      );

      // Execute the transaction
      const response = await this.getSuiProvider().executeTransactionBlock({
        transactionBlock: Buffer.from(txBytes).toString("base64"),
        signature,
        options: { showEffects: true },
        requestType: "WaitForEffectsCert",
      });

      return {
        hash: response.digest,
        effects: response.effects,
      };
    } catch (error) {
      console.error("Sui transaction error:", error);
      throw error;
    }
  }

  /**
   * Helper methods for chain detection
   */
  private isEvmChain(chain: string): boolean {
    const evmChains = [
      "ethereum",
      "base",
      "bsc",
      "polygon",
      "arbitrum",
      "optimism",
      "avalanche",
    ];
    return evmChains.some((evmChain) => chain.toLowerCase().includes(evmChain));
  }

  private isSuiChain(chain: string): boolean {
    return chain.toLowerCase().includes("sui");
  }

  private getChainIdFromChain(chain: string): number {
    const chainMap: Record<string, number> = {
      ethereum: 1,
      base: 8453,
      bsc: 56,
      polygon: 137,
      arbitrum: 42161,
      optimism: 10,
      avalanche: 43114,
    };

    const chainLower = chain.toLowerCase();
    for (const [key, value] of Object.entries(chainMap)) {
      if (chainLower.includes(key)) {
        return value;
      }
    }

    return 1; // Default to Ethereum mainnet
  }
}

export default new TurnkeyService();
