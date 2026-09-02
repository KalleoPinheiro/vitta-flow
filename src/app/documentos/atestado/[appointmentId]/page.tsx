"use client";

import { use } from "react";
import type { AppointmentDto } from "@/lib/dto";
import { useApiQuery } from "@/lib/use-api-query";
import { ErrorAlert, LoadingIndicator } from "@/components/feedback";
import { DocumentFrame, type ClinicInfoDto } from "@/components/document-frame";
import { isClinicInfoComplete } from "@/domain/clinic/clinic";

export default function AttendanceDocumentPage({
  params,
}: {
  params: Promise<{ appointmentId: string }>;
}) {
  const { appointmentId } = use(params);
  const { data: clinic } = useApiQuery<ClinicInfoDto>("/api/clinic-info");
  const {
    data: appointment,
    error,
    isLoading: appointmentLoading,
  } = useApiQuery<AppointmentDto>(`/api/appointments/${appointmentId}`);

  if (error) return <ErrorAlert message={error} />;
  if (!clinic || appointmentLoading) return <LoadingIndicator />;
  if (!appointment) return <ErrorAlert message="Consulta não encontrada" />;
  if (!isClinicInfoComplete(clinic)) {
    return (
      <ErrorAlert message="Clínica sem CNPJ ou responsável técnico cadastrados — cadastre em Configurações antes de emitir este documento." />
    );
  }
  if (appointment.status !== "completed") {
    return (
      <ErrorAlert message={`Não é possível emitir declaração de comparecimento: consulta com status "${appointment.status}", não "realizada".`} />
    );
  }

  const start = new Date(appointment.startsAt);
  const end = new Date(appointment.endsAt);
  const time = (d: Date) =>
    d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

  return (
    <DocumentFrame clinic={clinic} title="Declaração de Comparecimento">
      <p className="mb-4">
        Declaro, para os devidos fins, que{" "}
        <strong>{appointment.patientName ?? "o(a) paciente"}</strong> compareceu a atendimento
        de estomaterapia nesta clínica no dia{" "}
        <strong>{start.toLocaleDateString("pt-BR")}</strong>, no período de{" "}
        <strong>{time(start)}</strong> às <strong>{time(end)}</strong>, para realização de:{" "}
        <strong>{appointment.procedure}</strong>.
      </p>
      <p>Por ser verdade, firmo a presente declaração.</p>
    </DocumentFrame>
  );
}
