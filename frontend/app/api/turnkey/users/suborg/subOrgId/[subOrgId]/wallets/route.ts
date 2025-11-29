/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest } from "next/server";
import {
  listUserWallets,
  createUserWallet,
} from "@/controllers/turnkeycontroller";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ subOrgId: string }> }
) {
  const { subOrgId } = await params;
  (request as any).params = { subOrgId };
  return listUserWallets(request);
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ subOrgId: string }> }
) {
  const { subOrgId } = await params;
  (request as any).params = { subOrgId };
  return createUserWallet(request);
}
