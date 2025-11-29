import { getTurnkeyStatus } from "@/controllers/turnkeycontroller";

export async function GET() {
  return getTurnkeyStatus();
}