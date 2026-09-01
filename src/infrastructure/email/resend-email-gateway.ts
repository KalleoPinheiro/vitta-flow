import {
  NullEmailGateway,
  type EmailGateway,
  type EmailMessage,
} from "@/application/ports/email-gateway";

export interface ResendConfig {
  apiKey: string;
  /** Remetente no formato aceito pelo provedor: "Nome <endereco@dominio>" ou só o endereço. */
  from: string;
}

const RESEND_API_URL = "https://api.resend.com/emails";
const REQUEST_TIMEOUT_MS = 10_000;

/**
 * E-mail transacional via API HTTP do Resend (convite e reset de senha).
 * Sem SDK: a chamada é um POST JSON, mesmo molde do `MetaWhatsAppGateway`.
 */
export class ResendEmailGateway implements EmailGateway {
  readonly enabled = true;

  constructor(private readonly config: ResendConfig) {}

  async send(message: EmailMessage): Promise<void> {
    const response = await fetch(RESEND_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.config.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: this.config.from,
        to: [message.to],
        subject: message.subject,
        text: message.text,
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      throw new Error(`Resend API ${response.status}: ${body.slice(0, 300)}`);
    }
  }
}

export function resendConfigFromEnv(): ResendConfig | null {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!apiKey || !from) {
    return null;
  }
  return { apiKey, from };
}

/**
 * Fail-closed em produção: sem credenciais, convite e reset ficariam mudos e
 * ninguém conseguiria o primeiro acesso — então a falha é explícita na
 * construção, não um dry-run silencioso. Fora de produção o gateway nulo é o
 * caminho normal de dev/teste (mesma convenção do canal de WhatsApp).
 */
export function buildEmailGateway(): EmailGateway {
  const config = resendConfigFromEnv();
  if (config) {
    return new ResendEmailGateway(config);
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "E-mail transacional não configurado: defina RESEND_API_KEY e EMAIL_FROM " +
        "(convite e reset de senha dependem deles)",
    );
  }
  return new NullEmailGateway();
}
