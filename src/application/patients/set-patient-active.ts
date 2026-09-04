import type { Patient } from '@/domain/patient/patient';
import type { PatientRepository } from '@/domain/patient/patient-repository';
import { NotFoundError } from '@/domain/shared/errors';

export class SetPatientActive {
  constructor(private readonly patients: PatientRepository) {}

  async execute(input: { id: string; active: boolean }): Promise<Patient> {
    const patient = await this.patients.findById(input.id);
    if (!patient) {
      throw new NotFoundError('Paciente', input.id);
    }
    const updated = input.active ? patient.reactivate() : patient.deactivate();
    await this.patients.save(updated);
    return updated;
  }
}
