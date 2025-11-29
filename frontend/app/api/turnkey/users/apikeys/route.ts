import { NextRequest } from "next/server";
import { createApiKey } from "@/controllers/turnkeycontroller";

export async function POST(request: NextRequest) {
  return createApiKey(request);
}
