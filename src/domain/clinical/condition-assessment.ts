import { ValidationError } from "../shared/errors";
import { newId } from "../shared/id";

export const EXUDATE_LEVELS = ["none", "low", "moderate", "high"] as const;
export type ExudateLevel = (typeof EXUDATE_LEVELS)[number];

const MAX_PAIN = 10;

export interface ConditionAssessmentProps {
  conditionId: string;
  lengthMm?: number | null;
  widthMm?: number | null;
  depthMm?: number | null;
  tissueType?: string | null;
  exudate?: ExudateLevel | null;
  painScale?: number | null;
  skinCondition?: string | null;
  complications?: string | null;
  notes?: string | null;
}

export interface ConditionAssessmentState extends ConditionAssessmentProps {
  id: string;
  createdAt: Date;
}

export class ConditionAssessment {
  private constructor(private readonly state: ConditionAssessmentState) {}

  static create(props: ConditionAssessmentProps): ConditionAssessment {
    if (props.conditionId.trim().length === 0) {
      throw new ValidationError("Condição é obrigatória");
    }
    for (const [label, value] of [
      ["comprimento", props.lengthMm],
      ["largura", props.widthMm],
      ["profundidade", props.depthMm],
    ] as const) {
      if (value != null && value < 0) {
        throw new ValidationError(`Medida de ${label} não pode ser negativa`);
      }
    }
    if (props.painScale != null && (props.painScale < 0 || props.painScale > MAX_PAIN)) {
      throw new ValidationError(`Escala de dor deve estar entre 0 e ${MAX_PAIN}`);
    }

    return new ConditionAssessment({
      conditionId: props.conditionId,
      lengthMm: props.lengthMm ?? null,
      widthMm: props.widthMm ?? null,
      depthMm: props.depthMm ?? null,
      tissueType: props.tissueType?.trim() || null,
      exudate: props.exudate ?? null,
      painScale: props.painScale ?? null,
      skinCondition: props.skinCondition?.trim() || null,
      complications: props.complications?.trim() || null,
      notes: props.notes?.trim() || null,
      id: newId(),
      createdAt: new Date(),
    });
  }

  static restore(state: ConditionAssessmentState): ConditionAssessment {
    return new ConditionAssessment({ ...state });
  }

  /** Área estimada da ferida (C×L) em mm², ou null quando não medida. */
  get areaMm2(): number | null {
    if (this.state.lengthMm == null || this.state.widthMm == null) {
      return null;
    }
    return this.state.lengthMm * this.state.widthMm;
  }

  get id(): string {
    return this.state.id;
  }

  get conditionId(): string {
    return this.state.conditionId;
  }

  get lengthMm(): number | null {
    return this.state.lengthMm ?? null;
  }

  get widthMm(): number | null {
    return this.state.widthMm ?? null;
  }

  get depthMm(): number | null {
    return this.state.depthMm ?? null;
  }

  get tissueType(): string | null {
    return this.state.tissueType ?? null;
  }

  get exudate(): ExudateLevel | null {
    return this.state.exudate ?? null;
  }

  get painScale(): number | null {
    return this.state.painScale ?? null;
  }

  get skinCondition(): string | null {
    return this.state.skinCondition ?? null;
  }

  get complications(): string | null {
    return this.state.complications ?? null;
  }

  get notes(): string | null {
    return this.state.notes ?? null;
  }

  get createdAt(): Date {
    return this.state.createdAt;
  }
}
