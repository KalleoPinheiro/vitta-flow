import type { Supply } from "@/domain/inventory/supply";
import type { SupplyRepository } from "@/domain/inventory/inventory-repositories";

export interface SupplyListItem {
  supply: Supply;
  isLowStock: boolean;
}

export class ListSupplies {
  constructor(private readonly supplies: SupplyRepository) {}

  async execute(): Promise<SupplyListItem[]> {
    const all = await this.supplies.findAll();
    return all.map((supply) => ({ supply, isLowStock: supply.isLowStock }));
  }
}
