import { NextRequest } from "next/server";
import { exportWallet } from "@/controllers/turnkeycontroller";

export async function POST(request: NextRequest) {
  return exportWallet(request);
}