import { NextRequest } from "next/server";
import { verifyOtp } from "@/controllers/turnkeycontroller";

export async function POST(request: NextRequest) {
  return verifyOtp(request);
}
