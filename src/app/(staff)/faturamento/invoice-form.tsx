"use client";

import { useState } from "react";
import type { PatientDto } from "@/lib/dto";
import { ErrorAlert } from "@/components/feedback";

export interface InvoiceFormValues {
  patientId: string;
  description: string;
  amount: string;
  dueDate: string;
}

interface InvoiceFormProps {
  patients: PatientDto[];
  onSubmit: (values: InvoiceFormValues) => Promise<void>;
}

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none";

export function InvoiceForm({ patients, onSubmit }: InvoiceFormProps) {
  const [values, setValues] = useState<InvoiceFormValues>({
    patientId: "",
    description: "",
    amount: "",
    dueDate: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await onSubmit(values);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao emitir fatura");
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
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.fullName}
            </option>
          ))}
        </select>
      </label>
      <label className="text-sm font-medium">
        Descrição *
        <input
          required
          value={values.description}
          onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Ex.: Sessão de curativo especializado"
          className={`mt-1 ${inputClass}`}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium">
          Valor (R$) *
          <input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={values.amount}
            onChange={(e) => setValues((prev) => ({ ...prev, amount: e.target.value }))}
            className={`mt-1 ${inputClass}`}
          />
        </label>
        <label className="text-sm font-medium">
          Vencimento
          <input
            type="date"
            value={values.dueDate}
            onChange={(e) => setValues((prev) => ({ ...prev, dueDate: e.target.value }))}
            className={`mt-1 ${inputClass}`}
          />
        </label>
      </div>
      <button
        type="submit"
        disabled={saving}
        className="mt-2 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
      >
        {saving ? "Emitindo…" : "Emitir fatura"}
      </button>
    </form>
  );
}
