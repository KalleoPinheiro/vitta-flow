import type { AppointmentRepository } from "@/domain/scheduling/appointment-repository";
import type { InvoiceRepository } from "@/domain/billing/invoice-repository";
import type { FollowUpRepository } from "@/domain/followup/follow-up-repository";
import type { SessionPackageRepository } from "@/domain/billing/package";

/**
 * Repositórios disponíveis dentro de uma transação — escopo enxuto, apenas o
 * que a conclusão de consulta usa (YAGNI); cresce quando outro fluxo precisar.
 */
export interface TransactionScope {
  appointments: AppointmentRepository;
  invoices: InvoiceRepository;
  followUps: FollowUpRepository;
  sessionPackages: SessionPackageRepository;
}

/**
 * Unidade de trabalho (P1 histórico do projeto): executa `fn` com repositórios
 * transacionais — tudo persiste ou nada persiste.
 */
export interface TransactionManager {
  run<T>(fn: (repos: TransactionScope) => Promise<T>): Promise<T>;
}

/**
 * Implementação sem transação real (in-memory/testes, CONS2-03): executa a
 * função com os repositórios existentes. Mantém os testes de unidade puros.
 */
export class NoTransactionManager implements TransactionManager {
  constructor(private readonly repos: TransactionScope) {}

  async run<T>(fn: (repos: TransactionScope) => Promise<T>): Promise<T> {
    return fn(this.repos);
  }
}
