import { Partner, type PartnerProps } from "@/domain/partner/partner";
import type { PartnerRepository } from "@/domain/partner/partner-repository";
import { ValidationError } from "@/domain/shared/errors";

export class CreatePartner {
  constructor(private readonly partners: PartnerRepository) {}

  async execute(input: PartnerProps): Promise<Partner> {
    const existing = await this.partners.findByEmail(input.email);
    if (existing) {
      throw new ValidationError(`Já existe parceiro com o email ${input.email}`);
    }
    const partner = Partner.create(input);
    await this.partners.save(partner);
    return partner;
  }
}
