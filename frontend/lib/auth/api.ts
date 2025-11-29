/* eslint-disable @typescript-eslint/no-explicit-any */
"use client";

import { BASE_URL } from "../constant";

export const turnkeyApi = {
  // 1. List Wallets
  listWallets: async () => {
    const response = await fetch(`${BASE_URL}/api/turnkey/wallets`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.json();
  },

  // 2. Get Specific Wallet
  getWallet: async (walletId: string) => {
    const response = await fetch(
      `${BASE_URL}/api/turnkey/wallets/${walletId}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.json();
  },

  // 3. Create Wallet
  createWallet: async (data: { walletName: string; accounts?: any[] }) => {
    const response = await fetch(`${BASE_URL}/api/turnkey/wallets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // 4. Update Wallet
  updateWallet: async (walletId: string, data: { walletName: string }) => {
    const response = await fetch(
      `${BASE_URL}/api/turnkey/wallets/${walletId}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );
    return response.json();
  },

  // 5. Delete Wallet
  deleteWallet: async (walletId: string) => {
    const response = await fetch(
      `${BASE_URL}/api/turnkey/wallets/${walletId}`,
      {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.json();
  },

  // 6. Import Wallet
  importWallet: async (data: {
    userId: string;
    walletName: string;
    encryptedBundle: string;
    accounts: [
      {
        curve: string;
        pathFormat: string;
        path: string;
        addressFormat: string;
      },
    ];
    organizationId: string;
  }) => {
    const response = await fetch(`${BASE_URL}/api/turnkey/wallets/import`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // 7. Export Wallet
  exportWallet: async (data: { walletId: string; targetPublicKey: string }) => {
    const response = await fetch(`${BASE_URL}/api/turnkey/wallets/export`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // 8. Get Wallet Accounts
  getWalletAccounts: async (walletId: string) => {
    const response = await fetch(
      `${BASE_URL}/api/turnkey/wallets/${walletId}/accounts`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.json();
  },

  // 9. Create Wallet Account
  createWalletAccount: async (walletId: string, data: { accounts: any[] }) => {
    const response = await fetch(
      `${BASE_URL}/api/turnkey/wallets/${walletId}/accounts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );
    return response.json();
  },

  // 10. Sign Transaction
  signTransaction: async (data: {
    signWith: string;
    unsignedTransaction: string;
    type?: string;
  }) => {
    const response = await fetch(`${BASE_URL}/api/turnkey/sign/transaction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // 11. Sign Raw Payload
  signRawPayload: async (data: {
    signWith: string;
    payload: string;
    encoding?: string;
    hashFunction?: string;
  }) => {
    const response = await fetch(`${BASE_URL}/api/turnkey/sign/payload`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // 12. Sign Multiple Payloads
  signMultiplePayloads: async (data: {
    signWith: string;
    payloads: string[];
    encoding?: string;
    hashFunction?: string;
  }) => {
    const response = await fetch(`${BASE_URL}/api/turnkey/sign/payloads`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    return response.json();
  },

  // 13. List User Wallets
  listUserWallets: async (subOrgId: string) => {
    const response = await fetch(
      `${BASE_URL}/api/turnkey/users/suborg/subOrgId/${subOrgId}/wallets`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.json();
  },

  // 14. Create User Wallet
  createUserWallet: async (
    subOrgId: string,
    data: { walletName: string; accounts?: any[] }
  ) => {
    const response = await fetch(
      `${BASE_URL}/api/turnkey/users/suborg/subOrgId/${subOrgId}/wallets`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      }
    );
    return response.json();
  },

  // 15. Get User
  getUser: async (userId: string) => {
    const response = await fetch(`${BASE_URL}/api/turnkey/users/${userId}`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });
    return response.json();
  },

  // 16. List Private Keys
  listPrivateKeys: async (organisationID: string) => {
    const response = await fetch(
      `${BASE_URL}/api/turnkey/wallets/privatekeys/${organisationID}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
    return response.json();
  },
};
