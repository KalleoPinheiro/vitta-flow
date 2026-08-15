import { after } from "next/server";
import { AuditEvent, type AuditAction } from "@/domain/audit/audit-event";
import type { AuditEventRepository } from "@/domain/audit/audit-event-repository";
import type { Session } from "@/lib/auth/session";

export interface AuditInput {
  action: AuditAction;
  resourceType: string;
  resourceId: string;
  patientId?: string | null;
  detail?: string | null;
}

/**
 * Registra evento de auditoria após a resposta (after()), best-effort:
 * falha de auditoria nunca falha o request — é logada no servidor.
 * Sem sessão (dev aberto), registra ator "anonymous" para não perder a trilha.
 */
export function recordAudit(
  auditEvents: AuditEventRepository,
  session: Session | null,
  input: AuditInput,
): void {
  after(async () => {
    try {
      await persistAuditEvent(auditEvents, session, input);
    } catch (error) {
      console.error("Auditoria: falha ao registrar evento", error);
    }
  });
}

/**
 * Variante write-ahead para ações críticas (exportação LGPD, exclusão de foto):
 * o evento é persistido ANTES da resposta e uma falha de auditoria falha a
 * requisição — sucesso silencioso sem trilha não é aceitável nesses fluxos.
 */
export async function recordAuditNow(
  auditEvents: AuditEventRepository,
  session: Session | null,
  input: AuditInput,
): Promise<void> {
  await persistAuditEvent(auditEvents, session, input);
}

async function persistAuditEvent(
  auditEvents: AuditEventRepository,
  session: Session | null,
  input: AuditInput,
): Promise<void> {
  await auditEvents.save(
    AuditEvent.create({
      actorRole: session?.role ?? "anonymous",
      actorId: session?.subject ?? "anonymous",
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      patientId: input.patientId ?? null,
      detail: input.detail ?? null,
    }),
  );
}
