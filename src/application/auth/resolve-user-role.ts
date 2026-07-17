import type { PatientRepository } from "@/domain/patient/patient-repository";
import type { PartnerRepository } from "@/domain/partner/partner-repository";
import type { UserRole } from "@/lib/auth/session";

export interface ResolveUserRoleInput {
  email: string;
  /** Emails da equipe da clínica (admins) — allowlist do login Google. */
  adminEmails: string[];
}

/**
 * Resolve o papel de um email autenticado pelo Google.
 * Prioridade: admin (equipe) → partner (médico ativo) → patient (paciente ativo).
 * Retorna null quando o email não pertence a ninguém — acesso negado.
 */
export class ResolveUserRole {
  constructor(
    private readonly patients: PatientRepository,
    private readonly partners: PartnerRepository,
  ) {}

  async execute(input: ResolveUserRoleInput): Promise<UserRole | null> {
    const email = input.email.trim().toLowerCase();
    if (input.adminEmails.includes(email)) {
      return "admin";
    }
    const partner = await this.partners.findByEmail(email);
    if (partner?.isActive) {
      return "partner";
    }
    const patient = await this.patients.findByEmail(email);
    if (patient?.isActive) {
      return "patient";
    }
    return null;
  }
}
