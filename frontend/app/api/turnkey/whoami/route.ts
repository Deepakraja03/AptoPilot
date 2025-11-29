import { NextRequest } from "next/server";
import { getWhoami } from "@/controllers/turnkeycontroller";

export async function GET(request: NextRequest) {
  return getWhoami(request);
}
