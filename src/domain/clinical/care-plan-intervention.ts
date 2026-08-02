import { ValidationError } from "../shared/errors";
import { newId } from "../shared/id";

export const INTERVENTION_PRIORITIES = ["baixa", "media", "alta"] as const;
export type InterventionPriority = (typeof INTERVENTION_PRIORITIES)[number];

export interface CarePlanInterventionProps {
  carePlanId: string;
  interventionCode: string;
  /** Frequência clínica em texto livre (ex.: "a cada troca de placa"). */
  frequency: string;
  priority: InterventionPriority;
}

export interface CarePlanInterventionState extends CarePlanInterventionProps {
  id: string;
  createdAt: Date;
}

/** Intervenção NIC prescrita. */
export class CarePlanIntervention {
  private constructor(private readonly state: CarePlanInterventionState) {}

  static create(props: CarePlanInterventionProps): CarePlanIntervention {
    if (props.carePlanId.trim().length === 0) {
      throw new ValidationError("Plano de cuidados é obrigatório");
    }
    if (props.interventionCode.trim().length === 0) {
      throw new ValidationError("Intervenção é obrigatória");
    }
    if (!INTERVENTION_PRIORITIES.includes(props.priority)) {
      throw new ValidationError("Prioridade da intervenção inválida");
    }
    const frequency = props.frequency.trim();
    if (frequency.length === 0) {
      throw new ValidationError("Frequência da intervenção é obrigatória");
    }
    return new CarePlanIntervention({
      carePlanId: props.carePlanId,
      interventionCode: props.interventionCode.trim(),
      frequency,
      priority: props.priority,
      id: newId(),
      createdAt: new Date(),
    });
  }

  static restore(state: CarePlanInterventionState): CarePlanIntervention {
    return new CarePlanIntervention({ ...state });
  }

  get id(): string {
    return this.state.id;
  }

  get carePlanId(): string {
    return this.state.carePlanId;
  }

  get interventionCode(): string {
    return this.state.interventionCode;
  }

  get frequency(): string {
    return this.state.frequency;
  }

  get priority(): InterventionPriority {
    return this.state.priority;
  }

  get createdAt(): Date {
    return this.state.createdAt;
  }
}
