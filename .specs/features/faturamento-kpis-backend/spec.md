# Faturamento: KPIs agregados no backend — Specification

## Problem Statement

Página `/faturamento` calcula "Total recebido" e "Total a receber" com `Array.reduce` sobre `invoices` — a página carregada via `usePagedQuery` (100 itens/página). Com filtro de status ou paginação ativos, os KPIs somam só o subconjunto visível, não o total real da clínica. Número financeiro incorreto exibido com aparência de confiável (Issue #73, `docs/audits/auditoria-ux-2026-08.md` §Financeiro).

Infra já existe: `InvoiceRepository.summarize(filter)` (domínio + Drizzle + in-memory) agrega no banco e é usado por `GetBillingSummary` no dashboard mensal (`/api/summary`). Falta expor endpoint dedicado para a página de faturamento e trocar o cálculo client-side pelo valor agregado.

## Goals

- [ ] KPIs "Total recebido" e "Total a receber" vêm de agregação no backend, corretos independentemente de paginação/filtro de status na tela.
- [ ] Endpoint dedicado reaproveita `InvoiceRepository.summarize` já existente e testado na camada de infra.

## Out of Scope

| Feature | Reason |
| ------- | ------ |
| Filtro de período (from/to) nos KPIs da página de faturamento | Página atual não tem seletor de data; fora do pedido da issue |
| Alterar comportamento do dashboard `/api/summary` | Já correto (usa `GetBillingSummary`), não é alvo da issue |
| Escopar KPI pelo filtro de status da lista | KPIs são "recebido" (paid) x "a receber" (pending) por definição — já segmentados por status; aplicar o filtro de status por cima removeria um dos dois cartões quando o outro status estiver selecionado, o que contradiz "total real" |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Escopo temporal do KPI | Todas as faturas da clínica (sem `from`/`to`) — totais all-time | Página não oferece filtro de data; "total real" da issue = total real, não total do mês | n (assumption, log) |
| Novo endpoint vs. reuso de `/api/summary` | Novo endpoint `GET /api/invoices/summary` | `/api/summary` é mensal e mistura agendamentos; faturamento precisa de totais all-time só de faturas — reaproveita `InvoiceRepository.summarize` mas via novo use case fino, não o `GetBillingSummary` (que exige `from`/`to`) | n (assumption, log) |
| Rótulos dos cartões | Trocar "(lista atual)" por texto que não implique escopo de lista, ex. "Total recebido" / "Total a receber" | O texto atual descreve exatamente o bug (soma da lista); mantê-lo após o fix seria enganoso | n (assumption, log) |

**Open questions:** none — resolvidas acima.

---

## User Stories

### P1: KPI de faturamento reflete total real da clínica ⭐ MVP

**User Story**: Como recepcionista, quero que os cartões de "Total recebido" e "Total a receber" mostrem o valor real de todas as faturas, não só da página/filtro atual, para confiar no número ao fechar o caixa.

**Why P1**: É o bug relatado — número financeiro errado exibido como confiável.

**Acceptance Criteria**:

1. WHEN a página `/faturamento` carrega THEN o frontend SHALL buscar os totais via `GET /api/invoices/summary` (não via soma client-side de `invoices`).
2. WHEN existem mais faturas do que uma página (`PAGE_SIZE=100`) THEN `paidCents` e `pendingCents` retornados pelo endpoint SHALL somar TODAS as faturas pagas/pendentes da clínica, não apenas as carregadas na tela.
3. WHEN o filtro de status da lista (`STATUS_FILTERS`) é alterado THEN os KPIs SHALL permanecer inalterados (não dependem do filtro de status da lista).
4. WHEN não há sessão de staff autenticada THEN `GET /api/invoices/summary` SHALL retornar 401/403 (mesmo guard de `requireStaffSession` usado em `/api/invoices`).
5. WHEN não há faturas na clínica THEN o endpoint SHALL retornar `paidCents: 0`, `pendingCents: 0` (sem erro).

**Independent Test**: Criar >100 faturas (mais que `PAGE_SIZE`) via seed/teste, algumas pagas e outras pendentes; chamar `GET /api/invoices/summary`; comparar com soma manual de todas — deve bater exatamente, mesmo que a lista paginada mostre só 100.

---

## Edge Cases

- WHEN clínica tem faturas canceladas THEN elas SHALL ser excluídas de `paidCents` e `pendingCents` (já é o comportamento de `summarize`, que separa `cancelledCount`).
- WHEN multi-tenant (mais de uma clínica) THEN o summary SHALL ser escopado por `clinicId` da sessão, igual à listagem (`getRepositories({ clinicId })`).

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| FIN-01 | P1 | Implementing | Pending |
| FIN-02 | P1 | Implementing | Pending |
| FIN-03 | P1 | Implementing | Pending |
| FIN-04 | P1 | Implementing | Pending |
| FIN-05 | P1 | Implementing | Pending |

**Coverage:** 5 total, 5 mapped to implementation, 0 unmapped.

---

## Success Criteria

- [ ] `GET /api/invoices/summary` retorna totais corretos mesmo com >`PAGE_SIZE` faturas.
- [ ] Página `/faturamento` não soma mais `invoices` no cliente para os KPIs.
- [ ] Teste de API cobre o caso >100 faturas provando que a soma bate com o real (regressão do bug).
- [ ] `npm run typecheck`, `npm run lint`, `npm run test` passam; cobertura ≥90% mantida.
