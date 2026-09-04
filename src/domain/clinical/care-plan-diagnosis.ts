import { ValidationError } from '../shared/errors';
import { newId } from '../shared/id';

export const CARE_PLAN_DIAGNOSIS_TYPES = [
  'real',
  'risco',
  'promocao-saude',
] as const;
export type CarePlanDiagnosisType = (typeof CARE_PLAN_DIAGNOSIS_TYPES)[number];

export interface CarePlanDiagnosisProps {
  carePlanId: string;
  diagnosisCode: string;
  type: CarePlanDiagnosisType;
  /** Etiologia — "relacionado a". */
  relatedFactors?: string | null;
  /** Sinais/sintomas — "evidenciado por". Diagnóstico de risco não tem (só fatores de risco). */
  definingCharacteristics?: string | null;
}

export interface CarePlanDiagnosisState extends CarePlanDiagnosisProps {
  id: string;
  createdAt: Date;
}

/**
 * Diagnóstico de enfermagem prescrito no formato PES (Problema-Etiologia-Sinais/sintomas).
 * Diagnóstico real exige etiologia e evidência; diagnóstico de risco exige etiologia mas
 * rejeita evidência (um risco, por definição, ainda não se manifestou); diagnóstico de
 * promoção da saúde não tem etiologia, mas exige evidência (motivação/desejo expresso).
 */
export class CarePlanDiagnosis {
  private constructor(private readonly state: CarePlanDiagnosisState) {}

  static create(props: CarePlanDiagnosisProps): CarePlanDiagnosis {
    CarePlanDiagnosis.validateIds(props);
    const relatedFactors = props.relatedFactors?.trim() || null;
    const definingCharacteristics =
      props.definingCharacteristics?.trim() || null;
    CarePlanDiagnosis.validatePes(
      props.type,
      relatedFactors,
      definingCharacteristics,
    );

    return new CarePlanDiagnosis({
      carePlanId: props.carePlanId,
      diagnosisCode: props.diagnosisCode.trim(),
      type: props.type,
      relatedFactors,
      definingCharacteristics,
      id: newId(),
      createdAt: new Date(),
    });
  }

  private static validateIds(props: CarePlanDiagnosisProps): void {
    if (props.carePlanId.trim().length === 0) {
      throw new ValidationError('Plano de cuidados é obrigatório');
    }
    if (props.diagnosisCode.trim().length === 0) {
      throw new ValidationError('Diagnóstico é obrigatório');
    }
  }

  /** Diagnóstico real exige etiologia e evidência; risco exige etiologia mas rejeita evidência. */
  private static validatePes(
    type: CarePlanDiagnosisType,
    relatedFactors: string | null,
    definingCharacteristics: string | null,
  ): void {
    if (!CARE_PLAN_DIAGNOSIS_TYPES.includes(type)) {
      throw new ValidationError('Tipo de diagnóstico inválido');
    }
    if (type === 'risco') {
      CarePlanDiagnosis.validateRisco(relatedFactors, definingCharacteristics);
    } else if (type === 'real') {
      CarePlanDiagnosis.validateReal(relatedFactors, definingCharacteristics);
    } else {
      CarePlanDiagnosis.validatePromocaoSaude(
        relatedFactors,
        definingCharacteristics,
      );
    }
  }

  /** Risco exige fatores de risco (etiologia) e rejeita evidência — ainda não se manifestou. */
  private static validateRisco(
    relatedFactors: string | null,
    definingCharacteristics: string | null,
  ): void {
    if (definingCharacteristics) {
      throw new ValidationError(
        'Diagnóstico de risco não tem características definidoras — apenas fatores de risco',
      );
    }
    if (!relatedFactors) {
      throw new ValidationError(
        'Diagnóstico de risco exige fatores de risco (relacionado a)',
      );
    }
  }

  /** Real exige etiologia e evidência. */
  private static validateReal(
    relatedFactors: string | null,
    definingCharacteristics: string | null,
  ): void {
    if (!relatedFactors) {
      throw new ValidationError(
        'Diagnóstico real exige fatores relacionados (relacionado a)',
      );
    }
    if (!definingCharacteristics) {
      throw new ValidationError(
        'Diagnóstico real exige características definidoras (evidenciado por)',
      );
    }
  }

  /** Promoção da saúde não tem etiologia, mas exige evidência (motivação/desejo expresso). */
  private static validatePromocaoSaude(
    relatedFactors: string | null,
    definingCharacteristics: string | null,
  ): void {
    if (relatedFactors) {
      throw new ValidationError(
        'Diagnóstico de promoção da saúde não tem fatores relacionados — não há problema, só motivação',
      );
    }
    if (!definingCharacteristics) {
      throw new ValidationError(
        'Diagnóstico de promoção da saúde exige características definidoras (evidenciado por)',
      );
    }
  }

  static restore(state: CarePlanDiagnosisState): CarePlanDiagnosis {
    return new CarePlanDiagnosis({ ...state });
  }

  get id(): string {
    return this.state.id;
  }

  get carePlanId(): string {
    return this.state.carePlanId;
  }

  get diagnosisCode(): string {
    return this.state.diagnosisCode;
  }

  get type(): CarePlanDiagnosisType {
    return this.state.type;
  }

  get relatedFactors(): string | null {
    return this.state.relatedFactors ?? null;
  }

  get definingCharacteristics(): string | null {
    return this.state.definingCharacteristics ?? null;
  }

  get createdAt(): Date {
    return this.state.createdAt;
  }
}
