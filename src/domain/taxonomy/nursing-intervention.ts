import { ValidationError } from '../shared/errors';
import { newId } from '../shared/id';

const CODE_PATTERN = /^\d{4}$/;

export interface NursingInterventionProps {
  code: string;
  label: string;
  domain: string;
  class: string;
  edition: string;
}

export interface NursingInterventionState extends NursingInterventionProps {
  id: string;
  active: boolean;
  createdAt: Date;
}

/** Intervenção de enfermagem NIC. */
export class NursingIntervention {
  private constructor(private readonly state: NursingInterventionState) {}

  static create(props: NursingInterventionProps): NursingIntervention {
    return new NursingIntervention({
      ...NursingIntervention.validate(props),
      id: newId(),
      active: true,
      createdAt: new Date(),
    });
  }

  static restore(state: NursingInterventionState): NursingIntervention {
    return new NursingIntervention({ ...state });
  }

  private static validate(
    props: NursingInterventionProps,
  ): NursingInterventionProps {
    if (!CODE_PATTERN.test(props.code)) {
      throw new ValidationError('Código NIC deve ter 4 dígitos (ex.: 3660)');
    }
    const label = props.label.trim();
    if (label.length === 0) {
      throw new ValidationError('Rótulo da intervenção é obrigatório');
    }
    const domain = props.domain.trim();
    const interventionClass = props.class.trim();
    if (domain.length === 0 || interventionClass.length === 0) {
      throw new ValidationError('Domínio e classe NIC são obrigatórios');
    }
    const edition = props.edition.trim();
    if (edition.length === 0) {
      throw new ValidationError('Edição da taxonomia é obrigatória');
    }
    return {
      code: props.code,
      label,
      domain,
      class: interventionClass,
      edition,
    };
  }

  deactivate(): NursingIntervention {
    return new NursingIntervention({ ...this.state, active: false });
  }

  reactivate(): NursingIntervention {
    return new NursingIntervention({ ...this.state, active: true });
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
