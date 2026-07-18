import { ValidationError } from "../shared/errors";
import { newId } from "../shared/id";

export interface ProfessionalProps {
  fullName: string;
  /** Registro profissional (ex.: COREN-SP 123456). */
  registry?: string | null;
}

export interface ProfessionalState extends ProfessionalProps {
  id: string;
  active: boolean;
  createdAt: Date;
}

/** Profissional da equipe que atende e assina evoluções. */
export class Professional {
  private constructor(private readonly state: ProfessionalState) {}

  static create(props: ProfessionalProps): Professional {
    return new Professional({
      ...Professional.validate(props),
      id: newId(),
      active: true,
      createdAt: new Date(),
    });
  }

  static restore(state: ProfessionalState): Professional {
    return new Professional({ ...state });
  }

  private static validate(props: ProfessionalProps): ProfessionalProps {
    const fullName = props.fullName.trim();
    if (fullName.length === 0) {
      throw new ValidationError("Nome do profissional é obrigatório");
    }
    return { fullName, registry: props.registry?.trim() || null };
  }

  update(changes: Partial<ProfessionalProps>): Professional {
    const validated = Professional.validate({
      fullName: changes.fullName ?? this.state.fullName,
      registry: changes.registry !== undefined ? changes.registry : this.state.registry,
    });
    return new Professional({ ...this.state, ...validated });
  }

  deactivate(): Professional {
    return new Professional({ ...this.state, active: false });
  }

  reactivate(): Professional {
    return new Professional({ ...this.state, active: true });
  }

  get id(): string {
    return this.state.id;
  }

  get fullName(): string {
    return this.state.fullName;
  }

  get registry(): string | null {
    return this.state.registry ?? null;
  }

  get isActive(): boolean {
    return this.state.active;
  }

  get createdAt(): Date {
    return this.state.createdAt;
  }
}
