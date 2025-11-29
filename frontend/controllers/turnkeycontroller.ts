/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest as NextRequestBase, NextResponse } from "next/server";
import turnkeyService from "../lib/services/turnkey/index";
import databaseService from "../lib/services/mongo/database";

interface User {
  id?: string;
  organizationId?: string;
  [key: string]: any;
}
interface NextRequestWithUser extends NextRequestBase {
  user?: User;
}
type NextRequest = NextRequestWithUser;

const asyncHandler =
  (
    fn: (req?: NextRequest, res?: NextResponse) => Promise<NextResponse | void>
  ) =>
  (req?: NextRequest, res?: NextResponse) => {
    return Promise.resolve(fn(req, res)).catch((error) => {
      console.error("Error in turnkey controller:", error);
      return NextResponse.json(
        {
          success: false,
          error: error?.message || "Internal server error",
        },
        { status: 500 }
      );
    });
  };

/**
 * -----------------------------------------------
 * SYSTEM & STATUS ENDPOINTS
 * -----------------------------------------------
 */

export const getTurnkeyStatus = asyncHandler(async () => {
  try {
    const status = await turnkeyService.testConnection();

    await databaseService.logApiHealth({
      service: "turnkey",
      status: status.success ? "healthy" : "unhealthy",
      message: status.message,
      checkedAt: new Date(),
      NextResponseTime: status.responseTime,
    });

    if (status.success) {
      return NextResponse.json(
        {
          success: true,
          message: status.message,
        },
        { status: 200 }
      );
    } else {
      throw new Error(`Failed to connect to Turnkey API: ${status.message}`);
    }
  } catch (err) {
    const error = err as Error;
    console.error("Turnkey status check error:", error);

    await databaseService.logApiHealth({
      service: "turnkey",
      status: "error",
      message: error.message,
      checkedAt: new Date(),
      error: error.stack,
    });

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
});

export const getWhoami = asyncHandler(async (req?: NextRequest) => {
  try {
    const whoamiNextResponse = await turnkeyService.getWhoami();

    await databaseService.logApiCall({
      service: "turnkey",
      endpoint: "whoami",
      userId: req?.user?.id,
      status: "success",
      calledAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        data: whoamiNextResponse,
      },
      { status: 200 }
    );
  } catch (err) {
    const error = err as Error;
    console.error("Whoami error:", error);

    await databaseService.logApiCall({
      service: "turnkey",
      endpoint: "whoami",
      userId: req?.user?.id,
      status: "error",
      error: error.message,
      calledAt: new Date(),
    });

    return NextResponse.json(
      {
        success: false,
        error: error.message || "Internal server error",
      },
      { status: 500 }
    );
  }
});

/**
 * -----------------------------------------------
 * ORGANIZATION & USER MANAGEMENT
 * -----------------------------------------------
 */

export const getOrganizationInfo = asyncHandler(async () => {
  const orgInfo = await turnkeyService.getOrganization();

  return NextResponse.json(
    {
      success: true,
      organization: orgInfo.organization,
    },
    { status: 200 }
  );
});

export const getUsers = asyncHandler(async () => {
  const usersNextResponse = await turnkeyService.getUsers();

  return NextResponse.json(
    {
      success: true,
      users: usersNextResponse.users || [],
    },
    { status: 200 }
  );
});

export const getUser = asyncHandler(async (req?: NextRequest) => {
  const url = new URL(req?.url || "");
  const pathParts = url.pathname.split("/");
  const userId = pathParts[pathParts.length - 1];

  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: "User ID is required",
      },
      { status: 400 }
    );
  }

  const userNextResponse = await turnkeyService.getUser(userId);

  return NextResponse.json(
    {
      success: true,
      user: userNextResponse.user,
    },
    { status: 200 }
  );
});

export const createUser = asyncHandler(async (req?: NextRequest) => {
  const body =
    typeof req?.body === "object" &&
    req?.body !== null &&
    "userName" in req?.body
      ? req?.body
      : await req?.json();
  const { userName, userEmail, publicKey, apiKeyName } = body;

  if (!userName || !publicKey || !apiKeyName) {
    return NextResponse.json(
      {
        success: false,
        error: "Username, public key, and API key name are required",
      },
      { status: 400 }
    );
  }

  try {
    const existingUser = await databaseService.getUserByWallet(userEmail);
    if (existingUser) {
      return NextResponse.json(
        {
          success: false,
          error: "User with this email already exists",
        },
        { status: 400 }
      );
    }

    const user = {
      userName,
      userEmail,
      apiKeys: [
        {
          apiKeyName,
          publicKey,
          curveType: "API_KEY_CURVE_SECP256K1" as
            | "API_KEY_CURVE_SECP256K1"
            | "API_KEY_CURVE_P256"
            | "API_KEY_CURVE_ED25519",
        },
      ],
      authenticators: [],
      oauthProviders: [],
      userTags: [],
    };

    const createNextResponse = await turnkeyService.createUsers([user]);
    const turnkeyUserId = createNextResponse.userIds?.[0];

    if (!turnkeyUserId) {
      throw new Error("Failed to create user in Turnkey");
    }

    const dbUser = await databaseService.createUser({
      username: userName,
      email: userEmail,
      turnkeyUserId,
      organizationId: req?.user?.organizationId,
    });

    return NextResponse.json(
      {
        success: true,
        message: "User created successfully",
        user: {
          id: dbUser.id,
          username: dbUser.username,
          email: dbUser.email,
          turnkeyUserId,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create user error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create user",
      },
      { status: 500 }
    );
  }
});

export const updateUser = asyncHandler(async (req?: NextRequest) => {
  const url = new URL(req?.url || "");
  const pathParts = url.pathname.split("/");
  const userId = pathParts[pathParts.length - 1];
  const body =
    typeof req?.body === "object" &&
    req?.body !== null &&
    "userName" in req?.body
      ? req?.body
      : await req?.json();
  const { userName } = body;

  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: "User ID is required",
      },
      { status: 400 }
    );
  }

  try {
    const dbUser = await databaseService.getUserById(userId);
    if (!dbUser) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    const updateNextResponse = await turnkeyService.updateUser(
      userId,
      userName
    );

    const updatedUser = await databaseService.updateUser(userId, {
      username: userName,
      updatedAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        message: "User updated successfully",
        user: {
          id: updatedUser.id,
          username: updatedUser.username,
          email: updatedUser.email,
          turnkeyUserId: updateNextResponse.user?.userId,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Update user error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to update user",
      },
      { status: 500 }
    );
  }
});

export const deleteUser = asyncHandler(async (req?: NextRequest) => {
  const url = new URL(req?.url || "");
  const pathParts = url.pathname.split("/");
  const userId = pathParts[pathParts.length - 1];

  if (!userId) {
    return NextResponse.json(
      {
        success: false,
        error: "User ID is required",
      },
      { status: 400 }
    );
  }

  try {
    const dbUser = await databaseService.getUserById(userId);
    if (!dbUser) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found",
        },
        { status: 404 }
      );
    }

    await turnkeyService.deleteUsers([userId]);

    await databaseService.deleteUser(userId);

    return NextResponse.json(
      {
        success: true,
        message: "User deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete user",
      },
      { status: 500 }
    );
  }
});

export const createApiKey = asyncHandler(async (req?: NextRequest) => {
  const body =
    typeof req?.body === "object" &&
    req?.body !== null &&
    "apiKeyName" in req?.body
      ? req?.body
      : await req?.json();
  const {
    userId,
    apiKeyName,
    publicKey,
    curveType = "API_KEY_CURVE_SECP256K1",
  } = body;

  if (!userId || !apiKeyName || !publicKey) {
    return NextResponse.json(
      {
        success: false,
        error: "User ID, API key name, and public key are required",
      },
      { status: 400 }
    );
  }

  const apiKey = {
    apiKeyName,
    publicKey,
    curveType,
  };

  const apiKeyNextResponse = await turnkeyService.createApiKeys(userId, [
    apiKey,
  ]);

  return NextResponse.json(
    {
      success: true,
      message: "API key created successfully",
      apiKeyIds: apiKeyNextResponse.apiKeyIds,
    },
    { status: 201 }
  );
});

export const deleteApiKey = asyncHandler(async (req?: NextRequest) => {
  // Extract userId and apiKeyId from the URL path
  const url = new URL(req?.url || "");
  const pathParts = url.pathname.split("/");
  // Adjust the indices below as per your route structure, e.g. /api/users/:userId/api-keys/:apiKeyId
  const apiKeyId = pathParts[pathParts.length - 1];
  const userId = pathParts[pathParts.length - 3];

  if (!userId || !apiKeyId) {
    return NextResponse.json(
      {
        success: false,
        error: "User ID and API key ID are required",
      },
      { status: 400 }
    );
  }

  await turnkeyService.deleteApiKeys(userId, [apiKeyId]);

  return NextResponse.json(
    {
      success: true,
      message: "API key deleted successfully",
    },
    { status: 200 }
  );
});

/**
 * -----------------------------------------------
 * AUTHENTICATION & SESSION MANAGEMENT
 * -----------------------------------------------
 */

export const initOtpAuth = asyncHandler(async (req?: NextRequest) => {
  const { contact } = await req?.json();
  console.log("initOtpAuth contact:", contact);

  if (!contact) {
    return NextResponse.json(
      {
        success: false,
        error: "Contact information is required",
      },
      { status: 400 }
    );
  }
  try {
    const otpNextResponse = await turnkeyService.initOTPAuth(contact);

    await databaseService.createOtpRecord({
      otpId: otpNextResponse.otpId,
      email: contact,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    return NextResponse.json(
      {
        success: true,
        message: "OTP authentication initialized successfully",
        otpId: otpNextResponse.otpId,
      },
      { status: 200 }
    );
  } catch (initialError) {
    console.error("Initial OTP attempt failed:", initialError);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to initialize OTP authentication",
      },

      { status: 500 }
    );
  }
});

export const getOtpIdByEmail = asyncHandler(async (req?: NextRequest) => {
  const { email } = await req?.json();

  console.log("getOtpIdByEmail email:", email);
  if (!email) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing required parameter: email",
      },
      { status: 400 }
    );
  }

  try {
    const otpRecord = await databaseService.getValidOtpByEmail(email);

    console.log("otpRecord", otpRecord);
    if (!otpRecord) {
      return NextResponse.json(
        {
          success: false,
          error: "No valid OTP found for this email",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        otpId: otpRecord.otpId,
      },
      { status: 200 }
    );
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve OTP information",
      },
      { status: 500 }
    );
  }
});

export const verifyOtp = asyncHandler(async (req?: NextRequest) => {
  const { otpId, otpCode, email } = await req?.json();
  let actualOtpId = otpId;

  if (!otpId || !otpCode || !email) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing required parameters: otpId or otpCode",
      },
      { status: 400 }
    );
  }

  console.log("otpId", otpId);
  console.log("otpCode", otpCode);
  console.log("email", email);

  try {
    if (!otpId && email) {
      const otpRecord = await databaseService.getValidOtpByEmail(email);

      if (!otpRecord) {
        return NextResponse.json(
          {
            success: false,
            error: "No valid OTP found for this email",
          },
          { status: 404 }
        );
      }

      actualOtpId = otpRecord.otpId;
    }

    console.log("actualOtpId", actualOtpId);
    console.log("otpCode", otpCode);
    console.log("email", email);

    const verifyNextResponse = await turnkeyService.verifyOTP(
      actualOtpId,
      otpCode,
      email
    );

    await databaseService.invalidateOtp(otpId);

    return NextResponse.json(
      {
        success: true,
        message: "OTP verification successful",
        token: verifyNextResponse.verificationToken,
        userId: verifyNextResponse.userId,
      },
      {
        status: 200,
      }
    );
  } catch (error) {
    console.error("OTP verification failed:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to verify OTP",
      },
      { status: 500 }
    );
  }
});

export const emailAuth = asyncHandler(async (req?: NextRequest) => {
  const { email, targetPublicKey, apiKeyName } = await req?.json();

  if (!email || !targetPublicKey || !apiKeyName) {
    return NextResponse.json(
      {
        success: false,
        error: "Email, target public key, and API key name are required",
      },
      { status: 400 }
    );
  }

  const response = await turnkeyService.emailAuth(
    email,
    targetPublicKey,
    apiKeyName
  );

  return NextResponse.json(
    {
      success: true,
      message: "Email authentication initiated",
      data: response,
    },
    { status: 200 }
  );
});

export const createReadOnlySession = asyncHandler(async (req?: NextRequest) => {
  const { targetPublicKey, expirationSeconds } = await req?.json();

  if (!targetPublicKey) {
    return NextResponse.json(
      {
        success: false,
        error: "Target public key is required",
      },
      { status: 400 }
    );
  }

  try {
    const sessionNextResponse = await turnkeyService.createReadOnlySession(
      targetPublicKey,
      expirationSeconds
    );

    const sessionToken =
      sessionNextResponse.activity?.result?.createReadOnlySessionResult
        ?.credentialBundle;

    if (sessionToken && req?.user?.id) {
      await databaseService.updateUser(req?.user.id, {
        sessionToken,
        sessionExpiry: new Date(
          Date.now() + (expirationSeconds || 24 * 60 * 60) * 1000
        ),
        lastLoginAt: new Date(),
      });
    }

    return NextResponse.json(
      {
        success: true,
        message: "Read-only session created successfully",
        sessionToken,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Create read-only session error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create read-only session",
      },
      { status: 500 }
    );
  }
});

export const createReadWriteSession = asyncHandler(
  async (req?: NextRequest) => {
    const { targetPublicKey, expirationSeconds } = await req?.json();

    if (!targetPublicKey) {
      return NextResponse.json(
        {
          success: false,
          error: "Target public key is required",
        },
        { status: 400 }
      );
    }

    try {
      const sessionNextResponse = await turnkeyService.createReadWriteSession(
        targetPublicKey,
        expirationSeconds
      );

      const sessionToken =
        sessionNextResponse.activity?.result?.createReadWriteSessionResultV2
          ?.credentialBundle;

      if (sessionToken && req?.user?.id) {
        await databaseService.updateUser(req?.user.id, {
          sessionToken,
          sessionExpiry: new Date(
            Date.now() + (expirationSeconds || 24 * 60 * 60) * 1000
          ),
          lastLoginAt: new Date(),
        });
      }

      return NextResponse.json(
        {
          success: true,
          message: "Read-write session created successfully",
          sessionToken,
        },
        { status: 200 }
      );
    } catch (error) {
      console.error("Create read-write session error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create read-write session",
        },
        { status: 500 }
      );
    }
  }
);

/**
 * -----------------------------------------------
 * WALLET MANAGEMENT
 * -----------------------------------------------
 */

export const listWallets = asyncHandler(async () => {
  const walletsNextResponse = await turnkeyService.listWallets();

  return NextResponse.json(
    {
      success: true,
      message: "Wallets fetched successfully",
      wallets: walletsNextResponse.wallets || [],
    },
    { status: 200 }
  );
});

export const getWallet = asyncHandler(async (req?: NextRequest) => {
  const walletId = (req as any)?.params?.walletId;

  if (!walletId) {
    return NextResponse.json(
      {
        success: false,
        error: "Wallet ID is required",
      },
      { status: 400 }
    );
  }

  const walletNextResponse = await turnkeyService.getWallet(walletId);

  return NextResponse.json(
    {
      success: true,
      message: "Wallet fetched successfully",
      wallet: walletNextResponse.wallet,
    },
    { status: 200 }
  );
});

export const createWallet = asyncHandler(async (req?: NextRequest) => {
  const { walletName, accounts } = await req?.json();

  if (!walletName) {
    return NextResponse.json(
      {
        success: false,
        error: "Wallet name is required",
      },
      { status: 400 }
    );
  }

  try {
    const walletNextResponse = await turnkeyService.createWallet(
      walletName,
      accounts
    );

    const walletId =
      walletNextResponse.activity?.result?.createWalletResult?.walletId;
    const addresses =
      walletNextResponse.activity?.result?.createWalletResult?.addresses || [];

    if (!walletId) {
      throw new Error("Failed to create wallet in Turnkey");
    }

    const dbWallet = await databaseService.createWallet({
      walletId,
      walletName,
      organizationId: req?.user?.organizationId || "",
      userId: req?.user?.id || "",
    });

    if (addresses.length > 0) {
      const accountsData = addresses.map((address: string, index: number) => ({
        walletId,
        address,
        path: accounts?.[index]?.path || `m/44'/60'/0'/0/${index}`,
        curve: accounts?.[index]?.curve || "CURVE_SECP256K1",
        pathFormat: accounts?.[index]?.pathFormat || "PATH_FORMAT_BIP32",
        addressFormat:
          accounts?.[index]?.addressFormat || "ADDRESS_FORMAT_ETHEREUM",
        chainId: accounts?.[index]?.chainId || 1,
      }));

      await databaseService.createWalletAccounts(accountsData);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Wallet created successfully",
        wallet: {
          id: dbWallet.id,
          walletId: dbWallet.walletId,
          walletName: dbWallet.walletName,
          addresses,
          createdAt: dbWallet.createdAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create wallet error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create wallet",
      },
      { status: 500 }
    );
  }
});

export const updateWallet = asyncHandler(async (req?: NextRequest) => {
  const walletId = (req as any)?.params?.walletId;
  const { walletName } = await req?.json();

  if (!walletId || !walletName) {
    return NextResponse.json(
      {
        success: false,
        error: "Wallet ID and new wallet name are required",
      },
      { status: 400 }
    );
  }

  const updateNextResponse = await turnkeyService.updateWallet(
    walletId,
    walletName
  );

  return NextResponse.json(
    {
      success: true,
      message: "Wallet updated successfully",
      walletId: updateNextResponse.walletId,
    },
    { status: 200 }
  );
});

export const deleteWallet = asyncHandler(async (req?: NextRequest) => {
  const url = new URL(req?.url || "");
  const pathParts = url.pathname.split("/");
  const walletId = pathParts[pathParts.length - 1];

  if (!walletId) {
    return NextResponse.json(
      {
        success: false,
        error: "Wallet ID is required",
      },
      { status: 400 }
    );
  }

  try {
    const wallet = await databaseService.getWalletById(walletId);

    if (!wallet) {
      return NextResponse.json(
        {
          success: false,
          error: "Wallet not found",
        },
        { status: 404 }
      );
    }

    await turnkeyService.deleteWallets([walletId]);

    await databaseService.deleteWallet(walletId);

    return NextResponse.json(
      {
        success: true,
        message: "Wallet deleted successfully",
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Delete wallet error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete wallet",
      },
      { status: 500 }
    );
  }
});

export const importWallet = asyncHandler(async (req?: NextRequest) => {
  const { userId, walletName, encryptedBundle, accounts, organizationId } =
    await req?.json();

  if (
    !userId ||
    !walletName ||
    !encryptedBundle ||
    !accounts ||
    !organizationId
  ) {
    return NextResponse.json(
      {
        success: false,
        error:
          "User ID, wallet name, encrypted bundle, and accounts are required",
      },
      { status: 400 }
    );
  }

  try {
    const importNextResponse = await turnkeyService.importWallet(
      userId,
      walletName,
      encryptedBundle,
      accounts,
      organizationId
    );

    const dbWallet = await databaseService.createWallet({
      walletId: importNextResponse.walletId,
      walletName,
      userId,
      organizationId: req?.user?.organizationId || "",
      imported: true,
      importedAt: new Date(),
    });

    if (importNextResponse.addresses.length > 0) {
      const accountsData = importNextResponse.addresses.map(
        (address: string, index: number) => ({
          walletId: importNextResponse.walletId,
          address,
          path: accounts?.[index]?.path || `m/44'/60'/0'/0/${index}`,
          curve: accounts?.[index]?.curve || "CURVE_SECP256K1",
          pathFormat: accounts?.[index]?.pathFormat || "PATH_FORMAT_BIP32",
          addressFormat:
            accounts?.[index]?.addressFormat || "ADDRESS_FORMAT_ETHEREUM",
          chainId: accounts?.[index]?.chainId || 1,
        })
      );

      await databaseService.createWalletAccounts(accountsData);
    }

    return NextResponse.json(
      {
        success: true,
        message: "Wallet imported successfully",
        wallet: {
          id: dbWallet.id,
          walletId: dbWallet.walletId,
          walletName: dbWallet.walletName,
          addresses: importNextResponse.addresses,
          imported: dbWallet.imported,
          importedAt: dbWallet.importedAt,
          exported: dbWallet.exported,
          exportedAt: dbWallet.exportedAt,
          createdAt: dbWallet.createdAt,
          updatedAt: dbWallet.updatedAt,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Import wallet error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to import wallet",
      },
      { status: 500 }
    );
  }
});

export const exportWallet = asyncHandler(async (req?: NextRequest) => {
  const { walletId, targetPublicKey } = await req?.json();

  if (!walletId || !targetPublicKey) {
    return NextResponse.json(
      {
        success: false,
        error: "Wallet ID and target public key are required",
      },
      { status: 400 }
    );
  }

  try {
    const wallet = await databaseService.getWalletById(walletId);

    if (!wallet) {
      return NextResponse.json(
        {
          success: false,
          error: "Wallet not found",
        },
        { status: 404 }
      );
    }

    const exportNextResponse = await turnkeyService.exportWallet(
      walletId,
      targetPublicKey
    );

    await databaseService.updateWallet(walletId, {
      exported: true,
      exportedAt: new Date(),
      updatedAt: new Date(),
    });

    return NextResponse.json(
      {
        success: true,
        message: "Wallet exported successfully",
        exportBundle: exportNextResponse.exportBundle,
        wallet: {
          id: wallet.id,
          walletId: wallet.walletId,
          walletName: wallet.walletName,
          imported: wallet.imported,
          importedAt: wallet.importedAt,
          exported: true,
          exportedAt: new Date(),
          createdAt: wallet.createdAt,
          updatedAt: wallet.updatedAt,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Export wallet error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to export wallet",
      },
      { status: 500 }
    );
  }
});

export const getWalletAccounts = asyncHandler(async (req?: NextRequest) => {
  // Get walletId from params instead of parsing URL
  const walletId = (req as any)?.params?.walletId;

  console.log("getWalletAccounts - walletId:", walletId);

  if (!walletId) {
    return NextResponse.json(
      {
        success: false,
        error: "Wallet ID is required",
      },
      { status: 400 }
    );
  }

  try {
    const accountsNextResponse =
      await turnkeyService.getWalletAccounts(walletId);

    return NextResponse.json(
      {
        success: true,
        message: "Wallet accounts fetched successfully",
        accounts: accountsNextResponse.accounts || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error in turnkey controller:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to get wallet accounts",
      },
      { status: 500 }
    );
  }
});

export const createWalletAccount = asyncHandler(async (req?: NextRequest) => {
  // Get walletId from params instead of parsing URL
  const walletId = (req as any)?.params?.walletId;
  const { accounts } = await req?.json();

  console.log("createWalletAccount - walletId:", walletId);
  console.log("createWalletAccount - accounts:", accounts);

  if (!walletId || !accounts) {
    return NextResponse.json(
      {
        success: false,
        error: "Wallet ID and account details are required",
      },
      { status: 400 }
    );
  }

  try {
    const createNextResponse = await turnkeyService.createWalletAccounts(
      walletId,
      accounts
    );

    return NextResponse.json(
      {
        success: true,
        message: "Wallet account(s) created successfully",
        addresses: createNextResponse.addresses || [],
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error in turnkey controller:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create wallet account",
      },
      { status: 500 }
    );
  }
});

/**
 * -----------------------------------------------
 * SIGNING OPERATIONS
 * -----------------------------------------------
 */

export const signTransaction = asyncHandler(async (req?: NextRequest) => {
  const { signWith, unsignedTransaction, type } = await req?.json();

  if (!signWith || !unsignedTransaction) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing required parameters: signWith or unsignedTransaction",
      },
      { status: 400 }
    );
  }

  try {
    const signNextResponse = await turnkeyService.signTransaction(
      signWith,
      unsignedTransaction,
      type
    );

    return NextResponse.json(
      {
        success: true,
        message: "Transaction signed successfully",
        signedTransaction: signNextResponse.signedTransaction,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    console.error("Sign transaction error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to sign transaction",
      },
      { status: 500 }
    );
  }
});

export const signRawPayload = asyncHandler(async (req?: NextRequest) => {
  const { signWith, payload, encoding, hashFunction } = await req?.json();

  if (!signWith || !payload) {
    return NextResponse.json(
      {
        success: false,
        error: "Sign with and payload are required",
      },
      { status: 400 }
    );
  }

  const signNextResponse = await turnkeyService.signRawPayload(
    signWith,
    payload,
    encoding,
    hashFunction
  );

  return NextResponse.json(
    {
      success: true,
      message: "Payload signed successfully",
      signature: signNextResponse.signature,
    },
    { status: 200 }
  );
});

export const signMultiplePayloads = asyncHandler(async (req?: NextRequest) => {
  const { signWith, payloads, encoding, hashFunction } = await req?.json();

  if (!signWith || !payloads || !Array.isArray(payloads)) {
    return NextResponse.json(
      {
        success: false,
        error: "Sign with and an array of payloads are required",
      },
      { status: 400 }
    );
  }

  const signNextResponse = await turnkeyService.signRawPayloads(
    signWith,
    payloads,
    encoding,
    hashFunction
  );

  return NextResponse.json(
    {
      success: true,
      message: "Payloads signed successfully",
      signatures: signNextResponse.signatures,
    },
    { status: 200 }
  );
});

/**
 * -----------------------------------------------
 * POLICY & ACTIVITY MANAGEMENT
 * -----------------------------------------------
 */

export const getActivities = asyncHandler(async () => {
  const activitiesNextResponse = await turnkeyService.getActivities();

  return NextResponse.json(
    {
      success: true,
      activities: activitiesNextResponse.activities || [],
    },
    { status: 200 }
  );
});

export const getActivity = asyncHandler(async (req?: NextRequest) => {
  const url = new URL(req?.url || "");
  const pathParts = url.pathname.split("/");
  const activityId = pathParts[pathParts.length - 1];

  if (!activityId) {
    return NextResponse.json(
      {
        success: false,
        error: "Activity ID is required",
      },
      { status: 400 }
    );
  }

  const activityNextResponse = await turnkeyService.getActivity(activityId);

  return NextResponse.json(
    {
      success: true,
      activity: activityNextResponse.activity,
    },
    { status: 200 }
  );
});

export const approveActivity = asyncHandler(async (req?: NextRequest) => {
  const { fingerprint } = await req?.json();

  if (!fingerprint) {
    return NextResponse.json(
      {
        success: false,
        error: "Activity fingerprint is required",
      },
      { status: 400 }
    );
  }

  const approveNextResponse = await turnkeyService.approveActivity(fingerprint);

  return NextResponse.json(
    {
      success: true,
      message: "Activity approved successfully",
      data: approveNextResponse,
    },
    { status: 200 }
  );
});

export const rejectActivity = asyncHandler(async (req?: NextRequest) => {
  const { fingerprint } = await req?.json();

  if (!fingerprint) {
    return NextResponse.json(
      {
        success: false,
        error: "Activity fingerprint is required",
      },
      { status: 400 }
    );
  }

  const rejectNextResponse = await turnkeyService.rejectActivity(fingerprint);

  return NextResponse.json(
    {
      success: true,
      message: "Activity rejected successfully",
      data: rejectNextResponse,
    },
    { status: 200 }
  );
});

export const getPolicies = asyncHandler(async () => {
  const policiesNextResponse = await turnkeyService.getPolicies();

  return NextResponse.json(
    {
      success: true,
      policies: policiesNextResponse.policies || [],
    },
    { status: 200 }
  );
});

export const createPolicy = asyncHandler(async (req?: NextRequest) => {
  const { policyName, policy, resources } = await req?.json();

  if (!policyName || !policy) {
    return NextResponse.json(
      {
        success: false,
        error: "Policy name and policy document are required",
      },
      { status: 400 }
    );
  }

  const createNextResponse = await turnkeyService.createPolicy(
    policyName,
    policy,
    resources || []
  );

  return NextResponse.json(
    {
      success: true,
      message: "Policy created successfully",
      policyId: createNextResponse.policyId,
    },
    { status: 201 }
  );
});

/**
 * Create default user registration policy
 */
export const createUserRegistrationPolicy = asyncHandler(
  async (req?: NextRequest) => {
    const policyName = "user-registration-policy";

    const userId = req?.user?.id;
    if (!userId) {
      return NextResponse.json(
        {
          success: false,
          error: "User ID is required to create policy",
        },
        { status: 400 }
      );
    }

    const consensus = `approvers.any(user, user.id == "${userId}")`;
    const condition = `activity.type in ["ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION_V7", "ACTIVITY_TYPE_CREATE_USERS_V2", "ACTIVITY_TYPE_CREATE_API_KEYS_V2", "ACTIVITY_TYPE_INIT_OTP_AUTH", "ACTIVITY_TYPE_OTP_AUTH", "ACTIVITY_TYPE_EMAIL_AUTH_V2"]`;

    const notes =
      "Policy for controlling user registration and authentication flows";

    try {
      const createNextResponse = await turnkeyService.createPolicy(
        policyName,
        consensus,
        condition,
        notes
      );

      return NextResponse.json(
        {
          success: true,
          message: "User registration policy created successfully",
          policyId: createNextResponse.policyId,
        },
        { status: 201 }
      );
    } catch (error) {
      console.error("Create user registration policy error:", error);
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create user registration policy",
        },
        { status: 500 }
      );
    }
  }
);

/**
 * Register a new user by creating a sub-organization for them
 */
export const registerUser = asyncHandler(async (req?: NextRequest) => {
  const { username, email } = await req?.json();

  console.log("Registering user:", { username, email });
  if (!username || !email) {
    return NextResponse.json(
      {
        success: false,
        error: "Username, email, public key, and API key name are required",
      },
      { status: 400 }
    );
  }

  const existingUser = await databaseService.getUserByWallet(email);
  if (existingUser) {
    return NextResponse.json(
      {
        success: false,
        error: "User with this email already exists",
      },
      { status: 400 }
    );
  }

  // Prefer values from request body if provided, otherwise from env; finally, fallback to a sensible default
  const bodyMaybe = typeof req?.body === "object" && req?.body !== null ? (req?.body as any) : null;
  const publicKey = (bodyMaybe?.publicKey as string) || process.env.NEXT_PUBLIC_TURNKEY_API_PUBLIC_KEY || "";
  let apiKeyName = (bodyMaybe?.apiKeyName as string) || process.env.NEXT_PUBLIC_TURNKEY_API_KEY_NAME || "";
  if (!apiKeyName) {
    apiKeyName = `${username}-root-key-${Date.now()}`;
  }
  console.log("Public Key:", publicKey);
  console.log("API Key Name:", apiKeyName);
  console.log("Username:", username);
  console.log("Email:", email);
  try {
    const subOrgNextResponse = await turnkeyService.createSubOrganization(
      `${username}-org`,
      [
        {
          userName: username,
          userEmail: email,
          apiKeys: [
            {
              apiKeyName,
              publicKey,
              curveType: "API_KEY_CURVE_SECP256K1",
            },
          ],
          authenticators: [],
          oauthProviders: [],
          userTags: [],
        },
      ],
      1
    );

    console.log("Sub-organization created:", subOrgNextResponse);

    const subOrgId = subOrgNextResponse.subOrganizationId;

    const userData = {
      username,
      email,
      organizationId: subOrgId,
      turnkeyUserId: subOrgNextResponse.rootUserIds?.[0],
      primaryWalletAddress: "",
      connectedWallets: [],
      walletAddress: "",
    };

    const user = await databaseService.createUser(userData);

    return NextResponse.json(
      {
        success: true,
        message: "User registered successfully",
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          organizationId: user.organizationId,
        },
        subOrganizationId: subOrgId,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("User registration error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to register user",
      },
      { status: 500 }
    );
  }
});

/**
 * Get a user's sub-organization ID by email (for login flows)
 */
export const getUserSubOrgByEmail = asyncHandler(async (req?: NextRequest) => {
  // Get email from params instead of JSON body for GET request
  const email = (req as any)?.params?.email;

  if (!email) {
    return NextResponse.json(
      {
        success: false,
        error: "Email is required",
      },
      { status: 400 }
    );
  }

  try {
    const user = await databaseService.getUserByWallet(email);
    console.log("User:", user);

    if (!user || !user.organizationId) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found or no sub-organization associated",
        },
        { status: 404 }
      );
    }

    return NextResponse.json(
      {
        success: true,
        email,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        subOrganizationId: user.organizationId,
        turnkeyUserId: user.turnkeyUserId,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Get user sub-org error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve user information",
      },
      { status: 500 }
    );
  }
});
/**
 * OTP Login with sub-organization context
 */
export const otpLogin = asyncHandler(async (req?: NextRequest) => {
  const { email } = await req?.json();

  if (!email) {
    return NextResponse.json(
      {
        success: false,
        error:
          "Missing required parameters: email, otpId, otpCode, and PublicKey",
      },
      { status: 400 }
    );
  }

  try {
    console.log("otpLogin NextRequest:", {
      email,
    });
    const loginNextResponse = await turnkeyService.otpLogin(email);

    return NextResponse.json(
      {
        success: true,
        message: "Login successful",
        sessionToken: loginNextResponse.credentialBundle,
        activity: loginNextResponse.activity,
        apiKeyId: loginNextResponse.apiKeyId,
        organizationId: loginNextResponse.organizationId,
        organizationName: loginNextResponse.organizationName,
        userId: loginNextResponse.userId,
        userName: loginNextResponse.userName,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("OTP login error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to login with OTP",
      },
      { status: 500 }
    );
  }
});
/**
 * List wallets for a specific sub-organization (user)
 */
export const listUserWallets = asyncHandler(async (req?: NextRequest) => {
  // Get subOrgId from params instead of parsing URL
  const subOrgId = (req as any)?.params?.subOrgId;

  console.log("listUserWallets - subOrgId:", subOrgId);

  if (!subOrgId) {
    return NextResponse.json(
      {
        success: false,
        error: "Sub-organization ID is required",
      },
      { status: 400 }
    );
  }

  try {
    const user = await databaseService.getUserByOrganizationId(subOrgId);
    console.log("Found user for listing wallets:", user);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found for this sub-organization",
        },
        { status: 404 }
      );
    }

    const turnkeyWalletsNextResponse = await turnkeyService.listWallets();

    return NextResponse.json(
      {
        success: true,
        subOrganizationId: subOrgId,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
        wallets: (user.wallets ?? []).map((wallet: any) => ({
          id: wallet.id,
          walletId: wallet.walletId,
          walletName: wallet.walletName,
          organizationId: wallet.organizationId,
          accounts: wallet.accounts,
          createdAt: wallet.createdAt,
          exported: wallet.exported,
          imported: wallet.imported,
        })),
        turnkeyWallets: turnkeyWalletsNextResponse.wallets || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("List user wallets error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to retrieve user wallets",
      },
      { status: 500 }
    );
  }
});

export const createRequiredPolicies = asyncHandler(async () => {
  try {
    const orgInfo = await turnkeyService.getOrganization();
    const rootOrgId = orgInfo.organization?.organizationId;

    if (!rootOrgId) {
      return NextResponse.json(
        {
          success: false,
          error: "Could not determine root organization ID",
        },
        { status: 500 }
      );
    }

    const authPolicyNextResponse = await turnkeyService.createPolicy(
      "auth-operations-policy",
      `true`,
      `activity.type in [
        "ACTIVITY_TYPE_INIT_OTP_AUTH", 
        "ACTIVITY_TYPE_OTP_AUTH", 
        "ACTIVITY_TYPE_VERIFY_OTP",
        "ACTIVITY_TYPE_OTP_LOGIN",
        "ACTIVITY_TYPE_EMAIL_AUTH_V2"
      ]`,
      "Policy to allow authentication operations including OTP and email auth"
    );

    const regPolicyNextResponse = await turnkeyService.createPolicy(
      "user-registration-policy",
      `true`,
      `activity.type in [
        "ACTIVITY_TYPE_CREATE_SUB_ORGANIZATION_V7", 
        "ACTIVITY_TYPE_CREATE_USERS_V2", 
        "ACTIVITY_TYPE_CREATE_API_KEYS_V2"
      ]`,
      "Policy for controlling user registration flows"
    );

    const walletPolicyNextResponse = await turnkeyService.createPolicy(
      "wallet-operations-policy",
      `true`,
      `activity.type in [
        "ACTIVITY_TYPE_CREATE_WALLET",
        "ACTIVITY_TYPE_GET_WALLET",
        "ACTIVITY_TYPE_GET_WALLET_BY_ID",
        "ACTIVITY_TYPE_GET_WALLETS",
        "ACTIVITY_TYPE_UPDATE_WALLET",
        "ACTIVITY_TYPE_DELETE_WALLET",
        "ACTIVITY_TYPE_IMPORT_WALLET",
        "ACTIVITY_TYPE_EXPORT_WALLET",
        "ACTIVITY_TYPE_CREATE_WALLET_ACCOUNTS",
        "ACTIVITY_TYPE_SIGN_TRANSACTION",
        "ACTIVITY_TYPE_SIGN_RAW_PAYLOAD",
        "ACTIVITY_TYPE_SIGN_RAW_PAYLOADS"
      ]`,
      "Policy allowing wallet creation and management operations"
    );

    return NextResponse.json(
      {
        success: true,
        message: "All required policies created successfully",
        policies: {
          authPolicy: authPolicyNextResponse?.policyId,
          registrationPolicy: regPolicyNextResponse?.policyId,
          walletPolicy: walletPolicyNextResponse?.policyId,
        },
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Failed to create required policies:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create required policies",
        details:
          "You might need to delete existing policies with similar names first",
      },
      { status: 500 }
    );
  }
});

/**
 * Create a wallet for a specific user (sub-organization)
 */
export const createUserWallet = asyncHandler(async (req?: NextRequest) => {
  // Get subOrgId from params instead of parsing URL
  const subOrgId = (req as any)?.params?.subOrgId;
  const { walletName, accounts } = await req?.json();

  console.log("createUserWallet - subOrgId:", subOrgId);
  console.log("createUserWallet - walletName:", walletName);

  if (!subOrgId || !walletName) {
    return NextResponse.json(
      {
        success: false,
        error: "Sub-organization ID and wallet name are required",
      },
      { status: 400 }
    );
  }

  try {
    const user = await databaseService.getUserByOrganizationId(subOrgId);
    console.log("Found user:", user);

    if (!user) {
      return NextResponse.json(
        {
          success: false,
          error: "User not found for this sub-organization",
        },
        { status: 404 }
      );
    }

    const walletNextResponse = await turnkeyService.createWallet(
      walletName,
      accounts
    );

    const walletId =
      walletNextResponse.activity?.result?.createWalletResult?.walletId;
    const addresses =
      walletNextResponse.activity?.result?.createWalletResult?.addresses || [];

    if (!walletId) {
      throw new Error("Failed to create wallet in Turnkey");
    }

    const dbWallet = await databaseService.createWallet({
      walletId,
      walletName,
      userId: user.id,
      organizationId: subOrgId,
    });

    if (addresses.length > 0) {
      const accountsData = addresses.map((address: string, index: number) => ({
        walletId,
        address,
        path: accounts?.[index]?.path || `m/44'/60'/0'/0/${index}`,
        curve: accounts?.[index]?.curve || "CURVE_SECP256K1",
        pathFormat: accounts?.[index]?.pathFormat || "PATH_FORMAT_BIP32",
        addressFormat:
          accounts?.[index]?.addressFormat || "ADDRESS_FORMAT_ETHEREUM",
        chainId: accounts?.[index]?.chainId || 1,
      }));

      await databaseService.createWalletAccounts(accountsData);

      if (!user.primaryWalletAddress && addresses[0]) {
        await databaseService.updateUser(user.id, {
          primaryWalletAddress: addresses[0],
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        message: "Wallet created successfully",
        subOrganizationId: subOrgId,
        wallet: {
          id: dbWallet.id,
          walletId: dbWallet.walletId,
          walletName: dbWallet.walletName,
          addresses,
          createdAt: dbWallet.createdAt,
        },
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Create user wallet error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to create wallet",
      },
      { status: 500 }
    );
  }
});

export const createRootPolicy = asyncHandler(async () => {
  try {
    const rootPolicyNextResponse = await turnkeyService.createPolicy(
      "root-policy",
      "true",
      "true",
      "Root policy allowing all operations for bootstrapping"
    );

    return NextResponse.json(
      {
        success: true,
        message: "Root policy created successfully",
        policyId: rootPolicyNextResponse?.policyId,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Failed to create root policy:", error);
    return NextResponse.json(
      {
        success: false,
        error: error.message || "Failed to create root policy",
        details: error.stack,
      },
      { status: 500 }
    );
  }
});

export const deleteSession = asyncHandler(async () => {
  try {
    const NextResponse = await turnkeyService.deleteSession();
    console.log("NextResponse", NextResponse);
    return NextResponse.json(
      {
        success: true,
        message: "Session deleted successfully",
      },

      { status: 200 }
    );
  } catch (error) {
    console.error("Delete session error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to delete session",
      },
      { status: 500 }
    );
  }
});

export const listPrivateKeys = asyncHandler(async (req?: NextRequest) => {
  const url = new URL(req?.url || "");
  const pathParts = url.pathname.split("/");
  const subOrgId = pathParts[pathParts.length - 1];

  if (!subOrgId) {
    return NextResponse.json(
      {
        success: false,
        error: "Wallet ID is required",
      },
      { status: 400 }
    );
  }

  try {
    const privateKeysNextResponse =
      await turnkeyService.getPrivateKeys(subOrgId);

    return NextResponse.json(
      {
        success: true,
        message: "Private keys fetched successfully",
        privateKeys: privateKeysNextResponse.privateKeys || [],
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("List private keys error:", error);
    return NextResponse.json(
      {
        success: false,
        error: "Failed to list private keys",
      },
      { status: 500 }
    );
  }
});

/**
 * Execute Mayan Finance swap
 */
export const executeMayanSwap = asyncHandler(async (req?: NextRequest) => {
  const {
    fromChain,
    toChain,
    fromToken,
    toToken,
    amount,
    fromAddress,
    toAddress,
    slippageBps,
  } = await req?.json();

  // Get user's sub-organization ID from request context
  const userOrganizationId = req?.user?.organizationId;

  if (!userOrganizationId) {
    return NextResponse.json(
      {
        success: false,
        error: "User organization context required",
      },
      { status: 401 }
    );
  }

  if (
    !fromChain ||
    !toChain ||
    !fromToken ||
    !toToken ||
    !amount ||
    !fromAddress ||
    !toAddress
  ) {
    return NextResponse.json(
      {
        success: false,
        error: "Missing required swap parameters",
      },
      { status: 400 }
    );
  }

  try {
    const swapResult = await turnkeyService.executeSwap({
      userOrganizationId, // Pass user's sub-org ID
      fromChain,
      toChain,
      fromToken,
      toToken,
      amount,
      fromAddress,
      toAddress,
      slippageBps,
    });

    return NextResponse.json(
      {
        success: true,
        message: "Swap executed successfully",
        result: swapResult,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Mayan swap execution error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Failed to execute swap",
      },
      { status: 500 }
    );
  }
});

export const executeEvmTransaction = asyncHandler(async (req?: NextRequest) => {
  const { transactionRequest, chainId } = await req?.json();

  // Get user's sub-organization ID from request context
  const userOrganizationId = req?.user?.organizationId;

  if (!userOrganizationId) {
    return NextResponse.json(
      {
        success: false,
        error: "User organization context required",
      },
      { status: 401 }
    );
  }

  try {
    const result = await turnkeyService.executeUserTransaction(
      userOrganizationId, // USER'S SUB-ORG
      "evm",
      { transactionRequest, chainId: chainId || 1 }
    );

    return NextResponse.json(
      {
        success: true,
        result,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("EVM transaction error:", error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Transaction failed",
      },
      { status: 500 }
    );
  }
});
