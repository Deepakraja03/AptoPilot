import { NextRequest } from "next/server";
import { signRawPayload } from "@/controllers/turnkeycontroller";

export async function POST(request: NextRequest) {
  return signRawPayload(request);
}