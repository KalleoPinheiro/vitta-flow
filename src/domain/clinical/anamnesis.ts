import { ValidationError } from "../shared/errors";

export interface AnamnesisProps {
  patientId: string;
  comorbidities?: string;
  allergies?: string;
  medications?: string;
  surgicalHistory?: string;
  notes?: string;
}

export interface AnamnesisState {
  patientId: string;
  comorbidities: string;
  allergies: string;
  medications: string;
  surgicalHistory: string;
  notes: string;
  updatedAt: Date;
}

const TEXT_FIELDS = [
  "comorbidities",
  "allergies",
  "medications",
  "surgicalHistory",
  "notes",
] as const;

type AnamnesisTextField = (typeof TEXT_FIELDS)[number];

const mergeTextFields = (
  base: Record<AnamnesisTextField, string>,
  changes: Partial<Record<AnamnesisTextField, string>>,
): Record<AnamnesisTextField, string> =>
  Object.fromEntries(
    TEXT_FIELDS.map((field) => [field, changes[field]?.trim() ?? base[field]]),
  ) as Record<AnamnesisTextField, string>;

const EMPTY_FIELDS: Record<AnamnesisTextField, string> = {
  comorbidities: "",
  allergies: "",
  medications: "",
  surgicalHistory: "",
  notes: "",
};

export class Anamnesis {
  private constructor(private readonly state: AnamnesisState) {}

  static create(props: AnamnesisProps): Anamnesis {
    if (props.patientId.trim().length === 0) {
      throw new ValidationError("Paciente é obrigatório");
    }
    return new Anamnesis({
      patientId: props.patientId,
      ...mergeTextFields(EMPTY_FIELDS, props),
      updatedAt: new Date(),
    });
  }

  static restore(state: AnamnesisState): Anamnesis {
    return new Anamnesis({ ...state });
  }

  update(changes: Omit<Partial<AnamnesisProps>, "patientId">): Anamnesis {
    return new Anamnesis({
      ...this.state,
      ...mergeTextFields(this.state, changes),
      updatedAt: new Date(),
    });
  }

  get patientId(): string {
    return this.state.patientId;
  }

  get comorbidities(): string {
    return this.state.comorbidities;
  }

  get allergies(): string {
    return this.state.allergies;
  }

  get medications(): string {
    return this.state.medications;
  }

  get surgicalHistory(): string {
    return this.state.surgicalHistory;
  }

  get notes(): string {
    return this.state.notes;
  }

  get updatedAt(): Date {
    return this.state.updatedAt;
  }
}
