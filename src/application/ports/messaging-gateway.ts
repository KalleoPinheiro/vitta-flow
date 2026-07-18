export interface MessagingGateway {
  /** false = canal desativado (sem credenciais) — chamador trata como "pulado". */
  readonly enabled: boolean;
  /** Envia texto para o telefone (formato E.164 ou nacional BR). Lança em falha de API. */
  sendText(phone: string, message: string): Promise<void>;
}

/** Canal desativado: loga o que enviaria (dry-run) e nunca falha. */
export class NullMessagingGateway implements MessagingGateway {
  readonly enabled = false;

  async sendText(phone: string, message: string): Promise<void> {
    console.info(`[mensageria desativada] Para ${phone}: ${message}`);
  }
}
