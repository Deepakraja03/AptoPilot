/* eslint-disable @typescript-eslint/no-explicit-any */

import { NextRequest } from "next/server";
import {
  getUser,
  updateUser,
  deleteUser,
} from "@/controllers/turnkeycontroller";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  (request as any).params = { userId };
  return getUser(request);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  (request as any).params = { userId };
  return updateUser(request);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params;
  (request as any).params = { userId };
  return deleteUser(request);
}
