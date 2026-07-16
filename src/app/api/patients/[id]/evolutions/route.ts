import type { NextRequest } from "next/server";
import { z } from "zod";
import { getRepositories } from "@/infrastructure/container";
import { AddEvolutionNote } from "@/application/clinical/add-evolution-note";
import { ListEvolutionNotes } from "@/application/clinical/list-evolution-notes";
import { handleRequest } from "@/lib/api-response";
import { toEvolutionNoteDto } from "@/lib/dto";

const evolutionSchema = z.object({
  appointmentId: z.string().nullish(),
  subjective: z.string().default(""),
  objective: z.string().default(""),
  assessment: z.string().default(""),
  plan: z.string().default(""),
});

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const { evolutions } = await getRepositories();
    const notes = await new ListEvolutionNotes(evolutions).execute({ patientId: id });
    return notes.map(toEvolutionNoteDto);
  });
}

export async function POST(request: NextRequest, context: RouteContext) {
  return handleRequest(async () => {
    const { id } = await context.params;
    const body = evolutionSchema.parse(await request.json());
    const { evolutions, patients } = await getRepositories();
    const note = await new AddEvolutionNote(evolutions, patients).execute({
      patientId: id,
      appointmentId: body.appointmentId ?? null,
      subjective: body.subjective,
      objective: body.objective,
      assessment: body.assessment,
      plan: body.plan,
    });
    return toEvolutionNoteDto(note);
  });
}
