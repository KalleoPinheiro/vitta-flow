import { ValidationError } from "../shared/errors";
import { newId } from "../shared/id";

export interface ProcedureProps {
  name: string;
  priceCents: number;
  durationMinutes: number;
}

export interface ProcedureState extends ProcedureProps {
  id: string;
  active: boolean;
  createdAt: Date;
}

const MAX_DURATION_MINUTES = 8 * 60;

/** Procedimento do catálogo — fonte única de nome, preço e duração padrão. */
export class Procedure {
  private constructor(private readonly state: ProcedureState) {}

  static create(props: ProcedureProps): Procedure {
    return new Procedure({
      ...Procedure.validate(props),
      id: newId(),
      active: true,
      createdAt: new Date(),
    });
  }

  static restore(state: ProcedureState): Procedure {
    return new Procedure({ ...state });
  }

  private static validate(props: ProcedureProps): ProcedureProps {
    const name = props.name.trim();
    if (name.length === 0) {
      throw new ValidationError("Nome do procedimento é obrigatório");
    }
    if (!Number.isInteger(props.priceCents) || props.priceCents < 0) {
      throw new ValidationError("Preço padrão não pode ser negativo");
    }
    if (
      !Number.isInteger(props.durationMinutes) ||
      props.durationMinutes <= 0 ||
      props.durationMinutes > MAX_DURATION_MINUTES
    ) {
      throw new ValidationError("Duração padrão deve ser entre 1 minuto e 8 horas");
    }
    return { name, priceCents: props.priceCents, durationMinutes: props.durationMinutes };
  }

  update(changes: Partial<ProcedureProps>): Procedure {
    const validated = Procedure.validate({
      name: changes.name ?? this.state.name,
      priceCents: changes.priceCents ?? this.state.priceCents,
      durationMinutes: changes.durationMinutes ?? this.state.durationMinutes,
    });
    return new Procedure({ ...this.state, ...validated });
  }

  deactivate(): Procedure {
    return new Procedure({ ...this.state, active: false });
  }

  reactivate(): Procedure {
    return new Procedure({ ...this.state, active: true });
  }

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  get priceCents(): number {
    return this.state.priceCents;
  }

  get durationMinutes(): number {
    return this.state.durationMinutes;
  }

  get isActive(): boolean {
    return this.state.active;
  }

  get createdAt(): Date {
    return this.state.createdAt;
  }
}
