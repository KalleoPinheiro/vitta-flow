"use client";

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
  const { data, error } = useApiQuery<PatientPortalDto>("/api/portal/patient");

  if (error) return <ErrorAlert message={error} />;
  if (!data) return <LoadingIndicator />;

  const upcoming = data.appointments.filter(
    (a) =>
      new Date(a.startsAt).getTime() >= PAGE_LOAD_MS &&
      (a.status === "scheduled" || a.status === "confirmed"),
  );
  const past = data.appointments.filter((a) => !upcoming.includes(a));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold">Olá, {data.patient.fullName.split(" ")[0]}!</h1>
        <p className="text-sm text-slate-500">Acompanhe aqui suas consultas e sua evolução clínica.</p>
      </div>

      <Section title="Próximas consultas">
        {upcoming.length === 0 ? (
          <EmptyState message="Nenhuma consulta agendada. Entre em contato com a clínica para agendar." />
        ) : (
          <AppointmentList appointments={upcoming} />
        )}
      </Section>

      {data.followUps.length > 0 && (
        <Section title="Retornos recomendados">
          <ul className="flex flex-col gap-2 text-sm">
            {data.followUps.map((followUp) => (
              <li key={followUp.id} className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                {followUp.reason} — até <strong>{formatDate(followUp.dueDate)}</strong>
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
              <ConditionProgress key={entry.condition.id} {...entry} />
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
          <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white text-sm">
            {data.invoices.map((invoice) => (
              <li key={invoice.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate">{invoice.description}</p>
                  <p className="text-xs text-slate-400">{formatDate(invoice.issuedAt)}</p>
                </div>
                <span className="font-medium">{formatCurrency(invoice.amountCents)}</span>
                <StatusBadge
                  status={invoice.status}
                  label={INVOICE_STATUS_LABELS[invoice.status] ?? invoice.status}
                />
              </li>
            ))}
          </ul>
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

function AppointmentList({ appointments }: { appointments: PortalAppointmentDto[] }) {
  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200 bg-white text-sm">
      {appointments.map((appointment) => (
        <li key={appointment.id} className="flex items-center gap-3 px-4 py-3">
          <div className="min-w-0 flex-1">
            <p className="font-medium">{formatDateTime(appointment.startsAt)}</p>
            <p className="truncate text-slate-500">{appointment.procedure}</p>
          </div>
          <StatusBadge
            status={appointment.status}
            label={APPOINTMENT_STATUS_LABELS[appointment.status] ?? appointment.status}
          />
        </li>
      ))}
    </ul>
  );
}
