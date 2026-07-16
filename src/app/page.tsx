"use client";

import Link from "next/link";
import type { AppointmentDto } from "@/lib/dto";
import type { BillingSummary } from "@/application/billing/get-billing-summary";
import { useApiQuery } from "@/lib/use-api-query";
import { APPOINTMENT_STATUS_LABELS, formatCurrency, formatTime } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorAlert, LoadingIndicator } from "@/components/feedback";

interface SummaryData {
  billing: BillingSummary;
  appointmentsInMonth: number;
  today: AppointmentDto[];
}

export default function DashboardPage() {
  const { data: summary, error } = useApiQuery<SummaryData>("/api/summary");

  if (error) return <ErrorAlert message={error} />;
  if (!summary) return <LoadingIndicator />;

  const cards = [
    { label: "Recebido no mês", value: formatCurrency(summary.billing.paidCents) },
    { label: "A receber", value: formatCurrency(summary.billing.pendingCents) },
    { label: "Consultas no mês", value: String(summary.appointmentsInMonth) },
    { label: "Faturas pendentes", value: String(summary.billing.pendingCount) },
  ];

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Dashboard</h1>

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-teal-700">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Consultas de hoje</h2>
          <Link href="/agenda" className="text-sm font-medium text-teal-700 hover:underline">
            Ver agenda completa →
          </Link>
        </div>
        {summary.today.length === 0 ? (
          <EmptyState message="Nenhuma consulta agendada para hoje." />
        ) : (
          <ul className="divide-y divide-slate-100">
            {summary.today.map((appointment) => (
              <li key={appointment.id} className="flex items-center gap-4 py-3">
                <span className="w-24 shrink-0 font-mono text-sm text-slate-600">
                  {formatTime(appointment.startsAt)}–{formatTime(appointment.endsAt)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{appointment.patientName}</p>
                  <p className="truncate text-sm text-slate-500">{appointment.procedure}</p>
                </div>
                <StatusBadge
                  status={appointment.status}
                  label={APPOINTMENT_STATUS_LABELS[appointment.status] ?? appointment.status}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
