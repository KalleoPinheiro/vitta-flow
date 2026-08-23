"use client";

import { useState } from "react";
import type { AuditEventDto, PatientDto } from "@/lib/dto";
import { useApiQuery } from "@/lib/use-api-query";
import { usePagedQuery } from "@/lib/use-paged-query";
import { formatDateTime } from "@/lib/format";
import { ErrorAlert } from "@/components/feedback";
import { LoadMoreButton } from "@/components/load-more-button";
import { PagedList } from "@/components/paged-list";
import { Card } from "@still-void/ui/react";
import { nativeField } from "@/lib/ui";

const PAGE_SIZE = 100;

const ACTION_LABELS: Record<string, string> = {
  read: "Leitura",
  create: "Criação",
  update: "Alteração",
  delete: "Exclusão",
};

const RESOURCE_LABELS: Record<string, string> = {
  anamnesis: "Anamnese",
  evolution: "Evolução",
  evolutions: "Evoluções",
  condition: "Condição",
  conditions: "Condições",
  assessment: "Avaliação",
  assessments: "Avaliações",
  "portal-patient": "Portal do paciente",
  "portal-partner": "Portal do parceiro",
  photo: "Foto",
  document: "Documento",
};

export default function AuditPage() {
  const [patientId, setPatientId] = useState("");
  const { data: patients } = useApiQuery<PatientDto[]>("/api/patients");

  const query = patientId ? `?patientId=${encodeURIComponent(patientId)}` : "";
  const {
    items: events,
    hasMore,
    error,
    loadMore,
  } = usePagedQuery<AuditEventDto>(`/api/audit${query}`, PAGE_SIZE);

  const patientNames = new Map((patients ?? []).map((p) => [p.id, p.fullName]));

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="sv-display text-2xl font-bold">Auditoria de prontuário</h1>
        {/* sv-gap: native-select */}
        <select
          value={patientId}
          onChange={(e) => setPatientId(e.target.value)}
          className={nativeField}
        >
          <option value="">Todos os pacientes</option>
          {(patients ?? []).map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.fullName}
            </option>
          ))}
        </select>
      </div>

      <p className="mb-4 text-sm text-ink-3">
        Trilha imutável de acessos e alterações em dados clínicos (LGPD art. 11). Somente
        metadados — nunca conteúdo de prontuário.
      </p>

      {error && <ErrorAlert message={error} />}

      <Card className="overflow-x-auto">
        <PagedList
          items={events}
          emptyMessage="Nenhum evento de auditoria registrado."
          render={(list) => (
            // sv-gap: table
            <table className="w-full text-left text-sm">
              <thead className="border-b border-border bg-bg text-xs uppercase text-ink-3">
                <tr>
                  <th className="px-4 py-3">Quando</th>
                  <th className="px-4 py-3">Ator</th>
                  <th className="px-4 py-3">Ação</th>
                  <th className="px-4 py-3">Recurso</th>
                  <th className="px-4 py-3">Paciente</th>
                  <th className="px-4 py-3">Detalhe</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {list.map((event) => (
                  <tr key={event.id}>
                    <td className="whitespace-nowrap px-4 py-2 text-ink-2">
                      {formatDateTime(event.occurredAt)}
                    </td>
                    <td className="px-4 py-2">
                      <span className="font-medium">{event.actorRole}</span>
                      <span className="block text-xs text-ink-3">{event.actorId}</span>
                    </td>
                    <td className="px-4 py-2">{ACTION_LABELS[event.action] ?? event.action}</td>
                    <td className="px-4 py-2">
                      {RESOURCE_LABELS[event.resourceType] ?? event.resourceType}
                    </td>
                    <td className="px-4 py-2 text-ink-2">
                      {event.patientId
                        ? (patientNames.get(event.patientId) ?? event.patientId)
                        : "—"}
                    </td>
                    <td className="px-4 py-2 text-ink-3">{event.detail ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        />
      </Card>

      <LoadMoreButton visible={Boolean(events) && hasMore} onClick={loadMore} />
    </div>
  );
}
