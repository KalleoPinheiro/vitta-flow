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
import { HealingChart } from "@/components/healing-chart";
import { ConditionPhotos } from "./condition-photos";

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
                    <a
                      href={`/documentos/relatorio/${condition.id}`}
                      className="font-medium text-teal-700 hover:underline"
                    >
                      Relatório p/ parceiro
                    </a>
                  </div>
                </div>

                {isOpen && (
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <ConditionPhotos
                      conditionId={condition.id}
                      canUpload={condition.status === "active"}
                    />
                    {conditionAssessments.length === 0 ? (
                      <EmptyState message="Nenhuma avaliação registrada." />
                    ) : (
                      <div className="overflow-x-auto">
                        <div className="mb-3">
                          <HealingChart assessments={conditionAssessments} />
                        </div>
                        <table className="w-full text-left text-xs">
                          <thead className="text-slate-500">
                            <tr>
                              <th className="py-1 pr-3">Data</th>
                              <th className="py-1 pr-3">C×L×P (mm)</th>
                              <th className="py-1 pr-3">Área (mm²)</th>
                              <th className="py-1 pr-3">Tecido</th>
                              <th className="py-1 pr-3">Exsudato</th>
                              <th className="py-1 pr-3">Dor</th>
                              <th className="py-1 pr-3">PUSH/DET</th>
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
                                <td className="py-1.5 pr-3 font-medium">{scoreLabel(a)}</td>
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

/** Score clínico validado da avaliação: PUSH (ferida) ou DET (estomia). */
function scoreLabel(assessment: AssessmentDto): string {
  if (assessment.pushScore != null) return `PUSH ${assessment.pushScore}`;
  if (assessment.detScore != null) return `DET ${assessment.detScore}`;
  return "—";
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
  complicationCodes: string[];
  detDiscolorationArea: string;
  detDiscolorationSeverity: string;
  detErosionArea: string;
  detErosionSeverity: string;
  detOvergrowthArea: string;
  detOvergrowthSeverity: string;
  notes: string;
}

/** Complicações canônicas de estomia (O2.2) — labels em pt-BR. */
const COMPLICATION_OPTIONS = [
  { value: "dermatitis", label: "Dermatite" },
  { value: "prolapse", label: "Prolapso" },
  { value: "hernia", label: "Hérnia" },
  { value: "retraction", label: "Retração" },
  { value: "bleeding", label: "Sangramento" },
  { value: "granuloma", label: "Granuloma" },
  { value: "stenosis", label: "Estenose" },
  { value: "other", label: "Outra" },
];

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
  complicationCodes:
    values.complicationCodes.length > 0 ? values.complicationCodes.join(",") : null,
  detDiscolorationArea: toNumberOrNull(values.detDiscolorationArea),
  detDiscolorationSeverity: toNumberOrNull(values.detDiscolorationSeverity),
  detErosionArea: toNumberOrNull(values.detErosionArea),
  detErosionSeverity: toNumberOrNull(values.detErosionSeverity),
  detOvergrowthArea: toNumberOrNull(values.detOvergrowthArea),
  detOvergrowthSeverity: toNumberOrNull(values.detOvergrowthSeverity),
  notes: toTextOrNull(values.notes),
});

function AssessmentForm({ condition, onSaved }: { condition: ConditionDto; onSaved: () => void }) {
  const isWound = condition.kind === "wound";
  const [values, setValues] = useState<AssessmentFormValues>({
    lengthMm: "",
    widthMm: "",
    depthMm: "",
    tissueType: "",
    exudate: "",
    painScale: "",
    skinCondition: "",
    complications: "",
    complicationCodes: [],
    detDiscolorationArea: "",
    detDiscolorationSeverity: "",
    detErosionArea: "",
    detErosionSeverity: "",
    detOvergrowthArea: "",
    detOvergrowthSeverity: "",
    notes: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const set = (key: keyof typeof values) => (value: string) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const toggleComplication = (code: string) =>
    setValues((prev) => ({
      ...prev,
      complicationCodes: prev.complicationCodes.includes(code)
        ? prev.complicationCodes.filter((c) => c !== code)
        : [...prev.complicationCodes, code],
    }));

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
                {/* Valores canônicos do PUSH 3.0 — texto livre legado permanece no histórico. */}
                <option value="closed">Fechado (0)</option>
                <option value="epithelial">Epitelização (1)</option>
                <option value="granulation">Granulação (2)</option>
                <option value="slough">Esfacelo (3)</option>
                <option value="necrotic">Necrose (4)</option>
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
          <fieldset className="rounded-lg border border-slate-200 p-3">
            <legend className="px-1 text-xs font-semibold uppercase text-slate-500">
              Escala DET (0–15) — área 0–3 · severidade 0–2
            </legend>
            <div className="grid grid-cols-3 gap-3 text-sm">
              <DetDomainInputs
                label="Descoloração"
                area={values.detDiscolorationArea}
                severity={values.detDiscolorationSeverity}
                onArea={set("detDiscolorationArea")}
                onSeverity={set("detDiscolorationSeverity")}
              />
              <DetDomainInputs
                label="Erosão"
                area={values.detErosionArea}
                severity={values.detErosionSeverity}
                onArea={set("detErosionArea")}
                onSeverity={set("detErosionSeverity")}
              />
              <DetDomainInputs
                label="Hiperplasia"
                area={values.detOvergrowthArea}
                severity={values.detOvergrowthSeverity}
                onArea={set("detOvergrowthArea")}
                onSeverity={set("detOvergrowthSeverity")}
              />
            </div>
          </fieldset>
          <div>
            <p className="mb-1 text-sm font-medium">Complicações</p>
            <div className="flex flex-wrap gap-2">
              {COMPLICATION_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => toggleComplication(option.value)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium ${
                    values.complicationCodes.includes(option.value)
                      ? "bg-red-700 text-white"
                      : "border border-slate-300 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
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
            Observação de complicações (texto livre)
            <input
              value={values.complications}
              onChange={(e) => set("complications")(e.target.value)}
              placeholder="Detalhe as complicações selecionadas…"
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

function DetDomainInputs({
  label,
  area,
  severity,
  onArea,
  onSeverity,
}: {
  label: string;
  area: string;
  severity: string;
  onArea: (value: string) => void;
  onSeverity: (value: string) => void;
}) {
  return (
    <div>
      <p className="mb-1 font-medium">{label}</p>
      <div className="flex gap-2">
        <input
          type="number"
          min="0"
          max="3"
          placeholder="área"
          value={area}
          onChange={(e) => onArea(e.target.value)}
          className={inputClass}
        />
        <input
          type="number"
          min="0"
          max="2"
          placeholder="sev."
          value={severity}
          onChange={(e) => onSeverity(e.target.value)}
          className={inputClass}
        />
      </div>
    </div>
  );
}
