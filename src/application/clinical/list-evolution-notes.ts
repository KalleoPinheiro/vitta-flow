import type { EvolutionNoteRepository } from '@/domain/clinical/clinical-repositories';
import type { EvolutionNote } from '@/domain/clinical/evolution-note';

export class ListEvolutionNotes {
  constructor(private readonly evolutions: EvolutionNoteRepository) {}

  async execute(input: { patientId: string }): Promise<EvolutionNote[]> {
    return this.evolutions.findByPatientId(input.patientId);
  }
}
