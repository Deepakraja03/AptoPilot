import { createRootPolicy } from "@/controllers/turnkeycontroller";

export async function POST() {
  return createRootPolicy();
}