"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client";
import { useApiQuery } from "@/lib/use-api-query";
import type { ProcedureDto } from "@/lib/dto";
import { formatTime } from "@/lib/format";
import { Button, Card, CardContent, Input, NativeSelect } from "@still-void/ui/react";
import { accentButton } from "@/lib/ui";
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
      <Button
        type="button"
        size="sm"
        onClick={() => setOpen(true)}
        className={`mt-2 ${accentButton}`}
      >
        Agendar retorno
      </Button>
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
    <Card className="mt-2 border-accent">
      <CardContent className="p-3">
      {error && <ErrorAlert message={error} />}
      <div className="grid gap-2 sm:grid-cols-2">
        <label className="text-xs font-medium">
          Procedimento
          <NativeSelect
            value={procedureId}
            disabled={saving}
            onChange={(e) => setProcedureId(e.target.value)}
            className="mt-1 py-1.5 text-xs"
          >
            <option value="">Selecione…</option>
            {(procedures ?? []).map((procedure) => (
              <option key={procedure.id} value={procedure.id}>
                {procedure.name}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="text-xs font-medium">
          Dia
          <Input
            type="date"
            value={date}
            disabled={saving}
            min={today}
            max={maxDate}
            onChange={(e) => setDate(e.target.value)}
            className="mt-1 h-8 text-xs"
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

      <Button
        type="button"
        variant="link"
        onClick={onCancel}
        className="mt-3 h-auto px-0 text-xs font-medium text-ink-3"
      >
        Cancelar
      </Button>
      </CardContent>
    </Card>
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
  const { data: slots, error } = useApiQuery<AvailableSlotDto[]>(
    `/api/portal/patient/slots?procedureId=${encodeURIComponent(procedureId)}&date=${encodeURIComponent(date)}`,
  );

  // Sem estes dois ramos a falha era silenciosa: o paciente via a área vazia e
  // concluía que não havia horário, quando na verdade a busca falhou.
  if (error) {
    return <ErrorAlert message={error} />;
  }
  if (!slots) {
    return <p className="mt-3 text-xs text-ink-3">Buscando horários…</p>;
  }
  if (slots.length === 0) {
    return (
      <p className="mt-3 text-xs text-ink-3">
        Nenhum horário livre neste dia — tente outra data.
      </p>
    );
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {slots.map((slot) => (
        <Button
          key={slot.startsAt}
          type="button"
          variant="outline"
          size="sm"
          disabled={disabled}
          onClick={() => onPick(slot)}
          className="h-7 border-accent px-3 text-xs font-medium text-accent-ink hover:bg-accent-soft"
        >
          {formatTime(slot.startsAt)}
        </Button>
      ))}
    </div>
  );
}
