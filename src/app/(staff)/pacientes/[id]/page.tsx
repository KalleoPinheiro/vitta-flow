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
import { Alert, AlertDescription, Card, Icon } from "@still-void/ui/react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@still-void/ui/react/client";

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
    <Alert variant="danger" className="mb-6" icon={<Icon name="alert-triangle" />}>
      <AlertDescription className="font-bold">
        Alergias: {allergies}
      </AlertDescription>
    </Alert>
  );
}

/**
 * Guarda de troca de aba (issue #66): SOAP em edição ou anamnese alterada
 * pedem confirmação antes de descartar. Extraído em hook próprio para manter
 * a complexidade de `PatientRecordPage` dentro do limite do projeto.
 */
function useDirtyTabGuard(tab: TabKey) {
  const [evolutionsDirty, setEvolutionsDirty] = useState(false);
  const [anamnesisDirty, setAnamnesisDirty] = useState(false);
  const [pendingTab, setPendingTab] = useState<TabKey | null>(null);

  const isCurrentTabDirty =
    (tab === "evolucoes" && evolutionsDirty) || (tab === "anamnese" && anamnesisDirty);

  const requestTabChange = (nextTab: TabKey, setTab: (next: TabKey) => void) => {
    if (nextTab === tab) return;
    if (isCurrentTabDirty) {
      setPendingTab(nextTab);
      return;
    }
    setTab(nextTab);
  };

  const confirmDiscardAndSwitch = (setTab: (next: TabKey) => void) => {
    if (pendingTab) {
      setTab(pendingTab);
    }
    setPendingTab(null);
  };

  return {
    pendingTab,
    setEvolutionsDirty,
    setAnamnesisDirty,
    requestTabChange,
    confirmDiscardAndSwitch,
    cancelPendingTab: () => setPendingTab(null),
  };
}

export default function PatientRecordPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [tab, setTab] = useState<TabKey>("anamnese");
  const {
    pendingTab,
    setEvolutionsDirty,
    setAnamnesisDirty,
    requestTabChange,
    confirmDiscardAndSwitch,
    cancelPendingTab,
  } = useDirtyTabGuard(tab);

  const { data: patient, error } = useApiQuery<PatientDto>(`/api/patients/${id}`);
  const {
    data: anamnesis,
    error: anamnesisError,
    isLoading: anamnesisLoading,
    refresh: refreshAnamnesis,
  } = useApiQuery<AnamnesisDto | null>(`/api/patients/${id}/anamnesis`);
  const {
    data: conditions,
    error: conditionsError,
    isLoading: conditionsLoading,
    refresh: refreshConditions,
  } = useApiQuery<ConditionDto[]>(`/api/patients/${id}/conditions`);
  const {
    data: evolutions,
    error: evolutionsError,
    isLoading: evolutionsLoading,
    refresh: refreshEvolutions,
  } = useApiQuery<EvolutionNoteDto[]>(`/api/patients/${id}/evolutions`);
  const {
    data: carePlans,
    error: carePlansError,
    isLoading: carePlansLoading,
    refresh: refreshCarePlans,
  } = useApiQuery<CarePlanDto[]>(`/api/patients/${id}/care-plans`);

  if (error) return <ErrorAlert message={error} />;
  if (!patient) return <LoadingIndicator />;

  return (
    <div>
      <div className="mb-1 text-sm">
        <Link href="/pacientes" className="text-accent-ink hover:underline">
          <Icon name="chevron-left" /> Pacientes
        </Link>
      </div>
      <PatientHeader patient={patient} />
      <AllergyBanner allergies={anamnesis?.allergies} />

      <Tabs
        value={tab}
        onValueChange={(next) => requestTabChange(next as TabKey, setTab)}
      >
        <TabsList>
          {TABS.map((item) => (
            <TabsTrigger key={item.key} value={item.key}>
              {tabLabel(item, conditions ?? [], evolutions ?? [], carePlans ?? [])}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={tab}>
          <Card className="p-5">
            <RecordTabPanel
              tab={tab}
              patientId={id}
              anamnesis={anamnesis ?? null}
              anamnesisError={anamnesisError}
              anamnesisLoading={anamnesisLoading}
              onAnamnesisDirtyChange={setAnamnesisDirty}
              conditions={conditions ?? []}
              conditionsError={conditionsError}
              conditionsLoading={conditionsLoading}
              evolutions={evolutions ?? []}
              evolutionsError={evolutionsError}
              evolutionsLoading={evolutionsLoading}
              onEvolutionsDirtyChange={setEvolutionsDirty}
              carePlans={carePlans ?? []}
              carePlansError={carePlansError}
              carePlansLoading={carePlansLoading}
              refreshAnamnesis={refreshAnamnesis}
              refreshConditions={refreshConditions}
              refreshEvolutions={refreshEvolutions}
              refreshCarePlans={refreshCarePlans}
            />
          </Card>
        </TabsContent>
      </Tabs>

      <AlertDialog open={pendingTab !== null} onOpenChange={(open) => !open && cancelPendingTab()}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Descartar alterações?</AlertDialogTitle>
            <AlertDialogDescription>
              Há texto não salvo nesta aba. Trocar de aba agora descarta o que foi digitado.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => confirmDiscardAndSwitch(setTab)}>
              Descartar e trocar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

interface RecordTabPanelProps {
  tab: TabKey;
  patientId: string;
  anamnesis: AnamnesisDto | null;
  anamnesisError: string | null;
  anamnesisLoading: boolean;
  onAnamnesisDirtyChange: (dirty: boolean) => void;
  conditions: ConditionDto[];
  conditionsError: string | null;
  conditionsLoading: boolean;
  evolutions: EvolutionNoteDto[];
  evolutionsError: string | null;
  evolutionsLoading: boolean;
  onEvolutionsDirtyChange: (dirty: boolean) => void;
  carePlans: CarePlanDto[];
  carePlansError: string | null;
  carePlansLoading: boolean;
  refreshAnamnesis: () => void;
  refreshConditions: () => void;
  refreshEvolutions: () => void;
  refreshCarePlans: () => void;
}

function RecordTabPanel({
  tab,
  patientId,
  anamnesis,
  anamnesisError,
  anamnesisLoading,
  onAnamnesisDirtyChange,
  conditions,
  conditionsError,
  conditionsLoading,
  evolutions,
  evolutionsError,
  evolutionsLoading,
  onEvolutionsDirtyChange,
  carePlans,
  carePlansError,
  carePlansLoading,
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
        error={conditionsError}
        isLoading={conditionsLoading}
        onChanged={refreshConditions}
        onRetry={refreshConditions}
      />
    );
  }
  if (tab === "evolucoes") {
    return (
      <EvolutionsSection
        patientId={patientId}
        evolutions={evolutions}
        error={evolutionsError}
        isLoading={evolutionsLoading}
        onSaved={refreshEvolutions}
        onRetry={refreshEvolutions}
        onDirtyChange={onEvolutionsDirtyChange}
      />
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
        error={carePlansError}
        isLoading={carePlansLoading}
        onChanged={refreshCarePlans}
        onRetry={refreshCarePlans}
      />
    );
  }
  return (
    <AnamnesisSection
      key={anamnesis ? anamnesis.updatedAt : "empty"}
      patientId={patientId}
      anamnesis={anamnesis}
      error={anamnesisError}
      isLoading={anamnesisLoading}
      onSaved={refreshAnamnesis}
      onRetry={refreshAnamnesis}
      onDirtyChange={onAnamnesisDirtyChange}
    />
  );
}
