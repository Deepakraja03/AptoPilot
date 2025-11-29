import { NextRequest, NextResponse } from "next/server";
import { customWallet } from "@/config/turnkey";
import turnkeyService from "@/lib/services/turnkey/index";
import databaseService from "@/lib/services/firebase/database";

export async function POST(request: NextRequest) {
  try {
    const { walletAddress, publicKey, walletType, createSubOrgParams } =
      await request.json();

    if (!walletAddress || !publicKey) {
      return NextResponse.json(
        { error: "Wallet address and public key are required" },
        { status: 400 }
      );
    }

    // Try to find existing user by wallet email format
    const walletEmail = `${walletAddress.toLowerCase()}@wallet.intentifi.com`;
    let existingUser;
    try {
      existingUser = await databaseService.getUserByWallet(walletEmail);
    } catch {
      console.log("No existing user found, will create new one");
    }

    let userData;

    if (existingUser && existingUser.organizationId) {
      // User exists, return existing user data
      userData = {
        userId: existingUser.turnkeyUserId,
        organizationId: existingUser.organizationId,
        session: null, // Session will be created by the client-side Turnkey provider
        username: existingUser.username,
        email: existingUser.email,
      };
    } else {
      // Create new sub-organization for wallet user
      try {
        const username = `wallet-${walletAddress.slice(0, 8)}`;
        const email = `${walletAddress.toLowerCase()}@wallet.intentifi.com`;

        // Create sub-organization with wallet configuration
        const uniqueWalletName = `${walletType === "solana" ? "Solana" : "EVM"}-${walletAddress.slice(0, 8)}-${Date.now()}`;
        const walletConfig = createSubOrgParams?.customWallet || {
          ...customWallet,
          walletName: uniqueWalletName,
          walletAccounts:
            walletType === "solana"
              ? [
                  {
                    curve: "CURVE_ED25519" as const,
                    pathFormat: "PATH_FORMAT_BIP32" as const,
                    path: "m/44'/501'/0'/0'",
                    addressFormat: "ADDRESS_FORMAT_SOLANA" as const,
                  },
                ]
              : customWallet.walletAccounts,
        };

        const subOrgResponse = await turnkeyService.createSubOrganization(
          `${username}-org`,
          [
            {
              userName: username,
              userEmail: email,
              apiKeys: [
                {
                  apiKeyName: "Wallet Auth Key",
                  publicKey,
                  curveType:
                    walletType === "solana"
                      ? "API_KEY_CURVE_ED25519"
                      : "API_KEY_CURVE_SECP256K1",
                },
              ],
              authenticators: [],
              oauthProviders: [],
              userTags: [],
            },
          ],
          1
        );

        const subOrgId = subOrgResponse.subOrganizationId;
        const turnkeyUserId = subOrgResponse.rootUserIds?.[0];

        if (!subOrgId || !turnkeyUserId) {
          throw new Error("Failed to create sub-organization");
        }

        // Create wallet in the sub-organization
        const walletResponse = await turnkeyService.createWallet(
          walletConfig.walletName,
          walletConfig.walletAccounts
        );

        const walletId = walletResponse.wallet.walletId;

        if (!walletId) {
          throw new Error("Failed to create wallet in sub-organization");
        }

        // Create user in database
        const dbUser = await databaseService.createUser({
          username,
          email,
          organizationId: subOrgId,
          turnkeyUserId,
          walletAddress,
          primaryWalletAddress: walletAddress,
          connectedWallets: [walletAddress],
        });

        // Create wallet record in database
        await databaseService.createWallet({
          walletId,
          walletName: walletConfig.walletName,
          userId: dbUser.id,
          organizationId: subOrgId,
        });

        userData = {
          userId: turnkeyUserId,
          organizationId: subOrgId,
          session: null, // Session will be created by the client-side Turnkey provider
          username: dbUser.username,
          email: dbUser.email,
        };
      } catch (error) {
        console.error("Failed to create sub-organization:", error);
        return NextResponse.json(
          { error: "Failed to create wallet account" },
          { status: 500 }
        );
      }
    }

    // Return user data
    return NextResponse.json({
      success: true,
      userId: userData.userId,
      organizationId: userData.organizationId,
      session: userData.session,
      username: userData.username,
      email: userData.email,
      walletAddress,
      walletType,
    });
  } catch (error) {
    console.error("Wallet authentication error:", error);
    return NextResponse.json(
      { error: "Internal server error during wallet authentication" },
      { status: 500 }
    );
  }
}
