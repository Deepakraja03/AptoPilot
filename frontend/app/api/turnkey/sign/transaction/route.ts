import { NextRequest } from "next/server";
import { signTransaction } from "@/controllers/turnkeycontroller";

export async function POST(request: NextRequest) {
  return signTransaction(request);
}