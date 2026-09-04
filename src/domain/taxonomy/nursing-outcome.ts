import { ValidationError } from '../shared/errors';
import { newId } from '../shared/id';
import { NocScale, type NocScaleAnchors } from './noc-scale';

const CODE_PATTERN = /^\d{4}$/;

export interface NursingOutcomeProps {
  code: string;
  label: string;
  domain: string;
  class: string;
  edition: string;
  scaleAnchors: NocScaleAnchors;
}

export interface NursingOutcomeState {
  id: string;
  code: string;
  label: string;
  domain: string;
  class: string;
  edition: string;
  scale: NocScale;
  active: boolean;
  createdAt: Date;
}

/** Resultado de enfermagem NOC — escala Likert 1–5 própria (ver NocScale). */
export class NursingOutcome {
  private constructor(private readonly state: NursingOutcomeState) {}

  static create(props: NursingOutcomeProps): NursingOutcome {
    if (!CODE_PATTERN.test(props.code)) {
      throw new ValidationError('Código NOC deve ter 4 dígitos (ex.: 1101)');
    }
    const label = props.label.trim();
    if (label.length === 0) {
      throw new ValidationError('Rótulo do resultado é obrigatório');
    }
    const domain = props.domain.trim();
    const outcomeClass = props.class.trim();
    if (domain.length === 0 || outcomeClass.length === 0) {
      throw new ValidationError('Domínio e classe NOC são obrigatórios');
    }
    const edition = props.edition.trim();
    if (edition.length === 0) {
      throw new ValidationError('Edição da taxonomia é obrigatória');
    }
    return new NursingOutcome({
      id: newId(),
      code: props.code,
      label,
      domain,
      class: outcomeClass,
      edition,
      scale: NocScale.create(props.scaleAnchors),
      active: true,
      createdAt: new Date(),
    });
  }

  static restore(state: NursingOutcomeState): NursingOutcome {
    return new NursingOutcome({ ...state });
  }

  deactivate(): NursingOutcome {
    return new NursingOutcome({ ...this.state, active: false });
  }

  reactivate(): NursingOutcome {
    return new NursingOutcome({ ...this.state, active: true });
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

  get scale(): NocScale {
    return this.state.scale;
  }

  get isActive(): boolean {
    return this.state.active;
  }

  get createdAt(): Date {
    return this.state.createdAt;
  }
}
