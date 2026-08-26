# Lacunas do `@still-void/ui` — backlog para a lib

- **Status:** Aberto
- **Data:** 2026-08-25
- **Versão verificada:** `@still-void/ui@3.1.0`
- **Origem:** migração 2.0 → 3.1 do VittaFlow (`.specs/features/still-void-v3-migration/`)

Componentes que o VittaFlow precisa e a `3.1.0` **não** exporta, mais os defeitos
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
`dist/react/index.d.ts` e `dist/react/client/index.d.ts` da `3.1.0` — o artefato
publicado, não a documentação.

**Contagem de call sites** é de ocorrências no código, não de arquivos.

---

## Faltando no catálogo

### `pagination`

- **Componente proposto:** `Pagination`
- **Call sites:** 1 padrão, replicado
- **Exemplo:** [src/components/load-more-button.tsx](../src/components/load-more-button.tsx)
- **Workaround atual:** um `Button variant="outline"` chamado "Carregar mais".
  Funciona, mas não há nada no catálogo para paginação numerada, que é o que as
  listas de auditoria e faturamento pedem conforme crescem.
- **Reconferido contra a `3.1.0`:** nenhum símbolo `Pagination` na export line de
  `dist/react/index.d.ts` nem de `dist/react/client/index.d.ts`. Lacuna segue real.

### `progress`

<!-- sv-gap-doc-only: necessidade real, mas hoje resolvida por SVG próprio já marcado como data-chart -->

- **Componente proposto:** `Progress`
- **Call sites:** 0 diretos, mas há necessidade real
- **Exemplo:** [src/components/healing-chart.tsx](../src/components/healing-chart.tsx) desenha SVG à mão; os scores PUSH (0–17) e DET (0–15) e a escala de dor (0–10) são barras de progresso conceituais
- **Nota:** o pacote exporta `ReadingProgress`, que é a barra de progresso de
  leitura de artigo — não um `Progress` genérico com `value`/`max`.
- **Reconferido contra a `3.1.0`:** nenhum símbolo `Progress` na export line de
  `dist/react/index.d.ts` nem de `dist/react/client/index.d.ts`; só `ReadingProgress`
  (`dist/react/client/index.d.ts`). Lacuna segue real.

### `separator`

- **Componente proposto:** `Separator`
- **Call sites:** 1
- **Exemplo:** [src/app/login/page.tsx](../src/app/login/page.tsx) — o divisor "ou" entre Google e senha
- **Workaround atual:** `<span className="h-px flex-1 bg-surface-2" />`, sem
  `role="separator"`.
- **Reconferido contra a `3.1.0`:** nenhum símbolo `Separator` na export line de
  `dist/react/index.d.ts` nem de `dist/react/client/index.d.ts` (a lib exporta
  `DropdownMenuSeparator`/`SelectSeparator`, específicos de menu/select, não um
  `Separator` genérico). Lacuna segue real.

### `data-chart`

- **Componente proposto:** primitivos de gráfico com os tokens do sistema
- **Call sites:** 1 componente de 250 linhas
- **Exemplo:** [src/components/healing-chart.tsx](../src/components/healing-chart.tsx)
- **Nota:** o gráfico já usa `var(--sv-accent-ink)`, `var(--sv-info-ink)` e
  `var(--sv-warning-ink)` para as séries, mas eixos, grade e rótulos são SVG
  escrito à mão. Baixa prioridade — é o item mais específico do domínio clínico
  desta lista e o que menos se generaliza.
- **Reconferido contra a `3.1.0`:** nenhum símbolo contendo `Chart` na export line
  de `dist/react/index.d.ts` nem de `dist/react/client/index.d.ts`. Lacuna segue real.

### `icon-set-gaps`

- **Componente proposto:** três novos valores em `IconName`
- **Call sites:** 3, em 2 arquivos
- **Exemplos:** [(staff)/page.tsx](../src/app/(staff)/page.tsx) — 📷 "Fotos de pacientes aguardando triagem"; [(staff)/materiais/page.tsx](../src/app/(staff)/materiais/page.tsx) — ⛔ lote vencido, ⏳ lote a vencer
- **Por que não dá para usar o que existe:** `IconName` da `3.1.0` tem exatamente
  15 valores (`x`, `check`, `chevron-down`, `chevron-up`, `chevron-right`,
  `chevron-left`, `info`, `alert-triangle`, `alert-circle`, `check-circle`,
  `copy`, `sun`, `moon`, `search`, `menu`) — nenhum cobre câmera, bloqueado ou
  pendente. `alert-triangle`/`alert-circle` são genéricos demais para substituir
  o sentido específico de "vencido" (⛔) e "a vencer" (⏳) que o texto ao lado já
  não deixa ambíguo, então trocar por um ícone errado pioraria a leitura.
- **Workaround atual:** os três glifos (`📷`/`⛔`/`⏳`) permanecem como texto,
  marcados `sv-gap: icon-set-gaps` no ponto do código.
- **API sugerida:** adicionar `camera`, `blocked` e `pending` (ou equivalentes)
  a `IconName`.
- **Reconferido contra a `3.1.0`:** `type IconName` em `dist/react/index.d.ts`
  lista exatamente os 15 nomes acima — confirmado por leitura direta do artefato
  publicado. Lacuna segue real.

---

## Particularidades sem workaround local

### `dialog-close-label`

<!-- sv-gap-doc-only: é configuração via showCloseButton={false}, não workaround local com marcação sv-gap: no código -->

- **Componente:** `DialogContent`
- **Divergência:** a partir da `3.0.0`, `DialogContent` passa a empacotar seu
  próprio botão de fechar (`showCloseButton`, `true` por padrão) — o que fecha a
  antiga lacuna `dialog-close-button`. Mas o nome acessível desse botão é
  **hardcoded em inglês**, `"Close dialog"` (`dist/react/client/index.js`), e
  `DialogContentProps` expõe só `showCloseButton?: boolean`, nenhuma prop de
  rótulo ou i18n — confirmado em `dist/react/client/index.d.ts`.
- **Impacto:** numa UI pt-BR, expor esse botão sem tradução é regressão de
  acessibilidade. Por isso o app optou por `showCloseButton={false}` e manter o
  próprio botão pt-BR (`aria-label="Fechar"`) — ver
  [src/components/modal.tsx](../src/components/modal.tsx) e AD-015 em
  `.specs/STATE.md`.
- **Ação sugerida:** expor uma prop de rótulo (`closeLabel`) ou aceitar
  `children` no lugar do `<span className="sv-sr-only">` fixo, para permitir
  i18n sem desabilitar o botão nativo.

---

## Relacionado

- [BACKLOG-DESIGN-SYSTEM.md](BACKLOG-DESIGN-SYSTEM.md) — backlog da adoção da 1.x;
  os itens 1, 2 e 3 são fechados pela migração para a `2.0.1`.
- [.specs/features/still-void-v3-migration/](../.specs/features/still-void-v3-migration/) —
  spec, design e tasks da migração `2.0` → `3.1` que fechou 14 das 19 lacunas
  anteriores e levantou `dialog-close-label` e `icon-set-gaps`.
- [.specs/features/still-void-v2-migration/](../.specs/features/still-void-v2-migration/) —
  spec, design e tasks da migração `1.x` → `2.0` que levantou as lacunas
  originais.
