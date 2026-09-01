import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { ConsumeAuthToken, MIN_PASSWORD_LENGTH } from "@/application/auth/auth-token-flow";
import { RateLimiter } from "@/lib/auth/rate-limit";
import { clientIp } from "@/lib/auth/client-ip";
import { fail, handleRequest } from "@/lib/api-response";

/** Mesmo limite do login: adivinhar um token é força bruta como qualquer outra. */
const SET_PASSWORD_RATE_LIMIT = new RateLimiter(5, 60_000);

const schema = z.object({
  token: z.string().min(1).max(400),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(200),
});

/**
 * Define a senha a partir de um link de convite ou de reset. Rota pública por
 * natureza: quem a usa ainda não tem sessão — a autorização é o token de uso
 * único, não um cookie.
 */
export async function POST(request: NextRequest) {
  if (!SET_PASSWORD_RATE_LIMIT.allow(clientIp(request))) {
    return fail("Muitas tentativas, aguarde um minuto", 429);
  }

  return handleRequest(async () => {
    const body = schema.parse(await request.json());
    // clinicId nulo: o consumo acontece antes da sessão, sem empresa de contexto.
    const { authTokens, userAccounts } = await getRepositories({ clinicId: null });
    await new ConsumeAuthToken(authTokens, userAccounts).execute({
      secret: body.token,
      newPassword: body.password,
    });
    return { ok: true };
  });
}
