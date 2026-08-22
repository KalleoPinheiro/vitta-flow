/**
 * Receitas de classe que o catálogo do Still Void ainda não cobre.
 *
 * O `Button` do pacote tem seis variantes (default, destructive, outline,
 * secondary, ghost, link) e nenhuma delas é a "primária preenchida com o
 * accent" — a `default` é superfície neutra. Como o app tem dezenas de ações
 * primárias, a diferença vive aqui em vez de repetida em cada call site.
 *
 * O `tailwind-merge` que o `Button` usa internamente resolve o conflito de
 * `bg-*` a favor do className passado, então isto sobrescreve a variante sem
 * `!important` nem especificidade extra.
 *
 * Ver `docs/still-void-gaps.md`, entrada `button-accent-variant`.
 */
export const accentButton = "bg-accent-ink text-sv-bg hover:bg-accent-strong";
