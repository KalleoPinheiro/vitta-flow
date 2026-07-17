import { newId } from "../shared/id";
import { validatePersonContact } from "../shared/person-validation";

export interface PartnerProps {
  fullName: string;
  email: string;
  phone: string;
  crm?: string | null;
  specialty?: string | null;
}

export interface PartnerState extends PartnerProps {
  id: string;
  active: boolean;
  createdAt: Date;
}

/** Médico parceiro que indica pacientes à clínica. */
export class Partner {
  private constructor(private readonly state: PartnerState) {}

  static create(props: PartnerProps): Partner {
    return new Partner({
      ...Partner.validate(props),
      id: newId(),
      active: true,
      createdAt: new Date(),
    });
  }

  static restore(state: PartnerState): Partner {
    return new Partner({ ...state });
  }

  private static validate(props: PartnerProps): PartnerProps {
    return {
      ...validatePersonContact(props),
      crm: props.crm?.trim() || null,
      specialty: props.specialty?.trim() || null,
    };
  }

  update(changes: Partial<PartnerProps>): Partner {
    const validated = Partner.validate({
      fullName: changes.fullName ?? this.state.fullName,
      email: changes.email ?? this.state.email,
      phone: changes.phone ?? this.state.phone,
      crm: changes.crm !== undefined ? changes.crm : this.state.crm,
      specialty: changes.specialty !== undefined ? changes.specialty : this.state.specialty,
    });
    return new Partner({ ...this.state, ...validated });
  }

  deactivate(): Partner {
    return new Partner({ ...this.state, active: false });
  }

  reactivate(): Partner {
    return new Partner({ ...this.state, active: true });
  }

  get id(): string {
    return this.state.id;
  }

  get fullName(): string {
    return this.state.fullName;
  }

  get email(): string {
    return this.state.email;
  }

  get phone(): string {
    return this.state.phone;
  }

  get crm(): string | null {
    return this.state.crm ?? null;
  }

  get specialty(): string | null {
    return this.state.specialty ?? null;
  }

  get isActive(): boolean {
    return this.state.active;
  }

  get createdAt(): Date {
    return this.state.createdAt;
  }
}
