"use client";

import { ToastProvider, TooltipProvider } from "@still-void/ui/react/client";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <TooltipProvider delayDuration={300}>{children}</TooltipProvider>
    </ToastProvider>
  );
}
