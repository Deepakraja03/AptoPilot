import { NextRequest } from "next/server";
import { emailAuth } from "@/controllers/turnkeycontroller";

export async function POST(request: NextRequest) {
  return emailAuth(request);
}