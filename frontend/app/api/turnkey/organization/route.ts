import { getOrganizationInfo } from "@/controllers/turnkeycontroller";

export async function GET() {
  return getOrganizationInfo();
}
