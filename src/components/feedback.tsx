interface ErrorAlertProps {
  message: string;
}

export function ErrorAlert({ message }: ErrorAlertProps) {
  return (
    <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
      {message}
    </div>
  );
}

export function LoadingIndicator() {
  return <p className="py-8 text-center text-sm text-slate-500">Carregando…</p>;
}

export function EmptyState({ message }: { message: string }) {
  return <p className="py-8 text-center text-sm text-slate-500">{message}</p>;
}
