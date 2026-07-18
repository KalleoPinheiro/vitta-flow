"use client";

import { use, useState } from "react";
import Link from "next/link";
import type { AnamnesisDto, ConditionDto, EvolutionNoteDto, PatientDto } from "@/lib/dto";
import { useApiQuery } from "@/lib/use-api-query";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { ErrorAlert, LoadingIndicator } from "@/components/feedback";
import { AnamnesisSection } from "./anamnesis-section";
import { ConditionsSection } from "./conditions-section";
import { EvolutionsSection } from "./evolutions-section";

const TABS = [
  { key: "anamnese", label: "Anamnese" },
  { key: "condicoes", label: "Estomias e feridas" },
  { key: "evolucoes", label: "Evoluções (SOAP)" },
] as const;

type TabKey = (typeof TABS)[number]["key"];
type Tab = (typeof TABS)[number];

function tabLabel(tab: Tab, conditions: ConditionDto[], evolutions: EvolutionNoteDto[]): string {
  const counts: Partial<Record<TabKey, number>> = {
    condicoes: conditions.length,
    evolucoes: evolutions.length,
  };
  const count = counts[tab.key] ?? 0;
  return count > 0 ? `${tab.label} (${count})` : tab.label;
}

interface TabButtonProps {
  label: string;
  isActive: boolean;
  onClick: () => void;
}

function PatientHeader({ patient }: { patient: PatientDto }) {
  return (
    <div className="mb-6 flex flex-wrap items-center gap-3">
      <h1 className="text-2xl font-bold">{patient.fullName}</h1>
      <StatusBadge
        status={patient.active ? "confirmed" : "cancelled"}
        label={patient.active ? "Ativo" : "Inativo"}
      />
      <span className="text-sm text-slate-500">
        {patient.phone} · {patient.email}
        {patient.birthDate ? ` · nasc. ${formatDate(patient.birthDate)}` : ""}
      </span>
      <a
        href={`/documentos/consentimento/${patient.id}`}
        className="ml-auto text-sm font-medium text-teal-700 hover:underline"
      >
        Termo de consentimento
      </a>
    </div>
  );
}

function AllergyBanner({ allergies }: { allergies?: string }) {
  if (!allergies) {
    return null;
  }
  return (
    <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm">
      <span className="font-bold text-red-800">⚠ Alergias: </span>
      <span className="text-red-900">{allergies}</span>
    </div>
  );
}

function TabButton({ label, isActive, onClick }: TabButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
        isActive
          ? "border-teal-700 text-teal-800"
          : "border-transparent text-slate-500 hover:text-slate-700"
      }`}
    >
      {label}
    </button>
  );
}

export default function PatientRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState<TabKey>("anamnese");

  const { data: patient, error } = useApiQuery<PatientDto>(`/api/patients/${id}`);
  const { data: anamnesis, refresh: refreshAnamnesis } = useApiQuery<AnamnesisDto | null>(
    `/api/patients/${id}/anamnesis`,
  );
  const { data: conditions, refresh: refreshConditions } = useApiQuery<ConditionDto[]>(
    `/api/patients/${id}/conditions`,
  );
  const { data: evolutions, refresh: refreshEvolutions } = useApiQuery<EvolutionNoteDto[]>(
    `/api/patients/${id}/evolutions`,
  );

  if (error) return <ErrorAlert message={error} />;
  if (!patient) return <LoadingIndicator />;

  return (
    <div>
      <div className="mb-1 text-sm">
        <Link href="/pacientes" className="text-teal-700 hover:underline">
          ← Pacientes
        </Link>
      </div>
      <PatientHeader patient={patient} />
      <AllergyBanner allergies={anamnesis?.allergies} />

      <div className="mb-4 flex gap-2 border-b border-slate-200">
        {TABS.map((item) => (
          <TabButton
            key={item.key}
            label={tabLabel(item, conditions ?? [], evolutions ?? [])}
            isActive={tab === item.key}
            onClick={() => setTab(item.key)}
          />
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <RecordTabPanel
          tab={tab}
          patientId={id}
          anamnesis={anamnesis ?? null}
          conditions={conditions ?? []}
          evolutions={evolutions ?? []}
          refreshAnamnesis={refreshAnamnesis}
          refreshConditions={refreshConditions}
          refreshEvolutions={refreshEvolutions}
        />
      </div>
    </div>
  );
}

interface RecordTabPanelProps {
  tab: TabKey;
  patientId: string;
  anamnesis: AnamnesisDto | null;
  conditions: ConditionDto[];
  evolutions: EvolutionNoteDto[];
  refreshAnamnesis: () => void;
  refreshConditions: () => void;
  refreshEvolutions: () => void;
}

function RecordTabPanel({
  tab,
  patientId,
  anamnesis,
  conditions,
  evolutions,
  refreshAnamnesis,
  refreshConditions,
  refreshEvolutions,
}: RecordTabPanelProps) {
  if (tab === "condicoes") {
    return (
      <ConditionsSection
        patientId={patientId}
        conditions={conditions}
        onChanged={refreshConditions}
      />
    );
  }
  if (tab === "evolucoes") {
    return (
      <EvolutionsSection patientId={patientId} evolutions={evolutions} onSaved={refreshEvolutions} />
    );
  }
  return (
    <AnamnesisSection
      key={anamnesis ? anamnesis.updatedAt : "empty"}
      patientId={patientId}
      anamnesis={anamnesis}
      onSaved={refreshAnamnesis}
    />
  );
}
