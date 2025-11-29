import { NextRequest } from "next/server";
import { createReadWriteSession } from "@/controllers/turnkeycontroller";

export async function POST(request: NextRequest) {
  return createReadWriteSession(request);
}