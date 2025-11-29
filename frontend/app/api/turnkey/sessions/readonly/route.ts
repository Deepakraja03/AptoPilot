import { NextRequest } from "next/server";
import { createReadOnlySession } from "@/controllers/turnkeycontroller";

export async function POST(request: NextRequest) {
  return createReadOnlySession(request);
}