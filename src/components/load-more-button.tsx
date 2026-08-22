"use client";

import { Button } from "@still-void/ui/react";

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
      <Button type="button" variant="outline" size="sm" onClick={onClick}>
        Carregar mais
      </Button>
    </div>
  );
}
