import { NOC_SCALE_MAX, NOC_SCALE_MIN } from "../taxonomy/noc-scale";
import { ValidationError } from "../shared/errors";
import { newId } from "../shared/id";

const SCALE_MIN = NOC_SCALE_MIN;
const SCALE_MAX = NOC_SCALE_MAX;

export interface OutcomeEvaluationProps {
  outcomeId: string;
  score: number;
  professionalId?: string | null;
  notes?: string | null;
}

export interface OutcomeEvaluationState extends OutcomeEvaluationProps {
  id: string;
  evaluatedAt: Date;
}

/** Reavaliação de um resultado NOC prescrito — imutável após criada (integridade de prontuário). */
export class OutcomeEvaluation {
  private constructor(private readonly state: OutcomeEvaluationState) {}

  static create(props: OutcomeEvaluationProps): OutcomeEvaluation {
    if (props.outcomeId.trim().length === 0) {
      throw new ValidationError("Resultado prescrito é obrigatório");
    }
    if (!Number.isInteger(props.score) || props.score < SCALE_MIN || props.score > SCALE_MAX) {
      throw new ValidationError(`Pontuação deve ser um inteiro entre ${SCALE_MIN} e ${SCALE_MAX}`);
    }
    return new OutcomeEvaluation({
      outcomeId: props.outcomeId,
      score: props.score,
      professionalId: props.professionalId ?? null,
      notes: props.notes?.trim() || null,
      id: newId(),
      evaluatedAt: new Date(),
    });
  }

  static restore(state: OutcomeEvaluationState): OutcomeEvaluation {
    return new OutcomeEvaluation({ ...state });
  }

  get id(): string {
    return this.state.id;
  }

  get outcomeId(): string {
    return this.state.outcomeId;
  }

  get score(): number {
    return this.state.score;
  }

  get professionalId(): string | null {
    return this.state.professionalId ?? null;
  }

  get notes(): string | null {
    return this.state.notes ?? null;
  }

  get evaluatedAt(): Date {
    return this.state.evaluatedAt;
  }
}
