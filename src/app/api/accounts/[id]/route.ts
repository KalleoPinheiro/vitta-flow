import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { NotFoundError } from "@/domain/shared/errors";
import { hashPassword } from "@/lib/auth/password";
import { handleRequest } from "@/lib/api-response";
import { toUserAccountDto } from "@/lib/dto";

const updateSchema = z.object({
  active: z.boolean().optional(),
  password: z.string().min(8).max(200).optional(),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function PATCH(request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const body = updateSchema.parse(await request.json());
    const { userAccounts } = await getRepositories();

    const all = await userAccounts.findAll();
    const existing = all.find((account) => account.id === id);
    if (!existing) {
      throw new NotFoundError("Conta", id);
    }

    let updated = existing;
    if (body.password) {
      updated = updated.withPasswordHash(await hashPassword(body.password));
    }
    if (body.active === true) updated = updated.reactivate();
    if (body.active === false) updated = updated.deactivate();

    await userAccounts.save(updated);
    return toUserAccountDto(updated);
  });
}
