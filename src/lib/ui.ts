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

/**
 * Superfície de campo tokenizada para os elementos de formulário que a lib não
 * exporta: `<select>`, `<textarea>` e `<input type="file|checkbox|radio">`.
 * Espelha o visual do `Input` do pacote (mesma borda, raio, superfície e anel
 * de foco) para que campo nativo e campo da lib não destoem lado a lado.
 *
 * Ver `docs/still-void-gaps.md`, entradas `native-select`, `textarea` e
 * `file-input`.
 */
export const nativeField =
  "flex w-full rounded-md border border-sv-border bg-sv-surface px-3 py-2 text-sm text-sv-text ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
