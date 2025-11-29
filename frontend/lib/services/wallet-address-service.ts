import { SupportedChain } from "../goldrush";
import databaseService from "./firebase/database";

export interface WalletAddressInfo {
  primaryAddress: string;
  walletId: string;
  // eslint-disable-next-line
  accounts: any[];
  chainAddresses: {
    ethereum: string | null;
    solana: string | null;
    sui: string | null;
  };
  metadata: {
    totalAccounts: number;
    supportedChains: string[];
    walletName: string;
    createdAt: Date;
  };
}

export interface MultiChainAddresses
  extends Record<SupportedChain, string | null> {
  ETHEREUM: string | null;
  BASE: string | null;
  BSC: string | null;
  SOLANA: string | null;
  POLYGON: string | null;
  ARBITRUM: string | null;
  OPTIMISM: string | null;
}

/**
 * Service for managing wallet addresses across multiple chains
 * Provides centralized logic for address mapping and validation
 */
export class WalletAddressService {
  private static instance: WalletAddressService;

  private constructor() {}

  public static getInstance(): WalletAddressService {
    if (!WalletAddressService.instance) {
      WalletAddressService.instance = new WalletAddressService();
    }
    return WalletAddressService.instance;
  }

  /**
   * Get user wallet addresses with enhanced chain-specific mapping
   */
  async getUserWalletAddresses(
    userId: string
  ): Promise<WalletAddressInfo | null> {
    try {
      const wallets = await databaseService.getWalletsByUserId(userId);

      if (wallets.length === 0) {
        console.warn(`No wallets found for user: ${userId}`);
        return null;
      }

      // Get the first wallet's accounts
      const wallet = wallets[0];
      const accounts = await databaseService.getWalletAccountsByWalletId(
        wallet.walletId
      );

      if (accounts.length === 0) {
        console.warn(`No accounts found for wallet: ${wallet.walletId}`);
        return null;
      }

      // Map accounts by address format for chain-specific resolution
      const addressMap = {
        ethereum: null as string | null,
        solana: null as string | null,
        sui: null as string | null,
      };

      // Find chain-specific addresses
      accounts.forEach((account) => {
        switch (account.addressFormat) {
          case "ADDRESS_FORMAT_ETHEREUM":
            addressMap.ethereum = account.address;
            break;
          case "ADDRESS_FORMAT_SOLANA":
            addressMap.solana = account.address;
            break;
          case "ADDRESS_FORMAT_SUI":
            addressMap.sui = account.address;
            break;
        }
      });

      // Use primary address as fallback for missing chain-specific addresses
      const primaryAddress = accounts[0].address;

      return {
        primaryAddress,
        walletId: wallet.walletId,
        accounts: accounts,
        chainAddresses: {
          ethereum: addressMap.ethereum || primaryAddress,
          solana: addressMap.solana || primaryAddress,
          sui: addressMap.sui || primaryAddress,
        },
        metadata: {
          totalAccounts: accounts.length,
          supportedChains: accounts.map((acc) => acc.addressFormat),
          walletName: wallet.walletName || "Default Wallet",
          createdAt: wallet.createdAt,
        },
      };
    } catch (error) {
      console.error("Error getting user wallet addresses:", error);
      return null;
    }
  }

  /**
   * Get multi-chain addresses for a user with validation
   */
  async getMultiChainAddresses(userId: string): Promise<MultiChainAddresses> {
    try {
      const walletInfo = await this.getUserWalletAddresses(userId);

      if (!walletInfo) {
        console.warn(`No wallet info found for user: ${userId}`);
        return this.getEmptyAddresses();
      }

      const { chainAddresses, metadata } = walletInfo;

      console.log(`Mapping addresses for user ${userId}:`, {
        totalAccounts: metadata.totalAccounts,
        supportedChains: metadata.supportedChains,
        walletName: metadata.walletName,
      });

      // Map chain-specific addresses where available, fallback to primary
      const multiChainAddresses: MultiChainAddresses = {
        // EVM chains use Ethereum address
        ETHEREUM: chainAddresses.ethereum,
        BASE: chainAddresses.ethereum,
        BSC: chainAddresses.ethereum,
        POLYGON: chainAddresses.ethereum,
        ARBITRUM: chainAddresses.ethereum,
        OPTIMISM: chainAddresses.ethereum,
        // Use actual Solana address from user's wallet
        SOLANA: chainAddresses.solana,
      };

      // Validate addresses before returning
      const validatedAddresses: MultiChainAddresses = {} as MultiChainAddresses;

      Object.entries(multiChainAddresses).forEach(([chain, address]) => {
        if (address && this.isValidAddress(address, chain as SupportedChain)) {
          validatedAddresses[chain as SupportedChain] = address;
        } else {
          console.warn(
            `Invalid or missing address for chain ${chain}: ${address}`
          );
          validatedAddresses[chain as SupportedChain] = null;
        }
      });

      return validatedAddresses;
    } catch (error) {
      console.error("Error getting multi-chain addresses:", error);
      return this.getEmptyAddresses();
    }
  }

  /**
   * Validate address format for specific chain
   */
  public isValidAddress(address: string, chain: SupportedChain): boolean {
    if (!address || typeof address !== "string") {
      return false;
    }

    try {
      switch (chain) {
        case "SOLANA":
          // Solana addresses are base58 encoded and typically 32-44 characters
          return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address);
        case "ETHEREUM":
        case "BASE":
        case "BSC":
        case "POLYGON":
        case "ARBITRUM":
        case "OPTIMISM":
          // EVM addresses are 42 characters starting with 0x
          return /^0x[a-fA-F0-9]{40}$/.test(address);
        default:
          return false;
      }
    } catch (error) {
      console.error(`Error validating address for chain ${chain}:`, error);
      return false;
    }
  }

  /**
   * Get empty addresses object
   */
  private getEmptyAddresses(): MultiChainAddresses {
    return {
      ETHEREUM: null,
      BASE: null,
      BSC: null,
      SOLANA: null,
      POLYGON: null,
      ARBITRUM: null,
      OPTIMISM: null,
    };
  }

  /**
   * Get supported chains for a user's wallet
   */
  async getSupportedChains(userId: string): Promise<SupportedChain[]> {
    try {
      const addresses = await this.getMultiChainAddresses(userId);
      return Object.entries(addresses)
        .filter(([, address]) => address !== null)
        .map(([chain]) => chain as SupportedChain);
    } catch (error) {
      console.error("Error getting supported chains:", error);
      return [];
    }
  }

  /**
   * Check if user has valid address for specific chain
   */
  async hasValidAddressForChain(
    userId: string,
    chain: SupportedChain
  ): Promise<boolean> {
    try {
      const addresses = await this.getMultiChainAddresses(userId);
      return addresses[chain] !== null;
    } catch (error) {
      console.error(`Error checking address for chain ${chain}:`, error);
      return false;
    }
  }
}

// Export singleton instance
export const walletAddressService = WalletAddressService.getInstance();
export default walletAddressService;
