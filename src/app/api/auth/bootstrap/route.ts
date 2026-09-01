import { timingSafeEqual } from "node:crypto";
import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { UserAccount } from "@/domain/auth/user-account";
import { UNSET_PASSWORD_HASH } from "@/lib/auth/password";
import { IssueAuthToken } from "@/application/auth/auth-token-flow";
import { appUrlFromEnv } from "@/application/auth/send-invite";
import { RateLimiter } from "@/lib/auth/rate-limit";
import { clientIp } from "@/lib/auth/client-ip";
import { fail, handleRequest } from "@/lib/api-response";

const BOOTSTRAP_RATE_LIMIT = new RateLimiter(5, 60_000);

export const BOOTSTRAP_TOKEN_HEADER = "x-bootstrap-token";
/** Mensagem única para segredo errado e para instalação já inicializada. */
export const BOOTSTRAP_UNAVAILABLE_MESSAGE = "Bootstrap indisponível";

const schema = z.object({
  email: z.string().min(3).max(200),
});

function secretMatches(expected: string, provided: string): boolean {
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return (
    expectedBuffer.length === providedBuffer.length &&
    timingSafeEqual(expectedBuffer, providedBuffer)
  );
}

function hasValidBootstrapToken(request: NextRequest): boolean {
  const expected = process.env.VITTA_BOOTSTRAP_TOKEN;
  const provided = request.headers.get(BOOTSTRAP_TOKEN_HEADER);
  return Boolean(expected) && Boolean(provided) && secretMatches(expected!, provided!);
}

/**
 * Cria a PRIMEIRA conta Super Admin de uma instalação nova. Sem allowlist e
 * sem senha mestre, é o único caminho de primeiro acesso — e por isso tem duas
 * guardas independentes:
 *
 *  1. `VITTA_BOOTSTRAP_TOKEN` (header `x-bootstrap-token`) — segredo de deploy;
 *     ausente ou incorreto, a rota não faz nada. Fail-closed.
 *  2. Zero contas na instalação — depois da primeira conta a rota deixa de
 *     funcionar para sempre, mesmo com o segredo correto.
 *
 * A conta nasce sem senha usável: quem define a senha é a própria pessoa, pelo
 * convite enviado por e-mail — igual a qualquer outra conta.
 */
export async function POST(request: NextRequest) {
  if (!BOOTSTRAP_RATE_LIMIT.allow(clientIp(request))) {
    return fail("Muitas tentativas, aguarde um minuto", 429);
  }
  if (!hasValidBootstrapToken(request)) {
    return fail(BOOTSTRAP_UNAVAILABLE_MESSAGE, 403);
  }

  // clinicId nulo: o Super Admin é papel de sistema, sem empresa própria.
  const services = await getRepositories({ clinicId: null });
  if (await services.userAccounts.hasAnyAccount()) {
    return fail(BOOTSTRAP_UNAVAILABLE_MESSAGE, 403);
  }

  return handleRequest(async () => {
    const body = schema.parse(await request.json());
    const account = UserAccount.create({
      email: body.email,
      passwordHash: UNSET_PASSWORD_HASH,
      role: "super_admin",
      clinicId: null,
    });
    await services.userAccounts.save(account);
    const inviteUrl = await new IssueAuthToken(services.authTokens, services.email).execute({
      account,
      purpose: "invite",
      appUrl: appUrlFromEnv(),
    });
    return {
      email: account.email,
      role: account.role,
      // Sem canal de e-mail (dev, testes, `NullEmailGateway`) o link não chega a
      // lugar nenhum — devolvê-lo aqui é o que torna o bootstrap utilizável
      // nesses ambientes. Em produção o gateway falha na inicialização quando
      // não há credenciais, então `enabled` é sempre true e o campo vem nulo.
      inviteUrl: services.email.enabled ? null : inviteUrl,
    };
  });
}
