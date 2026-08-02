import type { CarePlanStatus } from "@/domain/clinical/care-plan";
import type { CarePlanDiagnosisType } from "@/domain/clinical/care-plan-diagnosis";
import type { InterventionPriority } from "@/domain/clinical/care-plan-intervention";
import type { CarePlanDiagnosisDto } from "@/lib/dto";

export const formatCurrency = (cents: number): string =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);

export const formatDate = (iso: string): string =>
  new Date(iso).toLocaleDateString("pt-BR");

export const formatTime = (iso: string): string =>
  new Date(iso).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

export const formatDateTime = (iso: string): string =>
  `${formatDate(iso)} ${formatTime(iso)}`;

export const APPOINTMENT_STATUS_LABELS: Record<string, string> = {
  scheduled: "Agendada",
  confirmed: "Confirmada",
  completed: "Concluída",
  cancelled: "Cancelada",
  no_show: "Faltou",
};

export const INVOICE_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  paid: "Paga",
  cancelled: "Cancelada",
};

export const STOMA_TYPE_LABELS: Record<string, string> = {
  colostomia: "Colostomia",
  ileostomia: "Ileostomia",
  urostomia: "Urostomia",
};

export const CONDITION_KIND_LABELS: Record<string, string> = {
  stoma: "Estomia",
  wound: "Ferida",
};

export const EXUDATE_LABELS: Record<string, string> = {
  none: "Nenhum",
  low: "Baixo",
  moderate: "Moderado",
  high: "Alto",
};

export const FOLLOW_UP_STATUS_LABELS: Record<string, string> = {
  pending: "Pendente",
  done: "Concluído",
  cancelled: "Cancelado",
};

export const PAYMENT_METHOD_LABELS: Record<string, string> = {
  pix: "Pix",
  cash: "Dinheiro",
  credit_card: "Cartão de crédito",
  debit_card: "Cartão de débito",
  insurance: "Convênio",
  transfer: "Transferência",
};

export const CARE_PLAN_STATUS_LABELS: Record<CarePlanStatus, string> = {
  active: "Ativo",
  resolved: "Resolvido",
  cancelled: "Cancelado",
};

export const CARE_PLAN_DIAGNOSIS_TYPE_LABELS: Record<CarePlanDiagnosisType, string> = {
  real: "Real",
  risco: "Risco",
  "promocao-saude": "Promoção da saúde",
};

export const INTERVENTION_PRIORITY_LABELS: Record<InterventionPriority, string> = {
  baixa: "Baixa",
  media: "Média",
  alta: "Alta",
};

/** Frase PES legível: Problema relacionado a Etiologia, evidenciado por Sinais/sintomas. */
export function pesSentence(diagnosis: CarePlanDiagnosisDto): string {
  if (diagnosis.type === "risco") {
    return `Risco de ${diagnosis.diagnosisLabel} relacionado a ${diagnosis.relatedFactors}`;
  }
  if (diagnosis.type === "promocao-saude") {
    return `${diagnosis.diagnosisLabel} evidenciado por ${diagnosis.definingCharacteristics}`;
  }
  return `${diagnosis.diagnosisLabel} relacionado a ${diagnosis.relatedFactors}, evidenciado por ${diagnosis.definingCharacteristics}`;
}

/** Rótulo de progresso de um resultado NOC — usa `attainment` para distinguir regressão de progresso. */
export function outcomeStatusLabel(outcome: {
  isAchieved: boolean | null;
  attainment: number | null;
}): string {
  if (outcome.isAchieved == null) {
    return "Sem avaliação";
  }
  if (outcome.isAchieved) {
    return "Meta atingida";
  }
  return (outcome.attainment ?? 0) < 0 ? "Em regressão" : "Em progresso";
}
