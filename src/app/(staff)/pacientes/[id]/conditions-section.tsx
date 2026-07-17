"use client";

import { useCallback, useState } from "react";
import { apiFetch } from "@/lib/client";
import type { AssessmentDto, ConditionDto } from "@/lib/dto";
import {
  CONDITION_KIND_LABELS,
  EXUDATE_LABELS,
  STOMA_TYPE_LABELS,
  formatDate,
  formatDateTime,
} from "@/lib/format";
import { Modal } from "@/components/modal";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorAlert } from "@/components/feedback";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none";

interface ConditionsSectionProps {
  patientId: string;
  conditions: ConditionDto[];
  onChanged: () => void;
}

export function ConditionsSection({ patientId, conditions, onChanged }: ConditionsSectionProps) {
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [assessing, setAssessing] = useState<ConditionDto | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [assessments, setAssessments] = useState<Record<string, AssessmentDto[]>>({});

  const loadAssessments = useCallback(async (conditionId: string) => {
    const result = await apiFetch<AssessmentDto[]>(`/api/conditions/${conditionId}/assessments`);
    setAssessments((prev) => ({ ...prev, [conditionId]: result }));
  }, []);

  const toggleExpanded = (conditionId: string) => {
    const willOpen = expanded !== conditionId;
    setExpanded(willOpen ? conditionId : null);
    if (willOpen) {
      void loadAssessments(conditionId).catch(() => undefined);
    }
  };

  const resolveCondition = async (condition: ConditionDto) => {
    try {
      await apiFetch<ConditionDto>(`/api/conditions/${condition.id}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "resolve" }),
      });
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao resolver condição");
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {error && <ErrorAlert message={error} />}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Estomias e feridas com avaliações seriadas para acompanhar a evolução.
        </p>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800"
        >
          + Nova condição
        </button>
      </div>

      {conditions.length === 0 ? (
        <EmptyState message="Nenhuma condição clínica cadastrada." />
      ) : (
        <ul className="flex flex-col gap-3">
          {conditions.map((condition) => {
            const conditionAssessments = assessments[condition.id] ?? [];
            const isOpen = expanded === condition.id;
            return (
              <li key={condition.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="mr-2 font-medium">{condition.title}</span>
                    <span className="mr-2 text-xs text-slate-500">
                      {CONDITION_KIND_LABELS[condition.kind]}
                      {condition.stomaType ? ` · ${STOMA_TYPE_LABELS[condition.stomaType]}` : ""}
                      {condition.startedAt ? ` · desde ${formatDate(condition.startedAt)}` : ""}
                    </span>
                    <StatusBadge
                      status={condition.status === "active" ? "confirmed" : "completed"}
                      label={condition.status === "active" ? "Em acompanhamento" : "Resolvida"}
                    />
                  </div>
                  <div className="flex gap-2 text-sm">
                    <button
                      type="button"
                      onClick={() => toggleExpanded(condition.id)}
                      className="font-medium text-teal-700 hover:underline"
                    >
                      {isOpen ? "Ocultar avaliações" : "Ver avaliações"}
                    </button>
                    {condition.status === "active" && (
                      <>
                        <button
                          type="button"
                          onClick={() => setAssessing(condition)}
                          className="font-medium text-teal-700 hover:underline"
                        >
                          + Avaliação
                        </button>
                        <button
                          type="button"
                          onClick={() => void resolveCondition(condition)}
                          className="font-medium text-slate-500 hover:underline"
                        >
                          Marcar resolvida
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    {conditionAssessments.length === 0 ? (
                      <EmptyState message="Nenhuma avaliação registrada." />
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs">
                          <thead className="text-slate-500">
                            <tr>
                              <th className="py-1 pr-3">Data</th>
                              <th className="py-1 pr-3">C×L×P (mm)</th>
                              <th className="py-1 pr-3">Área (mm²)</th>
                              <th className="py-1 pr-3">Tecido</th>
                              <th className="py-1 pr-3">Exsudato</th>
                              <th className="py-1 pr-3">Dor</th>
                              <th className="py-1 pr-3">Pele periestomal</th>
                              <th className="py-1">Complicações</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {conditionAssessments.map((a) => (
                              <tr key={a.id}>
                                <td className="py-1.5 pr-3">{formatDateTime(a.createdAt)}</td>
                                <td className="py-1.5 pr-3">
                                  {a.lengthMm != null
                                    ? `${a.lengthMm}×${a.widthMm ?? "—"}×${a.depthMm ?? "—"}`
                                    : "—"}
                                </td>
                                <td className="py-1.5 pr-3">{a.areaMm2 ?? "—"}</td>
                                <td className="py-1.5 pr-3">{a.tissueType ?? "—"}</td>
                                <td className="py-1.5 pr-3">
                                  {a.exudate ? EXUDATE_LABELS[a.exudate] : "—"}
                                </td>
                                <td className="py-1.5 pr-3">
                                  {a.painScale != null ? `${a.painScale}/10` : "—"}
                                </td>
                                <td className="py-1.5 pr-3">{a.skinCondition ?? "—"}</td>
                                <td className="py-1.5">{a.complications ?? "—"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {creating && (
        <Modal title="Nova condição clínica" onClose={() => setCreating(false)}>
          <ConditionForm
            patientId={patientId}
            onSaved={() => {
              setCreating(false);
              onChanged();
            }}
          />
        </Modal>
      )}

      {assessing && (
        <Modal title={`Avaliação — ${assessing.title}`} onClose={() => setAssessing(null)}>
          <AssessmentForm
            condition={assessing}
            onSaved={() => {
              void loadAssessments(assessing.id).catch(() => undefined);
              setExpanded(assessing.id);
              setAssessing(null);
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function ConditionForm({ patientId, onSaved }: { patientId: string; onSaved: () => void }) {
  const [kind, setKind] = useState<"stoma" | "wound">("stoma");
  const [title, setTitle] = useState("");
  const [stomaType, setStomaType] = useState("colostomia");
  const [startedAt, setStartedAt] = useState("");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch<ConditionDto>(`/api/patients/${patientId}/conditions`, {
        method: "POST",
        body: JSON.stringify({
          kind,
          title,
          stomaType: kind === "stoma" ? stomaType : null,
          startedAt: startedAt ? new Date(startedAt).toISOString() : null,
          notes: notes || null,
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar condição");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <ErrorAlert message={error} />}
      <label className="text-sm font-medium">
        Tipo *
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as "stoma" | "wound")}
          className={`mt-1 ${inputClass}`}
        >
          <option value="stoma">Estomia</option>
          <option value="wound">Ferida</option>
        </select>
      </label>
      {kind === "stoma" && (
        <label className="text-sm font-medium">
          Tipo de estomia *
          <select
            value={stomaType}
            onChange={(e) => setStomaType(e.target.value)}
            className={`mt-1 ${inputClass}`}
          >
            {Object.entries(STOMA_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="text-sm font-medium">
        Descrição/localização *
        <input
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={kind === "stoma" ? "Ex.: Colostomia terminal QIE" : "Ex.: Úlcera venosa perna E"}
          className={`mt-1 ${inputClass}`}
        />
      </label>
      <label className="text-sm font-medium">
        Início (cirurgia/lesão)
        <input
          type="date"
          value={startedAt}
          onChange={(e) => setStartedAt(e.target.value)}
          className={`mt-1 ${inputClass}`}
        />
      </label>
      <label className="text-sm font-medium">
        Observações
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={`mt-1 ${inputClass}`} />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="mt-1 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
      >
        {saving ? "Salvando…" : "Criar condição"}
      </button>
    </form>
  );
}

interface AssessmentFormValues {
  lengthMm: string;
  widthMm: string;
  depthMm: string;
  tissueType: string;
  exudate: string;
  painScale: string;
  skinCondition: string;
  complications: string;
  notes: string;
}

const toNumberOrNull = (value: string): number | null => (value ? Number(value) : null);
const toTextOrNull = (value: string): string | null => value || null;

const toAssessmentPayload = (values: AssessmentFormValues) => ({
  lengthMm: toNumberOrNull(values.lengthMm),
  widthMm: toNumberOrNull(values.widthMm),
  depthMm: toNumberOrNull(values.depthMm),
  tissueType: toTextOrNull(values.tissueType),
  exudate: toTextOrNull(values.exudate),
  painScale: toNumberOrNull(values.painScale),
  skinCondition: toTextOrNull(values.skinCondition),
  complications: toTextOrNull(values.complications),
  notes: toTextOrNull(values.notes),
});

function AssessmentForm({ condition, onSaved }: { condition: ConditionDto; onSaved: () => void }) {
  const isWound = condition.kind === "wound";
  const [values, setValues] = useState({
    lengthMm: "",
    widthMm: "",
    depthMm: "",
    tissueType: "",
    exudate: "",
    painScale: "",
    skinCondition: "",
    complications: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof values) => (value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/conditions/${condition.id}/assessments`, {
        method: "POST",
        body: JSON.stringify(toAssessmentPayload(values)),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar avaliação");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <ErrorAlert message={error} />}
      {isWound && (
        <>
          <div className="grid grid-cols-3 gap-3">
            <label className="text-sm font-medium">
              Comprimento (mm)
              <input type="number" min="0" value={values.lengthMm} onChange={(e) => set("lengthMm")(e.target.value)} className={`mt-1 ${inputClass}`} />
            </label>
            <label className="text-sm font-medium">
              Largura (mm)
              <input type="number" min="0" value={values.widthMm} onChange={(e) => set("widthMm")(e.target.value)} className={`mt-1 ${inputClass}`} />
            </label>
            <label className="text-sm font-medium">
              Profundidade (mm)
              <input type="number" min="0" value={values.depthMm} onChange={(e) => set("depthMm")(e.target.value)} className={`mt-1 ${inputClass}`} />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-sm font-medium">
              Tecido predominante
              <select value={values.tissueType} onChange={(e) => set("tissueType")(e.target.value)} className={`mt-1 ${inputClass}`}>
                <option value="">—</option>
                <option value="granulação">Granulação</option>
                <option value="epitelização">Epitelização</option>
                <option value="esfacelo">Esfacelo</option>
                <option value="necrose">Necrose</option>
              </select>
            </label>
            <label className="text-sm font-medium">
              Exsudato
              <select value={values.exudate} onChange={(e) => set("exudate")(e.target.value)} className={`mt-1 ${inputClass}`}>
                <option value="">—</option>
                {Object.entries(EXUDATE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </>
      )}
      {!isWound && (
        <>
          <label className="text-sm font-medium">
            Pele periestomal
            <input
              value={values.skinCondition}
              onChange={(e) => set("skinCondition")(e.target.value)}
              placeholder="Ex.: íntegra, dermatite leve…"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <label className="text-sm font-medium">
            Complicações
            <input
              value={values.complications}
              onChange={(e) => set("complications")(e.target.value)}
              placeholder="Ex.: dermatite, prolapso, hérnia, retração…"
              className={`mt-1 ${inputClass}`}
            />
          </label>
        </>
      )}
      <label className="text-sm font-medium">
        Dor (0–10)
        <input type="number" min="0" max="10" value={values.painScale} onChange={(e) => set("painScale")(e.target.value)} className={`mt-1 ${inputClass}`} />
      </label>
      <label className="text-sm font-medium">
        Observações
        <textarea rows={2} value={values.notes} onChange={(e) => set("notes")(e.target.value)} className={`mt-1 ${inputClass}`} />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="mt-1 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
      >
        {saving ? "Registrando…" : "Registrar avaliação"}
      </button>
    </form>
  );
}
