"use client";

import { categoryPill } from "@still-void/ui/react";

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
      <button type="button" onClick={onClick} className={categoryPill({ interactive: true })}>
        Carregar mais
      </button>
    </div>
  );
}
