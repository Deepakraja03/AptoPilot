/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest } from "next/server";
import { deleteApiKey } from "@/controllers/turnkeycontroller";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string; apiKeyId: string }> }
) {
  const { userId, apiKeyId } = await params;
  (request as any).params = { userId, apiKeyId };
  return deleteApiKey(request);
}
