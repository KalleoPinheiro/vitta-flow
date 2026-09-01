import type { PatientRepository } from "@/domain/patient/patient-repository";
import type { PartnerRepository } from "@/domain/partner/partner-repository";
import type { UserRole } from "@/domain/auth/user-role";

export interface ResolveUserRoleInput {
  email: string;
  /** Emails da equipe da clínica (admins) — allowlist do login Google. */
  adminEmails: string[];
}

/**
 * Resolve o papel de um email autenticado pelo Google.
 * Prioridade: super_admin (equipe) → partner (médico ativo) → patient (paciente ativo).
 * Retorna null quando o email não pertence a ninguém — acesso negado.
 *
 * Mapeamento transitório (issue #20, "Further Notes"): e-mails na allowlist
 * mapeiam para super_admin (era "admin") até a issue #21 remover o login Google
 * por completo.
 */
export class ResolveUserRole {
  constructor(
    private readonly patients: PatientRepository,
    private readonly partners: PartnerRepository,
  ) {}

  async execute(input: ResolveUserRoleInput): Promise<UserRole | null> {
    const email = input.email.trim().toLowerCase();
    if (input.adminEmails.includes(email)) {
      return "super_admin";
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
