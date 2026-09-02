"use client";

import { useState } from "react";
import { useToast } from "@still-void/ui/react/client";
import { apiFetch } from "@/lib/client";
import type { EvolutionNoteDto, ProfessionalDto } from "@/lib/dto";
import { useApiQuery } from "@/lib/use-api-query";
import { formatDateTime } from "@/lib/format";
import { EmptyState, ErrorAlert, LoadingIndicator } from "@/components/feedback";
import { Button, Card, NativeSelect, Textarea } from "@still-void/ui/react";

interface EvolutionsSectionProps {
  patientId: string;
  evolutions: EvolutionNoteDto[];
  error: string | null;
  isLoading: boolean;
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

export function EvolutionsSection({
  patientId,
  evolutions,
  error,
  isLoading,
  onSaved,
}: EvolutionsSectionProps) {
  const { toast } = useToast();
  const [values, setValues] = useState(EMPTY);
  const [professionalId, setProfessionalId] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const { data: professionals } = useApiQuery<ProfessionalDto[]>("/api/professionals");
  const activeProfessionals = (professionals ?? []).filter((p) => p.active);
  const professionalName = (id: string | null) =>
    (professionals ?? []).find((p) => p.id === id)?.fullName ?? null;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setFormError(null);
    try {
      await apiFetch<EvolutionNoteDto>(`/api/patients/${patientId}/evolutions`, {
        method: "POST",
        body: JSON.stringify({ ...values, professionalId: professionalId || null }),
      });
      toast({ description: "Evolução registrada", variant: "success" });
      setValues(EMPTY);
      setShowForm(false);
      onSaved();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Erro ao registrar evolução");
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
          variant="accent"
        >
          {showForm ? "Fechar" : "+ Nova evolução"}
        </Button>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="flex flex-col gap-3 rounded-lg border border-accent bg-accent-soft/40 p-4"
        >
          {formError && <ErrorAlert message={formError} />}
          {activeProfessionals.length > 0 && (
            <label className="text-sm font-medium">
              Profissional responsável
              <NativeSelect
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
                className="mt-1 w-full"
              >
                <option value="">— sem atribuição —</option>
                {activeProfessionals.map((professional) => (
                  <option key={professional.id} value={professional.id}>
                    {professional.fullName}
                  </option>
                ))}
              </NativeSelect>
            </label>
          )}
          {SOAP_FIELDS.map((field) => (
            <label key={field.key} className="text-sm font-medium">
              {field.label}
              <Textarea
                rows={2}
                value={values[field.key]}
                placeholder={field.placeholder}
                onChange={(e) => setValues((prev) => ({ ...prev, [field.key]: e.target.value }))}
                className="mt-1 w-full"
              />
            </label>
          ))}
          <Button
            type="submit"
            disabled={saving}
            variant="accent"
            className="self-start"
          >
            {saving ? "Registrando…" : "Registrar evolução"}
          </Button>
        </form>
      )}

      {isLoading ? (
        <LoadingIndicator />
      ) : error ? (
        <ErrorAlert message={error} />
      ) : evolutions.length === 0 ? (
        <EmptyState message="Nenhuma evolução registrada." />
      ) : (
        <ul className="flex flex-col gap-3">
          {evolutions.map((note) => (
            <Card as="li" key={note.id} className="p-4">
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
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
