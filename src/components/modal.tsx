'use client';

import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@still-void/ui/react/client';
import { useEffect, useState } from 'react';

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
 * O botão de fechar volta a ser o nativo do pacote: a partir da `3.2.0`,
 * `DialogContent` aceita `closeLabel`, que define o nome acessível do botão
 * embutido (antes fixo em `"Close dialog"`, em inglês). `closeLabel="Fechar"`
 * fecha essa lacuna de acessibilidade pt-BR sem precisar de um botão próprio.
 */
export function Modal({ title, onClose, children }: ModalProps) {
  const [previouslyFocused] = useState<HTMLElement | null>(() =>
    typeof document === 'undefined'
      ? null
      : (document.activeElement as HTMLElement | null),
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
        closeLabel="Fechar"
        className="max-h-[90vh] overflow-y-auto shadow-none"
      >
        <div className="flex items-center justify-between">
          <DialogTitle className="sv-display font-semibold text-lg">
            {title}
          </DialogTitle>
        </div>
        {children}
      </DialogContent>
    </Dialog>
  );
}
