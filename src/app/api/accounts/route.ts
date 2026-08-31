import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { ValidationError } from "@/domain/shared/errors";
import { USER_ROLES } from "@/domain/auth/user-role";
import { CreateAccount } from "@/application/auth/create-account";
import { hashPassword } from "@/lib/auth/password";
import { handleRequest } from "@/lib/api-response";
import { toUserAccountDto } from "@/lib/dto";
import { requireStaffSession } from "@/lib/auth/require-session";
import { LEGACY_CLINIC_ID } from "@/infrastructure/persistence/drizzle/legacy-clinic";

const MIN_PASSWORD_LENGTH = 8;

const createSchema = z.object({
  email: z.string().min(3).max(200),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(200),
  role: z.enum(USER_ROLES),
  // Só super_admin (clinicId de sessão nulo) pode/precisa escolher a empresa-alvo.
  clinicId: z.string().max(100).nullish(),
  professionalId: z.string().max(100).nullish(),
});

export async function GET(request: NextRequest) {
  const guard = requireStaffSession(request);
  if (!guard.ok) return guard.response;

  return handleRequest(async () => {
    const { userAccounts } = await getRepositories({
      clinicId: guard.session?.clinicId ?? null,
    });
    const accounts = await userAccounts.findAll();
    return accounts.map(toUserAccountDto);
  });
}

export async function POST(request: NextRequest) {
  const guard = requireStaffSession(request);
  if (!guard.ok) return guard.response;

  return handleRequest(async () => {
    const body = createSchema.parse(await request.json());
    // "Modo aberto" (sem autenticação configurada) equivale ao acesso total de
    // antes — trata a chamada como super_admin, exigindo clinicId explícito.
    const actor = guard.session
      ? { role: guard.session.role, clinicId: guard.session.clinicId }
      : { role: "super_admin" as const, clinicId: null };

    const targetClinicId =
      actor.role === "super_admin"
        ? (body.clinicId ?? LEGACY_CLINIC_ID)
        : (actor.clinicId ?? LEGACY_CLINIC_ID);

    const { userAccounts, professionals } = await getRepositories({ clinicId: targetClinicId });

    if (body.professionalId) {
      const professional = await professionals.findById(body.professionalId);
      if (!professional) {
        throw new ValidationError("Profissional vinculado não encontrado");
      }
    }

    const account = await new CreateAccount(userAccounts).execute(actor, {
      email: body.email,
      passwordHash: await hashPassword(body.password),
      role: body.role,
      clinicId: targetClinicId,
      professionalId: body.professionalId ?? null,
    });
    return toUserAccountDto(account);
  });
}
