import { render, type RenderOptions } from "@testing-library/react";
import { ToastProvider } from "@still-void/ui/react/client";
import type { ReactElement } from "react";

export function renderWithToast(
  ui: ReactElement,
  options?: RenderOptions
) {
  return render(<ToastProvider>{ui}</ToastProvider>, options);
}
