"use client";

import { useState } from "react";
import { Button, Card, Hero } from "@still-void/ui/react";
import { accentButton } from "@/lib/ui";
import { apiFetch } from "@/lib/client";
import type {
  FollowUpDto,
  InvoiceDto,
  PortalAppointmentDto,
  PortalPatientProfileDto,
} from "@/lib/dto";
import { useApiQuery } from "@/lib/use-api-query";
import {
  APPOINTMENT_STATUS_LABELS,
  INVOICE_STATUS_LABELS,
  formatCurrency,
  formatDate,
  formatDateTime,
} from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorAlert, LoadingIndicator } from "@/components/feedback";
import { ConditionProgress, type ConditionWithAssessmentsDto } from "./condition-progress";
import { ConsentCard, PatientPhotoUpload, type ConsentStatusDto } from "./consent-card";
import { ScheduleReturn } from "./schedule-return";

interface PatientPortalDto {
  patient: PortalPatientProfileDto;
  appointments: PortalAppointmentDto[];
  conditions: ConditionWithAssessmentsDto[];
  invoices: InvoiceDto[];
  followUps: FollowUpDto[];
}

// Momento de carregamento da página — suficiente para separar futuras × passadas.
const PAGE_LOAD_MS = Date.now();

export function PatientPortalView() {
  const { data, error, refresh } = useApiQuery<PatientPortalDto>("/api/portal/patient");
  // Fonte única do consentimento na tela: o card de aceite e o envio de foto
  // (COMP3-01) leem o mesmo status — cópias separadas divergiam após o aceite,
  // porque useApiQuery guarda estado por componente, sem cache compartilhado.
  const { data: consent, refresh: refreshConsent } =
    useApiQuery<ConsentStatusDto>("/api/portal/patient/consent");
  const [confirmError, setConfirmError] = useState<string | null>(null);

  if (error) return <ErrorAlert message={error} />;
  if (!data) return <LoadingIndicator />;

  const confirmAppointment = async (appointment: PortalAppointmentDto) => {
    try {
      await apiFetch(`/api/portal/patient/appointments/${appointment.id}/confirm`, {
        method: "POST",
      });
      setConfirmError(null);
      refresh();
    } catch (err) {
      setConfirmError(err instanceof Error ? err.message : "Erro ao confirmar presença");
    }
  };

  const upcoming = data.appointments.filter(
    (a) =>
      new Date(a.startsAt).getTime() >= PAGE_LOAD_MS &&
      (a.status === "scheduled" || a.status === "confirmed"),
  );
  const past = data.appointments.filter((a) => !upcoming.includes(a));

  return (
    <div className="flex flex-col gap-6">
      <Hero
        className="pt-0 pb-2"
        eyebrow="Portal do paciente"
        title={`Olá, ${data.patient.fullName.split(" ")[0]}!`}
        description="Acompanhe aqui suas consultas e sua evolução clínica."
      />

      <ConsentCard status={consent} onAccepted={refreshConsent} />

      <Section title="Próximas consultas">
        {confirmError && <ErrorAlert message={confirmError} />}
        {upcoming.length === 0 ? (
          <EmptyState message="Nenhuma consulta agendada. Entre em contato com a clínica para agendar." />
        ) : (
          <AppointmentList
            appointments={upcoming}
            onConfirm={(appointment) => void confirmAppointment(appointment)}
          />
        )}
      </Section>

      {data.followUps.length > 0 && (
        <Section title="Retornos recomendados">
          <ul className="flex flex-col gap-2 text-sm">
            {data.followUps.map((followUp) => (
              <li key={followUp.id} className="rounded-lg border border-warning-soft bg-warning-soft px-3 py-2">
                {followUp.reason} — até <strong>{formatDate(followUp.dueDate)}</strong>
                <ScheduleReturn followUpId={followUp.id} onScheduled={refresh} />
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Minha evolução clínica">
        {data.conditions.length === 0 ? (
          <EmptyState message="Nenhuma condição em acompanhamento." />
        ) : (
          <div className="flex flex-col gap-3">
            {data.conditions.map((entry) => (
              <div key={entry.condition.id}>
                <ConditionProgress {...entry} photoUrlBase="/api/portal/patient/photos" />
                {entry.condition.status === "active" && (
                  <PatientPhotoUpload
                    conditionId={entry.condition.id}
                    consentPending={consent !== null && !consent.accepted}
                    onSent={refresh}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Histórico de consultas">
        {past.length === 0 ? (
          <EmptyState message="Sem consultas anteriores." />
        ) : (
          <AppointmentList appointments={past} />
        )}
      </Section>

      <Section title="Minhas faturas">
        {data.invoices.length === 0 ? (
          <EmptyState message="Nenhuma fatura." />
        ) : (
          <Card>
            <ul className="divide-y divide-border text-sm">
            {data.invoices.map((invoice) => (
              <li key={invoice.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate">{invoice.description}</p>
                  <p className="text-xs text-ink-3">{formatDate(invoice.issuedAt)}</p>
                </div>
                <span className="font-medium">{formatCurrency(invoice.amountCents)}</span>
                <StatusBadge
                  status={invoice.status}
                  label={INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status}
                />
              </li>
            ))}
          </ul>
          </Card>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">{title}</h2>
      {children}
    </section>
  );
}

interface AppointmentListProps {
  appointments: PortalAppointmentDto[];
  onConfirm?: (appointment: PortalAppointmentDto) => void;
}

function AppointmentList({ appointments, onConfirm }: AppointmentListProps) {
  return (
    <Card>
            <ul className="divide-y divide-border text-sm">
      {appointments.map((appointment) => (
        <li key={appointment.id} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium">{formatDateTime(appointment.startsAt)}</p>
            <p className="truncate text-ink-3">{appointment.procedure}</p>
          </div>
          {onConfirm && appointment.status === "scheduled" && (
            <Button
              type="button"
              size="sm"
              onClick={() => onConfirm(appointment)}
              className={accentButton}
            >
              Confirmar presença
            </Button>
          )}
          <StatusBadge
            status={appointment.status}
            label={APPOINTMENT_STATUS_LABELS[appointment.status] ?? appointment.status}
          />
        </li>
      ))}
    </ul>
    </Card>
  );
}
