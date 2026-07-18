"use client";

import { useState } from "react";
import type { AppointmentDto } from "@/lib/dto";
import {
  APPOINTMENT_STATUS_LABELS,
  formatCurrency,
  formatDate,
  formatTime,
} from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { ErrorAlert } from "@/components/feedback";

type AppointmentAction = "confirm" | "cancel" | "no_show" | "complete";

interface AppointmentDetailProps {
  appointment: AppointmentDto;
  onAction: (action: AppointmentAction, followUpInDays?: number | null) => Promise<void>;
  onReschedule: (startsAt: Date, endsAt: Date) => Promise<void>;
}

const FOLLOW_UP_OPTIONS = [
  { value: 0, label: "Sem retorno" },
  { value: 7, label: "Retorno em 7 dias" },
  { value: 15, label: "Retorno em 15 dias" },
  { value: 30, label: "Retorno em 30 dias" },
  { value: 60, label: "Retorno em 60 dias" },
  { value: 90, label: "Retorno em 90 dias" },
];

const ACTION_BUTTONS: Array<{ action: AppointmentAction; label: string; className: string }> = [
  { action: "confirm", label: "Confirmar", className: "bg-teal-700 hover:bg-teal-800" },
  { action: "complete", label: "Concluir + faturar", className: "bg-emerald-700 hover:bg-emerald-800" },
  { action: "no_show", label: "Registrar falta", className: "bg-amber-600 hover:bg-amber-700" },
  { action: "cancel", label: "Cancelar", className: "bg-red-700 hover:bg-red-800" },
];

const VISIBLE_ACTIONS: Record<string, AppointmentAction[]> = {
  scheduled: ["confirm", "complete", "no_show", "cancel"],
  confirmed: ["complete", "no_show", "cancel"],
};

export function AppointmentDetail({ appointment, onAction, onReschedule }: AppointmentDetailProps) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [followUpInDays, setFollowUpInDays] = useState(30);
  const [newDate, setNewDate] = useState(appointment.startsAt.slice(0, 10));
  const [newTime, setNewTime] = useState(formatTime(appointment.startsAt));

  const durationMs =
    new Date(appointment.endsAt).getTime() - new Date(appointment.startsAt).getTime();
  const visibleActions = VISIBLE_ACTIONS[appointment.status] ?? [];

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao atualizar consulta");
    } finally {
      setBusy(false);
    }
  };

  const handleReschedule = () =>
    run(async () => {
      const startsAt = new Date(`${newDate}T${newTime}:00`);
      const endsAt = new Date(startsAt.getTime() + durationMs);
      await onReschedule(startsAt, endsAt);
    });

  return (
    <div className="flex flex-col gap-3 text-sm">
      {error && <ErrorAlert message={error} />}
      <div className="flex items-center justify-between">
        <p className="text-base font-semibold">{appointment.patientName}</p>
        <StatusBadge
          status={appointment.status}
          label={APPOINTMENT_STATUS_LABELS[appointment.status] ?? appointment.status}
        />
      </div>
      <p>
        <span className="text-slate-500">Data: </span>
        {formatDate(appointment.startsAt)}, {formatTime(appointment.startsAt)}–
        {formatTime(appointment.endsAt)}
      </p>
      <p>
        <span className="text-slate-500">Procedimento: </span>
        {appointment.procedure}
      </p>
      <p>
        <span className="text-slate-500">Valor: </span>
        {formatCurrency(appointment.priceCents)}
      </p>
      {appointment.notes && (
        <p>
          <span className="text-slate-500">Observações: </span>
          {appointment.notes}
        </p>
      )}

      <a
        href={`/documentos/atestado/${appointment.id}`}
        className="text-xs font-medium text-teal-700 hover:underline"
      >
        Declaração de comparecimento
      </a>

      {visibleActions.includes("complete") && (
        <label className="mt-1 text-xs font-medium text-slate-600">
          Ao concluir, programar retorno:
          <select
            value={followUpInDays}
            onChange={(e) => setFollowUpInDays(Number(e.target.value))}
            className="ml-2 rounded-lg border border-slate-300 px-2 py-1 text-xs"
          >
            {FOLLOW_UP_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      )}

      {visibleActions.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {ACTION_BUTTONS.filter((button) => visibleActions.includes(button.action)).map(
            (button) => (
              <button
                key={button.action}
                type="button"
                disabled={busy}
                onClick={() =>
                  void run(() =>
                    onAction(
                      button.action,
                      button.action === "complete" && followUpInDays > 0 ? followUpInDays : null,
                    ),
                  )
                }
                className={`rounded-lg px-3 py-1.5 text-xs font-medium text-white disabled:opacity-50 ${button.className}`}
              >
                {button.label}
              </button>
            ),
          )}
          <button
            type="button"
            disabled={busy}
            onClick={() => setRescheduling((prev) => !prev)}
            className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Remarcar
          </button>
        </div>
      )}

      {rescheduling && (
        <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-slate-200 bg-slate-50 p-3">
          <label className="text-xs font-medium">
            Nova data
            <input
              type="date"
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs font-medium">
            Novo horário
            <input
              type="time"
              value={newTime}
              onChange={(e) => setNewTime(e.target.value)}
              className="mt-1 block rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
            />
          </label>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleReschedule()}
            className="rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800 disabled:opacity-50"
          >
            Confirmar remarcação
          </button>
        </div>
      )}
    </div>
  );
}
