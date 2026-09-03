# Dashboard — achados P1-P3 pontuais (issue #86) Specification

## Problem Statement

`docs/audits/auditoria-ux-2026-08.md` §1 (Dashboard) lista achados P1-P3 que sobraram depois da
Fase A (#57-60, contrato de erro/AlertDialog/toast/shell responsivo) e da issue #85 (tooltip
PUSH/DET, já resolvida). Restam problemas de hierarquia de heading, erro de API mascarado como
"lista vazia" em 2 das 3 queries da página, ícone quebrando linha, KPIs mudos, breakpoint tardio do
grid, empty state pobre e Hero com respiro de página de marketing numa tela operacional.

## Goals

- [ ] Erro de API nunca renderiza como lista vazia em nenhuma das 3 queries do dashboard
- [ ] Hierarquia de heading válida (fila de triagem sai da faixa "Retornos pendentes")
- [ ] KPIs navegam para destino relevante; grid de 2 colunas ativa em `lg` (1024px), não `xl`
- [ ] `check:sv` permanece verde

## Out of Scope

| Item | Reason |
| --- | --- |
| KPI com período/comparação (ex.: "+12% vs mês passado") | Exige histórico agregado que não existe hoje (nenhuma tabela de snapshot mensal); é feature nova, não achado pontual — vira backlog próprio se o usuário priorizar |
| `/faturamento` com filtro por querystring (`?status=pending`) | Página não suporta filtro hoje; construir isso é feature de listagem nova, não ajuste pontual do dashboard (YAGNI) — KPI linka para a página sem filtro |
| P0-1/P0-2 (sidebar responsiva, `try/catch`+`AlertDialog` nas ações) | Já entregues pela Fase A (#57-60) — confirmado lendo `page.tsx` atual: `ConfirmAction` e `toast` já em uso em `resolveFollowUp`/`triage` |
| Tooltip PUSH/DET | Já entregue pela issue #85 — confirmado em `TriageQueue` (`Tooltip`/`TooltipContent` já presentes) |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Destino dos 4 KPIs | `paidCents`→`/faturamento`, `pendingCents`→`/faturamento`, `appointmentsInMonth`→`/agenda`, `pendingCount`→`/faturamento` | Sem filtro por querystring (ver Out of Scope), o destino possível é a página-mãe do dado — melhora sobre "texto morto" sem inventar feature de filtro | n (default do agente, documentado) |
| P3-1 "Hero com respiro de landing page" | Trocar `<Hero eyebrow title>` por `<h1 className="sv-display text-2xl font-bold">Dashboard</h1>`, igual a `/agenda` e `/pacientes` | Dashboard é a única página do staff usando `Hero` (grep confirmado); todas as outras usam `h1` direto — inconsistência é o próprio achado | n (default do agente, documentado) |
| P2-3 EmptyState "sem ícone/saída" | `EmptyState` ganha props opcionais `icon?: IconName` e `action?: {label, href}`; dashboard passa ícone contextual (`calendar`/`inbox`/`package`) e link de ação onde fizer sentido (ex.: "Nenhuma consulta hoje" → link para agenda) | Componente é compartilhado (`src/components/feedback.tsx`) — usado em várias páginas; props opcionais não quebram os outros call sites | n (default do agente, documentado) |

**Open questions:** nenhuma — todas resolvidas ou registradas acima.

---

## User Stories

### P1: Erro de API nunca vira "lista vazia" ⭐ MVP

**User Story**: Como recepcionista, quero ver um erro explícito quando a API de retornos ou de
materiais falha, em vez de "nenhum pendente"/"nenhum insumo baixo" — para não tratar indisponibilidade
como fato clínico/operacional.

**Why P1**: É o achado [P1-2] do audit doc, heurística 9 (nota 1) — falso "está tudo bem" é o pior
tipo de erro de UI numa tela clínica.

**Acceptance Criteria**:

1. WHEN `useApiQuery("/api/follow-ups?status=pending")` retorna `error` THEN o card "Retornos
   pendentes" SHALL renderizar `ErrorAlert` com `onRetry={refresh}` no lugar da lista/empty state
2. WHEN `useApiQuery("/api/supplies")` retorna `error` THEN o card "Estoque baixo" SHALL renderizar
   `ErrorAlert` com `onRetry={refresh}` no lugar da lista/empty state
3. WHEN `followUps`/`supplies` está `isLoading` (ainda sem `data` nem `error`) THEN o card
   correspondente SHALL renderizar `CardSkeleton`/`LoadingIndicator` em vez de tratar `undefined`
   como lista vazia
4. WHEN a query de `summary` (billing/appointments) falha THEN o comportamento atual (já correto,
   Fase A) SHALL ser preservado — este AC é regressão, não mudança

**Independent Test**: mockar `/api/follow-ups` e `/api/supplies` para 500 e ver `ErrorAlert` +
"Tentar novamente" em cada card, isolado do outro.

---

### P1: Fila de triagem em faixa própria, hierarquia de heading válida

**User Story**: Como enfermeira, quero que a fila de triagem clínica seja uma seção de topo
autônoma, não algo escondido dentro do card "Retornos pendentes" — para não perder o item quando o
card de retornos estiver vazio, e para o heading ler em ordem válida por leitor de tela.

**Why P1**: Achado [P1-1], heurística 4 (nota 2) e risco de acessibilidade (Sam): `<h3>` de
`TriageQueue` aparece antes do `<h2>` pai "Retornos pendentes".

**Acceptance Criteria**:

1. WHEN a página renderiza THEN `TriageQueue` SHALL ocupar uma faixa de largura total, acima do
   grid de KPIs — não mais aninhada dentro do card "Retornos pendentes"
2. WHEN `TriageQueue` está vazia (`queue.length === 0`) THEN SHALL continuar retornando `null` (sem
   mudança de comportamento aqui — só de posição)
3. WHEN o DOM é inspecionado THEN a ordem de headings SHALL ser: (nenhum h1 visível — substituído
   por `Hero`/novo `h1`, ver P3) → `h3` de "Fotos... triagem" (se presente) → `h2` "Consultas de
   hoje" → `h2` "Retornos pendentes" → `h2` "Estoque baixo", sem inversão

**Independent Test**: renderizar com fila de triagem não-vazia e confirmar via testing-library que
o heading da fila vem antes do heading "Retornos pendentes" no DOM, e que "Retornos pendentes" não
contém mais o card de triagem.

---

### P1: Chevron dos links não quebra linha

**User Story**: Como usuário, quero que "Ver agenda completa"/"Ver materiais" e o ícone fiquem na
mesma linha, sempre.

**Why P1**: Achado [P1-3] — defeito puro de CSS (`.sv-icon` sem `display`/`vertical-align`), gap
documentado da lib; correção no app é local e imediata.

**Acceptance Criteria**:

1. WHEN os links "Ver agenda completa" e "Ver materiais" renderizam THEN o texto e o `Icon
   name="chevron-right"` SHALL estar num wrapper `inline-flex items-center gap-1 whitespace-nowrap`

**Independent Test**: inspecionar классе no DOM renderizado (RTL) ou visualmente em viewport
estreito (390px) — o ícone nunca cai para a linha de baixo.

---

### P2: KPIs navegáveis e grid ativa em `lg`

**User Story**: Como recepcionista, quero clicar num KPI para ir à tela relacionada, e ver o layout
de 2 colunas já no notebook (1024-1279px), não só em telas grandes.

**Why P2**: Achados [P2-1] e [P2-2], heurísticas 7 e 8.

**Acceptance Criteria**:

1. WHEN um card de KPI renderiza THEN SHALL ser um `Link` (Next) para a rota do Assumption acima,
   com `aria-label` descritivo (ex.: "Ver faturas — Recebido no mês")
2. WHEN a viewport tem ≥1024px (`lg`) THEN o grid de "Consultas de hoje" + coluna direita SHALL
   ativar 2 colunas (troca `xl:grid-cols-2` → `lg:grid-cols-2`)

**Independent Test**: clicar num KPI e confirmar navegação; redimensionar para 1024px e confirmar
grid de 2 colunas via Playwright.

---

### P2: Empty state com ícone e saída

**User Story**: Como usuário, quero que um card vazio ("nenhuma consulta hoje" etc.) tenha um ícone
e, quando fizer sentido, uma ação — não só um parágrafo cinza.

**Why P2**: Achado [P2-3], heurística 8.

**Acceptance Criteria**:

1. WHEN `EmptyState` recebe `icon` THEN SHALL renderizar o `Icon` correspondente acima da mensagem
2. WHEN `EmptyState` recebe `action` THEN SHALL renderizar um link/botão com o `label` apontando
   para `href`
3. WHEN `EmptyState` é usado sem `icon`/`action` (outros call sites do app) THEN o comportamento
   atual (só mensagem) SHALL ser preservado — mudança é aditiva, não-quebra de compatibilidade

**Independent Test**: renderizar `EmptyState` com e sem as novas props; snapshot/RTL confirma
ambos os caminhos.

---

### P3: Título compacto, sem respiro de landing page

**User Story**: Como usuário do dia a dia, quero que o topo do dashboard tenha a mesma densidade
visual das outras telas operacionais (Agenda, Pacientes), não um `Hero` de página de marketing.

**Why P3**: Achado [P3-1] (segunda metade), heurística 10.

**Acceptance Criteria**:

1. WHEN a página renderiza THEN o topo SHALL usar `<h1 className="sv-display text-2xl
   font-bold">Dashboard</h1>` no lugar de `<Hero eyebrow="Visão geral" title="Dashboard" />`

**Independent Test**: inspecionar DOM — sem `sv-hero__eyebrow`, `h1` com texto "Dashboard" presente.

---

## Edge Cases

- WHEN `followUps` e `supplies` falham ao mesmo tempo THEN cada card SHALL mostrar seu próprio
  `ErrorAlert` independente (sem um card mascarar o erro do outro)
- WHEN `EmptyState` sem `icon`/`action` é usado em outra página (ex.: `/pacientes`) THEN SHALL
  continuar renderizando exatamente como hoje
- WHEN a viewport está abaixo de 1024px THEN o grid SHALL continuar em 1 coluna (comportamento
  `grid-cols-1` já existente, inalterado)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| DASH-01 | P1: Erro de API nunca vira lista vazia | Implement | Pending |
| DASH-02 | P1: Fila de triagem em faixa própria | Implement | Pending |
| DASH-03 | P1: Chevron não quebra linha | Implement | Pending |
| DASH-04 | P2: KPIs navegáveis + grid `lg` | Implement | Pending |
| DASH-05 | P2: Empty state com ícone/ação | Implement | Pending |
| DASH-06 | P3: Título compacto | Implement | Pending |

**Coverage:** 6 total, 6 mapeados (execução direta, sem `tasks.md` formal — escopo Medium), 0 sem
mapeamento.

---

## Success Criteria

- [ ] `npm run typecheck`, `npm run lint`, `npm run check:sv`, `npm run test:coverage` (≥90%) verdes
- [ ] Nenhuma regressão nos outros consumidores de `EmptyState`
- [ ] Issue #86 fechada via `Closes #86` no commit/PR
