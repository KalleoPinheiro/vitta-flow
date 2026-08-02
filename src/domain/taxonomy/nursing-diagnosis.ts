import { ValidationError } from "../shared/errors";
import { newId } from "../shared/id";

const CODE_PATTERN = /^\d{5}$/;

export interface NursingDiagnosisProps {
  code: string;
  label: string;
  domain: string;
  class: string;
  definition?: string | null;
  /** Edição da taxonomia de origem (ex.: "NANDA-I 2021-2023") — proveniência obrigatória. */
  edition: string;
}

export interface NursingDiagnosisState extends NursingDiagnosisProps {
  id: string;
  active: boolean;
  createdAt: Date;
}

/** Diagnóstico de enfermagem NANDA-I. Catálogo externo — ver política de licenciamento. */
export class NursingDiagnosis {
  private constructor(private readonly state: NursingDiagnosisState) {}

  static create(props: NursingDiagnosisProps): NursingDiagnosis {
    return new NursingDiagnosis({
      ...NursingDiagnosis.validate(props),
      id: newId(),
      active: true,
      createdAt: new Date(),
    });
  }

  static restore(state: NursingDiagnosisState): NursingDiagnosis {
    return new NursingDiagnosis({ ...state });
  }

  private static validate(props: NursingDiagnosisProps): NursingDiagnosisProps {
    if (!CODE_PATTERN.test(props.code)) {
      throw new ValidationError("Código NANDA-I deve ter 5 dígitos (ex.: 00046)");
    }
    const label = props.label.trim();
    if (label.length === 0) {
      throw new ValidationError("Rótulo do diagnóstico é obrigatório");
    }
    const domain = props.domain.trim();
    const diagnosisClass = props.class.trim();
    if (domain.length === 0 || diagnosisClass.length === 0) {
      throw new ValidationError("Domínio e classe NANDA-I são obrigatórios");
    }
    const edition = props.edition.trim();
    if (edition.length === 0) {
      throw new ValidationError("Edição da taxonomia é obrigatória");
    }
    return {
      code: props.code,
      label,
      domain,
      class: diagnosisClass,
      definition: props.definition?.trim() || null,
      edition,
    };
  }

  deactivate(): NursingDiagnosis {
    return new NursingDiagnosis({ ...this.state, active: false });
  }

  reactivate(): NursingDiagnosis {
    return new NursingDiagnosis({ ...this.state, active: true });
  }

  get id(): string {
    return this.state.id;
  }

  get code(): string {
    return this.state.code;
  }

  get label(): string {
    return this.state.label;
  }

  get domain(): string {
    return this.state.domain;
  }

  get class(): string {
    return this.state.class;
  }

  get definition(): string | null {
    return this.state.definition ?? null;
  }

  get edition(): string {
    return this.state.edition;
  }

  get isActive(): boolean {
    return this.state.active;
  }

  get createdAt(): Date {
    return this.state.createdAt;
  }
}
