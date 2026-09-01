import type { UserAccount } from "@/domain/auth/user-account";
import type { AuthTokenRepository } from "@/domain/auth/auth-token";
import type { EmailGateway } from "@/application/ports/email-gateway";
import { IssueAuthToken } from "./auth-token-flow";

export interface InviteServices {
  authTokens: AuthTokenRepository;
  email: EmailGateway;
}

/** Base pública da aplicação; sem APP_URL o link do e-mail não é clicável fora do host. */
export const appUrlFromEnv = (): string => process.env.APP_URL ?? "http://localhost:3000";

/**
 * Dispara o convite de primeiro acesso sem deixar a indisponibilidade do
 * provedor de e-mail derrubar o cadastro: a conta permanece criada e o convite
 * pode ser reemitido pelo fluxo de "esqueci minha senha".
 */
export async function sendInvite(services: InviteServices, account: UserAccount): Promise<void> {
  try {
    await new IssueAuthToken(services.authTokens, services.email).execute({
      account,
      purpose: "invite",
      appUrl: appUrlFromEnv(),
    });
  } catch (error) {
    console.error(`Convite: falha ao enviar e-mail para ${account.email}`, error);
  }
}
