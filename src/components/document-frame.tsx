"use client";

import type { ReactNode } from "react";

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
    <div className="text-slate-900">
      <div className="mb-6 flex items-center justify-between border-b border-slate-300 pb-4 print:hidden">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="text-sm text-teal-700 hover:underline"
        >
          ← Voltar
        </button>
        <button
          type="button"
          onClick={() => window.print()}
          className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
        >
          Imprimir / salvar PDF
        </button>
      </div>

      <header className="mb-8 border-b-2 border-slate-800 pb-4 text-center">
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
        <div className="mx-auto w-64 border-t border-slate-800 pt-1 text-center text-sm">
          {clinic.professionalName ?? "Assinatura do profissional"}
          {clinic.professionalRegistry && (
            <span className="block text-xs">{clinic.professionalRegistry}</span>
          )}
        </div>
      </footer>
    </div>
  );
}
