import { NotFoundError } from "@/domain/shared/errors";
import type { ProfessionalPatientLinkRepository } from "@/domain/clinical/professional-patient-link";
import type { Session } from "./session";

/**
 * Escopo dinâmico do Profissional (R4, RBAC-17/19): sem vínculo com o
 * paciente, o Profissional recebe 404 — nunca vazando se o paciente existe
 * (mesmo padrão 404-não-403 já usado no isolamento por empresa, M2/#23).
 * Papéis que não são "profissional" (ou sessão nula, modo aberto) passam
 * direto — a checagem é só do Profissional.
 */
export async function assertPatientAccessibleToProfessional(
  session: Session | null,
  patientId: string,
  links: ProfessionalPatientLinkRepository,
): Promise<void> {
  if (session?.role !== "profissional") {
    return;
  }
  const hasLink =
    session.professionalId !== null && (await links.hasLink(session.professionalId, patientId));
  if (!hasLink) {
    throw new NotFoundError("Paciente", patientId);
  }
}
