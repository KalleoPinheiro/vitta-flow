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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@still-void/ui/react";

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
        // SPEC_DEVIATION: override neutro de impressão (AD-006) — literal
        // border-black/text-black em vez de tokens --sv-*, para a folha
        // continuar em preto-sobre-branco na impressora P&B. O utilitário
        // vence layer(components), então o override é determinístico.
        <div className="mb-4 overflow-x-auto">
          <Table className="w-full border-collapse text-xs text-black">
            <TableHeader>
              <TableRow className="border-b border-black text-left">
                <TableHead className="py-1 pr-2 text-black">Resultado</TableHead>
                <TableHead className="py-1 pr-2 text-black">Basal</TableHead>
                <TableHead className="py-1 pr-2 text-black">Atual</TableHead>
                <TableHead className="py-1 pr-2 text-black">Meta</TableHead>
                <TableHead className="py-1 text-black">Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.outcomes.map((outcome) => (
                <TableRow key={outcome.id} className="border-b border-black/30">
                  <TableCell className="py-1 pr-2">
                    {outcome.outcomeCode} — {outcome.outcomeLabel}
                  </TableCell>
                  <TableCell className="py-1 pr-2">{outcome.baselineScore}</TableCell>
                  <TableCell className="py-1 pr-2">{outcome.currentScore ?? "—"}</TableCell>
                  <TableCell className="py-1 pr-2">{outcome.targetScore}</TableCell>
                  <TableCell className="py-1">{outcomeStatusLabel(outcome)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <h3 className="mb-2 font-semibold">Intervenções de enfermagem (NIC)</h3>
      {detail.interventions.length === 0 ? (
        <p>Nenhuma intervenção prescrita.</p>
      ) : (
        // SPEC_DEVIATION: override neutro de impressão (AD-006) — ver
        // comentário na tabela de resultados esperados (NOC) acima.
        <div className="overflow-x-auto">
          <Table className="w-full border-collapse text-xs text-black">
            <TableHeader>
              <TableRow className="border-b border-black text-left">
                <TableHead className="py-1 pr-2 text-black">Intervenção</TableHead>
                <TableHead className="py-1 pr-2 text-black">Frequência</TableHead>
                <TableHead className="py-1 pr-2 text-black">Prioridade</TableHead>
                <TableHead className="py-1 text-black">Execuções</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.interventions.map((intervention) => (
                <TableRow key={intervention.id} className="border-b border-black/30">
                  <TableCell className="py-1 pr-2">
                    {intervention.interventionCode} — {intervention.interventionLabel}
                  </TableCell>
                  <TableCell className="py-1 pr-2">{intervention.frequency}</TableCell>
                  <TableCell className="py-1 pr-2">{INTERVENTION_PRIORITY_LABELS[intervention.priority]}</TableCell>
                  <TableCell className="py-1">{intervention.records.length}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </DocumentFrame>
  );
}
