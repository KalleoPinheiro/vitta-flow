import type { NextRequest } from "next/server";
import { getRequestSession } from "@/lib/auth/request-session";
import { fail, ok } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  const session = getRequestSession(request);
  if (!session) {
    return fail("Não autenticado", 401);
  }
  return ok({ subject: session.subject, role: session.role });
}
