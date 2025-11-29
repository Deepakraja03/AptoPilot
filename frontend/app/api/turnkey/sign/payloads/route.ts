import { NextRequest } from "next/server";
import { signMultiplePayloads } from "@/controllers/turnkeycontroller";

export async function POST(request: NextRequest) {
  return signMultiplePayloads(request);
}