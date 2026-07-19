import { ValidationError } from "../shared/errors";
import { newId } from "../shared/id";

export interface ProfessionalProps {
  fullName: string;
  /** Registro profissional (ex.: COREN-SP 123456). */
  registry?: string | null;
  /** Percentual de repasse sobre a receita das consultas concluídas (0–100). */
  commissionPct?: number | null;
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
    const pct = props.commissionPct ?? null;
    if (pct != null && (!Number.isInteger(pct) || pct < 0 || pct > 100)) {
      throw new ValidationError("Repasse deve ser um percentual inteiro de 0 a 100");
    }
    return { fullName, registry: props.registry?.trim() || null, commissionPct: pct };
  }

  update(changes: Partial<ProfessionalProps>): Professional {
    const validated = Professional.validate({
      fullName: changes.fullName ?? this.state.fullName,
      registry: changes.registry !== undefined ? changes.registry : this.state.registry,
      commissionPct:
        changes.commissionPct !== undefined ? changes.commissionPct : this.state.commissionPct,
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

  get commissionPct(): number | null {
    return this.state.commissionPct ?? null;
  }

  get isActive(): boolean {
    return this.state.active;
  }

  get createdAt(): Date {
    return this.state.createdAt;
  }
}
