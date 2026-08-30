import { ValidationError } from "../shared/errors";
import { newId } from "../shared/id";

export interface ClinicProps {
  name: string;
  createdBy: string;
}

export interface ClinicState extends ClinicProps {
  id: string;
  createdAt: Date;
}

/** Empresa/clínica — unidade de isolamento de dados (multi-tenancy). */
export class Clinic {
  private constructor(private readonly state: ClinicState) {}

  static create(props: ClinicProps): Clinic {
    if (!props.name.trim()) {
      throw new ValidationError("Nome da clínica é obrigatório");
    }
    if (!props.createdBy.trim()) {
      throw new ValidationError("Criador da clínica é obrigatório");
    }
    return new Clinic({
      name: props.name.trim(),
      createdBy: props.createdBy,
      id: newId(),
      createdAt: new Date(),
    });
  }

  static restore(state: ClinicState): Clinic {
    return new Clinic({ ...state });
  }

  get id(): string {
    return this.state.id;
  }

  get name(): string {
    return this.state.name;
  }

  get createdBy(): string {
    return this.state.createdBy;
  }

  get createdAt(): Date {
    return this.state.createdAt;
  }
}
