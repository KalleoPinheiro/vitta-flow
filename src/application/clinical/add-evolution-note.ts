import { EvolutionNote } from "@/domain/clinical/evolution-note";
import type { EvolutionNoteRepository } from "@/domain/clinical/clinical-repositories";
import type { PatientRepository } from "@/domain/patient/patient-repository";
import { NotFoundError } from "@/domain/shared/errors";

export interface AddEvolutionNoteInput {
  patientId: string;
  appointmentId?: string | null;
  professionalId?: string | null;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
}

export class AddEvolutionNote {
  constructor(
    private readonly evolutions: EvolutionNoteRepository,
    private readonly patients: PatientRepository,
  ) {}

  async execute(input: AddEvolutionNoteInput): Promise<EvolutionNote> {
    const patient = await this.patients.findById(input.patientId);
    if (!patient) {
      throw new NotFoundError("Paciente", input.patientId);
    }
    const note = EvolutionNote.create(input);
    await this.evolutions.save(note);
    return note;
  }
}
