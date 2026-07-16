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

export class Anamnesis {
  private constructor(private readonly state: AnamnesisState) {}

  static create(props: AnamnesisProps): Anamnesis {
    if (props.patientId.trim().length === 0) {
      throw new ValidationError("Paciente é obrigatório");
    }
    return new Anamnesis({
      patientId: props.patientId,
      comorbidities: props.comorbidities?.trim() ?? "",
      allergies: props.allergies?.trim() ?? "",
      medications: props.medications?.trim() ?? "",
      surgicalHistory: props.surgicalHistory?.trim() ?? "",
      notes: props.notes?.trim() ?? "",
      updatedAt: new Date(),
    });
  }

  static restore(state: AnamnesisState): Anamnesis {
    return new Anamnesis({ ...state });
  }

  update(changes: Omit<Partial<AnamnesisProps>, "patientId">): Anamnesis {
    return new Anamnesis({
      ...this.state,
      comorbidities: changes.comorbidities?.trim() ?? this.state.comorbidities,
      allergies: changes.allergies?.trim() ?? this.state.allergies,
      medications: changes.medications?.trim() ?? this.state.medications,
      surgicalHistory: changes.surgicalHistory?.trim() ?? this.state.surgicalHistory,
      notes: changes.notes?.trim() ?? this.state.notes,
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
