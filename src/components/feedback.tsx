import { Alert, AlertDescription, CardSkeleton } from "@still-void/ui/react";

interface ErrorAlertProps {
  message: string;
}

/**
 * O `Alert` do Still Void é neutro por definição (superfície e borda padrão) —
 * o catálogo não traz variante de erro. A cor vem do token semântico `danger`,
 * que é fixo no sistema e independente do accent do site: um erro nunca colide
 * com a cor da marca. Sempre a variante -ink, a que bate 4.5:1 no tema claro.
 */
export function ErrorAlert({ message }: ErrorAlertProps) {
  return (
    <Alert className="mb-4 border-danger">
      <AlertDescription className="text-danger">{message}</AlertDescription>
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
