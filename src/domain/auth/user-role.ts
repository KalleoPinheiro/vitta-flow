export const USER_ROLES = ["admin", "partner", "patient"] as const;

/** Papel de acesso: admin (equipe), partner (médico parceiro) ou patient (paciente). */
export type UserRole = (typeof USER_ROLES)[number];
