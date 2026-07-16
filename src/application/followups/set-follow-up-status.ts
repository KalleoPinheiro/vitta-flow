import type { FollowUp } from "@/domain/followup/follow-up";
import type { FollowUpRepository } from "@/domain/followup/follow-up-repository";
import { NotFoundError } from "@/domain/shared/errors";

export interface SetFollowUpStatusInput {
  id: string;
  status: "done" | "cancelled";
}

export class SetFollowUpStatus {
  constructor(private readonly followUps: FollowUpRepository) {}

  async execute(input: SetFollowUpStatusInput): Promise<FollowUp> {
    const followUp = await this.followUps.findById(input.id);
    if (!followUp) {
      throw new NotFoundError("Retorno", input.id);
    }
    const updated = input.status === "done" ? followUp.markDone() : followUp.cancel();
    await this.followUps.save(updated);
    return updated;
  }
}
