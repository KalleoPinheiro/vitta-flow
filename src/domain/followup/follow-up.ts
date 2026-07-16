import { InvalidStatusTransitionError, ValidationError } from "../shared/errors";
import { newId } from "../shared/id";

export const FOLLOW_UP_STATUSES = ["pending", "done", "cancelled"] as const;
export type FollowUpStatus = (typeof FOLLOW_UP_STATUSES)[number];

export interface FollowUpProps {
  patientId: string;
  appointmentId?: string | null;
  dueDate: Date;
  reason: string;
}

export interface FollowUpState extends FollowUpProps {
  id: string;
  status: FollowUpStatus;
  createdAt: Date;
}

export class FollowUp {
  private constructor(private readonly state: FollowUpState) {}

  static create(props: FollowUpProps): FollowUp {
    const reason = props.reason.trim();
    if (reason.length === 0) {
      throw new ValidationError("Motivo do retorno é obrigatório");
    }
    if (props.patientId.trim().length === 0) {
      throw new ValidationError("Paciente é obrigatório");
    }
    return new FollowUp({
      patientId: props.patientId,
      appointmentId: props.appointmentId ?? null,
      dueDate: props.dueDate,
      reason,
      id: newId(),
      status: "pending",
      createdAt: new Date(),
    });
  }

  static restore(state: FollowUpState): FollowUp {
    return new FollowUp({ ...state });
  }

  private transitionTo(status: FollowUpStatus): FollowUp {
    if (this.state.status !== "pending") {
      throw new InvalidStatusTransitionError(
        `Retorno já está "${this.state.status}", não pode mudar para "${status}"`,
      );
    }
    return new FollowUp({ ...this.state, status });
  }

  markDone(): FollowUp {
    return this.transitionTo("done");
  }

  cancel(): FollowUp {
    return this.transitionTo("cancelled");
  }

  isOverdue(now: Date): boolean {
    return this.state.status === "pending" && this.state.dueDate.getTime() < now.getTime();
  }

  get id(): string {
    return this.state.id;
  }

  get patientId(): string {
    return this.state.patientId;
  }

  get appointmentId(): string | null {
    return this.state.appointmentId ?? null;
  }

  get dueDate(): Date {
    return this.state.dueDate;
  }

  get reason(): string {
    return this.state.reason;
  }

  get status(): FollowUpStatus {
    return this.state.status;
  }

  get createdAt(): Date {
    return this.state.createdAt;
  }
}
