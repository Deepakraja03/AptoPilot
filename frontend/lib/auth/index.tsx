/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";
import React, { ReactNode, useEffect, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "../store/hooks";
import {
  setUser,
  setError,
  updateWallets,
  logout as logoutAction,
  initializeFromStorage,
} from "../store/authSlice";
import { turnkeyApi } from "./api";
import { BASE_URL } from "../constant";
import { WalletType } from "@turnkey/wallet-stamper";

interface SubOrgResponse {
  success: boolean;
  email: string;
  user: {
    id: string;
    username: string;
    email: string;
  };
  subOrganizationId: string;
  turnkeyUserId: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const { user, isLoading } = useAppSelector((state: any) => state.auth);

  useEffect(() => {
    // Initialize auth state from storage on app start
    dispatch(initializeFromStorage());
  }, [dispatch]);

  useEffect(() => {
    const checkSessionExpiry = () => {
      if (user?.sessionTimestamp) {
        const EIGHT_HOURS_IN_MS = 8 * 60 * 60 * 1000;
        const now = Date.now();
        const sessionAge = now - user.sessionTimestamp;

        if (sessionAge >= EIGHT_HOURS_IN_MS) {
          console.log("Session expired, logging out user");
          dispatch(logoutAction());
        }
      }
    };

    // Only start the interval if user is logged in
    const interval = user ? setInterval(checkSessionExpiry, 30000) : null;

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user, dispatch]);

  // Don't render children until auth state is initialized
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}

export function useAuth() {
  const dispatch = useAppDispatch();
  const { user, isLoading, error } = useAppSelector((state: any) => state.auth);

  const login = useCallback(
    async (
      email: string
    ): Promise<{ organizationId: string; userId: string; otpId: string }> => {
      try {
        dispatch(setError(null));

        // First, get the user's sub-organization
        const subOrgResponse = await fetch(
          `${BASE_URL}/api/turnkey/users/suborg/${email}`,
          {
            method: "GET",
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache",
            },
          }
        );

        if (!subOrgResponse.ok) {
          if (subOrgResponse.status === 404) {
            throw new Error(
              "User not found. Please check your email address or register first."
            );
          }
          throw new Error(`Failed to find user: ${subOrgResponse.status}`);
        }

        const subOrgData: SubOrgResponse = await subOrgResponse.json();

        if (!subOrgData.success || !subOrgData.subOrganizationId) {
          throw new Error("No sub-organization associated with this email");
        }

        // Then, initialize OTP
        const otpResponse = await fetch(
          `${BASE_URL}/api/turnkey/auth/otp/init`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache",
            },
            body: JSON.stringify({
              contact: email,
            }),
          }
        );

        if (!otpResponse.ok) {
          const errorData = await otpResponse.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              `Failed to send verification email: ${otpResponse.status}`
          );
        }

        const otpData = await otpResponse.json();
        console.log("OTP initialized successfully:", otpData);

        const optID = otpData.otpId;

        return {
          organizationId: subOrgData.subOrganizationId,
          userId: subOrgData.user.id,
          otpId: optID,
        };
      } catch (error) {
        console.error("Login error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Login failed";
        dispatch(setError(errorMessage));
        throw error;
      }
    },
    [dispatch]
  );

  const getOtpIdByEmail = useCallback(
    async (email: string): Promise<string> => {
      if (!email) {
        throw new Error("Email is required");
      }

      try {
        dispatch(setError(null));
        const response = await fetch(
          `${BASE_URL}/api/turnkey/auth/otp/getIdByEmail`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache",
              Pragma: "no-cache",
            },
            body: JSON.stringify({ email }),
          }
        );

        if (response.status === 429) {
          throw new Error("Too many requests. Please try again later.");
        }

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || "Failed to retrieve verification information"
          );
        }

        const data = await response.json();
        if (!data.otpId) {
          throw new Error("No OTP ID received from server");
        }

        return data.otpId;
      } catch (error) {
        console.error("Get OTP ID error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to get OTP ID";
        dispatch(setError(errorMessage));
        throw error;
      }
    },
    [dispatch]
  );

  const verifyOTP = useCallback(
    async (
      otpId: string,
      otpCode: string,
      email: string
    ): Promise<{ verificationToken: string; userId: string }> => {
      console.log("otpid", otpId, "otpcode", otpCode, "email", email);
      if (!otpId || !otpCode || !email) {
        throw new Error("Missing required parameters for OTP verification");
      }

      try {
        dispatch(setError(null));
        const response = await fetch(
          `${BASE_URL}/api/turnkey/auth/otp/verify`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-cache",
            },
            body: JSON.stringify({
              otpId,
              otpCode,
              email,
            }),
          }
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          if (response.status === 400) {
            throw new Error(errorData.error || "Invalid verification code");
          }
          throw new Error(errorData.error || "Verification failed");
        }

        const data = await response.json();
        if (!data.userId) {
          throw new Error("No verification token received");
        }

        return data;
      } catch (error) {
        console.error("OTP verification error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "OTP verification failed";
        dispatch(setError(errorMessage));
        throw error;
      }
    },
    [dispatch]
  );

  const completeLoginWithOtp = useCallback(
    async (email: string) => {
      if (!email) {
        throw new Error("Email is required");
      }

      try {
        dispatch(setError(null));

        const response = await fetch(`${BASE_URL}/api/turnkey/auth/otp/login`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
          body: JSON.stringify({
            email,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error || `Login failed: ${response.status}`
          );
        }

        const userData = await response.json();

        // Add session timestamp for expiry tracking
        const userDataWithSession = {
          ...userData,
          sessionTimestamp: Date.now(),
        };

        dispatch(setUser(userDataWithSession));
        console.log("Login completed successfully:", userDataWithSession);

        return userDataWithSession;
      } catch (error) {
        console.error("Complete login error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Login failed";
        dispatch(setError(errorMessage));
        throw error;
      }
    },
    [dispatch]
  );
const getWalletAccounts = useCallback(
    async (walletId: string) => {
      try {
        dispatch(setError(null));
        const response = await turnkeyApi.getWalletAccounts(walletId);

        if (response.error) {
          throw new Error(response.error);
        }

        return response;
      } catch (error) {
        console.error("Get wallet accounts error:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to get wallet accounts";
        dispatch(setError(errorMessage));
        throw error;
      }
    },
    [dispatch]
  );
  const fetchUserWallets = useCallback(async () => {
    console.log("Fetching user wallets...");
    console.log("User:", user);
    if (!user?.organizationId) {
      console.warn("No organization ID available for fetching wallets");
      return [];
    }

    try {
      dispatch(setError(null));
      const response = await turnkeyApi.listUserWallets(user.organizationId);

      if (response.error) {
        throw new Error(response.error);
      }

      const wallets = response.wallets || response;
      const walletsArray = Array.isArray(wallets) ? wallets : [];
      dispatch(updateWallets(walletsArray));
      console.log("Wallets fetched successfully:", wallets);
      console.log("Wallets dispatched to Redux:", walletsArray);

      // Fetch accounts for each wallet with proper error handling
      if (Array.isArray(wallets) && wallets.length > 0) {
        for (const wallet of wallets) {
          try {
            console.log(`Fetching accounts for wallet: ${wallet.walletId}`);
            const accountsResponse = await getWalletAccounts(wallet.walletId);
            console.log(`Accounts response for ${wallet.walletId}:`, accountsResponse);
            
            // If no accounts found, wait a bit and try again
            if (!accountsResponse || !accountsResponse.accounts || accountsResponse.accounts.length === 0) {
              console.log(`No accounts found for ${wallet.walletId}, retrying in 1 second...`);
              await new Promise(resolve => setTimeout(resolve, 1000));
              const retryResponse = await getWalletAccounts(wallet.walletId);
              console.log(`Retry response for ${wallet.walletId}:`, retryResponse);
            }
          } catch (error) {
            console.error(
              `Failed to fetch accounts for wallet ${wallet.walletId}:`,
              error
            );
          }
        }
      }
      
      return walletsArray;
    } catch (error) {
      console.error("Fetch wallets error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to fetch wallets";
      dispatch(setError(errorMessage));
      return [];
    }
  }, [dispatch, user?.organizationId, getWalletAccounts]);

  const logout = useCallback(() => {
    console.log("Logging out user");
    dispatch(logoutAction());
  }, [dispatch]);

  const createWallet = useCallback(
    async (walletName: string, accounts?: any[]) => {
      if (!user?.organizationId) {
        throw new Error("User not authenticated");
      }

      try {
        dispatch(setError(null));
        const response = await turnkeyApi.createUserWallet(
          user.organizationId,
          {
            walletName,
            accounts,
          }
        );

        if (response.error) {
          throw new Error(response.error);
        }

        await fetchUserWallets();
        return response;
      } catch (error) {
        console.error("Create wallet error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to create wallet";
        dispatch(setError(errorMessage));
        throw error;
      }
    },
    [dispatch, user?.organizationId, fetchUserWallets]
  );

  const exportWallet = useCallback(
    async (walletId: string, targetPublicKey: string) => {
      try {
        dispatch(setError(null));
        const response = await turnkeyApi.exportWallet({
          walletId,
          targetPublicKey,
        });

        if (response.error) {
          throw new Error(response.error);
        }

        return response;
      } catch (error) {
        console.error("Export wallet error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to export wallet";
        dispatch(setError(errorMessage));
        throw error;
      }
    },
    [dispatch]
  );

  

  const createWalletAccount = useCallback(
    async (
      walletId: string,
      accounts: {
        curve: string;
        pathFormat: string;
        path: string;
        addressFormat: string;
      }[]
    ) => {
      try {
        dispatch(setError(null));
        const response = await turnkeyApi.createWalletAccount(walletId, {
          accounts,
        });

        if (response.error) {
          throw new Error(response.error);
        }

        return response;
      } catch (error) {
        console.error("Create wallet account error:", error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : "Failed to create wallet account";
        dispatch(setError(errorMessage));
        throw error;
      }
    },
    [dispatch]
  );

  const importWallet = useCallback(
    async (
      walletName: string,
      encryptedBundle: string,
      accounts: {
        curve: string;
        pathFormat: string;
        path: string;
        addressFormat: string;
      }[]
    ) => {
      if (!user?.userId) {
        throw new Error("User not authenticated");
      }

      try {
        dispatch(setError(null));
        const response = await turnkeyApi.importWallet({
          userId: user.userId,
          walletName,
          encryptedBundle,
          accounts: accounts as any,
          organizationId: user.organizationId,
        });

        if (response.error) {
          throw new Error(response.error);
        }

        await fetchUserWallets();
        return response;
      } catch (error) {
        console.error("Import wallet error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Failed to import wallet";
        dispatch(setError(errorMessage));
        throw error;
      }
    },
    [dispatch, user, fetchUserWallets]
  );

  const listPrivateKeys = useCallback(async () => {
    if (!user?.organizationId) {
      throw new Error("User not authenticated");
    }
    try {
      dispatch(setError(null));
      const response = await turnkeyApi.listPrivateKeys(user.organizationId);
      if (response.error) {
        throw new Error(response.error);
      }
      return response;
    } catch (error) {
      console.error("List private keys error:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Failed to list private keys";
      dispatch(setError(errorMessage));
      throw error;
    }
  }, [dispatch, user?.organizationId]);

  const loginOrSignupWithWallet = useCallback(
    async ({
      walletProvider,
      createSubOrgParams,
    }: {
      walletProvider: any;
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
    }) => {
      try {
        dispatch(setError(null));

        // Get wallet info
        const accounts = await walletProvider.request({
          method: "eth_accounts",
        });

        if (!accounts || accounts.length === 0) {
          throw new Error("No wallet accounts found");
        }

        const walletAddress = accounts[0];

        // Get public key from wallet
        let publicKey;
        try {
          // Try to get public key - different methods for different wallets
          if (walletProvider.isMetaMask) {
            // For MetaMask, we need to use a different approach
            const message =
              "Please sign this message to authenticate with AptoPilot";
            const signature = await walletProvider.request({
              method: "personal_sign",
              params: [message, walletAddress],
            });
            // Use signature as a form of authentication
            publicKey = signature;
          } else {
            // For other wallets, try to get public key directly
            publicKey = await walletProvider.request({
              method: "eth_getEncryptionPublicKey",
              params: [walletAddress],
            });
          }
        } catch (error) {
          console.warn("Could not get public key, using address:", error);
          publicKey = walletAddress;
        }

        // Create or login with wallet
        const response = await fetch(`${BASE_URL}/api/turnkey/auth/wallet`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            walletAddress,
            publicKey,
            walletType: WalletType.Ethereum,
            createSubOrgParams,
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              `Wallet authentication failed: ${response.status}`
          );
        }

        const userData = await response.json();

        // Add session timestamp for expiry tracking
        const userDataWithSession = {
          ...userData,
          sessionTimestamp: Date.now(),
          walletAddress,
          isWalletAuth: true,
        };

        dispatch(setUser(userDataWithSession));
        console.log(
          "Wallet login completed successfully:",
          userDataWithSession
        );

        // Note: fetchUserWallets will be called by the site-header useEffect
        // to avoid duplicate calls

        return userDataWithSession;
      } catch (error) {
        console.error("Wallet login error:", error);
        const errorMessage =
          error instanceof Error ? error.message : "Wallet login failed";
        dispatch(setError(errorMessage));
        throw error;
      }
    },
    [dispatch, fetchUserWallets]
  );

  const loginWithSolanaWallet = useCallback(
    async ({
      walletProvider,
      createSubOrgParams,
    }: {
      walletProvider: any;
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
    }) => {
      try {
        dispatch(setError(null));

        // Connect to Solana wallet
        await walletProvider.connect();

        if (!walletProvider.publicKey) {
          throw new Error("No Solana wallet public key found");
        }

        const walletAddress = walletProvider.publicKey.toString();
        const publicKey = walletProvider.publicKey.toBase58();

        // Create or login with Solana wallet
        const response = await fetch(`${BASE_URL}/api/turnkey/auth/wallet`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            walletAddress,
            publicKey,
            walletType: "solana", // Custom type for Solana
            createSubOrgParams: {
              ...createSubOrgParams,
              customWallet: createSubOrgParams?.customWallet || {
                walletName: `Solana-Wallet-${Date.now()}`,
                walletAccounts: [
                  {
                    curve: "CURVE_ED25519",
                    pathFormat: "PATH_FORMAT_BIP32",
                    path: "m/44'/501'/0'/0'",
                    addressFormat: "ADDRESS_FORMAT_SOLANA",
                  },
                ],
              },
            },
          }),
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(
            errorData.error ||
              `Solana wallet authentication failed: ${response.status}`
          );
        }

        const userData = await response.json();

        // Add session timestamp for expiry tracking
        const userDataWithSession = {
          ...userData,
          sessionTimestamp: Date.now(),
          walletAddress,
          isWalletAuth: true,
        };

        dispatch(setUser(userDataWithSession));
        console.log(
          "Solana wallet login completed successfully:",
          userDataWithSession
        );

        // Note: fetchUserWallets will be called by the site-header useEffect
        // to avoid duplicate calls

        return userDataWithSession;
      } catch (error) {
        console.error("Solana wallet login error:", error);
        
        // If the error is about wallet label uniqueness, try to proceed with login
        if (error instanceof Error && error.message.includes("wallet label must be unique")) {
          console.log("Wallet already exists, attempting to proceed with login...");
          
          try {
            // Try to fetch user data by wallet address
            const response = await fetch(`${BASE_URL}/api/turnkey/auth/wallet`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                walletAddress: walletProvider.publicKey.toString(),
                publicKey: walletProvider.publicKey.toBase58(),
                walletType: "solana",
              }),
            });
            
            if (response.ok) {
              const userData = await response.json();
              // Add session timestamp for expiry tracking
              const userDataWithSession = {
                ...userData,
                sessionTimestamp: Date.now(),
                walletAddress: walletProvider.publicKey.toString(),
                isWalletAuth: true,
              };
              
              dispatch(setUser(userDataWithSession));
              return userDataWithSession;
            }
          } catch (secondError) {
            console.error("Failed to recover from wallet label error:", secondError);
          }
        }
        
        const errorMessage =
          error instanceof Error ? error.message : "Solana wallet login failed";
        dispatch(setError(errorMessage));
        throw error;
      }
    },
    [dispatch, fetchUserWallets]
  );

  return {
    user,
    isLoading,
    error,
    login,
    getOtpIdByEmail,
    verifyOTP,
    completeLoginWithOtp,
    logout,
    fetchUserWallets,
    createWallet,
    exportWallet,
    getWalletAccounts,
    createWalletAccount,
    importWallet,
    listPrivateKeys,
    loginOrSignupWithWallet,
    loginWithSolanaWallet,
  };
}
