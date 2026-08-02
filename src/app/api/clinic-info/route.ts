import type { NextRequest } from "next/server";
import { getClinicInfo } from "@/lib/clinic-info";
import { handleRequest } from "@/lib/api-response";
import { requireStaffSession } from "@/lib/auth/require-session";

export async function GET(request: NextRequest) {
  const guard = requireStaffSession(request);
  if (!guard.ok) return guard.response;

  return handleRequest(async () => getClinicInfo());
}
