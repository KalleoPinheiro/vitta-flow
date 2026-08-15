"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client";
import { useApiQuery } from "@/lib/use-api-query";
import type { ProcedureDto } from "@/lib/dto";
import { formatTime } from "@/lib/format";
import { ErrorAlert } from "@/components/feedback";

interface AvailableSlotDto {
  startsAt: string;
  endsAt: string;
}

/** Data local no formato aceito por <input type="date"> e pela API. */
const dayKey = (date: Date): string =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
    date.getDate(),
  ).padStart(2, "0")}`;

const OFFER_WINDOW_DAYS = 14;

interface ScheduleReturnProps {
  followUpId: string;
  onScheduled: () => void;
}

/**
 * Auto-agendamento do retorno pelo paciente (PORT4-10/11): escolhe
 * procedimento e dia, vê os horários livres e confirma — sem ligar para a
 * clínica. Os horários vêm da mesma regra usada pela equipe.
 */
export function ScheduleReturn({ followUpId, onScheduled }: ScheduleReturnProps) {
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-2 rounded-lg bg-teal-700 px-3 py-1.5 text-xs font-medium text-white hover:bg-teal-800"
      >
        Agendar retorno
      </button>
    );
  }

  return (
    <SchedulePanel
      followUpId={followUpId}
      onScheduled={() => {
        setOpen(false);
        onScheduled();
      }}
      onCancel={() => setOpen(false)}
    />
  );
}

function SchedulePanel({
  followUpId,
  onScheduled,
  onCancel,
}: ScheduleReturnProps & { onCancel: () => void }) {
  const { data: procedures } = useApiQuery<ProcedureDto[]>("/api/portal/patient/procedures");
  const [procedureId, setProcedureId] = useState("");
  // Janela de oferta fixada na montagem (o relógio não pode ser lido em render).
  const [today] = useState(() => dayKey(new Date()));
  const [maxDate] = useState(() => dayKey(new Date(Date.now() + OFFER_WINDOW_DAYS * 86_400_000)));
  const [date, setDate] = useState(today);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const inputClass =
    "mt-1 w-full rounded-lg border border-slate-300 px-3 py-1.5 text-xs focus:border-teal-500 focus:outline-none";

  const schedule = async (slot: AvailableSlotDto) => {
    setSaving(true);
    setError(null);
    try {
      await apiFetch("/api/portal/patient/appointments", {
        method: "POST",
        body: JSON.stringify({ procedureId, startsAt: slot.startsAt, followUpId }),
      });
      onScheduled();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao agendar retorno");
      setSaving(false);
    }
  };

  return (
    <div className="mt-2 rounded-lg border border-teal-200 bg-white p-3">
      {error && <ErrorAlert message={error} />}
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-medium">
          Procedimento
          <select
            value={procedureId}
            onChange={(e) => setProcedureId(e.target.value)}
            className={inputClass}
          >
            <option value="">Selecione…</option>
            {(procedures ?? []).map((procedure) => (
              <option key={procedure.id} value={procedure.id}>
                {procedure.name}
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs font-medium">
          Dia
          <input
            type="date"
            value={date}
            min={today}
            max={maxDate}
            onChange={(e) => setDate(e.target.value)}
            className={inputClass}
          />
        </label>
      </div>

      {procedureId && date && (
        <SlotPicker
          procedureId={procedureId}
          date={date}
          disabled={saving}
          onPick={(slot) => void schedule(slot)}
        />
      )}

      <button
        type="button"
        onClick={onCancel}
        className="mt-3 text-xs font-medium text-slate-500 hover:underline"
      >
        Cancelar
      </button>
    </div>
  );
}

/** Horários livres do dia — montado só com procedimento e data escolhidos. */
function SlotPicker({
  procedureId,
  date,
  disabled,
  onPick,
}: {
  procedureId: string;
  date: string;
  disabled: boolean;
  onPick: (slot: AvailableSlotDto) => void;
}) {
  const { data: slots } = useApiQuery<AvailableSlotDto[]>(
    `/api/portal/patient/slots?procedureId=${procedureId}&date=${date}`,
  );

  if (!slots) return null;
  if (slots.length === 0) {
    return (
      <p className="mt-3 text-xs text-slate-500">
        Nenhum horário livre neste dia — tente outra data.
      </p>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {slots.map((slot) => (
        <button
          key={slot.startsAt}
          type="button"
          disabled={disabled}
          onClick={() => onPick(slot)}
          className="rounded-lg border border-teal-300 px-3 py-1 text-xs font-medium text-teal-800 hover:bg-teal-50 disabled:opacity-50"
        >
          {formatTime(slot.startsAt)}
        </button>
      ))}
    </div>
  );
}
