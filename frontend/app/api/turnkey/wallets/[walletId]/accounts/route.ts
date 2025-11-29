/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import {
  getWalletAccounts,
  createWalletAccount,
} from "@/controllers/turnkeycontroller";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ walletId: string }> }
) {
  const { walletId } = await params;
  (request as any).params = { walletId };
  return getWalletAccounts(request);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ walletId: string }> }
) {
  const { walletId } = await params;
  (request as any).params = { walletId };
  return createWalletAccount(request);
}
