export const USER_ROLES = [
  "super_admin",
  "company_admin",
  "atendente",
  "profissional",
  "patient",
  "partner",
] as const;

/**
 * Papel de acesso, catálogo fechado de 6 valores (ADR-003):
 * - super_admin: sistema, cross-empresa.
 * - company_admin: equipe, acesso total dentro da própria empresa.
 * - atendente: equipe, acesso operacional (agenda, cadastro), sem dado clínico.
 * - profissional: equipe, acesso clínico escopado dinamicamente por vínculo com paciente.
 * - patient: paciente, portal próprio.
 * - partner: parceiro, portal próprio.
 */
export type UserRole = (typeof USER_ROLES)[number];
