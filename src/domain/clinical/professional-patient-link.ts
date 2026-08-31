/**
 * Vínculo Profissional↔Paciente (R4, RBAC-17..21) — nunca revogado uma vez
 * criado. Sem regra de negócio própria além de existir/não existir, então
 * não há entidade rica: o repositório expõe diretamente as três operações
 * necessárias.
 */
export interface ProfessionalPatientLinkRepository {
  /** Idempotente — chamar de novo para o mesmo par não duplica nem lança. */
  ensureLink(professionalId: string, patientId: string): Promise<void>;
  hasLink(professionalId: string, patientId: string): Promise<boolean>;
  findLinkedPatientIds(professionalId: string): Promise<string[]>;
}
