import type { Partner } from './partner';

export interface PartnerRepository {
  save(partner: Partner): Promise<void>;
  findById(id: string): Promise<Partner | null>;
  findByEmail(email: string): Promise<Partner | null>;
  findAll(): Promise<Partner[]>;
}
