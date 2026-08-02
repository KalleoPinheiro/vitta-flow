"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/client";
import { useApiQuery } from "@/lib/use-api-query";
import type {
  CarePlanDetailDto,
  CarePlanDto,
  CarePlanOutcomeDto,
  ConditionDto,
  NursingDiagnosisDto,
  NursingInterventionDto,
  NursingOutcomeDto,
} from "@/lib/dto";
import {
  CARE_PLAN_DIAGNOSIS_TYPE_LABELS,
  CARE_PLAN_STATUS_LABELS,
  INTERVENTION_PRIORITY_LABELS,
  formatDateTime,
  outcomeStatusLabel,
  pesSentence,
} from "@/lib/format";
import { Modal } from "@/components/modal";
import { StatusBadge } from "@/components/status-badge";
import { EmptyState, ErrorAlert } from "@/components/feedback";

const inputClass =
  "w-full rounded-lg border border-slate-300 px-3 py-2 text-sm focus:border-teal-500 focus:outline-none";

interface CarePlansSectionProps {
  patientId: string;
  conditions: ConditionDto[];
  plans: CarePlanDto[];
  onChanged: () => void;
}

export function CarePlansSection({ patientId, conditions, plans, onChanged }: CarePlansSectionProps) {
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">
          Processo de Enfermagem: diagnóstico (NANDA-I) → resultado esperado (NOC) → intervenção (NIC).
        </p>
        <button
          type="button"
          onClick={() => setCreating(true)}
          className="rounded-lg bg-teal-700 px-3 py-1.5 text-sm font-medium text-white hover:bg-teal-800"
        >
          + Novo plano
        </button>
      </div>

      {plans.length === 0 ? (
        <EmptyState message="Nenhum plano de cuidados aberto." />
      ) : (
        <ul className="flex flex-col gap-3">
          {plans.map((plan) => {
            const condition = conditions.find((item) => item.id === plan.conditionId);
            const isOpen = expanded === plan.id;
            return (
              <li key={plan.id} className="rounded-lg border border-slate-200 bg-white p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <span className="mr-2 font-medium">
                      {condition ? condition.title : "Plano geral do paciente"}
                    </span>
                    <StatusBadge
                      status={plan.status === "active" ? "confirmed" : "completed"}
                      label={CARE_PLAN_STATUS_LABELS[plan.status]}
                    />
                  </div>
                  <div className="flex gap-3 text-sm">
                    <button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : plan.id)}
                      className="font-medium text-teal-700 hover:underline"
                    >
                      {isOpen ? "Ocultar plano" : "Ver plano"}
                    </button>
                    <a
                      href={`/documentos/plano-cuidados/${plan.id}`}
                      className="font-medium text-teal-700 hover:underline"
                    >
                      Imprimir plano
                    </a>
                  </div>
                </div>
                {isOpen && <CarePlanPanel planId={plan.id} onChanged={onChanged} />}
              </li>
            );
          })}
        </ul>
      )}

      {creating && (
        <Modal title="Novo plano de cuidados" onClose={() => setCreating(false)}>
          <OpenCarePlanForm
            patientId={patientId}
            conditions={conditions}
            onSaved={() => {
              setCreating(false);
              onChanged();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function OpenCarePlanForm({
  patientId,
  conditions,
  onSaved,
}: {
  patientId: string;
  conditions: ConditionDto[];
  onSaved: () => void;
}) {
  const [conditionId, setConditionId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/patients/${patientId}/care-plans`, {
        method: "POST",
        body: JSON.stringify({ conditionId: conditionId || null }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao abrir plano");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <ErrorAlert message={error} />}
      <label className="text-sm font-medium">
        Condição associada
        <select
          value={conditionId}
          onChange={(e) => setConditionId(e.target.value)}
          className={`mt-1 ${inputClass}`}
        >
          <option value="">Geral (sem condição específica)</option>
          {conditions.map((condition) => (
            <option key={condition.id} value={condition.id}>
              {condition.title}
            </option>
          ))}
        </select>
      </label>
      <button
        type="submit"
        disabled={saving}
        className="mt-1 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
      >
        {saving ? "Abrindo…" : "Abrir plano"}
      </button>
    </form>
  );
}

function CarePlanPanel({ planId, onChanged }: { planId: string; onChanged: () => void }) {
  const { data: detail, error, refresh } = useApiQuery<CarePlanDetailDto>(`/api/care-plans/${planId}`);
  const [addingDiagnosis, setAddingDiagnosis] = useState(false);
  const [addingOutcome, setAddingOutcome] = useState(false);
  const [addingIntervention, setAddingIntervention] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  if (error) return <ErrorAlert message={error} />;
  if (!detail) return null;

  const isActive = detail.plan.status === "active";
  const firstDiagnosisCode = detail.diagnoses[0]?.diagnosisCode ?? null;

  const resolvePlan = async () => {
    try {
      await apiFetch(`/api/care-plans/${planId}`, {
        method: "PATCH",
        body: JSON.stringify({ action: "resolve" }),
      });
      refresh();
      onChanged();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Erro ao resolver plano");
    }
  };

  return (
    <div className="mt-3 flex flex-col gap-4 border-t border-slate-100 pt-3">
      {actionError && <ErrorAlert message={actionError} />}

      <DiagnosesSection
        diagnoses={detail.diagnoses}
        isActive={isActive}
        onAdd={() => setAddingDiagnosis(true)}
      />

      <OutcomesSection outcomes={detail.outcomes} isActive={isActive} onAdd={() => setAddingOutcome(true)} onEvaluated={refresh} />

      <InterventionsSection
        interventions={detail.interventions}
        isActive={isActive}
        onAdd={() => setAddingIntervention(true)}
        onRecorded={refresh}
      />

      {isActive && (
        <button
          type="button"
          onClick={() => void resolvePlan()}
          className="self-start text-sm font-medium text-slate-500 hover:underline"
        >
          Resolver plano
        </button>
      )}

      {addingDiagnosis && (
        <Modal title="Prescrever diagnóstico" onClose={() => setAddingDiagnosis(false)}>
          <AddDiagnosisForm
            carePlanId={planId}
            onSaved={() => {
              setAddingDiagnosis(false);
              refresh();
            }}
          />
        </Modal>
      )}
      {addingOutcome && (
        <Modal title="Prescrever resultado esperado" onClose={() => setAddingOutcome(false)}>
          <PrescribeOutcomeForm
            carePlanId={planId}
            diagnosisCode={firstDiagnosisCode}
            onSaved={() => {
              setAddingOutcome(false);
              refresh();
            }}
          />
        </Modal>
      )}
      {addingIntervention && (
        <Modal title="Prescrever intervenção" onClose={() => setAddingIntervention(false)}>
          <PrescribeInterventionForm
            carePlanId={planId}
            diagnosisCode={firstDiagnosisCode}
            onSaved={() => {
              setAddingIntervention(false);
              refresh();
            }}
          />
        </Modal>
      )}
    </div>
  );
}

function DiagnosesSection({
  diagnoses,
  isActive,
  onAdd,
}: {
  diagnoses: CarePlanDetailDto["diagnoses"];
  isActive: boolean;
  onAdd: () => void;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700">Diagnósticos (NANDA-I)</h4>
        {isActive && (
          <button type="button" onClick={onAdd} className="text-sm font-medium text-teal-700 hover:underline">
            + Diagnóstico
          </button>
        )}
      </div>
      {diagnoses.length === 0 ? (
        <EmptyState message="Nenhum diagnóstico prescrito." />
      ) : (
        <ul className="flex flex-col gap-2">
          {diagnoses.map((diagnosis) => (
            <li key={diagnosis.id} className="rounded-lg bg-slate-50 p-3 text-sm">
              <span className="mr-2 rounded-full bg-teal-100 px-2 py-0.5 text-xs font-medium text-teal-800">
                {diagnosis.diagnosisCode} · {CARE_PLAN_DIAGNOSIS_TYPE_LABELS[diagnosis.type]}
              </span>
              <p className="mt-1">{pesSentence(diagnosis)}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function OutcomesSection({
  outcomes,
  isActive,
  onAdd,
  onEvaluated,
}: {
  outcomes: CarePlanOutcomeDto[];
  isActive: boolean;
  onAdd: () => void;
  onEvaluated: () => void;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700">Resultados esperados (NOC)</h4>
        {isActive && (
          <button type="button" onClick={onAdd} className="text-sm font-medium text-teal-700 hover:underline">
            + Resultado
          </button>
        )}
      </div>
      {outcomes.length === 0 ? (
        <EmptyState message="Nenhum resultado prescrito." />
      ) : (
        <ul className="flex flex-col gap-2">
          {outcomes.map((outcome) => (
            <OutcomeRow key={outcome.id} outcome={outcome} canEvaluate={isActive} onEvaluated={onEvaluated} />
          ))}
        </ul>
      )}
    </section>
  );
}

function InterventionRow({
  intervention,
  isActive,
  onRecorded,
}: {
  intervention: CarePlanDetailDto["interventions"][number];
  isActive: boolean;
  onRecorded: () => void;
}) {
  return (
    <li className="rounded-lg bg-slate-50 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-medium">{intervention.interventionLabel}</span>
          <span className="ml-2 text-xs text-slate-500">
            {intervention.frequency} · prioridade {INTERVENTION_PRIORITY_LABELS[intervention.priority]}
          </span>
        </div>
        {isActive && <RecordInterventionButton interventionId={intervention.id} onRecorded={onRecorded} />}
      </div>
      {intervention.records.length > 0 && (
        <p className="mt-1 text-xs text-slate-500">
          Última execução: {formatDateTime(intervention.records[0].performedAt)} · total{" "}
          {intervention.records.length}
        </p>
      )}
    </li>
  );
}

function InterventionsSection({
  interventions,
  isActive,
  onAdd,
  onRecorded,
}: {
  interventions: CarePlanDetailDto["interventions"];
  isActive: boolean;
  onAdd: () => void;
  onRecorded: () => void;
}) {
  return (
    <section>
      <div className="mb-2 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-700">Intervenções (NIC)</h4>
        {isActive && (
          <button type="button" onClick={onAdd} className="text-sm font-medium text-teal-700 hover:underline">
            + Intervenção
          </button>
        )}
      </div>
      {interventions.length === 0 ? (
        <EmptyState message="Nenhuma intervenção prescrita." />
      ) : (
        <ul className="flex flex-col gap-2">
          {interventions.map((intervention) => (
            <InterventionRow
              key={intervention.id}
              intervention={intervention}
              isActive={isActive}
              onRecorded={onRecorded}
            />
          ))}
        </ul>
      )}
    </section>
  );
}

function scoreBadgeClass(current: number | null, target: number): string {
  if (current == null) return "bg-slate-200 text-slate-600";
  if (current >= target) return "bg-emerald-100 text-emerald-800";
  return "bg-amber-100 text-amber-800";
}

function OutcomeRow({
  outcome,
  canEvaluate,
  onEvaluated,
}: {
  outcome: CarePlanOutcomeDto;
  canEvaluate: boolean;
  onEvaluated: () => void;
}) {
  const [evaluating, setEvaluating] = useState(false);

  return (
    <li className="rounded-lg bg-slate-50 p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{outcome.outcomeLabel}</span>
        {canEvaluate && (
          <button
            type="button"
            onClick={() => setEvaluating(true)}
            className="text-sm font-medium text-teal-700 hover:underline"
          >
            Avaliar
          </button>
        )}
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-slate-600">
        <span>Basal {outcome.baselineScore}</span>
        <span aria-hidden="true">→</span>
        <span className={`rounded-full px-2 py-0.5 font-medium ${scoreBadgeClass(outcome.currentScore, outcome.targetScore)}`}>
          Atual {outcome.currentScore ?? "—"}
        </span>
        <span aria-hidden="true">→</span>
        <span>Meta {outcome.targetScore}</span>
        {outcome.isAchieved != null && (
          <span className="ml-1 font-medium">{outcomeStatusLabel(outcome)}</span>
        )}
      </div>
      {outcome.evaluations.length > 0 && (
        <p className="mt-1 text-xs text-slate-500">
          Última avaliação: {formatDateTime(outcome.evaluations[0].evaluatedAt)} · {outcome.evaluations.length}{" "}
          avaliação(ões) no histórico
        </p>
      )}
      {evaluating && (
        <Modal title={`Avaliar — ${outcome.outcomeLabel}`} onClose={() => setEvaluating(false)}>
          <EvaluateOutcomeForm
            outcome={outcome}
            onSaved={() => {
              setEvaluating(false);
              onEvaluated();
            }}
          />
        </Modal>
      )}
    </li>
  );
}

function RecordInterventionButton({
  interventionId,
  onRecorded,
}: {
  interventionId: string;
  onRecorded: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const record = async () => {
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/care-plan-interventions/${interventionId}/records`, {
        method: "POST",
        body: JSON.stringify({}),
      });
      onRecorded();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao registrar execução");
    } finally {
      setSaving(false);
    }
  };

  return (
    <span>
      <button
        type="button"
        disabled={saving}
        onClick={() => void record()}
        className="text-sm font-medium text-teal-700 hover:underline disabled:opacity-50"
      >
        {saving ? "Registrando…" : "Registrar execução"}
      </button>
      {error && <span className="ml-2 text-xs text-red-700">{error}</span>}
    </span>
  );
}

/** Busca no catálogo com preview dos termos ligados ao primeiro diagnóstico do plano, quando houver. */
function useTaxonomySearch<T>(kind: "diagnoses" | "outcomes" | "interventions") {
  const [term, setTerm] = useState("");
  const query = term.trim().length >= 2 ? `/api/taxonomy/${kind}?q=${encodeURIComponent(term)}` : null;
  const { data } = useApiQuery<T[]>(query);
  return { term, setTerm, results: data ?? [] };
}

interface TaxonomyOption {
  code: string;
  label: string;
}

/** Prioriza os termos ligados ao diagnóstico até o usuário digitar uma busca própria. */
function pickOptions<T>(term: string, searched: T[], suggested: T[]): T[] {
  return term.trim().length >= 2 ? searched : suggested;
}

function searchInputValue(selected: TaxonomyOption | null, term: string): string {
  return selected ? `${selected.code} — ${selected.label}` : term;
}

function TaxonomyOptionList<T extends TaxonomyOption>({
  options,
  linkedHint,
  onSelect,
}: {
  options: T[];
  linkedHint: string | null;
  onSelect: (item: T) => void;
}) {
  if (options.length === 0) {
    return null;
  }
  return (
    <ul className="max-h-40 overflow-y-auto rounded-lg border border-slate-200">
      {options.map((item) => (
        <li key={item.code}>
          <button
            type="button"
            onClick={() => onSelect(item)}
            className="w-full px-3 py-2 text-left text-sm hover:bg-teal-50"
          >
            <span className="font-medium">{item.code}</span> — {item.label}
            {linkedHint && <span className="ml-2 text-xs text-teal-700">{linkedHint}</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}

function AddDiagnosisForm({ carePlanId, onSaved }: { carePlanId: string; onSaved: () => void }) {
  const { term, setTerm, results } = useTaxonomySearch<NursingDiagnosisDto>("diagnoses");
  const [selected, setSelected] = useState<NursingDiagnosisDto | null>(null);
  const [type, setType] = useState<"real" | "risco" | "promocao-saude">("real");
  const [relatedFactors, setRelatedFactors] = useState("");
  const [definingCharacteristics, setDefiningCharacteristics] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) {
      setError("Selecione um diagnóstico do catálogo");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/care-plans/${carePlanId}/diagnoses`, {
        method: "POST",
        body: JSON.stringify({
          diagnosisCode: selected.code,
          type,
          relatedFactors: relatedFactors || null,
          definingCharacteristics: definingCharacteristics || null,
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao prescrever diagnóstico");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <ErrorAlert message={error} />}
      <label className="text-sm font-medium">
        Buscar diagnóstico (NANDA-I)
        <input
          value={searchInputValue(selected, term)}
          onChange={(e) => {
            setSelected(null);
            setTerm(e.target.value);
          }}
          placeholder="Ex.: integridade da pele, 00046…"
          className={`mt-1 ${inputClass}`}
        />
      </label>
      {!selected && <TaxonomyOptionList options={results} linkedHint={null} onSelect={setSelected} />}
      {selected && (
        <>
          <fieldset className="flex gap-3 text-sm">
            <legend className="sr-only">Tipo de diagnóstico</legend>
            {(["real", "risco", "promocao-saude"] as const).map((option) => (
              <label key={option} className="flex items-center gap-1">
                <input
                  type="radio"
                  name="diagnosis-type"
                  checked={type === option}
                  onChange={() => setType(option)}
                />
                {CARE_PLAN_DIAGNOSIS_TYPE_LABELS[option]}
              </label>
            ))}
          </fieldset>
          {type !== "promocao-saude" && (
            <label className="text-sm font-medium">
              Relacionado a (etiologia)
              <input
                value={relatedFactors}
                onChange={(e) => setRelatedFactors(e.target.value)}
                placeholder="Fator relacionado / de risco"
                className={`mt-1 ${inputClass}`}
              />
            </label>
          )}
          {type === "real" && (
            <label className="text-sm font-medium">
              Evidenciado por (características definidoras)
              <input
                value={definingCharacteristics}
                onChange={(e) => setDefiningCharacteristics(e.target.value)}
                placeholder="Sinais e sintomas observados"
                className={`mt-1 ${inputClass}`}
              />
            </label>
          )}
        </>
      )}
      <button
        type="submit"
        disabled={saving}
        className="mt-1 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
      >
        {saving ? "Salvando…" : "Prescrever diagnóstico"}
      </button>
    </form>
  );
}

function PrescribeOutcomeForm({
  carePlanId,
  diagnosisCode,
  onSaved,
}: {
  carePlanId: string;
  diagnosisCode: string | null;
  onSaved: () => void;
}) {
  const { data: linked } = useApiQuery<{ outcomes: NursingOutcomeDto[] }>(
    diagnosisCode ? `/api/taxonomy/diagnoses/${diagnosisCode}/linked-terms` : null,
  );
  const { term, setTerm, results } = useTaxonomySearch<NursingOutcomeDto>("outcomes");
  const [selected, setSelected] = useState<NursingOutcomeDto | null>(null);
  const [baselineScore, setBaselineScore] = useState("1");
  const [targetScore, setTargetScore] = useState("3");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const suggested = linked?.outcomes ?? [];
  const options = pickOptions(term, results, suggested);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) {
      setError("Selecione um resultado do catálogo");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/care-plans/${carePlanId}/outcomes`, {
        method: "POST",
        body: JSON.stringify({
          outcomeCode: selected.code,
          baselineScore: Number(baselineScore),
          targetScore: Number(targetScore),
        }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao prescrever resultado");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <ErrorAlert message={error} />}
      <label className="text-sm font-medium">
        Buscar resultado (NOC)
        <input
          value={searchInputValue(selected, term)}
          onChange={(e) => {
            setSelected(null);
            setTerm(e.target.value);
          }}
          placeholder="Ex.: integridade tissular, 1101…"
          className={`mt-1 ${inputClass}`}
        />
      </label>
      {!selected && (
        <TaxonomyOptionList
          options={options}
          linkedHint={term.trim().length < 2 ? "(ligado ao diagnóstico)" : null}
          onSelect={setSelected}
        />
      )}
      {selected && (
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm font-medium">
            Pontuação basal (1–5)
            <input
              type="number"
              required
              min={1}
              max={5}
              step={1}
              value={baselineScore}
              onChange={(e) => setBaselineScore(e.target.value)}
              className={`mt-1 ${inputClass}`}
            />
            <span className="mt-1 block text-xs text-slate-500">{selected.scaleAnchors[Number(baselineScore) - 1]}</span>
          </label>
          <label className="text-sm font-medium">
            Meta (1–5)
            <input
              type="number"
              required
              min={1}
              max={5}
              step={1}
              value={targetScore}
              onChange={(e) => setTargetScore(e.target.value)}
              className={`mt-1 ${inputClass}`}
            />
            <span className="mt-1 block text-xs text-slate-500">{selected.scaleAnchors[Number(targetScore) - 1]}</span>
          </label>
        </div>
      )}
      <button
        type="submit"
        disabled={saving}
        className="mt-1 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
      >
        {saving ? "Salvando…" : "Prescrever resultado"}
      </button>
    </form>
  );
}

function PrescribeInterventionForm({
  carePlanId,
  diagnosisCode,
  onSaved,
}: {
  carePlanId: string;
  diagnosisCode: string | null;
  onSaved: () => void;
}) {
  const { data: linked } = useApiQuery<{ interventions: NursingInterventionDto[] }>(
    diagnosisCode ? `/api/taxonomy/diagnoses/${diagnosisCode}/linked-terms` : null,
  );
  const { term, setTerm, results } = useTaxonomySearch<NursingInterventionDto>("interventions");
  const [selected, setSelected] = useState<NursingInterventionDto | null>(null);
  const [frequency, setFrequency] = useState("");
  const [priority, setPriority] = useState<"baixa" | "media" | "alta">("media");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const suggested = linked?.interventions ?? [];
  const options = pickOptions(term, results, suggested);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selected) {
      setError("Selecione uma intervenção do catálogo");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/care-plans/${carePlanId}/interventions`, {
        method: "POST",
        body: JSON.stringify({ interventionCode: selected.code, frequency, priority }),
      });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao prescrever intervenção");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {error && <ErrorAlert message={error} />}
      <label className="text-sm font-medium">
        Buscar intervenção (NIC)
        <input
          value={searchInputValue(selected, term)}
          onChange={(e) => {
            setSelected(null);
            setTerm(e.target.value);
          }}
          placeholder="Ex.: cuidados com lesões, 3660…"
          className={`mt-1 ${inputClass}`}
        />
      </label>
      {!selected && (
        <TaxonomyOptionList
          options={options}
          linkedHint={term.trim().length < 2 ? "(ligada ao diagnóstico)" : null}
          onSelect={setSelected}
        />
      )}
      {selected && (
        <>
          <label className="text-sm font-medium">
            Frequência *
            <input
              required
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              placeholder="Ex.: a cada troca de placa"
              className={`mt-1 ${inputClass}`}
            />
          </label>
          <fieldset className="flex gap-3 text-sm">
            <legend className="sr-only">Prioridade da intervenção</legend>
            {(["baixa", "media", "alta"] as const).map((option) => (
              <label key={option} className="flex items-center gap-1">
                <input
                  type="radio"
                  name="intervention-priority"
                  checked={priority === option}
                  onChange={() => setPriority(option)}
                />
                {INTERVENTION_PRIORITY_LABELS[option]}
              </label>
            ))}
          </fieldset>
        </>
      )}
      <button
        type="submit"
        disabled={saving}
        className="mt-1 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
      >
        {saving ? "Salvando…" : "Prescrever intervenção"}
      </button>
    </form>
  );
}

function EvaluateOutcomeForm({ outcome, onSaved }: { outcome: CarePlanOutcomeDto; onSaved: () => void }) {
  const [score, setScore] = useState(outcome.currentScore ?? outcome.baselineScore);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await apiFetch(`/api/care-plan-outcomes/${outcome.id}/evaluations`, {
        method: "POST",
        body: JSON.stringify({ score, notes: notes || null }),
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
      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 text-sm font-medium">Pontuação atual</legend>
        {outcome.scaleAnchors.map((anchor, index) => {
          const value = index + 1;
          return (
            <label key={value} className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="outcome-score"
                checked={score === value}
                onChange={() => setScore(value)}
              />
              <span className="font-medium">{value}</span> — {anchor}
            </label>
          );
        })}
      </fieldset>
      <label className="text-sm font-medium">
        Observações
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className={`mt-1 ${inputClass}`} />
      </label>
      <button
        type="submit"
        disabled={saving}
        className="mt-1 rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-50"
      >
        {saving ? "Salvando…" : "Registrar avaliação"}
      </button>
    </form>
  );
}
