import { Anamnesis } from '@/domain/clinical/anamnesis';
import type { AnamnesisRepository } from '@/domain/clinical/clinical-repositories';
import type { PatientRepository } from '@/domain/patient/patient-repository';
import { NotFoundError } from '@/domain/shared/errors';

export interface UpsertAnamnesisInput {
  patientId: string;
  comorbidities?: string;
  allergies?: string;
  medications?: string;
  surgicalHistory?: string;
  notes?: string;
}

export class UpsertAnamnesis {
  constructor(
    private readonly anamneses: AnamnesisRepository,
    private readonly patients: PatientRepository,
  ) {}

  async execute(input: UpsertAnamnesisInput): Promise<Anamnesis> {
    const patient = await this.patients.findById(input.patientId);
    if (!patient) {
      throw new NotFoundError('Paciente', input.patientId);
    }
    const existing = await this.anamneses.findByPatientId(input.patientId);
    const anamnesis = existing
      ? existing.update(input)
      : Anamnesis.create(input);
    await this.anamneses.save(anamnesis);
    return anamnesis;
  }
}
