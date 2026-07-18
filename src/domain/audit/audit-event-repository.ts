import type { AuditEvent } from "./audit-event";

export interface AuditEventFilter {
  patientId?: string;
  from?: Date;
  to?: Date;
}

export interface AuditEventPage {
  limit?: number;
  offset?: number;
}

/** Append-only: sem update nem delete — integridade da trilha. */
export interface AuditEventRepository {
  save(event: AuditEvent): Promise<void>;
  findAll(filter?: AuditEventFilter, page?: AuditEventPage): Promise<AuditEvent[]>;
}
