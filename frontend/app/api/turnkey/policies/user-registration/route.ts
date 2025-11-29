import { NextRequest } from "next/server";
import { createUserRegistrationPolicy } from "@/controllers/turnkeycontroller";

export async function POST(request: NextRequest) {
  return createUserRegistrationPolicy(request);
}
