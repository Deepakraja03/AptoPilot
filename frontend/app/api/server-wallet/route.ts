import { NextResponse } from "next/server";
import { Keypair } from "@solana/web3.js";
import bs58 from "bs58";

// Get the server keypair (same function as in swap API)
const getServerKeypair = () => {
  const privateKeyString = process.env.NEXT_PUBLIC_DEVNET_PRIVATE_KEY;
  if (!privateKeyString) {
    throw new Error(
      "NEXT_PUBLIC_DEVNET_PRIVATE_KEY not found in environment variables"
    );
  }

  try {
    const privateKeyBytes = bs58.decode(privateKeyString);
    return Keypair.fromSecretKey(privateKeyBytes);
  } catch {
    // If base58 fails, try as JSON array
    try {
      const privateKeyArray = JSON.parse(privateKeyString);
      return Keypair.fromSecretKey(new Uint8Array(privateKeyArray));
    } catch {
      throw new Error(
        "Invalid private key format. Must be base58 string or JSON array"
      );
    }
  }
};

export async function GET() {
  try {
    const serverKeypair = getServerKeypair();
    const publicKey = serverKeypair.publicKey.toString();

    return NextResponse.json({
      success: true,
      publicKey: publicKey,
    });
  } catch (error) {
    console.error("Server wallet API error:", error);
    return NextResponse.json(
      { error: "Failed to get server wallet address" },
      { status: 500 }
    );
  }
}
