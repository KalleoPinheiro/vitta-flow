import type { NextRequest } from "next/server";
import { USER_ROLES } from "@/domain/auth/user-role";
import { requirePortalSession } from "@/lib/auth/require-session";
import { ok } from "@/lib/api-response";

/** Identidade da sessão atual — qualquer papel autenticado. */
export async function GET(request: NextRequest) {
  const guard = requirePortalSession(request, USER_ROLES);
  if (!guard.ok) return guard.response;

  return ok({ subject: guard.session.subject, role: guard.session.role });
}
