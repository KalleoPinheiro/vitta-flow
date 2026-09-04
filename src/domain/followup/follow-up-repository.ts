import type { FollowUp, FollowUpStatus } from './follow-up';

export interface FollowUpFilter {
  status?: FollowUpStatus;
  dueBefore?: Date;
  patientId?: string;
}

export interface FollowUpRepository {
  save(followUp: FollowUp): Promise<void>;
  findById(id: string): Promise<FollowUp | null>;
  findAll(filter?: FollowUpFilter): Promise<FollowUp[]>;
}
