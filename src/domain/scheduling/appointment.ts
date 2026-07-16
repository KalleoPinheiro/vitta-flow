import { InvalidStatusTransitionError, ValidationError } from "../shared/errors";
import { newId } from "../shared/id";
import type { Money } from "../shared/money";
import type { TimeSlot } from "../shared/time-slot";

export const APPOINTMENT_STATUSES = [
  "scheduled",
  "confirmed",
  "completed",
  "cancelled",
  "no_show",
] as const;

export type AppointmentStatus = (typeof APPOINTMENT_STATUSES)[number];

export interface AppointmentProps {
  patientId: string;
  slot: TimeSlot;
  procedure: string;
  price: Money;
  notes?: string | null;
}

export interface AppointmentState extends AppointmentProps {
  id: string;
  status: AppointmentStatus;
  createdAt: Date;
  googleEventId?: string | null;
}

const ACTIVE_STATUSES: readonly AppointmentStatus[] = ["scheduled", "confirmed"];

export class Appointment {
  private constructor(private readonly state: AppointmentState) {}

  static create(props: AppointmentProps): Appointment {
    const procedure = props.procedure.trim();
    if (procedure.length === 0) {
      throw new ValidationError("Procedimento é obrigatório");
    }
    if (props.patientId.trim().length === 0) {
      throw new ValidationError("Paciente é obrigatório");
    }
    return new Appointment({
      ...props,
      procedure,
      notes: props.notes ?? null,
      id: newId(),
      status: "scheduled",
      createdAt: new Date(),
      googleEventId: null,
    });
  }

  static restore(state: AppointmentState): Appointment {
    return new Appointment({ ...state });
  }

  private transitionTo(status: AppointmentStatus, allowedFrom: readonly AppointmentStatus[]): Appointment {
    if (!allowedFrom.includes(this.state.status)) {
      throw new InvalidStatusTransitionError(
        `Não é possível mudar consulta de "${this.state.status}" para "${status}"`,
      );
    }
    return new Appointment({ ...this.state, status });
  }

  confirm(): Appointment {
    return this.transitionTo("confirmed", ["scheduled"]);
  }

  complete(): Appointment {
    return this.transitionTo("completed", ACTIVE_STATUSES);
  }

  cancel(): Appointment {
    return this.transitionTo("cancelled", ACTIVE_STATUSES);
  }

  markNoShow(): Appointment {
    return this.transitionTo("no_show", ACTIVE_STATUSES);
  }

  reschedule(newSlot: TimeSlot): Appointment {
    if (!ACTIVE_STATUSES.includes(this.state.status)) {
      throw new InvalidStatusTransitionError(
        `Não é possível remarcar consulta com status "${this.state.status}"`,
      );
    }
    return new Appointment({ ...this.state, slot: newSlot, status: "scheduled" });
  }

  updateDetails(changes: { procedure?: string; price?: Money; notes?: string | null }): Appointment {
    const procedure = (changes.procedure ?? this.state.procedure).trim();
    if (procedure.length === 0) {
      throw new ValidationError("Procedimento é obrigatório");
    }
    return new Appointment({
      ...this.state,
      procedure,
      price: changes.price ?? this.state.price,
      notes: changes.notes !== undefined ? changes.notes : this.state.notes,
    });
  }

  withGoogleEventId(googleEventId: string | null): Appointment {
    return new Appointment({ ...this.state, googleEventId });
  }

  get googleEventId(): string | null {
    return this.state.googleEventId ?? null;
  }

  get isActive(): boolean {
    return ACTIVE_STATUSES.includes(this.state.status);
  }

  conflictsWith(other: Appointment): boolean {
    if (!this.isActive || !other.isActive) {
      return false;
    }
    return this.state.slot.overlaps(other.slot);
  }

  get id(): string {
    return this.state.id;
  }

  get patientId(): string {
    return this.state.patientId;
  }

  get slot(): TimeSlot {
    return this.state.slot;
  }

  get procedure(): string {
    return this.state.procedure;
  }

  get price(): Money {
    return this.state.price;
  }

  get notes(): string | null {
    return this.state.notes ?? null;
  }

  get status(): AppointmentStatus {
    return this.state.status;
  }

  get createdAt(): Date {
    return this.state.createdAt;
  }
}
