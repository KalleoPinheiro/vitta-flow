"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client";
import type { EvolutionNoteDto, ProfessionalDto } from "@/lib/dto";
import { useApiQuery } from "@/lib/use-api-query";
import { formatDateTime } from "@/lib/format";
import { EmptyState, ErrorAlert } from "@/components/feedback";

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
        <p className="text-sm text-slate-500">
          Evoluções são imutáveis após registradas (integridade de prontuário).
        </p>
        <button
          type="button"
          onClick={() => setShowForm((v) => !v)}
          className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800"
        >
          {showForm ? "Fechar" : "+ Nova evolução"}
        </button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 rounded-lg border border-teal-200 bg-teal-50/40 p-4"
        >
          {error && <ErrorAlert message={error} />}
          {activeProfessionals.length > 0 && (
            <label className="text-sm font-medium">
              Profissional responsável
              <select
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
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
              <textarea
                rows={2}
                value={values[field.key]}
                placeholder={field.placeholder}
                onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm focus:border-teal-500 focus:outline-none"
              />
            </label>
          ))}
          <button
            type="submit"
            disabled={saving}
            className="self-start rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
          >
            {saving ? "Registrando…" : "Registrar evolução"}
          </button>
        </form>
      )}

      {evolutions.length === 0 ? (
        <EmptyState message="Nenhuma evolução registrada." />
      ) : (
        <ul className="flex flex-col gap-3">
          {evolutions.map((note) => (
            <li key={note.id} className="rounded-lg border border-slate-200 bg-white p-4">
              <p className="mb-2 text-xs font-medium text-slate-400">
                {formatDateTime(note.createdAt)}
                {professionalName(note.professionalId) && (
                  <span> · {professionalName(note.professionalId)}</span>
                )}
              </p>
              <dl className="grid gap-1 text-sm">
                {SOAP_FIELDS.map((field) =>
                  note[field.key] ? (
                    <div key={field.key}>
                      <dt className="inline font-semibold text-teal-800">
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
