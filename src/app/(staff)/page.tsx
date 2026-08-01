"use client";

import { useState } from "react";
import Link from "next/link";
import { Hero } from "@still-void/ui/react";
import type { AppointmentDto, FollowUpDto, SupplyDto } from "@/lib/dto";
import type { BillingSummary } from "@/application/billing/get-billing-summary";
import { apiFetch } from "@/lib/client";
import { useApiQuery } from "@/lib/use-api-query";
import {
  APPOINTMENT_STATUS_LABELS,
  formatCurrency,
  formatDate,
  formatTime,
} from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorAlert, LoadingIndicator } from "@/components/feedback";

interface SummaryData {
  billing: BillingSummary;
  appointmentsInMonth: number;
  today: AppointmentDto[];
}

export default function DashboardPage() {
  const { data: summary, error } = useApiQuery<SummaryData>("/api/summary");
  const { data: followUps, refresh: refreshFollowUps } = useApiQuery<FollowUpDto[]>(
    "/api/follow-ups?status=pending",
  );
  const { data: supplies } = useApiQuery<SupplyDto[]>("/api/supplies");

  const lowStock = (supplies ?? []).filter((s) => s.active && s.isLowStock);

  const resolveFollowUp = async (id: string, status: "done" | "cancelled") => {
    await apiFetch<FollowUpDto>(`/api/follow-ups/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ status }),
    });
    refreshFollowUps();
  };

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
      <Hero className="pt-0 pb-6" eyebrow="Visão geral" title="Dashboard" />

      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => (
          <div key={card.label} className="rounded-xl border border-slate-200 bg-white p-5">
            <p className="text-sm text-slate-500">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-teal-700">{card.value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
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

        <div className="flex flex-col gap-6">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <TriageQueue />
            <h2 className="mb-4 text-lg font-semibold">Retornos pendentes</h2>
            {!followUps || followUps.length === 0 ? (
              <EmptyState message="Nenhum retorno pendente." />
            ) : (
              <ul className="divide-y divide-slate-100">
                {followUps.slice(0, 8).map((followUp) => (
                  <li key={followUp.id} className="flex items-center gap-3 py-3 text-sm">
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium">
                        <Link
                          href={`/pacientes/${followUp.patientId}`}
                          className="hover:underline"
                        >
                          {followUp.patientName}
                        </Link>
                      </p>
                      <p className="truncate text-slate-500">{followUp.reason}</p>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-medium ${
                        followUp.isOverdue ? "text-red-700" : "text-slate-500"
                      }`}
                    >
                      {followUp.isOverdue ? "⚠ Atrasado — " : ""}
                      {formatDate(followUp.dueDate)}
                    </span>
                    <Link
                      href={`/agenda?followUpId=${followUp.id}&patientId=${followUp.patientId}&procedure=${encodeURIComponent(followUp.reason.replace(/^Retorno: /, ""))}`}
                      className="shrink-0 font-medium text-teal-700 hover:underline"
                    >
                      Agendar
                    </Link>
                    <button
                      type="button"
                      onClick={() => void resolveFollowUp(followUp.id, "done")}
                      className="shrink-0 font-medium text-emerald-700 hover:underline"
                    >
                      Concluir
                    </button>
                    <button
                      type="button"
                      onClick={() => void resolveFollowUp(followUp.id, "cancelled")}
                      className="shrink-0 font-medium text-slate-400 hover:underline"
                    >
                      Cancelar
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Estoque baixo</h2>
              <Link href="/materiais" className="text-sm font-medium text-teal-700 hover:underline">
                Ver materiais →
              </Link>
            </div>
            {lowStock.length === 0 ? (
              <EmptyState message="Nenhum insumo abaixo do mínimo." />
            ) : (
              <ul className="divide-y divide-slate-100 text-sm">
                {lowStock.slice(0, 6).map((supply) => (
                  <li key={supply.id} className="flex justify-between py-2">
                    <span className="truncate">{supply.name}</span>
                    <span className="shrink-0 font-medium text-amber-700">
                      {supply.stockQty}/{supply.minQty} {supply.unit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

interface TriagePhotoDto {
  id: string;
  conditionTitle: string;
  patientId: string | null;
  patientName: string;
  patientNote: string | null;
  createdAt: string;
}

/** Fila de triagem (O4.2): fotos enviadas por pacientes entre consultas. */
function TriageQueue() {
  const { data: queue, refresh } = useApiQuery<TriagePhotoDto[]>("/api/photos/triage");
  const [error, setError] = useState<string | null>(null);

  const triage = async (photo: TriagePhotoDto, decision: "reviewed" | "escalated") => {
    try {
      await apiFetch(`/api/photos/${photo.id}`, {
        method: "PATCH",
        body: JSON.stringify({ triage: decision }),
      });
      setError(null);
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro na triagem");
    }
  };

  if (!queue || queue.length === 0) {
    return null;
  }
  return (
    <div className="mb-6 rounded-lg border border-violet-200 bg-violet-50 p-4">
      <h3 className="mb-2 text-sm font-bold text-violet-900">
        📷 Fotos de pacientes aguardando triagem ({queue.length})
      </h3>
      {error && <ErrorAlert message={error} />}
      <ul className="flex flex-col gap-2">
        {queue.map((photo) => (
          <li key={photo.id} className="flex flex-wrap items-center gap-2 text-sm">
            {/* eslint-disable-next-line @next/next/no-img-element -- rota autorizada dinâmica */}
            <img
              src={`/api/photos/${photo.id}`}
              alt={`Foto de ${photo.patientName}`}
              className="h-12 w-12 rounded border border-slate-200 object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {photo.patientName} — {photo.conditionTitle}
              </p>
              <p className="truncate text-xs text-slate-500">
                {photo.patientNote ?? "sem observação"} · {formatDate(photo.createdAt)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void triage(photo, "reviewed")}
              className="font-medium text-emerald-700 hover:underline"
            >
              Ok, manter plano
            </button>
            <button
              type="button"
              onClick={() => void triage(photo, "escalated")}
              className="font-medium text-red-700 hover:underline"
            >
              Antecipar retorno
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
