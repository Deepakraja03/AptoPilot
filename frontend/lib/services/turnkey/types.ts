/* eslint-disable @typescript-eslint/no-explicit-any */

export interface TurnkeyWalletResponse {
  activity: {
    id: string;
    status: string;
    type: string;
    organizationId: string;
    timestampMs: string;
    result: {
      createWalletResult?: {
        walletId: string;
        addresses: string[];
      };
      createWalletAccountsResult?: {
        addresses: string[];
      };
      initOtpAuthResultV2?: {
        otpId: string;
      };
      otpAuthResult?: {
        userId: string;
        apiKeyId: string;
        credentialBundle: string;
      };
      signTransactionResult?: {
        signedTransaction: string;
      };
      createUsersResult?: {
        userIds: string[];
      };
      createApiKeysResult?: {
        apiKeyIds: string[];
      };
      importWalletResult?: {
        walletId: string;
        addresses: string[];
      };
      exportWalletResult?: {
        walletId: string;
        exportBundle: string;
      };
      importPrivateKeyResult?: {
        privateKeyId: string;
        addresses: [{ format: string; address: string }];
      };
      exportPrivateKeyResult?: {
        privateKeyId: string;
        exportBundle: string;
      };
      exportWalletAccountResult?: {
        address: string;
        exportBundle: string;
      };
      signRawPayloadResult?: {
        r: string;
        s: string;
        v: string;
      };
      signRawPayloadsResult?: {
        signatures: Array<{ r: string; s: string; v: string }>;
      };
      otpLoginResult?: {
        session: string;
      };
      createPrivateKeysResultV2?: {
        privateKeys: Array<{
          privateKeyId: string;
          addresses: Array<{
            format: string;
            address: string;
          }>;
        }>;
      };
      createReadOnlySessionResult?: {
        organizationId: string;
        organizationName: string;
        userId: string;
        username: string;
        session: string;
        sessionExpiry: string;
      };
      createReadWriteSessionResultV2?: {
        organizationId: string;
        organizationName: string;
        userId: string;
        username: string;
        apiKeyId: string;
        credentialBundle: string;
      };
      activity?: any;
      apiKey?: any;
      apiKeys?: any[];
      privateKey?: any;
      user?: any;
      wallet?: any;
      account?: any;
      policies?: any[];
      users?: any[];
      wallets?: any[];
      accounts?: any[];
    };
  };
}

export interface TurnkeyListWalletsResponse {
  wallets: Array<{
    walletId: string;
    walletName: string;
    accounts: Array<{
      accountId: string;
      address: string;
      addressFormat: string;
      curve: string;
      path: string;
      pathFormat: string;
    }>;
  }>;
}

export interface TurnkeyListUsersResponse {
  users: Array<{
    userId: string;
    userName: string;
    userEmail?: string;
    apiKeys: Array<{
      apiKeyId: string;
      apiKeyName: string;
      publicKey: string;
      curveType: string;
    }>;
  }>;
}

export interface TurnkeyCreateWalletRequest {
  type: "ACTIVITY_TYPE_CREATE_WALLET";
  timestampMs: string;
  organizationId: string;
  parameters: {
    walletName: string;
    accounts: TurnkeyAccount[];
    mnemonicLength?: number;
  };
}

export interface TurnkeyImportWalletRequest {
  type: "ACTIVITY_TYPE_IMPORT_WALLET";
  timestampMs: string;
  organizationId: string;
  parameters: {
    userId: string;
    walletName: string;
    encryptedBundle: string;
    accounts: TurnkeyAccount[];
  };
}

export interface TurnkeyExportWalletRequest {
  type: "ACTIVITY_TYPE_EXPORT_WALLET";
  timestampMs: string;
  organizationId: string;
  parameters: {
    walletId: string;
    targetPublicKey: string;
    language: string;
  };
}

export interface TurnkeyImportPrivateKeyRequest {
  type: "ACTIVITY_TYPE_IMPORT_PRIVATE_KEY";
  timestampMs: string;
  organizationId: string;
  parameters: {
    userId: string;
    privateKeyName: string;
    encryptedBundle: string;
    curve: string;
    addressFormats: string[];
  };
}

export interface TurnkeyExportPrivateKeyRequest {
  type: "ACTIVITY_TYPE_EXPORT_PRIVATE_KEY";
  timestampMs: string;
  organizationId: string;
  parameters: {
    privateKeyId: string;
    targetPublicKey: string;
  };
}

export interface TurnkeyExportWalletAccountRequest {
  type: "ACTIVITY_TYPE_EXPORT_WALLET_ACCOUNT";
  timestampMs: string;
  organizationId: string;
  parameters: {
    address: string;
    targetPublicKey: string;
  };
}

export interface TurnkeyOTPInitRequest {
  type: "ACTIVITY_TYPE_INIT_OTP_AUTH_V2";
  timestampMs: string;
  organizationId: string;
  parameters: {
    otpType: "OTP_TYPE_EMAIL" | "OTP_TYPE_SMS";
    contact: string;
    otpLength?: number;
    userIdentifier?: string;
    emailCustomization?: {
      appName?: string;
      logoUrl?: string;
    };
  };
}

export interface TurnkeyOTPAuthRequest {
  type: "ACTIVITY_TYPE_OTP_AUTH";
  timestampMs: string;
  organizationId: string;
  parameters: {
    otpId: string;
    otpCode: string;
    targetPublicKey: string;
    apiKeyName: string;
    expirationSeconds?: string;
    invalidateExisting?: boolean;
  };
}

export interface TurnkeyOTPLoginRequest {
  type: "ACTIVITY_TYPE_OTP_LOGIN";
  timestampMs: string;
  organizationId: string;
  parameters: {
    verificationToken: string;
    publicKey: string;
    expirationSeconds: string;
    invalidateExisting: boolean;
  };
}

export interface TurnkeySignTransactionRequest {
  type: "ACTIVITY_TYPE_SIGN_TRANSACTION_V2";
  timestampMs: string;
  organizationId: string;
  parameters: {
    signWith: string;
    unsignedTransaction: string;
    type: "TRANSACTION_TYPE_ETHEREUM";
  };
}

export interface TurnkeySignRawPayloadRequest {
  type: "ACTIVITY_TYPE_SIGN_RAW_PAYLOAD_V2";
  timestampMs: string;
  organizationId: string;
  parameters: {
    signWith: string;
    payload: string;
    encoding: string;
    hashFunction: string;
  };
}

export interface TurnkeySignRawPayloadsRequest {
  type: "ACTIVITY_TYPE_SIGN_RAW_PAYLOADS";
  timestampMs: string;
  organizationId: string;
  parameters: {
    signWith: string;
    payloads: string[];
    encoding: string;
    hashFunction: string;
  };
}

export interface TurnkeyCreateApiKeysRequest {
  type: "ACTIVITY_TYPE_CREATE_API_KEYS_V2";
  timestampMs: string;
  organizationId: string;
  parameters: {
    userId: string;
    apiKeys: Array<{
      apiKeyName: string;
      publicKey: string;
      curveType: string;
      expirationSeconds?: string;
    }>;
  };
}

export interface TurnkeyCreatePrivateKeysRequest {
  type: "ACTIVITY_TYPE_CREATE_PRIVATE_KEYS_V2";
  timestampMs: string;
  organizationId: string;
  parameters: {
    privateKeys: Array<{
      privateKeyName: string;
      curve: string;
      privateKeyTags?: string[];
      addressFormats: string[];
    }>;
  };
}

export interface TurnkeyCreateReadOnlySessionRequest {
  type: "ACTIVITY_TYPE_CREATE_READ_ONLY_SESSION";
  timestampMs: string;
  organizationId: string;
  parameters: Record<string, never>;
}

export interface TurnkeyCreateReadWriteSessionRequest {
  type: "ACTIVITY_TYPE_CREATE_READ_WRITE_SESSION_V2";
  timestampMs: string;
  organizationId: string;
  parameters: {
    targetPublicKey: string;
    userId: string;
    apiKeyName: string;
    expirationSeconds: string;
    invalidateExisting: boolean;
  };
}

export interface TurnkeyPaginationOptions {
  limit?: string;
  before?: string;
  after?: string;
}

export type TurnkeyAccount = {
  curve: "CURVE_SECP256K1" | "CURVE_ED25519";
  pathFormat: "PATH_FORMAT_BIP32";
  path: string;
  addressFormat:
    | "ADDRESS_FORMAT_ETHEREUM"
    | "ADDRESS_FORMAT_SOLANA"
    | "ADDRESS_FORMAT_SUI"
    | "ADDRESS_FORMAT_UNCOMPRESSED"
    | "ADDRESS_FORMAT_COMPRESSED";
};

export interface WalletBalance {
  totalValue: number;
  eth: {
    balance: number;
    address: string;
  };
  sol: {
    balance: number;
    address: string;
  };
}

export const ETHEREUM_ACCOUNT_CONFIG: TurnkeyAccount = {
  curve: "CURVE_SECP256K1",
  pathFormat: "PATH_FORMAT_BIP32",
  path: "m/44'/60'/0'/0/0",
  addressFormat: "ADDRESS_FORMAT_ETHEREUM",
};

export const SOLANA_ACCOUNT_CONFIG: TurnkeyAccount = {
  curve: "CURVE_ED25519",
  pathFormat: "PATH_FORMAT_BIP32",
  path: "m/44'/501'/0'/0'",
  addressFormat: "ADDRESS_FORMAT_SOLANA",
};

export const SUI_ACCOUNT_CONFIG: TurnkeyAccount = {
  curve: "CURVE_ED25519",
  pathFormat: "PATH_FORMAT_BIP32",
  path: "m/44'/784'/0'/0'/0'",
  addressFormat: "ADDRESS_FORMAT_SUI",
};

export interface TurnkeyWalletResponse {
  walletId?: string;
  addresses?: string[];
  wallet?: any;
  wallets?: any[];
  exportBundle?: string;
  signedTransaction?: string;
}

export interface OtpResponse {
  otpId: string;
}

export interface VerifyOtpResponse {
  verificationToken?: string;
}

export interface SessionResponse {
  token: string;
}

export interface TurnkeyConnectionStatus {
  success: boolean;
  message: string;
  responseTime: number;
}

export interface TurnkeyService {
  testConnection(): Promise<TurnkeyConnectionStatus>;
  getWhoami(): Promise<any>;
}
