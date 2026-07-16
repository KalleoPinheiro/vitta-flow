import { InvalidStatusTransitionError, ValidationError } from "../shared/errors";
import { newId } from "../shared/id";

export const CONDITION_KINDS = ["stoma", "wound"] as const;
export type ConditionKind = (typeof CONDITION_KINDS)[number];

export const STOMA_TYPES = ["colostomia", "ileostomia", "urostomia"] as const;
export type StomaType = (typeof STOMA_TYPES)[number];

export const CONDITION_STATUSES = ["active", "resolved"] as const;
export type ConditionStatus = (typeof CONDITION_STATUSES)[number];

export interface ClinicalConditionProps {
  patientId: string;
  kind: ConditionKind;
  title: string;
  stomaType?: StomaType | null;
  startedAt?: Date | null;
  notes?: string | null;
}

export interface ClinicalConditionState extends ClinicalConditionProps {
  id: string;
  status: ConditionStatus;
  createdAt: Date;
}

export class ClinicalCondition {
  private constructor(private readonly state: ClinicalConditionState) {}

  static create(props: ClinicalConditionProps): ClinicalCondition {
    const title = props.title.trim();
    if (title.length === 0) {
      throw new ValidationError("Título da condição é obrigatório");
    }
    if (props.patientId.trim().length === 0) {
      throw new ValidationError("Paciente é obrigatório");
    }
    if (props.kind === "stoma" && !props.stomaType) {
      throw new ValidationError("Estomia exige o tipo (colostomia, ileostomia ou urostomia)");
    }

    return new ClinicalCondition({
      patientId: props.patientId,
      kind: props.kind,
      title,
      stomaType: props.kind === "stoma" ? props.stomaType : null,
      startedAt: props.startedAt ?? null,
      notes: props.notes ?? null,
      id: newId(),
      status: "active",
      createdAt: new Date(),
    });
  }

  static restore(state: ClinicalConditionState): ClinicalCondition {
    return new ClinicalCondition({ ...state });
  }

  resolve(): ClinicalCondition {
    if (this.state.status !== "active") {
      throw new InvalidStatusTransitionError("Condição já está resolvida");
    }
    return new ClinicalCondition({ ...this.state, status: "resolved" });
  }

  get id(): string {
    return this.state.id;
  }

  get patientId(): string {
    return this.state.patientId;
  }

  get kind(): ConditionKind {
    return this.state.kind;
  }

  get title(): string {
    return this.state.title;
  }

  get stomaType(): StomaType | null {
    return this.state.stomaType ?? null;
  }

  get startedAt(): Date | null {
    return this.state.startedAt ?? null;
  }

  get notes(): string | null {
    return this.state.notes ?? null;
  }

  get status(): ConditionStatus {
    return this.state.status;
  }

  get isActive(): boolean {
    return this.state.status === "active";
  }

  get createdAt(): Date {
    return this.state.createdAt;
  }
}
