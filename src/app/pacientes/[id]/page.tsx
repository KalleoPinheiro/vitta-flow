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
      </div>

      {anamnesis?.allergies && (
        <div className="mb-6 rounded-lg border border-red-300 bg-red-50 px-4 py-3 text-sm">
          <span className="font-bold text-red-800">⚠ Alergias: </span>
          <span className="text-red-900">{anamnesis.allergies}</span>
        </div>
      )}

      <div className="mb-4 flex gap-2 border-b border-slate-200">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-medium ${
              tab === item.key
                ? "border-teal-700 text-teal-800"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {item.label}
            {item.key === "condicoes" && conditions && conditions.length > 0
              ? ` (${conditions.length})`
              : ""}
            {item.key === "evolucoes" && evolutions && evolutions.length > 0
              ? ` (${evolutions.length})`
              : ""}
          </button>
        ))}
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        {tab === "anamnese" && (
          <AnamnesisSection
            key={anamnesis ? anamnesis.updatedAt : "empty"}
            patientId={id}
            anamnesis={anamnesis ?? null}
            onSaved={refreshAnamnesis}
          />
        )}
        {tab === "condicoes" && (
          <ConditionsSection
            patientId={id}
            conditions={conditions ?? []}
            onChanged={refreshConditions}
          />
        )}
        {tab === "evolucoes" && (
          <EvolutionsSection
            patientId={id}
            evolutions={evolutions ?? []}
            onSaved={refreshEvolutions}
          />
        )}
      </div>
    </div>
  );
}
