import { NextRequest } from "next/server";
import { otpLogin } from "@/controllers/turnkeycontroller";

export async function POST(request: NextRequest) {
  return otpLogin(request);
}