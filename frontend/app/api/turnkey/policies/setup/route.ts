import { createRequiredPolicies } from "@/controllers/turnkeycontroller";

export async function POST() {
  return createRequiredPolicies();
}