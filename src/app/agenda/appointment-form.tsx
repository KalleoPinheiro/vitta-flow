"use client";

import { useState } from "react";
import type { PatientDto } from "@/lib/dto";
import { ErrorAlert } from "@/components/feedback";
import { dayKey } from "./calendar-grid";

export interface AppointmentFormValues {
  patientId: string;
  date: string;
  startTime: string;
  durationMinutes: number;
  procedure: string;
  price: string;
  notes: string;
}

interface AppointmentFormProps {
  patients: PatientDto[];
  defaultDate?: Date;
  onSubmit: (values: AppointmentFormValues) => Promise<void>;
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none";

const DURATION_OPTIONS = [30, 45, 60, 90, 120];

export function AppointmentForm({ patients, defaultDate, onSubmit }: AppointmentFormProps) {
  const [values, setValues] = useState<AppointmentFormValues>({
    patientId: "",
    date: defaultDate ? dayKey(defaultDate) : dayKey(new Date()),
    startTime: "09:00",
    durationMinutes: 60,
    procedure: "",
    price: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const activePatients = patients.filter((p) => p.active);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao agendar consulta");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <ErrorAlert message={error} />}
      <label className="text-sm font-medium">
        Paciente *
        <select
          required
          value={values.patientId}
          onChange={(e) => setValues((prev) => ({ ...prev, patientId: e.target.value }))}
          className={`mt-1 ${inputClass}`}
        >
          <option value="">Selecione…</option>
          {activePatients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.fullName}
            </option>
          ))}
        </select>
      </label>
      <div className="grid grid-cols-3 gap-3">
        <label className="text-sm font-medium">
          Data *
          <input
            required
            type="date"
            value={values.date}
            onChange={(e) => setValues((prev) => ({ ...prev, date: e.target.value }))}
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="text-sm font-medium">
          Início *
          <input
            required
            type="time"
            value={values.startTime}
            onChange={(e) => setValues((prev) => ({ ...prev, startTime: e.target.value }))}
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="text-sm font-medium">
          Duração *
          <select
            value={values.durationMinutes}
            onChange={(e) =>
              setValues((prev) => ({ ...prev, durationMinutes: Number(e.target.value) }))
            }
            className={`mt-1 ${inputClass}`}
          >
            {DURATION_OPTIONS.map((minutes) => (
              <option key={minutes} value={minutes}>
                {minutes} min
              </option>
            ))}
          </select>
        </label>
      </div>
      <label className="text-sm font-medium">
        Procedimento *
        <input
          required
          value={values.procedure}
          onChange={(e) => setValues((prev) => ({ ...prev, procedure: e.target.value }))}
          placeholder="Ex.: Troca de bolsa de colostomia"
          className={`mt-1 ${inputClass}`}
        />
      </label>
      <label className="text-sm font-medium">
        Valor (R$) *
        <input
          required
          type="number"
          min="0"
          step="0.01"
          value={values.price}
          onChange={(e) => setValues((prev) => ({ ...prev, price: e.target.value }))}
          className={`mt-1 ${inputClass}`}
        />
      </label>
      <label className="text-sm font-medium">
        Observações
        <textarea
          rows={2}
          value={values.notes}
          onChange={(e) => setValues((prev) => ({ ...prev, notes: e.target.value }))}
          className={`mt-1 ${inputClass}`}
        />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="mt-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
      >
        {saving ? "Agendando…" : "Agendar consulta"}
      </button>
    </form>
  );
}
