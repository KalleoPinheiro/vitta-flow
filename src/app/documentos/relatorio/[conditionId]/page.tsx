"use client";

import { use } from "react";
import type { AssessmentDto, ConditionDto, PatientDto } from "@/lib/dto";
import { useApiQuery } from "@/lib/use-api-query";
import {
  CONDITION_KIND_LABELS,
  EXUDATE_LABELS,
  STOMA_TYPE_LABELS,
  formatDate,
} from "@/lib/format";
import { ErrorAlert, LoadingIndicator } from "@/components/feedback";
import { DocumentFrame, type ClinicInfoDto } from "@/components/document-frame";
import { HealingChart } from "@/components/healing-chart";

/**
 * Relatório de evolução clínica para o médico parceiro — mesma minimização do
 * portal do parceiro: sem anamnese e sem qualquer dado financeiro.
 */
export default function PartnerReportPage({
  params,
}: {
  params: Promise<{ conditionId: string }>;
}) {
  const { conditionId } = use(params);
  const { data: clinic } = useApiQuery<ClinicInfoDto>("/api/clinic-info");
  const { data: condition, error } = useApiQuery<ConditionDto | null>(
    `/api/conditions/${conditionId}`,
  );
  const { data: assessments } = useApiQuery<AssessmentDto[]>(
    `/api/conditions/${conditionId}/assessments`,
  );

  if (error) return <ErrorAlert message={error} />;
  if (!clinic || condition === undefined || !assessments) return <LoadingIndicator />;
  if (condition === null) return <ErrorAlert message="Condição não encontrada" />;

  return <ReportContent clinic={clinic} condition={condition} assessments={assessments} />;
}

function ReportContent({
  clinic,
  condition,
  assessments,
}: {
  clinic: ClinicInfoDto;
  condition: ConditionDto;
  assessments: AssessmentDto[];
}) {
  const { data: patient } = useApiQuery<PatientDto>(`/api/patients/${condition.patientId}`);
  const chronological = [...assessments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );

  return (
    <DocumentFrame clinic={clinic} title="Relatório de Evolução Clínica">
      <p className="mb-1">
        <strong>Paciente:</strong> {patient?.fullName ?? "—"}
      </p>
      <p className="mb-1">
        <strong>Condição:</strong> {condition.title} (
        {CONDITION_KIND_LABELS[condition.kind] ?? condition.kind}
        {condition.stomaType
          ? ` — ${STOMA_TYPE_LABELS[condition.stomaType] ?? condition.stomaType}`
          : ""}
        )
      </p>
      <p className="mb-4">
        <strong>Início do acompanhamento:</strong>{" "}
        {condition.startedAt ? formatDate(condition.startedAt) : formatDate(condition.createdAt)}{" "}
        · <strong>Situação:</strong>{" "}
        {condition.status === "active" ? "em acompanhamento" : "resolvida"}
      </p>

      {chronological.length >= 2 && (
        <div className="mb-6">
          <HealingChart assessments={assessments} />
        </div>
      )}

      <h3 className="mb-2 font-semibold">Avaliações registradas</h3>
      {chronological.length === 0 ? (
        <p>Nenhuma avaliação registrada até a data deste relatório.</p>
      ) : (
        // sv-gap: table
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-black text-left">
              <th className="py-1 pr-2">Data</th>
              <th className="py-1 pr-2">C×L×P (mm)</th>
              <th className="py-1 pr-2">Área (mm²)</th>
              <th className="py-1 pr-2">Tecido</th>
              <th className="py-1 pr-2">Exsudato</th>
              <th className="py-1">Dor</th>
            </tr>
          </thead>
          <tbody>
            {chronological.map((a) => (
              <tr key={a.id} className="border-b border-black/30">
                <td className="py-1 pr-2">{formatDate(a.createdAt)}</td>
                <td className="py-1 pr-2">
                  {a.lengthMm != null ? `${a.lengthMm}×${a.widthMm ?? "—"}×${a.depthMm ?? "—"}` : "—"}
                </td>
                <td className="py-1 pr-2">{a.areaMm2 ?? "—"}</td>
                <td className="py-1 pr-2">{a.tissueType ?? "—"}</td>
                <td className="py-1 pr-2">{a.exudate ? (EXUDATE_LABELS[a.exudate] ?? a.exudate) : "—"}</td>
                <td className="py-1">{a.painScale != null ? `${a.painScale}/10` : "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </DocumentFrame>
  );
}
