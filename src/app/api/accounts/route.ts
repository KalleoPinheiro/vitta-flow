import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { UserAccount } from "@/domain/auth/user-account";
import { ValidationError } from "@/domain/shared/errors";
import { hashPassword } from "@/lib/auth/password";
import { handleRequest } from "@/lib/api-response";
import { toUserAccountDto } from "@/lib/dto";

const MIN_PASSWORD_LENGTH = 8;

const createSchema = z.object({
  email: z.string().min(3).max(200),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(200),
  professionalId: z.string().max(100).nullish(),
});

export async function GET() {
  return handleRequest(async () => {
    const { userAccounts } = await getRepositories();
    const accounts = await userAccounts.findAll();
    return accounts.map(toUserAccountDto);
  });
}

export async function POST(request: NextRequest) {
  return handleRequest(async () => {
    const body = createSchema.parse(await request.json());
    const { userAccounts, professionals } = await getRepositories();

    const existing = await userAccounts.findByEmail(body.email);
    if (existing) {
      throw new ValidationError("Já existe conta com este email");
    }
    if (body.professionalId) {
      const professional = await professionals.findById(body.professionalId);
      if (!professional) {
        throw new ValidationError("Profissional vinculado não encontrado");
      }
    }

    const account = UserAccount.create({
      email: body.email,
      passwordHash: await hashPassword(body.password),
      professionalId: body.professionalId ?? null,
    });
    await userAccounts.save(account);
    return toUserAccountDto(account);
  });
}
