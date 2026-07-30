"use client";

import { headerClasses } from "@still-void/ui";

interface ModalProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}

/**
 * O catálogo do Still Void é orientado a blog e não traz um modal, então este
 * fica no app — mas todo o visual vem dos tokens do sistema: superfície, borda,
 * raio, escala de z-index e o título com `sv-display`. Sem sombra, que é regra
 * de fidelidade do design system.
 */
export function Modal({ title, onClose, children }: ModalProps) {
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
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto border p-6"
        style={{
          background: "var(--sv-surface)",
          borderColor: "var(--sv-border)",
          borderRadius: "var(--sv-radius-xl)",
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="sv-display text-lg font-semibold">{title}</h2>
          <button type="button" onClick={onClose} aria-label="Fechar" className={headerClasses.link}>
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
