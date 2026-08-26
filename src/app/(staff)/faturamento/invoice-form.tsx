"use client";

import { useState } from "react";
import type { PatientDto } from "@/lib/dto";
import { ErrorAlert } from "@/components/feedback";
import { Button, Input, NativeSelect } from "@still-void/ui/react";

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
        <NativeSelect
          required
          value={values.patientId}
          onChange={(e) => setValues((prev) => ({ ...prev, patientId: e.target.value }))}
          className="mt-1"
        >
          <option value="">Selecione…</option>
          {patients.map((patient) => (
            <option key={patient.id} value={patient.id}>
              {patient.fullName}
            </option>
          ))}
        </NativeSelect>
      </label>
      <label className="text-sm font-medium">
        Descrição *
        <Input
          required
          value={values.description}
          onChange={(e) => setValues((prev) => ({ ...prev, description: e.target.value }))}
          placeholder="Ex.: Sessão de curativo especializado"
          className="mt-1"
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm font-medium">
          Valor (R$) *
          <Input
            required
            type="number"
            min="0.01"
            step="0.01"
            value={values.amount}
            onChange={(e) => setValues((prev) => ({ ...prev, amount: e.target.value }))}
            className="mt-1"
          />
        </label>
        <label className="text-sm font-medium">
          Vencimento
          <Input
            type="date"
            value={values.dueDate}
            onChange={(e) => setValues((prev) => ({ ...prev, dueDate: e.target.value }))}
            className="mt-1"
          />
        </label>
      </div>
      <Button
        type="submit"
        disabled={saving}
        variant="accent"
        className="mt-2"
      >
        {saving ? "Emitindo…" : "Emitir fatura"}
      </Button>
    </form>
  );
}
