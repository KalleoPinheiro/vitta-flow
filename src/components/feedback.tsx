import type { CSSProperties } from "react";
import { Callout, CardSkeleton } from "@still-void/ui/react";

interface ErrorAlertProps {
  message: string;
}

/**
 * O Still Void só define os kinds note/warn/aha — não há um "danger". A cor da
 * barra lateral e do rótulo é sobrescrevível por CSS var, então usamos o token
 * semântico de erro do próprio sistema em cima do kind visualmente mais próximo.
 */
const DANGER_CALLOUT: CSSProperties = {
  "--sv-callout-color": "var(--sv-danger-ink)",
} as CSSProperties;

export function ErrorAlert({ message }: ErrorAlertProps) {
  return (
    <Callout kind="warn" label="Erro" role="alert" className="mb-4" style={DANGER_CALLOUT}>
      {message}
    </Callout>
  );
}

/**
 * Skeleton do design system no lugar de texto solto. O CardSkeleton é
 * aria-hidden, então o texto de carregamento fica como rótulo acessível —
 * anunciado por leitor de tela e ainda alcançável pelos testes.
 */
export function LoadingIndicator() {
  return (
    <div className="py-8" aria-busy="true" aria-live="polite">
      <CardSkeleton />
      <span className="sr-only">Carregando…</span>
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <p className="py-8 text-center text-sm text-ink-3">
      {message}
    </p>
  );
}
