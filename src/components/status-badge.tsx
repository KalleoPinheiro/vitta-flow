import { CategoryPill } from "@still-void/ui/react";

/**
 * Cor por status usando os tokens semânticos do Still Void — fixos e
 * independentes do accent do site, justamente para "pago" nunca colidir com a
 * cor da marca. Sempre a variante -ink, que é a que bate 4.5:1 no tema claro.
 */
const COLOR_BY_STATUS: Record<string, string> = {
  scheduled: "var(--sv-info-ink)",
  confirmed: "var(--sv-accent-ink)",
  completed: "var(--sv-success-ink)",
  cancelled: "var(--sv-text-3)",
  no_show: "var(--sv-warning-ink)",
  pending: "var(--sv-warning-ink)",
  paid: "var(--sv-success-ink)",
};

const FALLBACK_COLOR = "var(--sv-text-3)";

interface StatusBadgeProps {
  status: string;
  label: string;
}

/**
 * Selo de status como pílula do design system: ponto colorido + label, nunca
 * emoji (regra de fidelidade do Still Void).
 */
// sv-gap: badge-hardcoded-red
export function StatusBadge({ status, label }: StatusBadgeProps) {
  return <CategoryPill label={label} color={COLOR_BY_STATUS[status] ?? FALLBACK_COLOR} />;
}
