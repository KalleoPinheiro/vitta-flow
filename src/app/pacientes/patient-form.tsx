"use client";

import { useState } from "react";
import type { PatientDto } from "@/lib/dto";
import { ErrorAlert } from "@/components/feedback";

export interface PatientFormValues {
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
  notes: string;
}

interface PatientFormProps {
  initial?: PatientDto;
  onSubmit: (values: PatientFormValues) => Promise<void>;
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none";

const toFormValues = (initial?: PatientDto): PatientFormValues => {
  if (!initial) {
    return { fullName: "", email: "", phone: "", birthDate: "", notes: "" };
  }
  return {
    fullName: initial.fullName,
    email: initial.email,
    phone: initial.phone,
    birthDate: initial.birthDate ? initial.birthDate.slice(0, 10) : "",
    notes: initial.notes ?? "",
  };
};

export function PatientForm({ initial, onSubmit }: PatientFormProps) {
  const [values, setValues] = useState<PatientFormValues>(() => toFormValues(initial));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (field: keyof PatientFormValues) => (value: string) =>
    setValues((prev) => ({ ...prev, [field]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar paciente");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <ErrorAlert message={error} />}
      <label className="text-sm font-medium">
        Nome completo *
        <input
          required
          value={values.fullName}
          onChange={(e) => set("fullName")(e.target.value)}
          className={`mt-1 ${inputClass}`}
        />
      </label>
      <label className="text-sm font-medium">
        Email *
        <input
          required
          type="email"
          value={values.email}
          onChange={(e) => set("email")(e.target.value)}
          className={`mt-1 ${inputClass}`}
        />
      </label>
      <label className="text-sm font-medium">
        Telefone *
        <input
          required
          value={values.phone}
          onChange={(e) => set("phone")(e.target.value)}
          className={`mt-1 ${inputClass}`}
        />
      </label>
      <label className="text-sm font-medium">
        Data de nascimento
        <input
          type="date"
          value={values.birthDate}
          onChange={(e) => set("birthDate")(e.target.value)}
          className={`mt-1 ${inputClass}`}
        />
      </label>
      <label className="text-sm font-medium">
        Observações clínicas
        <textarea
          rows={3}
          value={values.notes}
          onChange={(e) => set("notes")(e.target.value)}
          className={`mt-1 ${inputClass}`}
        />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="mt-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
      >
        {saving ? "Salvando…" : "Salvar"}
      </button>
    </form>
  );
}
