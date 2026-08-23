"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client";
import type { EvolutionNoteDto, ProfessionalDto } from "@/lib/dto";
import { useApiQuery } from "@/lib/use-api-query";
import { formatDateTime } from "@/lib/format";
import { EmptyState, ErrorAlert } from "@/components/feedback";
import { Button } from "@still-void/ui/react";
import { accentButton, nativeField } from "@/lib/ui";

interface EvolutionsSectionProps {
  patientId: string;
  evolutions: EvolutionNoteDto[];
  onSaved: () => void;
}

const SOAP_FIELDS = [
  { key: "subjective", label: "S — Subjetivo", placeholder: "Queixas relatadas pelo paciente" },
  { key: "objective", label: "O — Objetivo", placeholder: "Achados do exame físico" },
  { key: "assessment", label: "A — Avaliação", placeholder: "Interpretação clínica" },
  { key: "plan", label: "P — Plano", placeholder: "Conduta e orientações" },
] as const;

type SoapKey = (typeof SOAP_FIELDS)[number]["key"];

const EMPTY: Record<SoapKey, string> = { subjective: "", objective: "", assessment: "", plan: "" };

export function EvolutionsSection({ patientId, evolutions, onSaved }: EvolutionsSectionProps) {
  const [values, setValues] = useState(EMPTY);
  const [professionalId, setProfessionalId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { data: professionals } = useApiQuery<ProfessionalDto[]>("/api/professionals");
  const activeProfessionals = (professionals ?? []).filter((p) => p.active);
  const professionalName = (id: string | null) =>
    (professionals ?? []).find((p) => p.id === id)?.fullName ?? null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch<EvolutionNoteDto>(`/api/patients/${patientId}/evolutions`, {
        method: "POST",
        body: JSON.stringify({ ...values, professionalId: professionalId || null }),
      });
      setValues(EMPTY);
      setShowForm(false);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar evolução");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-ink-3">
          Evoluções são imutáveis após registradas (integridade de prontuário).
        </p>
        <Button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className={accentButton}
        >
          {showForm ? "Fechar" : "+ Nova evolução"}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 rounded-lg border border-accent bg-accent-soft/40 p-4"
        >
          {error && <ErrorAlert message={error} />}
          {activeProfessionals.length > 0 && (
            <label className="text-sm font-medium">
              Profissional responsável
              {/* sv-gap: native-select */}
              <select
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
                className={`${nativeField} mt-1 w-full`}
              >
                <option value="">— sem atribuição —</option>
                {activeProfessionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.fullName}
                  </option>
                ))}
              </select>
            </label>
          )}
          {SOAP_FIELDS.map((field) => (
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
          <Button
            type="submit"
            disabled={saving}
            className={`self-start ${accentButton}`}
          >
            {saving ? "Registrando…" : "Registrar evolução"}
          </Button>
        </form>
      )}

      {evolutions.length === 0 ? (
        <EmptyState message="Nenhuma evolução registrada." />
      ) : (
        <ul className="flex flex-col gap-3">
          {evolutions.map((note) => (
            /* sv-gap: card-as-element */
            <li key={note.id} className="rounded-lg border border-sv-border bg-sv-surface p-4">
              <p className="mb-2 text-xs font-medium text-ink-3">
                {formatDateTime(note.createdAt)}
                {professionalName(note.professionalId) && (
                  <span> · {professionalName(note.professionalId)}</span>
                )}
              </p>
              <dl className="grid gap-1 text-sm">
                {SOAP_FIELDS.map((field) =>
                  note[field.key] ? (
                    <div key={field.key}>
                      <dt className="inline font-semibold text-accent-ink">
                        {field.label.slice(0, 1)}:{" "}
                      </dt>
                      <dd className="inline whitespace-pre-wrap">{note[field.key]}</dd>
                    </div>
                  ) : null,
                )}
              </dl>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
