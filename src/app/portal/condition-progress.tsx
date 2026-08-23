"use client";

import { Card, CardContent } from "@still-void/ui/react";
import type { AssessmentDto, ConditionDto, ConditionPhotoDto } from "@/lib/dto";
import {
  CONDITION_KIND_LABELS,
  EXUDATE_LABELS,
  STOMA_TYPE_LABELS,
  formatDate,
} from "@/lib/format";
import { StatusBadge } from "@/components/status-badge";
import { HealingChart } from "@/components/healing-chart";

export interface ConditionWithAssessmentsDto {
  condition: ConditionDto;
  assessments: AssessmentDto[];
  /** Fotos só chegam ao próprio paciente — parceiro não recebe (minimização LGPD). */
  photos?: ConditionPhotoDto[];
  /** Base da URL autorizada para servir as fotos no contexto atual. */
  photoUrlBase?: string;
}

/** Linha do tempo de evolução clínica de uma condição (compartilhada entre os portais). */
export function ConditionProgress({
  condition,
  assessments,
  photos,
  photoUrlBase,
}: ConditionWithAssessmentsDto) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <span className="font-medium">{condition.title}</span>
          <span className="text-xs text-ink-3">
            {CONDITION_KIND_LABELS[condition.kind]}
            {condition.stomaType ? ` · ${STOMA_TYPE_LABELS[condition.stomaType]}` : ""}
          </span>
          <StatusBadge
            status={condition.status === "active" ? "confirmed" : "completed"}
            label={condition.status === "active" ? "Em acompanhamento" : "Resolvida"}
          />
        </div>
        {assessments.length === 0 ? (
          <p className="text-sm text-ink-3">Nenhuma avaliação registrada ainda.</p>
        ) : (
          <div className="mb-3">
            <HealingChart assessments={assessments} />
          </div>
        )}
        <PortalPhotoGallery photos={photos} photoUrlBase={photoUrlBase} />
        {assessments.length > 0 && (
          <ul className="flex flex-col gap-2 text-sm">
            {assessments.map((assessment) => (
              <li key={assessment.id} className="rounded bg-bg px-3 py-2">
                <span className="mr-2 text-xs font-medium text-ink-3">
                  {formatDate(assessment.createdAt)}
                </span>
                {describeAssessment(assessment)}
              </li>
            ))}
          </ul>
      )}
      </CardContent>
    </Card>
  );
}

function PortalPhotoGallery({
  photos,
  photoUrlBase,
}: {
  photos?: ConditionPhotoDto[];
  photoUrlBase?: string;
}) {
  if (!photoUrlBase || !photos || photos.length === 0) {
    return null;
  }
  return (
    <div className="mb-3 flex flex-wrap gap-2">
      {photos.map((photo) => (
        // eslint-disable-next-line @next/next/no-img-element -- rota autorizada dinâmica, sem otimizador
        <img
          key={photo.id}
          src={`${photoUrlBase}/${photo.id}`}
          alt={`Foto da condição em ${formatDate(photo.createdAt)}`}
          className="h-24 w-24 rounded border border-border object-cover"
        />
      ))}
    </div>
  );
}

function describeAssessment(assessment: AssessmentDto): string {
  const parts: string[] = [];
  if (assessment.areaMm2 != null) {
    parts.push(`ferida ${assessment.lengthMm}×${assessment.widthMm}mm (área ${assessment.areaMm2}mm²)`);
  }
  if (assessment.tissueType) parts.push(`tecido: ${assessment.tissueType}`);
  if (assessment.exudate) parts.push(`exsudato: ${EXUDATE_LABELS[assessment.exudate] ?? assessment.exudate}`);
  if (assessment.painScale != null) parts.push(`dor ${assessment.painScale}/10`);
  if (assessment.skinCondition) parts.push(`pele periestomal: ${assessment.skinCondition}`);
  if (assessment.complications) parts.push(`complicações: ${assessment.complications}`);
  if (assessment.notes) parts.push(assessment.notes);
  return parts.length > 0 ? parts.join(" · ") : "Avaliação registrada";
}
