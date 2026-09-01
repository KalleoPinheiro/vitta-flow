import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { IssueAuthToken } from "@/application/auth/auth-token-flow";
import { appUrlFromEnv } from "@/application/auth/send-invite";
import { RateLimiter } from "@/lib/auth/rate-limit";
import { clientIp } from "@/lib/auth/client-ip";
import { fail, ok } from "@/lib/api-response";

/** Mesmo limite do login: a rota é um oráculo em potencial se puder ser martelada. */
const FORGOT_RATE_LIMIT = new RateLimiter(5, 60_000);

const schema = z.object({
  email: z.string().min(3).max(200),
});

/**
 * Resposta única, sempre a mesma: conta existente, inexistente ou desativada
 * produzem exatamente este corpo. Qualquer diferença (status, texto, tempo de
 * resposta perceptível) transformaria a rota num verificador de e-mails.
 */
const NEUTRAL_RESPONSE = {
  message: "Se houver uma conta com este e-mail, enviamos um link para redefinir a senha.",
};

export async function POST(request: NextRequest) {
  if (!FORGOT_RATE_LIMIT.allow(clientIp(request))) {
    return fail("Muitas tentativas, aguarde um minuto", 429);
  }

  const parsed = schema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return ok(NEUTRAL_RESPONSE);
  }

  // Deliberadamente NÃO aguardado: esperar a emissão + o POST ao provedor de
  // e-mail deixaria a resposta do caso "conta existe" mensuravelmente mais lenta
  // que a do caso "não existe", e o corpo idêntico não adiantaria nada — o
  // relógio viraria o oráculo (CWE-204). O envio segue em background e qualquer
  // falha vai para o log, nunca para a resposta.
  void issueResetLink(parsed.data.email);

  return ok(NEUTRAL_RESPONSE);
}

async function issueResetLink(email: string): Promise<void> {
  try {
    // clinicId nulo: quem pede o reset não tem sessão, logo não há empresa de contexto.
    const services = await getRepositories({ clinicId: null });
    const account = await services.userAccounts.findByEmail(email);
    if (!account?.isActive) {
      return;
    }
    await new IssueAuthToken(services.authTokens, services.email).execute({
      account,
      purpose: "reset",
      appUrl: appUrlFromEnv(),
    });
  } catch (error) {
    console.error("Reset de senha: falha ao emitir o link", error);
  }
}
