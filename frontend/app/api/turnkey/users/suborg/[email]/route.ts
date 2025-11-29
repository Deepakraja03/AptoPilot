/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server";
import { getUserSubOrgByEmail } from "@/controllers/turnkeycontroller";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ email: string }> }
) {
  const { email } = await params;
  // Add email to request for controller access
  (request as any).params = { email };
  return getUserSubOrgByEmail(request);
}
