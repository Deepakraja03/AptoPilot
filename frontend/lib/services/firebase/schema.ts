export interface User {
  id: string;
  username: string;
  email: string;
  turnkeyUserId?: string;
  organizationId?: string;
  primaryWalletAddress?: string;
  connectedWallets?: string[];
  walletAddress?: string;
  sessionToken?: string;
  sessionExpiry?: Date;
  lastLoginAt?: Date;
  wallets?: Wallet[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Wallet {
  id: string;
  walletId: string;
  walletName: string;
  userId: string;
  organizationId: string;
  imported?: boolean;
  importedAt?: Date;
  exported?: boolean;
  exportedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletAccount {
  id: string;
  walletId: string;
  address: string;
  path: string;
  curve: string;
  pathFormat: string;
  addressFormat: string;
  chainId: number;
  createdAt: Date;
}

export interface OtpRecord {
  id: string;
  otpId: string;
  email: string;
  expiresAt: Date;
  isValid: boolean;
  createdAt: Date;
}

export interface ApiHealthLog {
  id: string;
  service: string;
  status: "healthy" | "unhealthy" | "error";
  message: string;
  checkedAt: Date;
  NextResponseTime?: number;
  error?: string;
}

export interface ApiCallLog {
  id: string;
  service: string;
  endpoint: string;
  userId?: string;
  status: "success" | "error";
  error?: string;
  calledAt: Date;
}

export interface SwapTransaction {
  id: string;
  userId: string;
  userAddress: string;
  fromChain: string;
  toChain: string;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  transactionHash: string;
  orderId?: string;
  status: "pending" | "completed" | "failed";
  swapService: "mayan" | "turnkey" | "other";
  createdAt: Date;
  completedAt?: Date;
}

export interface UserAllocation {
  id: string;
  userId: string;
  userAddress: string;
  totalAllocation: number;
  totalSpins: number;
  lastSpinDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface SpinHistory {
  id: string;
  userId: string;
  userAddress: string;
  allocationWon: number;
  spinDate: Date;
  spinResult: string; // The segment that was landed on
  transactionId?: string; // Reference to the transaction that made them eligible
}

export interface UserIntent {
  id: string;
  userId: string;
  type: 'swap' | 'stake' | 'lend' | 'bridge';
  status: 'automated' | 'pending' | 'completed' | 'failed';
  description: string;
  fromChain?: string;
  toChain?: string;
  amount?: number;
  symbol?: string;
  createdAt: Date;
  executedAt?: Date;
  nextExecution?: Date;
}
