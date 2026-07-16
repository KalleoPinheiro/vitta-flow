import { Supply, type SupplyProps } from "@/domain/inventory/supply";
import type { SupplyRepository } from "@/domain/inventory/inventory-repositories";

export class CreateSupply {
  constructor(private readonly supplies: SupplyRepository) {}

  async execute(input: SupplyProps): Promise<Supply> {
    const supply = Supply.create(input);
    await this.supplies.save(supply);
    return supply;
  }
}
