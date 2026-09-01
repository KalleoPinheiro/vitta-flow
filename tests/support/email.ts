import { vi, type MockInstance } from "vitest";

/**
 * A suíte roda sem credenciais de e-mail, então o container monta o
 * `NullEmailGateway` — que, por contrato (AUTH-01), registra em log o que
 * enviaria. Capturar esse log é o jeito de observar o e-mail sem enviar nada,
 * equivalente ao dry-run já usado pelo canal de WhatsApp.
 */
export interface EmailSpy {
  /** Corpos registrados, na ordem de envio. */
  readonly bodies: string[];
  restore(): void;
}

export function spyOnSentEmails(): EmailSpy {
  const bodies: string[] = [];
  const spy: MockInstance = vi.spyOn(console, "info").mockImplementation((...args: unknown[]) => {
    const line = String(args[0] ?? "");
    if (line.startsWith("[e-mail desativado]")) {
      bodies.push(line);
    }
  });
  return {
    bodies,
    restore: () => spy.mockRestore(),
  };
}

/** Extrai o segredo do link `/definir-senha?token=…` do último e-mail capturado. */
export function tokenFromLastEmail(spy: EmailSpy): string {
  const last = spy.bodies[spy.bodies.length - 1];
  const match = last?.match(/definir-senha\?token=([\w-]+)/);
  if (!match) {
    throw new Error(`Nenhum link de definição de senha no último e-mail: ${last ?? "(nenhum)"}`);
  }
  return match[1];
}
