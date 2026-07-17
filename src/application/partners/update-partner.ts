import type { Partner, PartnerProps } from "@/domain/partner/partner";
import type { PartnerRepository } from "@/domain/partner/partner-repository";
import { NotFoundError, ValidationError } from "@/domain/shared/errors";

export interface UpdatePartnerInput extends Partial<PartnerProps> {
  id: string;
  active?: boolean;
}

export class UpdatePartner {
  constructor(private readonly partners: PartnerRepository) {}

  async execute(input: UpdatePartnerInput): Promise<Partner> {
    const partner = await this.partners.findById(input.id);
    if (!partner) {
      throw new NotFoundError("Parceiro", input.id);
    }
    if (input.email) {
      const byEmail = await this.partners.findByEmail(input.email);
      if (byEmail && byEmail.id !== partner.id) {
        throw new ValidationError(`Já existe parceiro com o email ${input.email}`);
      }
    }
    let updated = partner.update(input);
    if (input.active !== undefined) {
      updated = input.active ? updated.reactivate() : updated.deactivate();
    }
    await this.partners.save(updated);
    return updated;
  }
}
