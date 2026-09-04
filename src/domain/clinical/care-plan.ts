import {
  InvalidStatusTransitionError,
  ValidationError,
} from '../shared/errors';
import { newId } from '../shared/id';

export const CARE_PLAN_STATUSES = ['active', 'resolved', 'cancelled'] as const;
export type CarePlanStatus = (typeof CARE_PLAN_STATUSES)[number];

export interface CarePlanProps {
  patientId: string;
  /** Condição associada (ferida/estomia) — nulo quando o diagnóstico é do paciente como um todo. */
  conditionId?: string | null;
  professionalId?: string | null;
}

export interface CarePlanState extends CarePlanProps {
  id: string;
  status: CarePlanStatus;
  createdAt: Date;
}

/** Plano de cuidados — raiz do agregado SAE (diagnóstico → resultado → intervenção). */
export class CarePlan {
  private constructor(private readonly state: CarePlanState) {}

  static create(props: CarePlanProps): CarePlan {
    const patientId = props.patientId.trim();
    if (patientId.length === 0) {
      throw new ValidationError('Paciente é obrigatório');
    }
    return new CarePlan({
      patientId,
      conditionId: props.conditionId ?? null,
      professionalId: props.professionalId ?? null,
      id: newId(),
      status: 'active',
      createdAt: new Date(),
    });
  }

  static restore(state: CarePlanState): CarePlan {
    return new CarePlan({ ...state });
  }

  private transitionTo(next: CarePlanStatus): CarePlan {
    if (this.state.status !== 'active') {
      throw new InvalidStatusTransitionError(
        'Plano de cuidados não está ativo',
      );
    }
    return new CarePlan({ ...this.state, status: next });
  }

  resolve(): CarePlan {
    return this.transitionTo('resolved');
  }

  cancel(): CarePlan {
    return this.transitionTo('cancelled');
  }

  get id(): string {
    return this.state.id;
  }

  get patientId(): string {
    return this.state.patientId;
  }

  get conditionId(): string | null {
    return this.state.conditionId ?? null;
  }

  get professionalId(): string | null {
    return this.state.professionalId ?? null;
  }

  get status(): CarePlanStatus {
    return this.state.status;
  }

  get isActive(): boolean {
    return this.state.status === 'active';
  }

  get createdAt(): Date {
    return this.state.createdAt;
  }
}
