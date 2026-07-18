"use client";

interface LoadMoreButtonProps {
  visible: boolean;
  onClick: () => void;
}

export function LoadMoreButton({ visible, onClick }: LoadMoreButtonProps) {
  if (!visible) {
    return null;
  }
  return (
    <div className="mt-4 text-center">
      <button
        type="button"
        onClick={onClick}
        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
      >
        Carregar mais
      </button>
    </div>
  );
}
