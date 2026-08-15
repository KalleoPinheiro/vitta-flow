import type { NextRequest } from "next/server";
import { getRepositories } from "@/infrastructure/container";
import { ConsentRecord } from "@/domain/consent/consent-record";
import { CONSENT_TEXT } from "@/lib/consent-text";
import { requirePortalSession } from "@/lib/auth/require-session";
import { handleRequest } from "@/lib/api-response";
import { recordAudit } from "@/lib/audit";
import { NotFoundError } from "@/domain/shared/errors";

/** Texto vigente + status do aceite do paciente logado. */
export async function GET(request: NextRequest) {
  const auth = requirePortalSession(request, "patient");
  if (!auth.ok) return auth.response;

  return handleRequest(async () => {
    const { patients, consentRecords } = await getRepositories();
    const patient = await patients.findByEmail(auth.session.subject);
    if (!patient) {
      throw new NotFoundError("Paciente", auth.session.subject);
    }
    const records = await consentRecords.findByPatientId(patient.id);
    const current = records.find((record) => record.covers(CONSENT_TEXT)) ?? null;
    return {
      consentText: CONSENT_TEXT,
      accepted: current !== null,
      acceptedAt: current?.acceptedAt.toISOString() ?? null,
    };
  });
}

/** Aceite digital: grava hash do texto exato + data + IP (evidência LGPD). */
export async function POST(request: NextRequest) {
  const auth = requirePortalSession(request, "patient");
  if (!auth.ok) return auth.response;

  return handleRequest(async () => {
    const { patients, consentRecords, auditEvents } = await getRepositories();
    const patient = await patients.findByEmail(auth.session.subject);
    if (!patient || !patient.isActive) {
      throw new NotFoundError("Paciente", auth.session.subject);
    }

    const existing = await consentRecords.findByPatientId(patient.id);
    const already = existing.find((record) => record.covers(CONSENT_TEXT));
    if (already) {
      return { accepted: true, acceptedAt: already.acceptedAt.toISOString() };
    }

    const record = ConsentRecord.create({
      patientId: patient.id,
      consentText: CONSENT_TEXT,
      ipAddress: request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
    });
    await consentRecords.save(record);

    recordAudit(auditEvents, auth.session, {
      action: "create",
      resourceType: "consent",
      resourceId: record.id,
      patientId: patient.id,
      detail: `hash ${record.textHash.slice(0, 12)}…`,
    });
    return { accepted: true, acceptedAt: record.acceptedAt.toISOString() };
  });
}
