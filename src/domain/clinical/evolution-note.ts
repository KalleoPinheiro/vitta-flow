import { ValidationError } from "../shared/errors";
import { newId } from "../shared/id";

export interface EvolutionNoteProps {
  patientId: string;
  appointmentId?: string | null;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  /** Autor da evolução (opcional — retrocompatível com histórico). */
  professionalId?: string | null;
}

export interface EvolutionNoteState extends EvolutionNoteProps {
  id: string;
  createdAt: Date;
}

/** Evolução SOAP — imutável após criada (integridade de prontuário). */
export class EvolutionNote {
  private constructor(private readonly state: EvolutionNoteState) {}

  static create(props: EvolutionNoteProps): EvolutionNote {
    const subjective = props.subjective.trim();
    const objective = props.objective.trim();
    const assessment = props.assessment.trim();
    const plan = props.plan.trim();

    if (!subjective && !objective && !assessment && !plan) {
      throw new ValidationError("Evolução exige ao menos um campo SOAP preenchido");
    }
    if (props.patientId.trim().length === 0) {
      throw new ValidationError("Paciente é obrigatório");
    }

    return new EvolutionNote({
      patientId: props.patientId,
      appointmentId: props.appointmentId ?? null,
      subjective,
      objective,
      assessment,
      plan,
      professionalId: props.professionalId ?? null,
      id: newId(),
      createdAt: new Date(),
    });
  }

  static restore(state: EvolutionNoteState): EvolutionNote {
    return new EvolutionNote({ ...state });
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

  get subjective(): string {
    return this.state.subjective;
  }

  get objective(): string {
    return this.state.objective;
  }

  get assessment(): string {
    return this.state.assessment;
  }

  get plan(): string {
    return this.state.plan;
  }

  get professionalId(): string | null {
    return this.state.professionalId ?? null;
  }

  get createdAt(): Date {
    return this.state.createdAt;
  }
}
