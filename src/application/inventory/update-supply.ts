import type { SupplyRepository } from '@/domain/inventory/inventory-repositories';
import type { Supply, SupplyProps } from '@/domain/inventory/supply';
import { NotFoundError } from '@/domain/shared/errors';

export interface UpdateSupplyInput extends Partial<SupplyProps> {
  id: string;
  active?: boolean;
}

export class UpdateSupply {
  constructor(private readonly supplies: SupplyRepository) {}

  async execute(input: UpdateSupplyInput): Promise<Supply> {
    const supply = await this.supplies.findById(input.id);
    if (!supply) {
      throw new NotFoundError('Insumo', input.id);
    }
    let updated = supply.update(input);
    if (input.active !== undefined) {
      updated = input.active ? updated.reactivate() : updated.deactivate();
    }
    await this.supplies.save(updated);
    return updated;
  }
}
