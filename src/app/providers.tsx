"use client";

import { ToastProvider } from "@still-void/ui/react/client";
import type { ReactNode } from "react";

export function Providers({ children }: { children: ReactNode }) {
  return <ToastProvider>{children}</ToastProvider>;
}
