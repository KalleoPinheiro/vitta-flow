import { ValidationError } from '../shared/errors';
import { newId } from '../shared/id';

export interface InterventionRecordProps {
  interventionId: string;
  professionalId?: string | null;
  notes?: string | null;
}

export interface InterventionRecordState extends InterventionRecordProps {
  id: string;
  performedAt: Date;
}

/** Execução de uma intervenção NIC prescrita — imutável após criada. */
export class InterventionRecord {
  private constructor(private readonly state: InterventionRecordState) {}

  static create(props: InterventionRecordProps): InterventionRecord {
    if (props.interventionId.trim().length === 0) {
      throw new ValidationError('Intervenção prescrita é obrigatória');
    }
    return new InterventionRecord({
      interventionId: props.interventionId,
      professionalId: props.professionalId ?? null,
      notes: props.notes?.trim() || null,
      id: newId(),
      performedAt: new Date(),
    });
  }

  static restore(state: InterventionRecordState): InterventionRecord {
    return new InterventionRecord({ ...state });
  }

  get id(): string {
    return this.state.id;
  }

  get interventionId(): string {
    return this.state.interventionId;
  }

  get professionalId(): string | null {
    return this.state.professionalId ?? null;
  }

  get notes(): string | null {
    return this.state.notes ?? null;
  }

  get performedAt(): Date {
    return this.state.performedAt;
  }
}
