"use client";

import { useState } from "react";
import Link from "next/link";
import { Button, Card, Hero, Icon } from "@still-void/ui/react";
import { useToast } from "@still-void/ui/react/client";
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
import { ConfirmAction } from "@/components/confirm-action";
import { EmptyState, ErrorAlert, LoadingIndicator } from "@/components/feedback";

interface SummaryData {
  billing: BillingSummary;
  appointmentsInMonth: number;
  today: AppointmentDto[];
}

export default function DashboardPage() {
  const { toast } = useToast();
  const { data: summary, error } = useApiQuery<SummaryData>("/api/summary");
  const { data: followUps, refresh: refreshFollowUps } = useApiQuery<FollowUpDto[]>(
    "/api/follow-ups?status=pending",
  );
  const { data: supplies } = useApiQuery<SupplyDto[]>("/api/supplies");

  const lowStock = (supplies ?? []).filter((s) => s.active && s.isLowStock);

  const resolveFollowUp = async (id: string, status: "done" | "cancelled") => {
    try {
      await apiFetch<FollowUpDto>(`/api/follow-ups/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toast({
        description: status === "done" ? "Retorno concluído" : "Retorno cancelado",
        variant: "success",
      });
      refreshFollowUps();
    } catch (err) {
      toast({
        description: err instanceof Error ? err.message : "Erro ao atualizar retorno",
        variant: "danger",
      });
    }
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
          <Card key={card.label} className="p-5">
            <p className="text-sm text-ink-3">{card.label}</p>
            <p className="mt-1 text-2xl font-bold text-accent-ink">{card.value}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Card className="p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Consultas de hoje</h2>
            <Link href="/agenda" className="text-sm font-medium text-accent-ink hover:underline">
              Ver agenda completa <Icon name="chevron-right" />
            </Link>
          </div>
          {summary.today.length === 0 ? (
            <EmptyState message="Nenhuma consulta agendada para hoje." />
          ) : (
            <ul className="divide-y divide-border">
              {summary.today.map((appointment) => (
                <li key={appointment.id} className="flex items-center gap-4 py-3">
                  <span className="w-24 shrink-0 font-mono text-sm text-ink-2">
                    {formatTime(appointment.startsAt)}–{formatTime(appointment.endsAt)}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{appointment.patientName}</p>
                    <p className="truncate text-sm text-ink-3">{appointment.procedure}</p>
                  </div>
                  <StatusBadge
                    status={appointment.status}
                    label={APPOINTMENT_STATUS_LABELS[appointment.status] ?? appointment.status}
                  />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <div className="flex flex-col gap-6">
          <Card className="p-5">
            <TriageQueue />
            <h2 className="mb-4 text-lg font-semibold">Retornos pendentes</h2>
            {!followUps || followUps.length === 0 ? (
              <EmptyState message="Nenhum retorno pendente." />
            ) : (
              <ul className="divide-y divide-border">
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
                      <p className="truncate text-ink-3">{followUp.reason}</p>
                    </div>
                    <span
                      className={`shrink-0 text-xs font-medium ${
                        followUp.isOverdue ? "text-danger" : "text-ink-3"
                      }`}
                    >
                      {followUp.isOverdue ? (
                        <>
                          <Icon name="alert-triangle" /> Atrasado —{" "}
                        </>
                      ) : null}
                      {formatDate(followUp.dueDate)}
                    </span>
                    <Link
                      href={`/agenda?followUpId=${followUp.id}&patientId=${followUp.patientId}&procedure=${encodeURIComponent(followUp.reason.replace(/^Retorno: /, ""))}`}
                      className="shrink-0 font-medium text-accent-ink hover:underline"
                    >
                      Agendar
                    </Link>
                    <Button
                      type="button"
                      onClick={() => void resolveFollowUp(followUp.id, "done")}
                      variant="link"
                      className="h-auto p-0 shrink-0 text-success"
                    >
                      Concluir
                    </Button>
                    <ConfirmAction
                      trigger={
                        <Button
                          type="button"
                          variant="link"
                          className="h-auto p-0 shrink-0 text-ink-3"
                        >
                          Cancelar
                        </Button>
                      }
                      title="Cancelar retorno?"
                      description="O retorno agendado será cancelado e o paciente não será mais lembrado."
                      confirmLabel="Cancelar retorno"
                      variant="danger"
                      onConfirm={() => resolveFollowUp(followUp.id, "cancelled")}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Estoque baixo</h2>
              <Link href="/materiais" className="text-sm font-medium text-accent-ink hover:underline">
                Ver materiais <Icon name="chevron-right" />
              </Link>
            </div>
            {lowStock.length === 0 ? (
              <EmptyState message="Nenhum insumo abaixo do mínimo." />
            ) : (
              <ul className="divide-y divide-border text-sm">
                {lowStock.slice(0, 6).map((supply) => (
                  <li key={supply.id} className="flex justify-between py-2">
                    <span className="truncate">{supply.name}</span>
                    <span className="shrink-0 font-medium text-warning">
                      {supply.stockQty}/{supply.minQty} {supply.unit}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
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
  waitingHours: number;
  latestScore: { kind: "push" | "det"; value: number } | null;
}

const TRIAGE_ATTENTION_HOURS = 24;

/** Fila de triagem (O4.2): fotos enviadas por pacientes entre consultas. */
function TriageQueue() {
  const { data: queue, refresh } = useApiQuery<TriagePhotoDto[]>("/api/photos/triage");
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const triage = async (photo: TriagePhotoDto, decision: "reviewed" | "escalated") => {
    try {
      await apiFetch(`/api/photos/${photo.id}`, {
        method: "PATCH",
        body: JSON.stringify({ triage: decision }),
      });
      toast({
        description: decision === "reviewed" ? "Foto revisada" : "Foto escalada",
        variant: "success",
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
    <Card className="mb-6 border-accent bg-accent-soft p-4">
      <h3 className="mb-2 text-sm font-bold text-accent-ink">
        <Icon name="camera" /> Fotos de pacientes aguardando triagem ({queue.length})
      </h3>
      {error && <ErrorAlert message={error} />}
      <ul className="flex flex-col gap-2">
        {queue.map((photo) => (
          <li key={photo.id} className="flex flex-wrap items-center gap-2 text-sm">
            {/* eslint-disable-next-line @next/next/no-img-element -- rota autorizada dinâmica */}
            <img
              src={`/api/photos/${photo.id}`}
              alt={`Foto de ${photo.patientName}`}
              className="h-12 w-12 rounded border border-border object-cover"
            />
            <div className="min-w-0 flex-1">
              <p className="truncate font-medium">
                {photo.patientName} — {photo.conditionTitle}
                {photo.latestScore && (
                  <span className="ml-2 rounded bg-sv-surface px-1.5 py-0.5 text-xs font-semibold text-accent-ink">
                    {photo.latestScore.kind === "push" ? "PUSH" : "DET"} {photo.latestScore.value}
                  </span>
                )}
              </p>
              <p className="truncate text-xs text-ink-3">
                {photo.patientNote ?? "sem observação"} · {formatDate(photo.createdAt)} ·{" "}
                <span
                  className={
                    photo.waitingHours >= TRIAGE_ATTENTION_HOURS
                      ? "font-semibold text-danger"
                      : undefined
                  }
                >
                  aguardando há {photo.waitingHours}h
                </span>
              </p>
            </div>
            <ConfirmAction
              trigger={
                <Button type="button" variant="link" className="h-auto p-0 text-success">
                  Ok, manter plano
                </Button>
              }
              title="Manter o plano de cuidados?"
              description="A foto é marcada como revisada sem intervenção. Não há ação de reabrir depois."
              confirmLabel="Confirmar"
              onConfirm={() => triage(photo, "reviewed")}
            />
            <ConfirmAction
              trigger={
                <Button type="button" variant="link" className="h-auto p-0 text-danger">
                  Antecipar retorno
                </Button>
              }
              title="Antecipar o retorno do paciente?"
              description="O retorno do paciente é antecipado com base nesta foto."
              confirmLabel="Confirmar antecipação"
              variant="danger"
              onConfirm={() => triage(photo, "escalated")}
            />
          </li>
        ))}
      </ul>
    </Card>
  );
}
