# Procedimentos e Materiais — achados P0-P3 (issue #89) Specification

## Problem Statement

`docs/audits/auditoria-ux-2026-08.md` §4 (Procedimentos e Materiais). Diferente das issues #86-88,
**nenhuma Fase anterior cobriu esta superfície** — os próprios P0 listados na issue nunca foram
corrigidos. Decisão do usuário via `AskUserQuestion`: **incluir todos os P0 desta issue**, ao
contrário do padrão "só P1-P3" usado em #86-88 (onde os P0 já tinham sido resolvidos por outras
Fases). Este spec cobre P0-P3, com exclusões pontuais documentadas por desproporção de tamanho.

## Goals

- [ ] Insumo novo não nasce "estoque baixo" (bug de `minQty` default); zero é visualmente mais grave
      que "baixo"
- [ ] Kit deixa de ser opaco na listagem de procedimentos (nº de itens visível sem abrir modal)
- [ ] Ações da linha (Kit/Editar/Desativar/Movimentar/Histórico) com alvo de toque real
- [ ] `KitForm` não aceita insumo duplicado nem quantidade inválida silenciosa
- [ ] Alerta de estoque baixo nomeia os insumos; saída maior que saldo falha antes do envio
- [ ] Ambas as páginas ganham busca/filtro básico e feedback consistente (erro de insights, cor
      semântica do histórico, confirmação de movimentação)
- [ ] `check:sv` permanece verde

## Out of Scope

| Item | Reason |
| --- | --- |
| Materiais — 3 modais → 1 painel com `Tabs` (P1, `583→~250 linhas`) | O próprio audit doc já trata isso como task própria (T6) do seu plano de ação — refactor real de composição de UI, desproporcional a uma issue "pontual"; recomendo issue própria |
| Procedimentos — cadastro em lote (P2: autoFocus, salvar-e-criar-outro, duplicar) | Mudança de fluxo de trabalho, não ajuste pontual — o modal atual funciona, só é menos eficiente pra lote; YAGNI sem pedido explícito de volume de cadastro |
| Materiais — `unit` como vocabulário fechado (P2) | Exigiria migração de dado existente (normalizar "un"/"und"/"Unidade" já gravados) — fora do escopo de um ajuste de UI |
| Materiais — mensagens Zod em pt-BR (P3) | É infraestrutura cross-cutting (todo endpoint que usa `z.parse` vaza mensagem em inglês), não específico desta página — mudança de escopo maior que a issue |
| Materiais — insumo inativo com saldo é "estoque fantasma" (P3) | Não há conceito de UI definido pro aviso (audit doc só descreve o problema, não a correção) — precisa de decisão de produto |
| Card-stack mobile completo (T8/T11 do audit doc) | O P0 "inutilizável no mobile" já está mitigado por `overflow-x-auto` (Fase A, #57-60) — confirmado lendo o código antes deste spec; as duas tabelas já rolam horizontalmente. Redesenho pra cards é polimento adicional, não "P0 quebrado" |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| P0 mobile (ambas as páginas) | Nenhuma mudança de código — já resolvido por `overflow-x-auto` da Fase A | Verificado no código antes de escrever o spec: as duas tabelas já têm o wrapper | y (verificado no código) |
| P0 severidade zero vs baixo | `Supply.isLowStock` passa a exigir `minQty > 0`; novo getter `isOutOfStock` (`stockQty === 0`) escala a severidade visual quando já há `isLowStock` | Resolve os 2 P0 de Materiais com uma mudança de domínio: sem `minQty` configurado não há "baixo"; com `minQty` configurado, zero fica mais grave que "perto do mínimo" | n (default do agente, implementado) |
| P1 "Kit" opaco | `ProcedureDto` ganha `kitItemCount` (nova query agregada `ProcedureKitRepository.countByProcedure()`); tabela mostra "Kit (N)" ou "Sem kit" | É a correção mínima que resolve "não mostra se tem kit nem quantos itens" sem redesenhar a coluna de ações | n (default do agente, implementado) |
| P1 alerta não acionável | `LowStockBanner` lista os nomes dos insumos (já tem os dados via `supplies`) + cada nome vira link/botão "Repor" que abre `MovementForm` daquele insumo | "Nomeia" e "repõe" resolvidos sem inventar navegação nova — reusa o modal de movimentação já existente | n (default do agente, documentado) |
| P2 preço sem R$ | Prefixo visual "R$" fora do `<Input type="number">` (span à esquerda, sem lib de máscara nova) — não resolve a vírgula decimal (`type="number"` não aceita), documentado como limite conhecido | `Input` não tem slot de prefixo no catálogo ainda (gap conhecido) — trocar pra máscara completa exigiria `type="text"` + parser próprio, desproporcional a um "polish" P3 | n (default do agente, documentado) |

**Open questions:** nenhuma — todas resolvidas ou registradas acima.

---

## User Stories

### P0: Insumo novo não nasce "estoque baixo" ⭐ MVP

**User Story**: Como recepcionista cadastrando um insumo novo, não quero ver "estoque baixo" antes
de sequer dar entrada — quero ver o alerta só quando um limite real foi configurado e o estoque caiu
abaixo dele.

**Why P0**: Achado [P0] Materiais — "todo insumo novo nasce marcado 'estoque baixo'", `minQty`
default 0 + `stockQty` 0 no create ⇒ `0 <= 0` sempre verdadeiro.

**Acceptance Criteria**:

1. WHEN `minQty === 0` THEN `Supply.isLowStock` SHALL ser `false`, independente de `stockQty`
2. WHEN `minQty > 0` E `stockQty <= minQty` THEN `Supply.isLowStock` SHALL ser `true` (comportamento
   já existente, preservado)
3. WHEN um insumo é criado (sempre `stockQty: 0`) com o `minQty` padrão do formulário (`0`) THEN
   NÃO SHALL aparecer como "estoque baixo" na listagem nem no banner do dashboard

**Independent Test**: `Supply.create({ minQty: 0, ... })` → `isLowStock` é `false`.

---

### P0: Zero é mais grave que "baixo"

**User Story**: Como enfermeira, quero que um insumo zerado (sem nenhuma unidade) pareça mais crítico
que um insumo "perto do mínimo".

**Why P0**: Achado [P0] Materiais — "0/10 é o mesmo âmbar que 9/10".

**Acceptance Criteria**:

1. WHEN `stockQty === 0` THEN `Supply.isOutOfStock` SHALL ser `true`
2. WHEN um insumo tem `isLowStock === true` E `isOutOfStock === true` THEN a UI SHALL mostrar
   "Sem estoque" em variante `danger`
3. WHEN um insumo tem `isLowStock === true` E `isOutOfStock === false` THEN a UI SHALL manter
   "Estoque baixo" em variante `warning` (comportamento atual)

**Independent Test**: insumo com `minQty: 5`, `stockQty: 0` → badge "Sem estoque" (danger); mesmo
insumo após `registerEntry(3)` → "Estoque baixo" (warning, `3 <= 5`).

---

### P1: Kit deixa de ser opaco

**User Story**: Como recepcionista, quero ver quantos insumos um procedimento consome sem precisar
abrir o modal.

**Why P1**: Achado [P1] Procedimentos — "'Kit' opaco para a função mais valiosa da página".

**Acceptance Criteria**:

1. WHEN `GET /api/procedures` responde THEN cada item SHALL incluir `kitItemCount` (nº de linhas do
   kit daquele procedimento)
2. WHEN a tabela de procedimentos renderiza THEN o botão "Kit" SHALL mostrar a contagem: "Kit (N)"
   quando `N > 0`, "Sem kit" (tom neutro) quando `N === 0`

**Independent Test**: mockar `/api/procedures` com `kitItemCount: 3` → botão mostra "Kit (3)"; com
`0` → "Sem kit".

---

### P1: Alvo de toque e hierarquia nas ações das duas tabelas

**User Story**: Como usuário, quero botões de ação com alvo de toque real, não texto de ~18px colado.

**Why P1**: Achado [P1] Procedimentos.

**Acceptance Criteria**:

1. WHEN a linha de procedimento renderiza THEN "Kit"/"Editar"/"Desativar"/"Reativar" SHALL ser
   `Button variant="ghost" size="sm"` (Desativar já usa `ConfirmAction` — preservado, só o trigger
   muda de estilo)
2. WHEN a linha de insumo renderiza THEN "Movimentar"/"Histórico"/"Editar" SHALL ser `Button
   variant="ghost" size="sm"`

**Independent Test**: inspecionar classes `sv-btn--ghost sv-btn--sm` nos botões de ação de ambas as
tabelas.

---

### P2: `KitForm` sem duplicata e com validação real de quantidade

**User Story**: Como recepcionista, não quero conseguir adicionar o mesmo insumo duas vezes no kit,
nem salvar uma quantidade inválida sem perceber.

**Why P2**: Achado [P2] Procedimentos — domínio já rejeita (`validateKitItems`), mas a UI mascara o
erro coagindo `quantity || 1` e não impede duplicata na hora de escolher.

**Acceptance Criteria**:

1. WHEN o usuário abre o seletor de insumo de uma linha do kit THEN as opções SHALL excluir insumos
   já escolhidos em outras linhas do mesmo kit
2. WHEN o campo quantidade está vazio ou ≤0 ao salvar THEN o formulário SHALL bloquear o envio com
   uma mensagem inline, em vez de coagir para `1` silenciosamente

**Independent Test**: kit com 2 linhas, escolher o mesmo insumo na 2ª → opção não aparece (já
escolhida na 1ª); quantidade vazia + salvar → erro inline, sem chamada à API.

---

### P2: Busca/filtro/contagem nas duas listagens

**User Story**: Como usuário com catálogo grande, quero filtrar por nome e ver quantos itens existem.

**Why P2**: Achado [P2] Procedimentos ("sem busca, filtro ou contagem").

**Acceptance Criteria**:

1. WHEN a página de procedimentos renderiza THEN SHALL ter um campo de busca por nome (filtro
   client-side — lista já vem inteira, sem paginação) + contagem "N procedimentos"
2. WHEN a página de materiais renderiza THEN SHALL ter o mesmo padrão (busca client-side + contagem)

**Independent Test**: digitar parte de um nome → só as linhas correspondentes aparecem; contagem
reflete o total filtrado.

---

### P1: Alerta de estoque acionável

**User Story**: Como recepcionista, quero que o banner de estoque baixo diga quais insumos e me deixe
repor direto dali.

**Why P1**: Achado [P1] Materiais.

**Acceptance Criteria**:

1. WHEN há insumos com `isLowStock` THEN o banner SHALL listar os nomes (já resolvido em parte —
   hoje só mostra a contagem)
2. WHEN o usuário clica no nome de um insumo no banner THEN SHALL abrir o modal de movimentação
   daquele insumo (mesmo fluxo do botão "Movimentar" da tabela)

**Independent Test**: 2 insumos com estoque baixo → banner lista os 2 nomes como botões; clicar
abre `MovementForm` do insumo certo.

---

### P1: Saída maior que o saldo falha antes do envio

**User Story**: Como recepcionista, não quero preencher todo o formulário de saída pra só depois
descobrir que não há saldo suficiente.

**Why P1**: Achado [P1] Materiais.

**Acceptance Criteria**:

1. WHEN o tipo é "Saída" THEN o campo quantidade SHALL ter `max={supply.stockQty}`
2. WHEN a quantidade digitada excede `supply.stockQty` (tipo Saída) THEN o formulário SHALL bloquear
   o envio com mensagem inline, sem chamar a API

**Independent Test**: insumo com `stockQty: 5`; digitar `6` em Saída + submeter → erro inline, sem
`fetch` de POST.

---

### P2: Feedback consistente em Materiais

**User Story**: Como usuário, quero pluralização correta, saber quando "Previsão: —" é erro (não
ausência de dado), cor semântica coerente no histórico, e confirmação antes de movimentar.

**Why P2**: Achados [P2] Materiais (4 achados agrupados por serem pequenos e correlatos).

**Acceptance Criteria**:

1. **REVERTIDO na implementação**: a ideia original (pluralizar "unidade"/"unidades" quando
   `unit === "un"`) quebrava a convenção existente de mostrar o `unit` cru salvo pelo usuário
   ("un", "pct" etc.) — um teste pré-existente (`staff-materiais.test.tsx`, "2 un") documentava
   esse comportamento como intencional. `unit` é texto livre (ver Out of Scope: vocabulário
   fechado fora de escopo); pluralizar só a abreviação "un" sem tocar as outras seria inconsistente
   e potencialmente confuso. Mantido `{stockQty} {unit}` sem alteração — achado não corrigido
   nesta rodada, nenhuma correção segura identificada sem decisão de produto sobre o campo `unit`
2. WHEN `/api/supplies/insights` falha THEN a coluna "Previsão" SHALL mostrar um indicador de erro
   (ex.: ícone + tooltip "Erro ao calcular previsão"), distinto de "—" (sem consumo)
3. WHEN o histórico renderiza uma saída (`type: "out"`) THEN a cor SHALL ser neutra (`bg-surface-2
   text-ink-2`), não `warning`/âmbar — saída de uso normal não é um alerta
4. WHEN o usuário submete `MovementForm` THEN SHALL haver uma confirmação (`ConfirmAction`) antes de
   enviar, nomeando tipo e quantidade

**Independent Test**: cada AC testado isoladamente — insights com erro mostra indicador; histórico
com saída não tem classe `warning`; submit do form abre confirmação antes do POST.

---

### P3: Prefixo R$ no preço

**User Story**: Como usuário, quero ver "R$" junto do campo de preço.

**Why P3**: Achado [P3] Procedimentos.

**Acceptance Criteria**:

1. WHEN o campo de preço renderiza (`ProcedureForm`, `SupplyForm`) THEN SHALL ter um prefixo visual
   "R$" ao lado do input (sem máscara de vírgula — ver Assumption)

**Independent Test**: inspecionar o prefixo "R$" presente ao lado do campo.

---

## Edge Cases

- WHEN um insumo tem `minQty: 0` E `stockQty: 0` (recém-criado) THEN NÃO SHALL aparecer no banner
  de estoque baixo nem no dashboard
- WHEN todos os itens do kit são removidos THEN SHALL continuar podendo salvar kit vazio
  (comportamento já existente, preservado)
- WHEN a busca client-side não encontra nada THEN SHALL mostrar mensagem de vazio distinta ("nenhum
  resultado para a busca" vs. "nenhum item cadastrado")

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| MAT-01 | P0: Zero mais grave que baixo | Implement | Pending |
| MAT-02 | P0: minQty 0 não alarma | Implement | Pending |
| PROC-03 | P1: Kit não opaco | Implement | Pending |
| PROC-02 / MAT-03-row | P1: Alvo de toque + hierarquia | Implement | Pending |
| PROC-04 | P2: KitForm sem duplicata/validação | Implement | Pending |
| PROC-05 / MAT-09 | P2: Busca/filtro/contagem | Implement | Pending |
| MAT-04 | P1: Alerta acionável | Implement | Pending |
| MAT-05 | P1: Saída > saldo falha antes | Implement | Pending |
| MAT-06 | P2: Feedback consistente (4 sub-ACs) | Implement | Pending |
| PROC-06 | P3: Prefixo R$ | Implement | Pending |

**Coverage:** 10 stories, 10 mapeados (execução direta, sem `tasks.md` formal), 0 sem mapeamento.

---

## Success Criteria

- [ ] `npm run typecheck`, `npm run lint`, `npm run check:sv`, `npm run test:coverage` (≥90%) verdes
- [ ] Nenhuma regressão nos testes existentes de `/procedimentos` e `/materiais`
- [ ] Issue #89 fechada via `Closes #89` no commit/PR
