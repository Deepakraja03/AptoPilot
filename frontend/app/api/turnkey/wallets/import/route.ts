import { NextRequest } from "next/server";
import { importWallet } from "@/controllers/turnkeycontroller";

export async function POST(request: NextRequest) {
  return importWallet(request);
}