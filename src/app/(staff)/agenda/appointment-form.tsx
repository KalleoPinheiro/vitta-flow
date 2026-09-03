"use client";

import { useState } from "react";
import type { PatientDto, ProcedureDto, ProfessionalDto } from "@/lib/dto";
import { useApiQuery } from "@/lib/use-api-query";
import { ApiError } from "@/lib/client";
import {
  DEFAULT_SCHEDULE_CONFIG,
  describeSchedule,
  type ScheduleConfig,
} from "@/domain/scheduling/schedule-config";
import { ErrorAlert } from "@/components/feedback";
import { dayKey } from "./calendar-grid";
import { Button, Input, NativeSelect, Textarea } from "@still-void/ui/react";

export interface AppointmentFormValues {
  patientId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  procedure: string;
  price: string;
  notes: string;
  professionalId: string;
  procedureId: string;
  /** 1 = consulta única; >1 = série semanal com N ocorrências. */
  occurrences: number;
}

interface AppointmentFormProps {
  patients: PatientDto[];
  professionals?: ProfessionalDto[];
  defaultDate?: Date;
  defaultPatientId?: string;
  defaultProcedure?: string;
  onSubmit: (values: AppointmentFormValues) => Promise<void>;
}

const DURATION_OPTIONS = [30, 45, 60, 90, 120];

/** 409 (conflito de horário) é `warning`, o resto (400 etc.) continua `danger` (AGENDA-05). */
function resolveSubmitError(err: unknown): { message: string; variant: "danger" | "warning" } {
  const message = err instanceof Error ? err.message : "Erro ao agendar consulta";
  const variant = err instanceof ApiError && err.status === 409 ? "warning" : "danger";
  return { message, variant };
}

function resolveScheduleConfig(data: { config: ScheduleConfig } | null): ScheduleConfig {
  return data?.config ?? DEFAULT_SCHEDULE_CONFIG;
}

export function AppointmentForm({
  patients,
  professionals = [],
  defaultDate,
  defaultPatientId,
  defaultProcedure,
  onSubmit,
}: AppointmentFormProps) {
  const [values, setValues] = useState<AppointmentFormValues>({
    patientId: defaultPatientId ?? "",
    date: defaultDate ? dayKey(defaultDate) : dayKey(new Date()),
    startTime: "09:00",
    durationMinutes: 60,
    procedure: defaultProcedure ?? "",
    price: "",
    notes: "",
    professionalId: "",
    procedureId: "",
    occurrences: 1,
  });
  const [error, setError] = useState<string | null>(null);
  const [errorVariant, setErrorVariant] = useState<"danger" | "warning">("danger");
  const [saving, setSaving] = useState(false);

  const activePatients = patients.filter((p) => p.active);
  const { data: catalog } = useApiQuery<ProcedureDto[]>("/api/procedures");
  const activeCatalog = (catalog ?? []).filter((p) => p.active);
  const { data: scheduleData } = useApiQuery<{ config: ScheduleConfig }>("/api/settings/schedule");
  const scheduleConfig = resolveScheduleConfig(scheduleData);

  // Selecionar do catálogo preenche nome, preço e duração (editáveis depois).
  const applyCatalogProcedure = (procedureId: string) => {
    const selected = activeCatalog.find((p) => p.id === procedureId);
    setValues((prev) => ({
      ...prev,
      procedureId,
      procedure: selected ? selected.name : prev.procedure,
      price: selected ? String(selected.priceCents / 100) : prev.price,
      durationMinutes: selected ? selected.durationMinutes : prev.durationMinutes,
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setErrorVariant("danger");
    try {
      await onSubmit(values);
    } catch (err) {
      const resolved = resolveSubmitError(err);
      setErrorVariant(resolved.variant);
      setError(resolved.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <ErrorAlert message={error} variant={errorVariant} />}
      <p className="rounded-lg bg-accent-soft px-3 py-2 text-xs text-accent-ink">
        Atendimento de {describeSchedule(scheduleConfig)}, com intervalo mínimo de{" "}
        {scheduleConfig.minGapMinutes} minutos entre consultas.
      </p>
      <label className="text-sm font-medium">
        Paciente *
        <NativeSelect
          required
          value={values.patientId}
          onChange={(e) => setValues((prev) => ({ ...prev, patientId: e.target.value }))}
          className="mt-1"
        >
          <option value="">Selecione…</option>
          {activePatients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.fullName}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label className="text-sm font-medium">
        Repetição
        <NativeSelect
          value={values.occurrences}
          onChange={(e) =>
            setValues((prev) => ({ ...prev, occurrences: Number(e.target.value) }))
          }
          className="mt-1"
        >
          <option value={1}>Consulta única</option>
          {[4, 6, 8, 10, 12].map((n) => (
            <option key={n} value={n}>
              Semanal — {n} sessões
            </option>
          ))}
        </NativeSelect>
      </label>
      {professionals.length > 0 && (
        <label className="text-sm font-medium">
          Profissional
          <NativeSelect
            value={values.professionalId}
            onChange={(e) => setValues((prev) => ({ ...prev, professionalId: e.target.value }))}
            className="mt-1"
          >
            <option value="">— sem atribuição —</option>
            {professionals.map((professional) => (
              <option key={professional.id} value={professional.id}>
                {professional.fullName}
              </option>
            ))}
          </NativeSelect>
        </label>
      )}
      <div className="grid grid-cols-3 gap-3">
        <label className="text-sm font-medium">
          Data *
          <Input
            required
            type="date"
            value={values.date}
            onChange={(e) => setValues((prev) => ({ ...prev, date: e.target.value }))}
            className="mt-1"
          />
        </label>
        <label className="text-sm font-medium">
          Início *
          <Input
            required
            type="time"
            value={values.startTime}
            onChange={(e) => setValues((prev) => ({ ...prev, startTime: e.target.value }))}
            className="mt-1"
          />
        </label>
        <label className="text-sm font-medium">
          Duração *
          <NativeSelect
            value={values.durationMinutes}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, durationMinutes: Number(e.target.value) }))
            }
            className="mt-1"
          >
            {DURATION_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} min
              </option>
            ))}
          </NativeSelect>
        </label>
      </div>
      {activeCatalog.length > 0 && (
        <label className="text-sm font-medium">
          Procedimento do catálogo
          <NativeSelect
            value={values.procedureId}
            onChange={(e) => applyCatalogProcedure(e.target.value)}
            className="mt-1"
          >
            <option value="">— escolher do catálogo —</option>
            {activeCatalog.map((procedure) => (
              <option key={procedure.id} value={procedure.id}>
                {procedure.name} ({procedure.durationMinutes} min)
              </option>
            ))}
          </NativeSelect>
        </label>
      )}

      <label className="text-sm font-medium">
        Procedimento *
        <Input
          required
          value={values.procedure}
          onChange={(e) => setValues((prev) => ({ ...prev, procedure: e.target.value }))}
          placeholder="Ex.: Troca de bolsa de colostomia"
          className="mt-1"
        />
      </label>
      <label className="text-sm font-medium">
        Valor (R$) *
        <Input
          required
          type="number"
          min="0"
          step="0.01"
          value={values.price}
          onChange={(e) => setValues((prev) => ({ ...prev, price: e.target.value }))}
          className="mt-1"
        />
      </label>
      <label className="text-sm font-medium">
        Observações
        <Textarea
          rows={2}
          value={values.notes}
          onChange={(e) => setValues((prev) => ({ ...prev, notes: e.target.value }))}
          className="mt-1"
        />
      </label>
      <Button
        type="submit"
        disabled={saving}
        variant="accent"
        className="mt-2"
      >
        {saving ? "Agendando…" : "Agendar consulta"}
      </Button>
    </form>
  );
}
