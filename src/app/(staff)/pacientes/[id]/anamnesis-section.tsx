"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client";
import type { AnamnesisDto } from "@/lib/dto";
import { ErrorAlert } from "@/components/feedback";
import { Button } from "@still-void/ui/react";
import { accentButton, nativeField } from "@/lib/ui";

interface AnamnesisSectionProps {
  patientId: string;
  anamnesis: AnamnesisDto | null;
  onSaved: () => void;
}

const FIELDS = [
  { key: "comorbidities", label: "Comorbidades", placeholder: "Ex.: Diabetes tipo 2, HAS" },
  { key: "allergies", label: "Alergias", placeholder: "Ex.: adesivo hidrocoloide, látex" },
  { key: "medications", label: "Medicações em uso", placeholder: "Ex.: Metformina 850mg 2x/dia" },
  { key: "surgicalHistory", label: "Histórico cirúrgico", placeholder: "Ex.: Colectomia (2024)" },
  { key: "notes", label: "Observações", placeholder: "" },
] as const;

type FieldKey = (typeof FIELDS)[number]["key"];

const toFormValues = (anamnesis: AnamnesisDto | null): Record<FieldKey, string> => {
  const entries = FIELDS.map((field) => [field.key, anamnesis ? anamnesis[field.key] : ""]);
  return Object.fromEntries(entries) as Record<FieldKey, string>;
};

export function AnamnesisSection({ patientId, anamnesis, onSaved }: AnamnesisSectionProps) {
  const [values, setValues] = useState<Record<FieldKey, string>>(() => toFormValues(anamnesis));
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch<AnamnesisDto>(`/api/patients/${patientId}/anamnesis`, {
        method: "PUT",
        body: JSON.stringify(values),
      });
      setSavedAt(new Date().toLocaleTimeString("pt-BR"));
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar anamnese");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <ErrorAlert message={error} />}
      {FIELDS.map((field) => (
        <label key={field.key} className="text-sm font-medium">
          {field.label}
          {/* sv-gap: textarea */}
          <textarea
            rows={2}
            value={values[field.key]}
            placeholder={field.placeholder}
            onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
            className={`${nativeField} mt-1 w-full`}
          />
        </label>
      ))}
      <div className="flex items-center gap-3">
        <Button
          type="submit"
          disabled={saving}
          className={accentButton}
        >
          {saving ? "Salvando…" : "Salvar anamnese"}
        </Button>
        {savedAt && <span className="text-xs text-ink-3">Salvo às {savedAt}</span>}
      </div>
    </form>
  );
}
