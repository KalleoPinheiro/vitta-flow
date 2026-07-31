"use client";

import { useEffect, useId, useRef } from "react";
import { headerClasses } from "@still-void/ui";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * O catálogo do Still Void é orientado a blog e não traz um modal, então este
 * fica no app — mas todo o visual vem dos tokens do sistema: superfície, borda,
 * raio, escala de z-index e o título com `sv-display`. Sem sombra, que é regra
 * de fidelidade do design system.
 */
export function Modal({ title, onClose, children }: ModalProps) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);

  // Semântica de diálogo: foco inicial dentro do modal, Tab preso nos
  // elementos focáveis, Escape fecha, e o foco volta pra quem abriu o modal.
  useEffect(() => {
    const dialog = dialogRef.current;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusable = dialog?.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR);
    (focusable?.[0] ?? dialog)?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialog) {
        return;
      }
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
      if (items.length === 0) {
        return;
      }
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{
        zIndex: "var(--sv-z-modal)",
        background: "color-mix(in srgb, var(--sv-text) 40%, transparent)",
      }}
      onClick={onClose}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto border p-6"
        style={{
          background: "var(--sv-surface)",
          borderColor: "var(--sv-border)",
          borderRadius: "var(--sv-radius-xl)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id={titleId} className="sv-display text-lg font-semibold">
            {title}
          </h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className={headerClasses.link}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
