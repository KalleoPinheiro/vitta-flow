/**
 * Layout dos documentos imprimíveis — sem navegação do staff.
 * @media print esconde controles; o navegador gera o PDF (Ctrl+P → Salvar como PDF).
 *
 * `bg-white` aqui é literal de propósito, e não `bg-surface`: a folha é papel,
 * não uma superfície do tema. Seguir o tema imprimiria fundo escuro. Mesma
 * decisão do DocumentFrame — cor neutra é permitida pela regra "toda cor resolve
 * para um token --sv-*".
 */
export default function DocumentsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl bg-white p-8 print:max-w-none print:p-0">
      {children}
    </div>
  );
}
