"use client";

import type { ReactNode } from "react";
import { Button, Icon } from "@still-void/ui/react";

export interface ClinicInfoDto {
  name: string;
  cnpj: string | null;
  address: string | null;
  professionalName: string | null;
  professionalRegistry: string | null;
  city: string | null;
}

interface DocumentFrameProps {
  clinic: ClinicInfoDto;
  title: string;
  children: ReactNode;
}

/** Moldura A4: cabeçalho da clínica, título, corpo e bloco de assinatura. */
export function DocumentFrame({ clinic, title, children }: DocumentFrameProps) {
  const today = new Date().toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });

  return (
    /* A moldura imprime em papel: fundo branco e tinta preta são o alvo real,
       não o tema da tela. Por isso o corpo do documento usa `black` literal —
       cor neutra, não paleta — enquanto a barra de ações, que só existe na tela
       e some no `print:`, segue os tokens do design system. */
    <div className="text-black">
      <div className="mb-6 flex items-center justify-between border-b border-border pb-4 print:hidden">
        <Button type="button" variant="link" onClick={() => window.history.back()}>
          <Icon name="chevron-left" /> Voltar
        </Button>
        <Button type="button" onClick={() => window.print()}>
          Imprimir / salvar PDF
        </Button>
      </div>

      <header className="mb-8 border-b-2 border-black pb-4 text-center">
        <h1 className="text-xl font-bold">{clinic.name}</h1>
        {clinic.cnpj && <p className="text-sm">CNPJ: {clinic.cnpj}</p>}
        {clinic.address && <p className="text-sm">{clinic.address}</p>}
      </header>

      <h2 className="mb-6 text-center text-lg font-bold uppercase">{title}</h2>

      <div className="text-sm leading-relaxed">{children}</div>

      <footer className="mt-12">
        <p className="mb-10 text-sm">
          {clinic.city ? `${clinic.city}, ` : ""}
          {today}.
        </p>
        <div className="mx-auto w-64 border-t border-black pt-1 text-center text-sm">
          {clinic.professionalName ?? "Assinatura do profissional"}
          {clinic.professionalRegistry && (
            <span className="block text-xs">{clinic.professionalRegistry}</span>
          )}
        </div>
      </footer>
    </div>
  );
}
