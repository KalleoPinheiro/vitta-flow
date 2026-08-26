"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@still-void/ui/react/client";
import { Icon } from "@still-void/ui/react";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * Diálogo modal sobre o `Dialog` do Still Void (Radix por baixo), que assume o
 * focus trap, o Escape e a dismissão por clique fora — tudo que antes era feito
 * à mão aqui.
 *
 * Um ajuste que a lib não cobre no padrão de uso do app:
 *
 * - O foco volta ao gatilho por um efeito próprio. A Radix restaura o foco na
 *   transição `open → false`, e os call sites daqui desmontam o `<Modal>` direto
 *   (o pai zera o estado), então essa transição nunca acontece.
 *
 * `aria-modal="true"` e a ausência de sombra (`shadow-none`) já são nativos do
 * `DialogContent` a partir da `3.1.0` (as antigas lacunas `dialog-aria-modal` e
 * `dialog-shadow` foram fechadas — ver `docs/still-void-gaps.md`); mantidos
 * aqui explícitos porque `tests/components/modal.test.tsx` já os asserte como
 * contrato do app.
 *
 * O botão de fechar é do app, não do pacote: a partir da 3.0.0 o `DialogContent`
 * passa a empacotar um próprio, mas com nome acessível `"Close dialog"` fixo em
 * inglês (sem prop de rótulo) — regressão de acessibilidade numa UI pt-BR. Por
 * isso `showCloseButton={false}` (AD-015), e o botão pt-BR abaixo continua sendo
 * o único.
 */
export function Modal({ title, onClose, children }: ModalProps) {
  const [previouslyFocused] = useState<HTMLElement | null>(() =>
    typeof document === "undefined" ? null : (document.activeElement as HTMLElement | null),
  );

  useEffect(() => {
    return () => {
      previouslyFocused?.focus();
    };
  }, [previouslyFocused]);

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) {
          onClose();
        }
      }}
    >
      <DialogContent
        aria-modal="true"
        showCloseButton={false}
        className="max-h-[90vh] overflow-y-auto shadow-none"
      >
        <div className="flex items-center justify-between">
          <DialogTitle className="sv-display text-lg font-semibold">{title}</DialogTitle>
          <DialogClose aria-label="Fechar" className="text-ink-3 hover:text-ink">
            <Icon name="x" />
          </DialogClose>
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}
