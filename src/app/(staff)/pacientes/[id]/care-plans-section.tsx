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
import { Button, Input, NativeSelect, RadioGroup, RadioGroupItem, Textarea } from "@still-void/ui/react";
import { accentButton } from "@/lib/ui";

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
        <p className="text-sm text-ink-3">
          Processo de Enfermagem: diagnóstico (NANDA-I) → resultado esperado (NOC) → intervenção (NIC).
        </p>
        <Button
          type="button"
          onClick={() => setCreating(true)}
          className={accentButton}
        >
          + Novo plano
        </Button>
      </div>

      {plans.length === 0 ? (
        <EmptyState message="Nenhum plano de cuidados aberto." />
      ) : (
        <ul className="flex flex-col gap-3">
          {plans.map((plan) => {
            const condition = conditions.find((item) => item.id === plan.conditionId);
            const isOpen = expanded === plan.id;
            return (
              /* sv-gap: card-as-element */
              <li key={plan.id} className="rounded-lg border border-sv-border bg-sv-surface p-4">
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
                    <Button
                      type="button"
                      onClick={() => setExpanded(isOpen ? null : plan.id)}
                      variant="link"
                      className="h-auto p-0 text-accent-ink"
                    >
                      {isOpen ? "Ocultar plano" : "Ver plano"}
                    </Button>
                    <a
                      href={`/documentos/plano-cuidados/${plan.id}`}
                      className="font-medium text-accent-ink hover:underline"
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
        <NativeSelect
          value={conditionId}
          onChange={(e) => setConditionId(e.target.value)}
          className="mt-1"
        >
          <option value="">Geral (sem condição específica)</option>
          {conditions.map((condition) => (
            <option key={condition.id} value={condition.id}>
              {condition.title}
            </option>
          ))}
        </NativeSelect>
      </label>
      <Button
        type="submit"
        disabled={saving}
        className={`mt-1 ${accentButton}`}
      >
        {saving ? "Abrindo…" : "Abrir plano"}
      </Button>
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
    <div className="mt-3 flex flex-col gap-4 border-t border-border pt-3">
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
        <Button
          type="button"
          onClick={() => void resolvePlan()}
          variant="link"
          className="h-auto p-0 self-start text-ink-3"
        >
          Resolver plano
        </Button>
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
        <h4 className="text-sm font-semibold text-ink">Diagnósticos (NANDA-I)</h4>
        {isActive && (
          <Button type="button" onClick={onAdd}
            variant="link"
            className="h-auto p-0 text-accent-ink"
          >
            + Diagnóstico
          </Button>
        )}
      </div>
      {diagnoses.length === 0 ? (
        <EmptyState message="Nenhum diagnóstico prescrito." />
      ) : (
        <ul className="flex flex-col gap-2">
          {diagnoses.map((diagnosis) => (
            <li key={diagnosis.id} className="rounded-lg bg-bg p-3 text-sm">
              <span className="mr-2 rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-ink">
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
        <h4 className="text-sm font-semibold text-ink">Resultados esperados (NOC)</h4>
        {isActive && (
          <Button type="button" onClick={onAdd}
            variant="link"
            className="h-auto p-0 text-accent-ink"
          >
            + Resultado
          </Button>
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
    <li className="rounded-lg bg-bg p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <span className="font-medium">{intervention.interventionLabel}</span>
          <span className="ml-2 text-xs text-ink-3">
            {intervention.frequency} · prioridade {INTERVENTION_PRIORITY_LABELS[intervention.priority]}
          </span>
        </div>
        {isActive && <RecordInterventionButton interventionId={intervention.id} onRecorded={onRecorded} />}
      </div>
      {intervention.records.length > 0 && (
        <p className="mt-1 text-xs text-ink-3">
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
        <h4 className="text-sm font-semibold text-ink">Intervenções (NIC)</h4>
        {isActive && (
          <Button type="button" onClick={onAdd}
            variant="link"
            className="h-auto p-0 text-accent-ink"
          >
            + Intervenção
          </Button>
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
  if (current == null) return "bg-surface-2 text-ink-2";
  if (current >= target) return "bg-success-soft text-success";
  return "bg-warning-soft text-warning";
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
    <li className="rounded-lg bg-bg p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="font-medium">{outcome.outcomeLabel}</span>
        {canEvaluate && (
          <Button
            type="button"
            onClick={() => setEvaluating(true)}
            variant="link"
            className="h-auto p-0 text-accent-ink"
          >
            Avaliar
          </Button>
        )}
      </div>
      <div className="mt-1 flex items-center gap-2 text-xs text-ink-2">
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
        <p className="mt-1 text-xs text-ink-3">
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
      <Button
        type="button"
        disabled={saving}
        onClick={() => void record()}
        variant="link"
        className="h-auto p-0 text-accent-ink"
      >
        {saving ? "Registrando…" : "Registrar execução"}
      </Button>
      {error && <span className="ml-2 text-xs text-danger">{error}</span>}
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
    <ul className="max-h-40 overflow-y-auto rounded-lg border border-border">
      {options.map((item) => (
        <li key={item.code}>
          <Button
            type="button"
            onClick={() => onSelect(item)}
            variant="ghost"
            className="w-full text-left hover:bg-accent-soft"
          >
            <span className="font-medium">{item.code}</span> — {item.label}
            {linkedHint && <span className="ml-2 text-xs text-accent-ink">{linkedHint}</span>}
          </Button>
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
        <Input
          value={searchInputValue(selected, term)}
          onChange={(e) => {
            setSelected(null);
            setTerm(e.target.value);
          }}
          placeholder="Ex.: integridade da pele, 00046…"
          className="mt-1"
        />
      </label>
      {!selected && <TaxonomyOptionList options={results} linkedHint={null} onSelect={setSelected} />}
      {selected && (
        <>
          <RadioGroup legend="Tipo de diagnóstico" legendHidden name="diagnosis-type" orientation="horizontal">
            {(["real", "risco", "promocao-saude"] as const).map((option) => (
              <RadioGroupItem
                key={option}
                value={option}
                checked={type === option}
                onChange={() => setType(option)}
              >
                {CARE_PLAN_DIAGNOSIS_TYPE_LABELS[option]}
              </RadioGroupItem>
            ))}
          </RadioGroup>
          {type !== "promocao-saude" && (
            <label className="text-sm font-medium">
              Relacionado a (etiologia)
              <Input
                value={relatedFactors}
                onChange={(e) => setRelatedFactors(e.target.value)}
                placeholder="Fator relacionado / de risco"
                className="mt-1"
              />
            </label>
          )}
          {(type === "real" || type === "promocao-saude") && (
            <label className="text-sm font-medium">
              Evidenciado por (características definidoras)
              <Input
                value={definingCharacteristics}
                onChange={(e) => setDefiningCharacteristics(e.target.value)}
                placeholder={
                  type === "promocao-saude"
                    ? "Motivação/desejo expresso pelo paciente"
                    : "Sinais e sintomas observados"
                }
                className="mt-1"
              />
            </label>
          )}
        </>
      )}
      <Button
        type="submit"
        disabled={saving}
        className={`mt-1 ${accentButton}`}
      >
        {saving ? "Salvando…" : "Prescrever diagnóstico"}
      </Button>
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
        <Input
          value={searchInputValue(selected, term)}
          onChange={(e) => {
            setSelected(null);
            setTerm(e.target.value);
          }}
          placeholder="Ex.: integridade tissular, 1101…"
          className="mt-1"
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
            <Input
              type="number"
              required
              min={1}
              max={5}
              step={1}
              value={baselineScore}
              onChange={(e) => setBaselineScore(e.target.value)}
              className="mt-1"
            />
            <span className="mt-1 block text-xs text-ink-3">{selected.scaleAnchors[Number(baselineScore) - 1]}</span>
          </label>
          <label className="text-sm font-medium">
            Meta (1–5)
            <Input
              type="number"
              required
              min={1}
              max={5}
              step={1}
              value={targetScore}
              onChange={(e) => setTargetScore(e.target.value)}
              className="mt-1"
            />
            <span className="mt-1 block text-xs text-ink-3">{selected.scaleAnchors[Number(targetScore) - 1]}</span>
          </label>
        </div>
      )}
      <Button
        type="submit"
        disabled={saving}
        className={`mt-1 ${accentButton}`}
      >
        {saving ? "Salvando…" : "Prescrever resultado"}
      </Button>
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
        <Input
          value={searchInputValue(selected, term)}
          onChange={(e) => {
            setSelected(null);
            setTerm(e.target.value);
          }}
          placeholder="Ex.: cuidados com lesões, 3660…"
          className="mt-1"
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
            <Input
              required
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
              placeholder="Ex.: a cada troca de placa"
              className="mt-1"
            />
          </label>
          <RadioGroup legend="Prioridade da intervenção" legendHidden name="intervention-priority" orientation="horizontal">
            {(["baixa", "media", "alta"] as const).map((option) => (
              <RadioGroupItem
                key={option}
                value={option}
                checked={priority === option}
                onChange={() => setPriority(option)}
              >
                {INTERVENTION_PRIORITY_LABELS[option]}
              </RadioGroupItem>
            ))}
          </RadioGroup>
        </>
      )}
      <Button
        type="submit"
        disabled={saving}
        className={`mt-1 ${accentButton}`}
      >
        {saving ? "Salvando…" : "Prescrever intervenção"}
      </Button>
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
      <RadioGroup legend="Pontuação atual" name="outcome-score">
        {outcome.scaleAnchors.map((anchor, index) => {
          const value = index + 1;
          return (
            <RadioGroupItem key={value} value={value} checked={score === value} onChange={() => setScore(value)}>
              <span className="font-medium">{value}</span> — {anchor}
            </RadioGroupItem>
          );
        })}
      </RadioGroup>
      <label className="text-sm font-medium">
        Observações
        <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} className="mt-1" />
      </label>
      <Button
        type="submit"
        disabled={saving}
        className={`mt-1 ${accentButton}`}
      >
        {saving ? "Salvando…" : "Registrar avaliação"}
      </Button>
    </form>
  );
}
