# Faturamento e Relatórios — achados P0-P3 pontuais (issue #90) Specification

## Problem Statement

`docs/audits/auditoria-ux-2026-08.md` §5 (Faturamento e Relatórios). O P0 de KPIs somados no
cliente já foi corrigido pela Fase D (#73) — issue #90 confirma isso. Verificado no código antes
deste spec: **2 dos 3 P0 listados na issue já estão resolvidos** (cancelamento de fatura já tem
`ConfirmAction`; mobile já tem `overflow-x-auto`, herdado da Fase A). Resta o P0 real de Relatórios
(erro trava a tela em skeleton infinito) + P1-P3 selecionados.

## Goals

- [ ] Erro ao carregar `/relatorios` nunca mais trava a tela em "Carregando…" pra sempre
- [ ] Coluna "Valor" do faturamento alinhada à direita com números tabulares
- [ ] Filtros de status com semântica de toggle-group acessível
- [ ] Mês do relatório em pt-BR, com navegação ‹›, e comparação com o mês anterior
- [ ] Porcentagem localizada (vírgula decimal)
- [ ] Nenhuma seção do relatório some silenciosamente quando vazia
- [ ] Tabelas de relatório com linha de total
- [ ] `MetricCard` deixa de estar duplicado entre as duas páginas
- [ ] `check:sv` permanece verde

## Out of Scope

| Item | Reason |
| --- | --- |
| Filtro de período no Faturamento + KPIs por período (`GET /api/invoices/summary?from&to`) | O P0 original ("KPI errado") já foi resolvido de outra forma pela Fase D — o summary hoje soma **todas** as faturas, sem depender do filtro da lista. Adicionar período exigiria mudar `InvoiceRepository.summarize`, a rota de summary e a UI de período — o próprio audit doc encadeia isso em T1-T3 de uma vez; desproporcional a um ajuste pontual sem o P0 que o motivava |
| Gráficos em `/relatorios` (`ChartBar`/`ChartGrid`) | Feature nova de visualização, não ajuste pontual — mesmo padrão de exclusão do `HealingChart` em #88 |
| Drill-down pra Faturamento / exportar CSV / `@media print` em `/relatorios` | Feature nova (T10 do audit doc), não achado pontual |
| `TableCaption`/cabeçalho fixo no Faturamento | Gap conhecido da lib (`table-sticky-header`), infraestrutura cross-page — fora do escopo de um ajuste pontual |
| Achados de `/profissionais`/`/parceiros` (P0 comissão ausente, mobile) | Pertencem à issue #91, não a esta |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| P0 cancelamento sem confirmação | Nenhuma mudança — já tem `ConfirmAction` (`title="Cancelar fatura?"`) | Verificado no código antes do spec | y (verificado) |
| P0 mobile herdado do shell | Nenhuma mudança — tabela já tem `overflow-x-auto` (Fase A) | Verificado no código antes do spec | y (verificado) |
| Mês localizado sem trocar `<input type="month">` por date picker próprio | Mantém `<input type="month">` como fonte de verdade do valor (compatibilidade/acessibilidade nativa), mas o rótulo visível vira texto próprio formatado em pt-BR + botões ‹›/› que incrementam/decrementam o mês — mesmo padrão de `monthLabel` já usado em `/agenda` | O gap `month-period-picker` da lib não tem substituto pronto; reescrever o input é fora de escopo, mas o rótulo exibido é 100% controlável pelo app | n (default do agente, documentado) |
| Comparação com mês anterior | Busca `/api/reports?month=<mês-1>` em paralelo ao mês atual; mostra "+X% vs mês anterior" (ou "−X%") abaixo de cada `MetricCard`, sem termo quando o mês anterior não tem dado (`totalAppointments === 0` E nenhuma fatura) | Resolve "nenhum número tem comparação" com a mesma fonte de dado já existente (`GET /api/reports`), sem endpoint novo | n (default do agente, documentado) |
| `MetricCard` compartilhado | Extrai `src/components/metric-card.tsx` a partir do `MetricCard` de Relatórios (mais completo, já aceita `accent`); `BillingSummaryCards` do Faturamento passa a usá-lo | Resolve o P3 "duplicado, já divergindo" com o componente mais capaz dos dois | n (default do agente, documentado) |

**Open questions:** nenhuma — todas resolvidas ou registradas acima.

---

## User Stories

### P0: Erro em Relatórios não trava mais em skeleton infinito ⭐ MVP

**User Story**: Como usuário, quero ver uma mensagem de erro clara se `/relatorios` falhar ao
carregar, não um "Carregando…" que nunca termina.

**Why P0**: Achado [P0] Relatórios — `report` fica `null` pra sempre, `aria-live` em loop.

**Acceptance Criteria**:

1. WHEN `useApiQuery("/api/reports?month=...")` retorna `error` THEN a página SHALL renderizar
   `ErrorAlert` no lugar do `LoadingIndicator`, antes de checar `!report`

**Independent Test**: mockar `/api/reports` com falha; confirmar `ErrorAlert` visível e
`LoadingIndicator`/"Carregando…" ausente.

---

### P1: Valor alinhado à direita com números tabulares

**User Story**: Como usuário, quero comparar valores de fatura visualmente alinhados, como já
acontece em `/relatorios`.

**Why P1**: Achado [P1] Faturamento — "e ironicamente `/relatorios` acerta isso".

**Acceptance Criteria**:

1. WHEN a coluna "Valor" renderiza (cabeçalho e células) THEN SHALL usar `text-right` +
   `tabular-nums`

**Independent Test**: inspecionar classes do `TableHead`/`TableCell` de "Valor".

---

### P1: Filtros de status com semântica de toggle-group

**User Story**: Como usuário de leitor de tela, quero saber qual filtro de status está ativo.

**Why P1**: Achado [P1] Faturamento.

**Acceptance Criteria**:

1. WHEN os filtros de status renderizam THEN o container SHALL ter `role="group"` com
   `aria-label="Filtrar por situação"`
2. WHEN um filtro está ativo THEN seu botão SHALL ter `aria-pressed="true"`; os demais,
   `aria-pressed="false"`

**Independent Test**: inspecionar `role`/`aria-pressed` nos botões de filtro.

---

### P2: "Ações" explica sua ausência

**User Story**: Como usuário, quero entender por que a coluna "Ações" está vazia numa fatura paga.

**Why P2**: Achado [P2] Faturamento.

**Acceptance Criteria**:

1. WHEN `invoice.status !== "pending"` THEN a célula de ações SHALL mostrar "—" em vez de vazio

**Independent Test**: fatura paga renderiza "—" na coluna Ações.

---

### P1: Mês localizado com navegação

**User Story**: Como usuário, quero ver "Agosto de 2026", não "August 2026", e navegar com ‹›.

**Why P1**: Achado [P1] Relatórios.

**Acceptance Criteria**:

1. WHEN a página renderiza THEN o rótulo do mês visível SHALL estar em pt-BR ("Agosto de 2026")
2. WHEN o usuário clica em ‹ ou › THEN o mês SHALL mudar para o anterior/próximo, recarregando o
   relatório

**Independent Test**: renderizar com mês fixo; confirmar rótulo pt-BR; clicar ‹ e conferir novo
`month` na query.

---

### P1: Porcentagem localizada

**User Story**: Como usuário, quero ver "15,0%", não "15.0%".

**Why P1**: Achado [P1] Relatórios.

**Acceptance Criteria**:

1. WHEN a taxa de falta renderiza THEN SHALL usar `Intl.NumberFormat("pt-BR", { style: "percent",
   minimumFractionDigits: 1 })`

**Independent Test**: `noShowRate: 0.153` → texto contém "15,3%".

---

### P1: Comparação com o mês anterior

**User Story**: Como dona da clínica, quero saber se um número "melhorou ou piorou" vs. mês
passado, sem fazer conta de cabeça.

**Why P1**: Achado [P1] Relatórios.

**Acceptance Criteria**:

1. WHEN o relatório do mês atual e do mês anterior carregam THEN cada `MetricCard` de "Consultas no
   mês", "Recebido" e "A receber" SHALL mostrar um delta percentual vs. o mês anterior
2. WHEN o mês anterior não tem dado comparável (0 consultas E 0 faturamento) THEN o `MetricCard`
   SHALL omitir o delta, sem dividir por zero

**Independent Test**: mês atual com 10 consultas, anterior com 8 → delta "+25% vs mês anterior";
mês anterior zerado → sem delta.

---

### P1: Nenhuma seção some silenciosamente

**User Story**: Como usuário, quero ver uma mensagem quando "Produção por profissional" não tem
dado, não a seção inteira sumindo sem explicação.

**Why P1**: Achado [P1] Relatórios — duas convenções opostas hoje (seção some vs. `EmptyState`).

**Acceptance Criteria**:

1. WHEN `productionByProfessional.length === 0` THEN a seção SHALL renderizar com `EmptyState` em
   vez de não renderizar nada
2. WHEN `Object.keys(byStatus).length === 0` THEN "Consultas por status" SHALL renderizar
   `EmptyState` em vez de uma lista vazia sem mensagem

**Independent Test**: mês sem produção por profissional → seção visível com mensagem; mês sem
nenhuma consulta → "Consultas por status" mostra mensagem.

---

### P2: Tabelas de relatório com linha de total

**User Story**: Como usuário, quero ver o total de receita/margem/repasse sem somar manualmente.

**Why P2**: Achado [P2] Relatórios.

**Acceptance Criteria**:

1. WHEN "Receita e margem por procedimento" tem linhas THEN SHALL exibir uma linha de total
   (Receita, Insumos, Margem somados)
2. WHEN "Produção por profissional" tem linhas THEN SHALL exibir uma linha de total (Receita,
   Repasse somados)

**Independent Test**: 2 linhas de receita conhecidas → linha de total com a soma correta.

---

### P3: `MetricCard` compartilhado

**User Story**: Como desenvolvedor, quero um só componente de cartão de métrica, não dois
divergindo.

**Why P3**: Achado [P3] Relatórios.

**Acceptance Criteria**:

1. WHEN Faturamento e Relatórios renderizam seus cartões THEN ambos SHALL importar o mesmo
   `MetricCard` de `src/components/metric-card.tsx`

**Independent Test**: grep confirma import único, sem duplicação de definição.

---

## Edge Cases

- WHEN `/api/reports` do mês anterior falha (mas o mês atual carrega) THEN o relatório atual SHALL
  renderizar normalmente, só sem os deltas (falha isolada não trava a tela principal)
- WHEN o usuário navega ‹› rapidamente várias vezes THEN cada troca de mês SHALL disparar nova
  busca (comportamento padrão de `useApiQuery` por mudança de URL, sem debounce necessário — não é
  campo de texto)
- WHEN `revenueByProcedure`/`productionByProfessional` têm só 1 linha THEN a linha de total SHALL
  aparecer mesmo assim (soma de 1 item)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| REL-01 | P0: Erro não trava em skeleton | Implement | Pending |
| FAT-01 | P1: Valor alinhado + tabular-nums | Implement | Pending |
| FAT-02 | P1: Filtros toggle-group acessível | Implement | Pending |
| FAT-03 | P2: Ações explica ausência | Implement | Pending |
| REL-02 | P1: Mês localizado + navegação | Implement | Pending |
| REL-03 | P1: Porcentagem localizada | Implement | Pending |
| REL-04 | P1: Comparação com mês anterior | Implement | Pending |
| REL-05 | P1: Nenhuma seção some | Implement | Pending |
| REL-06 | P2: Linha de total | Implement | Pending |
| SHARED-01 | P3: MetricCard compartilhado | Implement | Pending |

**Coverage:** 10 stories, 10 mapeados (execução direta, sem `tasks.md` formal), 0 sem mapeamento.

---

## Success Criteria

- [ ] `npm run typecheck`, `npm run lint`, `npm run check:sv`, `npm run test:coverage` (≥90%) verdes
- [ ] Nenhuma regressão nos testes existentes de `/faturamento` e `/relatorios`
- [ ] Issue #90 fechada via `Closes #90` no commit/PR
