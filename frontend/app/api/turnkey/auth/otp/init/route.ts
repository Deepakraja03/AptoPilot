import { NextRequest } from "next/server";
import { initOtpAuth } from "@/controllers/turnkeycontroller";

export async function POST(request: NextRequest) {
  return initOtpAuth(request);
}