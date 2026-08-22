# Lacunas do `@still-void/ui` — backlog para a lib

- **Status:** Aberto
- **Data:** 2026-08-22
- **Versão verificada:** `@still-void/ui@2.0.1`
- **Origem:** migração 1.x → 2.0 do VittaFlow (`.specs/features/still-void-v2-migration/`)

Componentes que o VittaFlow precisa e a `2.0.1` **não** exporta, mais os defeitos
encontrados no que ela exporta. Cada entrada é candidata a issue no repositório
[still-void](https://github.com/KalleoPinheiro/still-void).

## Como ler

Cada lacuna tem um `slug`. O mesmo `slug` aparece no código do VittaFlow como
comentário `sv-gap: <slug>`, na linha acima do workaround. `npm run check:sv`
mantém os dois lados em sincronia nos dois sentidos: marcação sem seção aqui, ou
seção aqui sem marcação no código, falham o gate. A exceção é uma seção anotada
com `<!-- sv-gap-doc-only -->`, para a lacuna que não tem workaround local — é
relato sobre a lib, não dívida no VittaFlow.

**Prova de ausência:** cada nome abaixo foi conferido contra a *export line* de
`dist/react/index.d.ts` e `dist/react/client/index.d.ts` da `2.0.1` — o artefato
publicado, não a documentação. Onde a doc diverge do artefato, está anotado.

**Contagem de call sites** é de ocorrências no código, não de arquivos.

---

## Faltando no catálogo

### `native-select`

- **Componente proposto:** `NativeSelect`
- **Call sites:** 23, em 14 arquivos
- **Exemplos:** [agenda/appointment-form.tsx](../src/app/(staff)/agenda/appointment-form.tsx), [pacientes/patient-form.tsx](../src/app/(staff)/pacientes/patient-form.tsx), [portal/schedule-return.tsx](../src/app/portal/schedule-return.tsx)
- **Por que não dá para usar o que existe:** a `2.0.1` exporta a família `Select`
  (Radix) de `@still-void/ui/react/client`. É um *combobox* custom: renderiza
  `div[role=combobox]` + listbox em portal, exige boundary client e não é
  substituto drop-in de um `<select name>` dentro de `<form>`. Trocar quebraria
  `userEvent.selectOptions` em ~8 arquivos de teste do app e mudaria a interação
  em campo de formulário. Registrado como decisão na spec da migração.
- **Workaround atual:** `<select>` nativo com a receita `nativeField` de
  [src/lib/ui.ts](../src/lib/ui.ts), que espelha borda, raio, superfície e anel de
  foco do `<Input>` do pacote para os dois não destoarem lado a lado.
- **API sugerida:** `<NativeSelect>` com a mesma assinatura de `<Input>` —
  `React.SelectHTMLAttributes<HTMLSelectElement>`, `children` sendo `<option>`.
  Server-safe, sem Radix. Coexiste com `Select`: um é campo, o outro é combobox.

### `textarea`

- **Componente proposto:** `Textarea`
- **Call sites:** 7, em 6 arquivos
- **Exemplos:** [pacientes/[id]/anamnesis-section.tsx](../src/app/(staff)/pacientes/[id]/anamnesis-section.tsx), [pacientes/[id]/evolutions-section.tsx](../src/app/(staff)/pacientes/[id]/evolutions-section.tsx)
- **Por que não dá para usar o que existe:** não há equivalente. O `Input` é
  `<input>` e não aceita `rows`.
- **Workaround atual:** `<textarea>` nativo com a receita `nativeField`.
- **API sugerida:** `Textarea` é o par óbvio do `Input` no shadcn upstream —
  mesmas classes, `React.TextareaHTMLAttributes<HTMLTextAreaElement>`,
  server-safe. É a lacuna mais barata de fechar da lista.

### `table`

- **Componentes propostos:** `Table`, `TableHeader`, `TableBody`, `TableFooter`, `TableRow`, `TableHead`, `TableCell`, `TableCaption`
- **Call sites:** 14, em 12 arquivos
- **Exemplos:** [procedimentos/page.tsx](../src/app/(staff)/procedimentos/page.tsx), [faturamento/page.tsx](../src/app/(staff)/faturamento/page.tsx), [auditoria/page.tsx](../src/app/(staff)/auditoria/page.tsx)
- **Por que não dá para usar o que existe:** não há equivalente. O catálogo da
  lib é orientado a blog (post card, grid, TOC) e nunca teve tabela de dados.
- **Workaround atual:** `<table>` nativo com utilitários tokenizados. Cada tela
  do staff repete o mesmo cabeçalho (`border-b bg-bg text-xs uppercase
  text-ink-3`) e o mesmo corpo (`divide-y divide-border`).
- **API sugerida:** a família `Table` do shadcn upstream, sem alteração. É a
  lacuna com maior retorno: 12 arquivos hoje replicam a mesma decoração à mão.

### `checkbox`

- **Componente proposto:** `Checkbox`
- **Call sites:** 1
- **Exemplo:** [materiais/page.tsx](../src/app/(staff)/materiais/page.tsx) — "insumo ativo"
- **Workaround atual:** `<input type="checkbox">` nativo, sem estilo do sistema.
- **API sugerida:** `Checkbox` do shadcn (Radix `@radix-ui/react-checkbox`),
  client-only. Volume baixo no VittaFlow, mas é primitivo de formulário básico.

### `radio-group`

- **Componentes propostos:** `RadioGroup`, `RadioGroupItem`
- **Call sites:** 3
- **Exemplo:** [pacientes/[id]/care-plans-section.tsx](../src/app/(staff)/pacientes/[id]/care-plans-section.tsx) — tipo de diagnóstico NANDA-I, prioridade de intervenção NIC, score NOC
- **Por que não dá para usar o que existe:** `Select` mudaria a interação — são
  escolhas de 3 a 5 opções que precisam ficar visíveis lado a lado no prontuário.
- **Workaround atual:** `<input type="radio">` nativo dentro de `<fieldset>` com
  `<legend className="sr-only">`.
- **API sugerida:** `RadioGroup` do shadcn (Radix), client-only.

### `file-input`

- **Componente proposto:** `FileInput`
- **Call sites:** 2
- **Exemplos:** [portal/consent-card.tsx](../src/app/portal/consent-card.tsx) (envio remoto de foto pelo paciente), [pacientes/[id]/condition-photos.tsx](../src/app/(staff)/pacientes/[id]/condition-photos.tsx)
- **Por que não dá para usar o que existe:** `Input` não cobre `type="file"` — o
  controle nativo tem chrome próprio do browser que ignora as classes.
- **Workaround atual:** `<input type="file" className="hidden">` dentro de um
  `<label>` estilizado como botão.
- **API sugerida:** `FileInput` que encapsule exatamente esse padrão
  (`label` + `input` escondido) e exponha `accept`, `disabled`, `onChange` e o
  rótulo como children.

### `card-as-element`

- **Mudança proposta:** `asChild` (ou prop `as`) no `Card`
- **Call sites:** 9, em 6 arquivos
- **Exemplos:** [relatorios/page.tsx](../src/app/(staff)/relatorios/page.tsx) (`<section>`), [pacientes/[id]/care-plans-section.tsx](../src/app/(staff)/pacientes/[id]/care-plans-section.tsx) (`<li>`)
- **Por que não dá para usar o que existe:** `Card` renderiza `<div>` fixo. Onde
  a superfície de cartão precisa ser um `<section>` (landmark) ou um `<li>`
  (obrigatório dentro de `<ul>`), usar `Card` apagaria a semântica do elemento.
- **Workaround atual:** o elemento correto com a superfície escrita à mão
  (`rounded-lg border border-sv-border bg-sv-surface`) — duplicando exatamente o
  que o `Card` já emite.
- **API sugerida:** `asChild` via `@radix-ui/react-slot` (já é dependência
  transitiva das famílias Radix do pacote), ou uma prop `as="section" | "li"`.

### `button-accent-variant`

- **Mudança proposta:** variante `accent` (ou `primary`) no `Button`
- **Call sites:** ~20 ações primárias
- **Exemplo:** [src/lib/ui.ts](../src/lib/ui.ts) — a receita `accentButton`
- **Por que não dá para usar o que existe:** `Button` tem seis variantes
  (`default`, `destructive`, `outline`, `secondary`, `ghost`, `link`) e nenhuma é
  preenchida com o accent do site — `default` é `bg-sv-surface text-sv-text`,
  superfície neutra. Um app com ação primária em cada tela não tem como expressar
  "botão principal" pelo catálogo.
- **Workaround atual:** a constante `accentButton`
  (`bg-accent-ink text-sv-bg hover:bg-accent-strong`), passada via `className` —
  o `tailwind-merge` interno do `Button` resolve o conflito de `bg-*` a favor
  dela.
- **API sugerida:** `variant="accent"` usando `bg-sv-accent-ink` /
  `hover:bg-sv-accent-ink/90` / `text-sv-bg`.

### `alert-dialog`

<!-- sv-gap-doc-only: nenhum workaround no código; é relato de divergência da lib -->

- **Componentes propostos:** família `AlertDialog`
- **Call sites:** 0 hoje (confirmações destrutivas do app usam `window.confirm`
  ou ação direta)
- **Divergência entre doc e artefato:** `docs/design-system.md` da lib anuncia
  "shadcn/ui: `Dialog` family, **`AlertDialog` family**, `DropdownMenu` family…" e
  `@radix-ui/react-alert-dialog@^1.1.23` está em `dependencies` do
  `package.json` — mas **nenhum símbolo `AlertDialog` aparece na export line** de
  `dist/react/client/index.d.ts@2.0.1`. Ou o barrel esqueceu o re-export, ou a
  doc e a dependência ficaram para trás.
- **Ação sugerida:** decidir qual dos dois está certo e alinhar — exportar o
  componente, ou remover a dependência e o trecho da doc.

### `pagination`

- **Componente proposto:** `Pagination`
- **Call sites:** 1 padrão, replicado
- **Exemplo:** [src/components/load-more-button.tsx](../src/components/load-more-button.tsx)
- **Workaround atual:** um `Button variant="outline"` chamado "Carregar mais".
  Funciona, mas não há nada no catálogo para paginação numerada, que é o que as
  listas de auditoria e faturamento pedem conforme crescem.

### `progress`

<!-- sv-gap-doc-only: necessidade real, mas hoje resolvida por SVG próprio já marcado como data-chart -->

- **Componente proposto:** `Progress`
- **Call sites:** 0 diretos, mas há necessidade real
- **Exemplo:** [src/components/healing-chart.tsx](../src/components/healing-chart.tsx) desenha SVG à mão; os scores PUSH (0–17) e DET (0–15) e a escala de dor (0–10) são barras de progresso conceituais
- **Nota:** o pacote exporta `ReadingProgress`, que é a barra de progresso de
  leitura de artigo — não um `Progress` genérico com `value`/`max`.

### `separator`

- **Componente proposto:** `Separator`
- **Call sites:** ~6
- **Exemplo:** [src/app/login/page.tsx](../src/app/login/page.tsx) — o divisor "ou" entre Google e senha
- **Workaround atual:** `<span className="h-px flex-1 bg-border" />`, sem
  `role="separator"`.

### `data-chart`

- **Componente proposto:** primitivos de gráfico com os tokens do sistema
- **Call sites:** 1 componente de 250 linhas
- **Exemplo:** [src/components/healing-chart.tsx](../src/components/healing-chart.tsx)
- **Nota:** o gráfico já usa `var(--sv-accent-ink)`, `var(--sv-info-ink)` e
  `var(--sv-warning-ink)` para as séries, mas eixos, grade e rótulos são SVG
  escrito à mão. Baixa prioridade — é o item mais específico do domínio clínico
  desta lista e o que menos se generaliza.

---

## Defeitos no que a `2.0.1` já exporta

### `dialog-shadow`

`DialogContent` inclui `shadow-lg` na sua className
(`dist/react/client/index.js`). O README da própria lib, em "Fidelity rules (do
not regress)", diz: *"`.sv-gradient-border` é a assinatura visual; never replace
with box-shadow"* e *"Cards have **no shadow**"*. O diálogo é a única superfície
do catálogo que quebra a regra.

### `dialog-close-button`

`DialogContent` não empacota botão de fechar. O shadcn upstream renderiza um `X`
com `sr-only "Close"` dentro do `DialogContent`. Aqui cada consumidor precisa
montar o seu — ver [src/components/modal.tsx](../src/components/modal.tsx), que
compõe `DialogClose` com `aria-label="Fechar"` à mão.

### `dialog-aria-modal`

`DialogContent` não define `aria-modal="true"`. A Radix marca os irmãos com
`aria-hidden`, o que é equivalente para leitor de tela, mas consumidores com
contrato de acessibilidade escrito em cima do atributo precisam passá-lo à mão.
Verificado em jsdom: `getAttribute("aria-modal")` retorna `null`.

### `badge-hardcoded-red`

`Badge variant="destructive"` usa `bg-red-500 text-white hover:bg-red-600` —
degraus crus do Tailwind, não os tokens do sistema. Todo o resto do catálogo usa
`bg-sv-*` / `bg-destructive`. Consequência prática: `.bg-red-500` aparece no CSS
gerado de um app que não tem nenhum `red-500` no código, e a cor não acompanha o
tema. Deveria ser `bg-destructive text-destructive-foreground`.

### `tailwind-setup-v3-only`

O README manda *"Configure your `tailwind.config.ts` to extend Still Void's
tokens"*, e o CHANGELOG da `2.0.0` diz que a release "Add[s] Tailwind config
extending Still Void tokens" — mas o `tailwind.config.ts` **não é publicado**
(`files: ["dist", "CHANGELOG.md"]`). Além disso, os componentes shadcn emitem
utilitários (`bg-sv-surface`, `ring-ring`, `bg-destructive`, `bg-background`,
`text-destructive-foreground`…) que **não existem** sem essa configuração, e o
Tailwind v4 não varre `node_modules` por padrão. Sem os dois passos abaixo, todo
componente shadcn da lib renderiza sem cor — silenciosamente, sem erro de build:

```css
@source "../../node_modules/@still-void/ui/dist";

@theme {
  --color-sv-bg: var(--sv-bg);
  --color-sv-surface: var(--sv-surface);
  --color-sv-surface-2: var(--sv-surface-2);
  --color-sv-text: var(--sv-text);
  --color-sv-text-2: var(--sv-text-2);
  --color-sv-border: var(--sv-border);
  --color-sv-signal-cyan: var(--sv-accent-cyan);
  --color-background: var(--sv-bg);
  --color-ring: var(--sv-accent);
  --color-destructive: var(--sv-danger);
  --color-destructive-foreground: var(--sv-bg);
}
```

**Ação sugerida:** publicar um `@still-void/ui/tailwind.css` com esse bloco, para
o consumidor fazer só `@import "@still-void/ui/tailwind.css"`, e atualizar o
README com as instruções de Tailwind v4 (CSS-first) além das de v3.

---

## Relacionado

- [BACKLOG-DESIGN-SYSTEM.md](BACKLOG-DESIGN-SYSTEM.md) — backlog da adoção da 1.x;
  os itens 1, 2 e 3 são fechados por esta migração.
- [.specs/features/still-void-v2-migration/](../.specs/features/still-void-v2-migration/) —
  spec, design e tasks da migração que levantou estas lacunas.
