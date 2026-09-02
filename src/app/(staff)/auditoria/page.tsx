"use client";

import { useState } from "react";
import type { AuditEventDto, PatientDto } from "@/lib/dto";
import { useApiQuery } from "@/lib/use-api-query";
import { usePagedQuery } from "@/lib/use-paged-query";
import { formatDateTime } from "@/lib/format";
import { ErrorAlert } from "@/components/feedback";
import { LoadMoreButton } from "@/components/load-more-button";
import { PagedList } from "@/components/paged-list";
import {
  Card,
  NativeSelect,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@still-void/ui/react";

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
        <NativeSelect value={patientId} onChange={(e) => setPatientId(e.target.value)}>
          <option value="">Todos os pacientes</option>
          {(patients ?? []).map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.fullName}
            </option>
          ))}
        </NativeSelect>
      </div>

      <p className="mb-4 text-sm text-ink-3">
        Trilha imutável de acessos e alterações em dados clínicos (LGPD art. 11). Somente
        metadados — nunca conteúdo de prontuário.
      </p>

      {error && <ErrorAlert message={error} />}

      <Card>
        <PagedList
          items={events}
          emptyMessage="Nenhum evento de auditoria registrado."
          render={(list) => (
            <div className="overflow-x-auto">
              <Table className="w-full text-left text-sm">
                <TableHeader>
                  <TableRow>
                    <TableHead className="px-4 py-3">Quando</TableHead>
                    <TableHead className="px-4 py-3">Ator</TableHead>
                    <TableHead className="px-4 py-3">Ação</TableHead>
                    <TableHead className="px-4 py-3">Recurso</TableHead>
                    <TableHead className="px-4 py-3">Paciente</TableHead>
                    <TableHead className="px-4 py-3">Detalhe</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {list.map((event) => (
                    <TableRow key={event.id}>
                      <TableCell className="whitespace-nowrap px-4 py-2 text-ink-2">
                        {formatDateTime(event.occurredAt)}
                      </TableCell>
                      <TableCell className="px-4 py-2">
                        <span className="font-medium">{event.actorRole}</span>
                        <span className="block text-xs text-ink-3">{event.actorId}</span>
                      </TableCell>
                      <TableCell className="px-4 py-2">{ACTION_LABELS[event.action] ?? event.action}</TableCell>
                      <TableCell className="px-4 py-2">
                        {RESOURCE_LABELS[event.resourceType] ?? event.resourceType}
                      </TableCell>
                      <TableCell className="px-4 py-2 text-ink-2">
                        {event.patientId
                          ? (patientNames.get(event.patientId) ?? event.patientId)
                          : "—"}
                      </TableCell>
                      <TableCell className="px-4 py-2 text-ink-3">{event.detail ?? "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        />
      </Card>

      <LoadMoreButton visible={Boolean(events) && hasMore} onClick={loadMore} />
    </div>
  );
}
