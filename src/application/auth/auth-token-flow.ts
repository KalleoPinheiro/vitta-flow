import { AuthToken, hashAuthTokenSecret, type AuthTokenPurpose } from "@/domain/auth/auth-token";
import type { AuthTokenRepository } from "@/domain/auth/auth-token";
import type { UserAccount, UserAccountRepository } from "@/domain/auth/user-account";
import type { EmailGateway } from "@/application/ports/email-gateway";
import { ValidationError } from "@/domain/shared/errors";
import { hashPassword } from "@/lib/auth/password";

/**
 * Mensagem única para link inexistente, expirado, já usado ou de conta inativa.
 * Distinguir os casos revelaria a quem tem o link se ele já foi usado por outra
 * pessoa, ou se um endereço corresponde a uma conta.
 */
export const INVALID_TOKEN_MESSAGE = "Link inválido ou expirado — solicite um novo";

export const MIN_PASSWORD_LENGTH = 8;

const SUBJECT_BY_PURPOSE: Record<AuthTokenPurpose, string> = {
  invite: "VittaFlow — defina sua senha de acesso",
  reset: "VittaFlow — redefinição de senha",
};

const INTRO_BY_PURPOSE: Record<AuthTokenPurpose, string> = {
  invite:
    "Sua conta no VittaFlow foi criada. Use o link abaixo para definir sua senha e acessar o sistema pela primeira vez.",
  reset:
    "Recebemos um pedido de redefinição de senha para sua conta no VittaFlow. Use o link abaixo para definir uma nova senha.",
};

const VALIDITY_BY_PURPOSE: Record<AuthTokenPurpose, string> = {
  invite: "O link vale por 24 horas e só pode ser usado uma vez.",
  reset: "O link vale por 1 hora e só pode ser usado uma vez.",
};

export interface IssueAuthTokenInput {
  account: UserAccount;
  purpose: AuthTokenPurpose;
  /** Base pública da aplicação (APP_URL) — compõe o link do e-mail. */
  appUrl: string;
  nowMs?: number;
}

/**
 * Emite um token de convite ou reset e envia o link por e-mail. Emitir invalida
 * os tokens anteriores não usados do mesmo propósito: pedir o link três vezes
 * não pode deixar três links vivos ao mesmo tempo.
 */
export class IssueAuthToken {
  constructor(
    private readonly tokens: AuthTokenRepository,
    private readonly email: EmailGateway,
  ) {}

  /** Devolve o link gerado — o chamador decide se ele pode ser exposto. */
  async execute(input: IssueAuthTokenInput): Promise<string> {
    const nowMs = input.nowMs ?? Date.now();
    await this.tokens.markAllUnusedAsUsed(input.account.id, input.purpose, new Date(nowMs));

    const { token, secret } = AuthToken.issue({
      accountId: input.account.id,
      purpose: input.purpose,
      nowMs,
    });
    await this.tokens.save(token);

    const base = input.appUrl.replace(/\/$/, "");
    const link = `${base}/definir-senha?token=${secret}`;
    await this.email.send({
      to: input.account.email,
      subject: SUBJECT_BY_PURPOSE[input.purpose],
      text: `${INTRO_BY_PURPOSE[input.purpose]}\n\n${link}\n\n${VALIDITY_BY_PURPOSE[input.purpose]}`,
    });
    return link;
  }
}

export interface ConsumeAuthTokenInput {
  /** Segredo vindo do link (`?token=`) — nunca o hash. */
  secret: string;
  newPassword: string;
  nowMs?: number;
}

/** Consome um token de uso único e grava a nova senha da conta correspondente. */
export class ConsumeAuthToken {
  constructor(
    private readonly tokens: AuthTokenRepository,
    private readonly accounts: UserAccountRepository,
  ) {}

  async execute(input: ConsumeAuthTokenInput): Promise<void> {
    if (input.newPassword.length < MIN_PASSWORD_LENGTH) {
      throw new ValidationError(`A senha precisa ter ao menos ${MIN_PASSWORD_LENGTH} caracteres`);
    }
    const nowMs = input.nowMs ?? Date.now();
    const token = await this.tokens.findUsableBySecretHash(
      hashAuthTokenSecret(input.secret),
      nowMs,
    );
    if (!token) {
      throw new ValidationError(INVALID_TOKEN_MESSAGE);
    }

    const account = await this.accounts.findById(token.accountId);
    if (!account || !account.isActive) {
      throw new ValidationError(INVALID_TOKEN_MESSAGE);
    }

    await this.accounts.updatePasswordHash(account.id, await hashPassword(input.newPassword));
    // Invalida os irmãos do mesmo propósito antes de marcar este como usado:
    // consumir um link precisa queimar todos os outros por conta própria, sem
    // depender da invariante de que a emissão já os invalidou.
    await this.tokens.markAllUnusedAsUsed(account.id, token.purpose, new Date(nowMs));
    await this.tokens.save(token.markUsed(new Date(nowMs)));
  }
}
