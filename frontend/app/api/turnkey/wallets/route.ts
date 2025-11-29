import { NextRequest } from "next/server";
import { listWallets, createWallet } from "@/controllers/turnkeycontroller";

export async function GET() {
  return listWallets();
}

export async function POST(request: NextRequest) {
  return createWallet(request);
}