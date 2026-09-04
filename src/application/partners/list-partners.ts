import type { Partner } from '@/domain/partner/partner';
import type { PartnerRepository } from '@/domain/partner/partner-repository';

export class ListPartners {
  constructor(private readonly partners: PartnerRepository) {}

  async execute(): Promise<Partner[]> {
    return this.partners.findAll();
  }
}
