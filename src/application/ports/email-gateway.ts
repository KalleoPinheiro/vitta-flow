export interface EmailMessage {
  /** Destinatário único — convite e reset são sempre 1:1 com uma conta. */
  to: string;
  subject: string;
  /** Corpo em texto puro; o link é a única informação essencial. */
  text: string;
}

export interface EmailGateway {
  /** false = canal desativado (sem credenciais) — chamador trata como "pulado". */
  readonly enabled: boolean;
  /** Envia a mensagem. Lança em falha de API. */
  send(message: EmailMessage): Promise<void>;
}

/** Canal desativado: loga o que enviaria (dry-run) e nunca falha. */
export class NullEmailGateway implements EmailGateway {
  readonly enabled = false;

  async send(message: EmailMessage): Promise<void> {
    console.info(
      `[e-mail desativado] Para ${message.to} — ${message.subject}\n${message.text}`,
    );
  }
}
