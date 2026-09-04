import { FollowUp } from '@/domain/followup/follow-up';
import type { FollowUpRepository } from '@/domain/followup/follow-up-repository';
import type { PatientRepository } from '@/domain/patient/patient-repository';
import { NotFoundError } from '@/domain/shared/errors';

export interface CreateFollowUpInput {
  patientId: string;
  appointmentId?: string | null;
  dueDate: Date;
  reason: string;
}

export class CreateFollowUp {
  constructor(
    private readonly followUps: FollowUpRepository,
    private readonly patients: PatientRepository,
  ) {}

  async execute(input: CreateFollowUpInput): Promise<FollowUp> {
    const patient = await this.patients.findById(input.patientId);
    if (!patient) {
      throw new NotFoundError('Paciente', input.patientId);
    }
    const followUp = FollowUp.create(input);
    await this.followUps.save(followUp);
    return followUp;
  }
}
