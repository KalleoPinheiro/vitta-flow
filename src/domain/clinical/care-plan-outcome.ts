import { ValidationError } from '../shared/errors';
import { newId } from '../shared/id';
import { NOC_SCALE_MAX, NOC_SCALE_MIN } from '../taxonomy/noc-scale';

const SCALE_MIN = NOC_SCALE_MIN;
const SCALE_MAX = NOC_SCALE_MAX;

export interface CarePlanOutcomeProps {
  carePlanId: string;
  outcomeCode: string;
  baselineScore: number;
  targetScore: number;
  deadline?: Date | null;
}

export interface CarePlanOutcomeState extends CarePlanOutcomeProps {
  id: string;
  createdAt: Date;
}

interface ScoredEvaluation {
  score: number;
  evaluatedAt: Date;
}

/** Resultado NOC prescrito — basal e meta na escala 1–5 do próprio resultado. */
export class CarePlanOutcome {
  private constructor(private readonly state: CarePlanOutcomeState) {}

  static create(props: CarePlanOutcomeProps): CarePlanOutcome {
    if (props.carePlanId.trim().length === 0) {
      throw new ValidationError('Plano de cuidados é obrigatório');
    }
    if (props.outcomeCode.trim().length === 0) {
      throw new ValidationError('Resultado é obrigatório');
    }
    for (const [label, value] of [
      ['basal', props.baselineScore],
      ['meta', props.targetScore],
    ] as const) {
      if (!Number.isInteger(value) || value < SCALE_MIN || value > SCALE_MAX) {
        throw new ValidationError(
          `Pontuação ${label} deve ser um inteiro entre ${SCALE_MIN} e ${SCALE_MAX}`,
        );
      }
    }
    if (props.targetScore <= props.baselineScore) {
      throw new ValidationError(
        'Meta deve ser maior que a pontuação basal — a meta é progresso',
      );
    }
    return new CarePlanOutcome({
      carePlanId: props.carePlanId,
      outcomeCode: props.outcomeCode.trim(),
      baselineScore: props.baselineScore,
      targetScore: props.targetScore,
      deadline: props.deadline ?? null,
      id: newId(),
      createdAt: new Date(),
    });
  }

  static restore(state: CarePlanOutcomeState): CarePlanOutcome {
    return new CarePlanOutcome({ ...state });
  }

  private latestEvaluation(
    evaluations: readonly ScoredEvaluation[],
  ): ScoredEvaluation | null {
    if (evaluations.length === 0) {
      return null;
    }
    return [...evaluations].sort(
      (a, b) => b.evaluatedAt.getTime() - a.evaluatedAt.getTime(),
    )[0];
  }

  /** Pontuação mais recente. Null enquanto não houver avaliação — o score nunca é chutado. */
  currentScore(evaluations: readonly ScoredEvaluation[]): number | null {
    return this.latestEvaluation(evaluations)?.score ?? null;
  }

  /** Progresso em relação à meta: 0 = na basal, 1 = meta atingida; negativo = regressão. */
  attainment(evaluations: readonly ScoredEvaluation[]): number | null {
    const current = this.currentScore(evaluations);
    if (current == null) {
      return null;
    }
    const span = this.state.targetScore - this.state.baselineScore;
    return (current - this.state.baselineScore) / span;
  }

  isAchieved(evaluations: readonly ScoredEvaluation[]): boolean | null {
    const current = this.currentScore(evaluations);
    if (current == null) {
      return null;
    }
    return current >= this.state.targetScore;
  }

  get id(): string {
    return this.state.id;
  }

  get carePlanId(): string {
    return this.state.carePlanId;
  }

  get outcomeCode(): string {
    return this.state.outcomeCode;
  }

  get baselineScore(): number {
    return this.state.baselineScore;
  }

  get targetScore(): number {
    return this.state.targetScore;
  }

  get deadline(): Date | null {
    return this.state.deadline ?? null;
  }

  get createdAt(): Date {
    return this.state.createdAt;
  }
}
