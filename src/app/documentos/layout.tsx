/**
 * Layout dos documentos imprimíveis — sem navegação do staff.
 * @media print esconde controles; o navegador gera o PDF (Ctrl+P → Salvar como PDF).
 */
export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl bg-white p-8 print:max-w-none print:p-0">
      {children}
    </div>
  );
}
