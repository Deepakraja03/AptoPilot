import { NextRequest } from "next/server";
import { getUsers, createUser } from "@/controllers/turnkeycontroller";

export async function GET() {
  return getUsers();
}

export async function POST(request: NextRequest) {
  return createUser(request);
}
