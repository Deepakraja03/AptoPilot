import { NextRequest } from "next/server";
import { registerUser } from "@/controllers/turnkeycontroller";

export async function POST(request: NextRequest) {
  return registerUser(request);
}