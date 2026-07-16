import type { Anamnesis } from "@/domain/clinical/anamnesis";
import type { AnamnesisRepository } from "@/domain/clinical/clinical-repositories";

export class GetAnamnesis {
  constructor(private readonly anamneses: AnamnesisRepository) {}

  async execute(input: { patientId: string }): Promise<Anamnesis | null> {
    return this.anamneses.findByPatientId(input.patientId);
  }
}
