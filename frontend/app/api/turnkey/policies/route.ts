import { NextRequest } from "next/server";
import { getPolicies, createPolicy } from "@/controllers/turnkeycontroller";

export async function GET() {
  return getPolicies();
}

export async function POST(request: NextRequest) {
  return createPolicy(request);
}