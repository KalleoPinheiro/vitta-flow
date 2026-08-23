"use client";

import { use, useState } from "react";
import Link from "next/link";
import type {
  AnamnesisDto,
  CarePlanDto,
  ConditionDto,
  EvolutionNoteDto,
  PatientDto,
} from "@/lib/dto";
import { useApiQuery } from "@/lib/use-api-query";
import { formatDate } from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { ErrorAlert, LoadingIndicator } from "@/components/feedback";
import { AnamnesisSection } from "./anamnesis-section";
import { ConditionsSection } from "./conditions-section";
import { EvolutionsSection } from "./evolutions-section";
import { CarePlansSection } from "./care-plans-section";
import { PackagesSection } from "./packages-section";
import { Button, Card } from "@still-void/ui/react";

const TABS = [
  { key: "anamnese", label: "Anamnese" },
  { key: "condicoes", label: "Estomias e feridas" },
  { key: "evolucoes", label: "Evoluções (SOAP)" },
  { key: "planoCuidados", label: "Plano de Cuidados (SAE)" },
  { key: "pacotes", label: "Pacotes" },
] as const;

type TabKey = (typeof TABS)[number]["key"];
type Tab = (typeof TABS)[number];

function tabLabel(
  tab: Tab,
  conditions: ConditionDto[],
  evolutions: EvolutionNoteDto[],
  carePlans: CarePlanDto[],
): string {
  const counts: Partial<Record<TabKey, number>> = {
    condicoes: conditions.length,
    evolucoes: evolutions.length,
    planoCuidados: carePlans.length,
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
      <h1 className="sv-display text-2xl font-bold">{patient.fullName}</h1>
      <StatusBadge
        status={patient.active ? "confirmed" : "cancelled"}
        label={patient.active ? "Ativo" : "Inativo"}
      />
      <span className="text-sm text-ink-3">
        {patient.phone} · {patient.email}
        {patient.birthDate ? ` · nasc. ${formatDate(patient.birthDate)}` : ""}
      </span>
      <span className="ml-auto flex gap-3 text-sm font-medium">
        <a href={`/documentos/consentimento/${patient.id}`} className="text-accent-ink hover:underline">
          Termo de consentimento
        </a>
        <a
          href={`/api/patients/${patient.id}/export`}
          target="_blank"
          rel="noreferrer"
          className="text-ink-3 hover:underline"
          title="Exportação completa dos dados do titular (LGPD art. 18)"
        >
          Exportar dados (LGPD)
        </a>
      </span>
    </div>
  );
}

function AllergyBanner({ allergies }: { allergies?: string }) {
  if (!allergies) {
    return null;
  }
  return (
    <div className="mb-6 rounded-lg border border-danger bg-danger-soft px-4 py-3 text-sm">
      <span className="font-bold text-danger">⚠ Alergias: </span>
      <span className="text-danger">{allergies}</span>
    </div>
  );
}

function TabButton({ label, isActive, onClick }: TabButtonProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
        isActive
          ? "border-accent-ink text-accent-ink"
          : "border-transparent text-ink-3 hover:text-ink"
      }`}
      variant="outline"
    >
      {label}
    </Button>
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
  const { data: carePlans, refresh: refreshCarePlans } = useApiQuery<CarePlanDto[]>(
    `/api/patients/${id}/care-plans`,
  );

  if (error) return <ErrorAlert message={error} />;
  if (!patient) return <LoadingIndicator />;

  return (
    <div>
      <div className="mb-1 text-sm">
        <Link href="/pacientes" className="text-accent-ink hover:underline">
          ← Pacientes
        </Link>
      </div>
      <PatientHeader patient={patient} />
      <AllergyBanner allergies={anamnesis?.allergies} />

      <div className="mb-4 flex gap-2 border-b border-border">
        {TABS.map((item) => (
          <TabButton
            key={item.key}
            label={tabLabel(item, conditions ?? [], evolutions ?? [], carePlans ?? [])}
            isActive={tab === item.key}
            onClick={() => setTab(item.key)}
          />
        ))}
      </div>

      <Card className="p-5">
        <RecordTabPanel
          tab={tab}
          patientId={id}
          anamnesis={anamnesis ?? null}
          conditions={conditions ?? []}
          evolutions={evolutions ?? []}
          carePlans={carePlans ?? []}
          refreshAnamnesis={refreshAnamnesis}
          refreshConditions={refreshConditions}
          refreshEvolutions={refreshEvolutions}
          refreshCarePlans={refreshCarePlans}
        />
      </Card>
    </div>
  );
}

interface RecordTabPanelProps {
  tab: TabKey;
  patientId: string;
  anamnesis: AnamnesisDto | null;
  conditions: ConditionDto[];
  evolutions: EvolutionNoteDto[];
  carePlans: CarePlanDto[];
  refreshAnamnesis: () => void;
  refreshConditions: () => void;
  refreshEvolutions: () => void;
  refreshCarePlans: () => void;
}

function RecordTabPanel({
  tab,
  patientId,
  anamnesis,
  conditions,
  evolutions,
  carePlans,
  refreshAnamnesis,
  refreshConditions,
  refreshEvolutions,
  refreshCarePlans,
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
  if (tab === "pacotes") {
    return <PackagesSection patientId={patientId} />;
  }
  if (tab === "planoCuidados") {
    return (
      <CarePlansSection
        patientId={patientId}
        conditions={conditions}
        plans={carePlans}
        onChanged={refreshCarePlans}
      />
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
