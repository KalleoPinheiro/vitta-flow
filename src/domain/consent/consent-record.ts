import { createHash } from "node:crypto";
import { ValidationError } from "../shared/errors";
import { newId } from "../shared/id";

export interface ConsentRecordState {
  id: string;
  patientId: string;
  /** SHA-256 do texto exato exibido no aceite — mudou o texto, novo aceite. */
  textHash: string;
  /** IP de origem do aceite (evidência). */
  ipAddress: string | null;
  acceptedAt: Date;
}

export const hashConsentText = (text: string): string =>
  createHash("sha256").update(text, "utf8").digest("hex");

/** Aceite digital do termo de consentimento — registro imutável (append-only). */
export class ConsentRecord {
  private constructor(private readonly state: ConsentRecordState) {}

  static create(input: {
    patientId: string;
    consentText: string;
    ipAddress?: string | null;
  }): ConsentRecord {
    if (!input.patientId.trim()) {
      throw new ValidationError("Paciente é obrigatório");
    }
    if (!input.consentText.trim()) {
      throw new ValidationError("Texto do termo é obrigatório");
    }
    return new ConsentRecord({
      id: newId(),
      patientId: input.patientId,
      textHash: hashConsentText(input.consentText),
      ipAddress: input.ipAddress?.trim() || null,
      acceptedAt: new Date(),
    });
  }

  static restore(state: ConsentRecordState): ConsentRecord {
    return new ConsentRecord({ ...state });
  }

  /** O aceite cobre este texto? (hash idêntico) */
  covers(consentText: string): boolean {
    return this.state.textHash === hashConsentText(consentText);
  }

  get id(): string {
    return this.state.id;
  }

  get patientId(): string {
    return this.state.patientId;
  }

  get textHash(): string {
    return this.state.textHash;
  }

  get ipAddress(): string | null {
    return this.state.ipAddress;
  }

  get acceptedAt(): Date {
    return this.state.acceptedAt;
  }
}

export interface ConsentRecordRepository {
  save(record: ConsentRecord): Promise<void>;
  findByPatientId(patientId: string): Promise<ConsentRecord[]>;
}
