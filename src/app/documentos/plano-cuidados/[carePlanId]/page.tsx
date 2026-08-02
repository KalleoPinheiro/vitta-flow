"use client";

import { use } from "react";
import type { CarePlanDetailDto, PatientDto } from "@/lib/dto";
import { useApiQuery } from "@/lib/use-api-query";
import {
  CARE_PLAN_DIAGNOSIS_TYPE_LABELS,
  CARE_PLAN_STATUS_LABELS,
  INTERVENTION_PRIORITY_LABELS,
  formatDate,
  outcomeStatusLabel,
  pesSentence,
} from "@/lib/format";
import { ErrorAlert, LoadingIndicator } from "@/components/feedback";
import { DocumentFrame, type ClinicInfoDto } from "@/components/document-frame";

/**
 * Plano de cuidados (SAE) para impressão — diagnóstico (NANDA-I), resultado
 * esperado (NOC) com trilha basal→atual→meta, e intervenções (NIC) prescritas.
 */
export default function CarePlanDocumentPage({
  params,
}: {
  params: Promise<{ carePlanId: string }>;
}) {
  const { carePlanId } = use(params);
  const { data: clinic } = useApiQuery<ClinicInfoDto>("/api/clinic-info");
  const { data: detail, error } = useApiQuery<CarePlanDetailDto>(`/api/care-plans/${carePlanId}`);

  if (error) return <ErrorAlert message={error} />;
  if (!clinic || !detail) return <LoadingIndicator />;

  return <CarePlanDocumentContent clinic={clinic} detail={detail} />;
}

function CarePlanDocumentContent({
  clinic,
  detail,
}: {
  clinic: ClinicInfoDto;
  detail: CarePlanDetailDto;
}) {
  const { data: patient, error: patientError } = useApiQuery<PatientDto>(
    `/api/patients/${detail.plan.patientId}`,
  );

  if (patientError) return <ErrorAlert message={patientError} />;
  if (!patient) return <LoadingIndicator />;

  return (
    <DocumentFrame clinic={clinic} title="Plano de Cuidados de Enfermagem (SAE)">
      <p className="mb-1">
        <strong>Paciente:</strong> {patient.fullName}
      </p>
      <p className="mb-4">
        <strong>Aberto em:</strong> {formatDate(detail.plan.createdAt)} ·{" "}
        <strong>Situação:</strong> {CARE_PLAN_STATUS_LABELS[detail.plan.status]}
      </p>

      <h3 className="mb-2 font-semibold">Diagnósticos de enfermagem (NANDA-I)</h3>
      {detail.diagnoses.length === 0 ? (
        <p className="mb-4">Nenhum diagnóstico prescrito.</p>
      ) : (
        <ul className="mb-4 list-disc pl-5">
          {detail.diagnoses.map((diagnosis) => (
            <li key={diagnosis.id} className="mb-1">
              <strong>
                {diagnosis.diagnosisCode} ({CARE_PLAN_DIAGNOSIS_TYPE_LABELS[diagnosis.type]}):
              </strong>{" "}
              {pesSentence(diagnosis)}
            </li>
          ))}
        </ul>
      )}

      <h3 className="mb-2 font-semibold">Resultados esperados (NOC)</h3>
      {detail.outcomes.length === 0 ? (
        <p className="mb-4">Nenhum resultado prescrito.</p>
      ) : (
        <table className="mb-4 w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-400 text-left">
              <th className="py-1 pr-2">Resultado</th>
              <th className="py-1 pr-2">Basal</th>
              <th className="py-1 pr-2">Atual</th>
              <th className="py-1 pr-2">Meta</th>
              <th className="py-1">Situação</th>
            </tr>
          </thead>
          <tbody>
            {detail.outcomes.map((outcome) => (
              <tr key={outcome.id} className="border-b border-slate-200">
                <td className="py-1 pr-2">
                  {outcome.outcomeCode} — {outcome.outcomeLabel}
                </td>
                <td className="py-1 pr-2">{outcome.baselineScore}</td>
                <td className="py-1 pr-2">{outcome.currentScore ?? "—"}</td>
                <td className="py-1 pr-2">{outcome.targetScore}</td>
                <td className="py-1">{outcomeStatusLabel(outcome)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <h3 className="mb-2 font-semibold">Intervenções de enfermagem (NIC)</h3>
      {detail.interventions.length === 0 ? (
        <p>Nenhuma intervenção prescrita.</p>
      ) : (
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-400 text-left">
              <th className="py-1 pr-2">Intervenção</th>
              <th className="py-1 pr-2">Frequência</th>
              <th className="py-1 pr-2">Prioridade</th>
              <th className="py-1">Execuções</th>
            </tr>
          </thead>
          <tbody>
            {detail.interventions.map((intervention) => (
              <tr key={intervention.id} className="border-b border-slate-200">
                <td className="py-1 pr-2">
                  {intervention.interventionCode} — {intervention.interventionLabel}
                </td>
                <td className="py-1 pr-2">{intervention.frequency}</td>
                <td className="py-1 pr-2">{INTERVENTION_PRIORITY_LABELS[intervention.priority]}</td>
                <td className="py-1">{intervention.records.length}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </DocumentFrame>
  );
}
