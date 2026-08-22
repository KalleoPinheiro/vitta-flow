"use client";

import { use } from "react";
import type { PatientDto } from "@/lib/dto";
import { useApiQuery } from "@/lib/use-api-query";
import { formatDate } from "@/lib/format";
import { ErrorAlert, LoadingIndicator } from "@/components/feedback";
import { DocumentFrame, type ClinicInfoDto } from "@/components/document-frame";

export default function ConsentDocumentPage({
  params,
}: {
  params: Promise<{ patientId: string }>;
}) {
  const { patientId } = use(params);
  const { data: clinic } = useApiQuery<ClinicInfoDto>("/api/clinic-info");
  const { data: patient, error } = useApiQuery<PatientDto>(`/api/patients/${patientId}`);

  if (error) return <ErrorAlert message={error} />;
  if (!clinic || !patient) return <LoadingIndicator />;

  return (
    <DocumentFrame clinic={clinic} title="Termo de Consentimento Livre e Esclarecido">
      <p className="mb-4">
        Eu, <strong>{patient.fullName}</strong>
        {patient.birthDate ? `, nascido(a) em ${formatDate(patient.birthDate)}` : ""}, declaro
        que fui informado(a), de forma clara e compreensível, sobre a natureza, os objetivos, os
        riscos e os benefícios dos procedimentos de estomaterapia propostos, incluindo cuidados
        com estomias, tratamento de feridas e orientações correlatas.
      </p>
      <p className="mb-4">
        Declaro ainda que tive oportunidade de esclarecer todas as minhas dúvidas e que estou
        ciente de que posso revogar este consentimento a qualquer momento, sem prejuízo do meu
        atendimento.
      </p>
      <p className="mb-4">
        Autorizo o registro fotográfico da evolução clínica exclusivamente para fins de
        acompanhamento terapêutico e documentação em prontuário, nos termos da Lei Geral de
        Proteção de Dados (Lei nº 13.709/2018).
      </p>
      <div className="mt-10">
        <div className="mx-auto w-64 border-t border-black pt-1 text-center">
          {patient.fullName}
          <span className="block text-xs">Paciente ou responsável legal</span>
        </div>
      </div>
    </DocumentFrame>
  );
}
