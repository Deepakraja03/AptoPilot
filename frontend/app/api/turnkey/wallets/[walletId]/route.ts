/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest } from "next/server";
import {
  getWallet,
  updateWallet,
  deleteWallet,
} from "@/controllers/turnkeycontroller";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ walletId: string }> }
) {
  const { walletId } = await params;
  (request as any).params = { walletId };
  return getWallet(request);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ walletId: string }> }
) {
  const { walletId } = await params;
  (request as any).params = { walletId };
  return updateWallet(request);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ walletId: string }> }
) {
  const { walletId } = await params;
  (request as any).params = { walletId };
  return deleteWallet(request);
}
