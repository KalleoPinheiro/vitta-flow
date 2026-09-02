import { createHash } from "node:crypto";
import { ValidationError } from "../shared/errors";
import { newId } from "../shared/id";

/** "accept": aceite do termo. "revoke": revogação — nunca apaga o aceite original (append-only). */
export type ConsentRecordKind = "accept" | "revoke";

export interface ConsentRecordState {
  id: string;
  patientId: string;
  kind: ConsentRecordKind;
  /** SHA-256 do texto exato exibido no aceite — mudou o texto, novo aceite. Vazio em revogações. */
  textHash: string;
  /** Versão do termo (`CONSENT_TEXT_VERSION`) vigente no momento do aceite. Nula em revogações e em linhas legadas pré-#70. */
  textVersion: string | null;
  /** IP de origem do aceite (evidência). */
  ipAddress: string | null;
  acceptedAt: Date;
}

/** Estado de linha legada (pré-#70): sem `kind`/`textVersion` gravados. */
type LegacyConsentRecordState = Omit<ConsentRecordState, "kind" | "textVersion"> &
  Partial<Pick<ConsentRecordState, "kind" | "textVersion">>;

export const hashConsentText = (text: string): string =>
  createHash("sha256").update(text, "utf8").digest("hex");

/** Aceite digital do termo de consentimento — registro imutável (append-only). */
export class ConsentRecord {
  private constructor(private readonly state: ConsentRecordState) {}

  static create(input: {
    patientId: string;
    consentText: string;
    textVersion: string;
    ipAddress?: string | null;
  }): ConsentRecord {
    if (!input.patientId.trim()) {
      throw new ValidationError("Paciente é obrigatório");
    }
    if (!input.consentText.trim()) {
      throw new ValidationError("Texto do termo é obrigatório");
    }
    if (!input.textVersion.trim()) {
      throw new ValidationError("Versão do termo é obrigatória");
    }
    return new ConsentRecord({
      id: newId(),
      patientId: input.patientId,
      kind: "accept",
      textHash: hashConsentText(input.consentText),
      textVersion: input.textVersion,
      ipAddress: input.ipAddress?.trim() || null,
      acceptedAt: new Date(),
    });
  }

  /** Registra revogação — não apaga o aceite original, cria um novo registro append-only. */
  static revoke(input: { patientId: string; ipAddress?: string | null }): ConsentRecord {
    if (!input.patientId.trim()) {
      throw new ValidationError("Paciente é obrigatório");
    }
    return new ConsentRecord({
      id: newId(),
      patientId: input.patientId,
      kind: "revoke",
      textHash: "",
      textVersion: null,
      ipAddress: input.ipAddress?.trim() || null,
      acceptedAt: new Date(),
    });
  }

  static restore(state: LegacyConsentRecordState): ConsentRecord {
    return new ConsentRecord({
      ...state,
      kind: state.kind ?? "accept",
      textVersion: state.textVersion ?? null,
    });
  }

  /**
   * Resolve o status atual de consentimento a partir do histórico completo
   * (qualquer ordem): olha só o registro mais recente por `acceptedAt`
   * (empate resolvido a favor da revogação — o desfecho mais restritivo — já
   * que `acceptedAt` tem resolução de milissegundo e duas chamadas em rápida
   * sucessão podem colidir).
   * Revogação mais recente → não aceito. Aceite mais recente que não cobre o
   * texto vigente (versão antiga) → não aceito. Sem nenhum registro → não
   * aceito, `current: null` (distinto de revogado — ver Edge Cases da spec).
   *
   * `latestAccept` é sempre o aceite mais recente, independente do resultado
   * de `accepted` — necessário pra exibir "sob qual versão/quando foi o
   * último aceite" mesmo quando o status atual é revogado (AC-70-2): usar
   * `current.acceptedAt` nesse caso devolveria o horário da REVOGAÇÃO como se
   * fosse data de aceite.
   */
  static resolveStatus(
    records: readonly ConsentRecord[],
    consentText: string,
  ): { accepted: boolean; current: ConsentRecord | null; latestAccept: ConsentRecord | null } {
    const latestAccept =
      records
        .filter((record) => record.kind === "accept")
        .sort((a, b) => b.state.acceptedAt.getTime() - a.state.acceptedAt.getTime())[0] ?? null;

    if (records.length === 0) {
      return { accepted: false, current: null, latestAccept: null };
    }
    const latest = [...records].sort(
      (a, b) =>
        b.state.acceptedAt.getTime() - a.state.acceptedAt.getTime() ||
        (a.kind === "revoke" ? -1 : 1),
    )[0];
    if (latest.kind === "revoke") {
      return { accepted: false, current: latest, latestAccept };
    }
    return { accepted: latest.covers(consentText), current: latest, latestAccept };
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

  get kind(): ConsentRecordKind {
    return this.state.kind;
  }

  get textHash(): string {
    return this.state.textHash;
  }

  get textVersion(): string | null {
    return this.state.textVersion;
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
  /** Registro mais recente por `acceptedAt` (qualquer `kind`) — usado pra resolver status. */
  findLatestByPatientId(patientId: string): Promise<ConsentRecord | null>;
}
