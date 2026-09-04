import { ToastProvider, TooltipProvider } from '@still-void/ui/react/client';
import { type RenderOptions, render } from '@testing-library/react';
import type { ReactElement } from 'react';

export function renderWithToast(ui: ReactElement, options?: RenderOptions) {
  return render(
    <ToastProvider>
      <TooltipProvider delayDuration={300}>{ui}</TooltipProvider>
    </ToastProvider>,
    options,
  );
}
