import { ValidationError } from "../shared/errors";
import { newId } from "../shared/id";

export interface ClinicProps {
  name: string;
  createdBy: string;
}

/** Dados cadastrais (issue #61) — usados em documentos clínicos emitidos (issue #62). */
export interface ClinicInfoFields {
  cnpj?: string | null;
  address?: string | null;
  city?: string | null;
  professionalName?: string | null;
  professionalRegistry?: string | null;
}

export interface ClinicState extends ClinicProps, ClinicInfoFields {
  id: string;
  createdAt: Date;
}

/**
 * `true` só quando os 3 campos com relevância jurídica direta na assinatura de
 * um documento estão presentes — `address`/`city` continuam opcionais (#62).
 */
export function isClinicInfoComplete(
  info: Pick<ClinicInfoFields, "cnpj" | "professionalName" | "professionalRegistry"> | null,
): boolean {
  return Boolean(info?.cnpj?.trim() && info?.professionalName?.trim() && info?.professionalRegistry?.trim());
}

const normalizeField = (value: string | null | undefined): string | null => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
};

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
      cnpj: null,
      address: null,
      city: null,
      professionalName: null,
      professionalRegistry: null,
    });
  }

  static restore(state: ClinicState): Clinic {
    return new Clinic({
      ...state,
      cnpj: state.cnpj ?? null,
      address: state.address ?? null,
      city: state.city ?? null,
      professionalName: state.professionalName ?? null,
      professionalRegistry: state.professionalRegistry ?? null,
    });
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

  get cnpj(): string | null {
    return this.state.cnpj ?? null;
  }

  get address(): string | null {
    return this.state.address ?? null;
  }

  get city(): string | null {
    return this.state.city ?? null;
  }

  get professionalName(): string | null {
    return this.state.professionalName ?? null;
  }

  get professionalRegistry(): string | null {
    return this.state.professionalRegistry ?? null;
  }

  /** Retorna uma nova instância com os campos cadastrais atualizados (imutável). */
  updateInfo(fields: ClinicInfoFields): Clinic {
    return new Clinic({
      ...this.state,
      cnpj: "cnpj" in fields ? normalizeField(fields.cnpj) : this.state.cnpj,
      address: "address" in fields ? normalizeField(fields.address) : this.state.address,
      city: "city" in fields ? normalizeField(fields.city) : this.state.city,
      professionalName:
        "professionalName" in fields
          ? normalizeField(fields.professionalName)
          : this.state.professionalName,
      professionalRegistry:
        "professionalRegistry" in fields
          ? normalizeField(fields.professionalRegistry)
          : this.state.professionalRegistry,
    });
  }

  isCompleteForDocumentEmission(): boolean {
    return isClinicInfoComplete(this.state);
  }
}
