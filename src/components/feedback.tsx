import { Alert, AlertDescription, CardSkeleton } from "@still-void/ui/react";

interface ErrorAlertProps {
  message: string;
}

/**
 * Alerta de erro com variante semântica do catálogo @still-void/ui v3.3+.
 * A variante `danger` automaticamente aplica role="alert", cores de erro
 * (danger -ink pra contrast 4.5:1), e ícone padrão (se necessário).
 * O token semântico garante que erros nunca colidem com a cor accent do site.
 */
export function ErrorAlert({ message }: ErrorAlertProps) {
  return (
    <Alert variant="danger" className="mb-4">
      <AlertDescription>{message}</AlertDescription>
    </Alert>
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
