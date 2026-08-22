"use client";

import { useEffect, useState } from "react";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@still-void/ui/react/client";

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
 * Dois ajustes que a lib não cobre no padrão de uso do app:
 *
 * - `aria-modal="true"` é passado explicitamente. A Radix não define o atributo:
 *   ela marca os irmãos com `aria-hidden`, que é equivalente para leitor de tela,
 *   mas o contrato de acessibilidade do app pede o atributo.
 * - O foco volta ao gatilho por um efeito próprio. A Radix restaura o foco na
 *   transição `open → false`, e os call sites daqui desmontam o `<Modal>` direto
 *   (o pai zera o estado), então essa transição nunca acontece.
 *
 * O botão de fechar também é do app: o `DialogContent` do pacote não empacota um
 * (o shadcn upstream empacota).
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
      <DialogContent aria-modal="true" className="max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between">
          <DialogTitle className="sv-display text-lg font-semibold">{title}</DialogTitle>
          <DialogClose aria-label="Fechar" className="text-ink-3 hover:text-ink">
            ✕
          </DialogClose>
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}
