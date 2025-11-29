/* eslint-disable @typescript-eslint/no-explicit-any */

import type { EIP1193Provider } from "viem";
export interface Window {
  ethereum?: EIP1193Provider & {
    isMetaMask?: boolean;
  };
  solana?: {
    isPhantom?: boolean;
    publicKey?: {
      toString: () => string;
      toBase58: () => string;
    };
    connect: () => Promise<void>;
    disconnect: () => Promise<void>;
    signTransaction: (transaction: any) => Promise<any>;
    signAllTransactions: (transactions: any[]) => Promise<any[]>;
    on: (event: string, callback: (...args: any[]) => void) => void;
    removeListener: (event: string, callback: (...args: any[]) => void) => void;
  };
}

export interface WalletProvider {
  isMetaMask?: boolean;
  isPhantom?: boolean;
  publicKey?: {
    toString: () => string;
    toBase58: () => string;
  };
  request?: (args: { method: string; params?: any[] }) => Promise<any>;
  connect?: () => Promise<void>;
  disconnect?: () => Promise<void>;
  signTransaction?: (transaction: any) => Promise<any>;
  signAllTransactions?: (transactions: any[]) => Promise<any[]>;
  on?: (event: string, callback: (...args: any[]) => void) => void;
  removeListener?: (event: string, callback: (...args: any[]) => void) => void;
}

export interface WalletConnectionOptions {
  walletProvider: WalletProvider;
  createSubOrgParams?: {
    customWallet?: {
      walletName: string;
      walletAccounts: {
        curve: string;
        pathFormat: string;
        path: string;
        addressFormat: string;
      }[];
    };
  };
}

export {};
