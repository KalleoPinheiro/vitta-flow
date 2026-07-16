import type { ClinicalCondition } from "@/domain/clinical/clinical-condition";
import type { ClinicalConditionRepository } from "@/domain/clinical/clinical-repositories";
import { NotFoundError } from "@/domain/shared/errors";

export class ResolveCondition {
  constructor(private readonly conditions: ClinicalConditionRepository) {}

  async execute(input: { id: string }): Promise<ClinicalCondition> {
    const condition = await this.conditions.findById(input.id);
    if (!condition) {
      throw new NotFoundError("Condição clínica", input.id);
    }
    const resolved = condition.resolve();
    await this.conditions.save(resolved);
    return resolved;
  }
}
