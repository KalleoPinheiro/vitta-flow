import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { AddEvolutionNote } from "@/application/clinical/add-evolution-note";
import { ListEvolutionNotes } from "@/application/clinical/list-evolution-notes";
import { handleRequest } from "@/lib/api-response";
import { requireStaffSession } from "@/lib/auth/require-session";
import { assertPatientAccessibleToProfessional } from "@/lib/auth/professional-patient-scope";
import { recordAudit } from "@/lib/audit";
import { toEvolutionNoteDto } from "@/lib/dto";
import { LEGACY_CLINIC_ID } from "@/infrastructure/persistence/drizzle/legacy-clinic";

const evolutionSchema = z.object({
  appointmentId: z.string().nullish(),
  professionalId: z.string().max(100).nullish(),
  subjective: z.string().max(5000).default(""),
  objective: z.string().max(5000).default(""),
  assessment: z.string().max(5000).default(""),
  plan: z.string().max(5000).default(""),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  const guard = requireStaffSession(request);
  if (!guard.ok) return guard.response;

  return handleRequest(async () => {
    const { id } = await context.params;
    const { evolutions, auditEvents, professionalPatientLinks } = await getRepositories({
      clinicId: guard.session?.clinicId ?? null,
    });
    await assertPatientAccessibleToProfessional(guard.session, id, professionalPatientLinks);
    const notes = await new ListEvolutionNotes(evolutions).execute({ patientId: id });
    recordAudit(auditEvents, guard.session, {
      action: "read",
      resourceType: "evolutions",
      resourceId: id,
      patientId: id,
    });
    return notes.map(toEvolutionNoteDto);
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  const guard = requireStaffSession(request);
  if (!guard.ok) return guard.response;
  const clinicId = guard.session?.clinicId ?? LEGACY_CLINIC_ID;

  return handleRequest(async () => {
    const { id } = await context.params;
    const body = evolutionSchema.parse(await request.json());
    const { evolutions, patients, auditEvents, userAccounts, professionalPatientLinks } =
      await getRepositories({ clinicId });
    const { session } = guard;
    // Autoria automática: conta individual logada define o profissional autor.
    let professionalId = body.professionalId ?? null;
    if (!professionalId && session?.subject && session.subject !== "local") {
      const account = await userAccounts.findByEmail(session.subject);
      professionalId = account?.professionalId ?? null;
    }
    const note = await new AddEvolutionNote(evolutions, patients).execute({
      patientId: id,
      appointmentId: body.appointmentId ?? null,
      professionalId,
      subjective: body.subjective,
      objective: body.objective,
      assessment: body.assessment,
      plan: body.plan,
    });
    // Nota de evolução com profissional concede/renova o vínculo com o
    // paciente (RBAC-19/20).
    if (professionalId) {
      await professionalPatientLinks.ensureLink(professionalId, id);
    }
    recordAudit(auditEvents, guard.session, {
      action: "create",
      resourceType: "evolution",
      resourceId: note.id,
      patientId: id,
    });
    return toEvolutionNoteDto(note);
  });
}
