import { NextRequest } from "next/server";
import { getOtpIdByEmail } from "@/controllers/turnkeycontroller";

export async function POST(request: NextRequest) {
  return getOtpIdByEmail(request);
}
