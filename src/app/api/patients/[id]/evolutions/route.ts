import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { AddEvolutionNote } from "@/application/clinical/add-evolution-note";
import { ListEvolutionNotes } from "@/application/clinical/list-evolution-notes";
import { handleRequest } from "@/lib/api-response";
import { getRequestSession } from "@/lib/auth/request-session";
import { recordAudit } from "@/lib/audit";
import { toEvolutionNoteDto } from "@/lib/dto";

const evolutionSchema = z.object({
  appointmentId: z.string().nullish(),
  subjective: z.string().max(5000).default(""),
  objective: z.string().max(5000).default(""),
  assessment: z.string().max(5000).default(""),
  plan: z.string().max(5000).default(""),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const { evolutions, auditEvents } = await getRepositories();
    const notes = await new ListEvolutionNotes(evolutions).execute({ patientId: id });
    recordAudit(auditEvents, getRequestSession(request), {
      action: "read",
      resourceType: "evolutions",
      resourceId: id,
      patientId: id,
    });
    return notes.map(toEvolutionNoteDto);
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const body = evolutionSchema.parse(await request.json());
    const { evolutions, patients, auditEvents } = await getRepositories();
    const note = await new AddEvolutionNote(evolutions, patients).execute({
      patientId: id,
      appointmentId: body.appointmentId ?? null,
      subjective: body.subjective,
      objective: body.objective,
      assessment: body.assessment,
      plan: body.plan,
    });
    recordAudit(auditEvents, getRequestSession(request), {
      action: "create",
      resourceType: "evolution",
      resourceId: note.id,
      patientId: id,
    });
    return toEvolutionNoteDto(note);
  });
}
