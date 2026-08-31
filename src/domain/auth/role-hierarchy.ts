import type { UserRole } from "./user-role";

/**
 * Regra pura de "quem pode cadastrar quem" (RBAC-07..RBAC-10, ADR-003) — sem
 * I/O, testável isoladamente. O escopo de empresa (o alvo precisa estar na
 * mesma empresa do ator, exceto para super_admin) é responsabilidade do
 * use-case que consome esta regra, não dela.
 */
export const PROVISIONING_MATRIX: Record<UserRole, readonly UserRole[]> = {
  super_admin: [
    "super_admin",
    "company_admin",
    "atendente",
    "profissional",
    "patient",
    "partner",
  ],
  company_admin: ["company_admin", "atendente", "profissional", "patient", "partner"],
  atendente: ["patient", "partner"],
  profissional: ["patient", "partner"],
  patient: [],
  partner: [],
};

export function canProvision(actorRole: UserRole, targetRole: UserRole): boolean {
  return PROVISIONING_MATRIX[actorRole].includes(targetRole);
}
