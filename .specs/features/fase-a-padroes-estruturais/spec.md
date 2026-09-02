# Fase A — Padrões Estruturais (issues #57–#60) Specification

## Problem Statement

A auditoria UX 2026-08 (`docs/audits/auditoria-ux-2026-08.md`) aponta 4 padrões estruturais recorrentes em 9+ superfícies do app — erro/vazio indistinguíveis, sidebar sem off-canvas mobile, ações destrutivas sem confirmação, escritas sem feedback de sucesso — como causa-raiz de dezenas de achados pontuais. Corrigir os 4 padrões de uma vez, na base, evita retrabalho tela por tela nas fases seguintes de correção.

## Goals

- [ ] `useApiQuery` expõe `isLoading` distinto de `error` distinto de `data` vazio; toda página que hoje confunde erro com "nenhum registro" migra pro contrato novo.
- [ ] Nenhuma tabela/tela interna do staff força scroll horizontal da página inteira em mobile; sidebar já off-canvas (lib) confirmada como suficiente.
- [ ] As ~15 ações destrutivas/irreversíveis levantadas na auditoria passam por `AlertDialog` com copy nomeando a consequência real antes de executar.
- [ ] Toda mutação (POST/PATCH/DELETE) bem-sucedida nas páginas staff/portal que hoje não dão feedback nenhum passa a mostrar toast de sucesso, via padrão único reaproveitável.

## Out of Scope

| Item | Razão |
| --- | --- |
| Reescrever cache do `useApiQuery` pra compartilhado entre componentes (L-008) | Fora do escopo desta fase; contrato de 3 estados não depende de cache compartilhado. Fica registrado como débito técnico separado. |
| Toast de sucesso em login/definir-senha/esqueci-senha | Decisão do usuário: redirect no sucesso já comunica o resultado; sem toast nessas 3 telas. |
| Adicionar ação de "reabrir" em condição/plano de cuidados resolvidos | A auditoria aponta a ausência, mas é mudança de regra de negócio, não só de confirmação — issue separada. |
| Corrigir alvos de toque <44px, contraste, ARIA (achados pontuais de acessibilidade) | Pertence às fases B/C de correção pontual por superfície, não ao padrão estrutural. |
| Migrar toda paginação/filtro para um componente único | Não é um dos 4 padrões estruturais listados nas issues #57–60. |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Escopo do toast de sucesso (#60) | Só as 4 telas hoje sem nenhum feedback: `pacientes/page.tsx`, `configuracoes/page.tsx`, `portal/patient-view.tsx`, `portal/consent-card.tsx`. Auth (login/definir-senha/esqueci-senha) fica fora. | Usuário confirmou via pergunta direta. | y |
| Copy do AlertDialog (#59) | Específica por ação, nomeando a consequência real (ex.: "resolver" trava evolução clínica permanentemente, sem reabrir; excluir foto remove evidência clínica). | Usuário confirmou; auditoria já apontou que copy genérica é insuficiente. | y |
| Breakpoint do shell mobile (#58) | Mantém o breakpoint padrão da lib (`1024px`, já configurado em `SidebarProvider`/`staff-layout-client.tsx`) — não é reconfigurado. | Sidebar já é off-canvas via `@still-void/ui` (`defaultOpen={false}`, `SidebarTrigger` visível `lg:hidden`); gap real é scroll horizontal de tabelas, não o shell em si. | y (verificado no código, não precisa perguntar) |
| Lista de ~15 ações destrutivas (#59) | Levantada diretamente do texto da auditoria (linhas 19, 87, 281 de `auditoria-ux-2026-08.md`) — ver tabela na seção Design/Tasks. Nenhuma ação nova sem confirmação será adicionada sem essa lista ser atualizada. | Auditoria já enumerou; não há ambiguidade a resolver com o usuário. | y |
| `useApiQuery` (#57): forma do novo estado | Adiciona `isLoading: boolean` ao retorno; mantém `data`/`error`/`refresh`. Nenhuma mudança de assinatura que quebre chamadas existentes além de consumir o novo campo. | Menor mudança possível que resolve a ambiguidade "carregando" vs "vazio" vs "erro"; evita reescrever cache (fora de escopo). | y |
| Página com erro mascarado como "sem dado" mais grave (Prontuário) | Tratada como caso P1 dentro da história 1 (não issue separada). | A própria issue #57 cita esse caso como motivador principal. | y |

**Open questions:** nenhuma — todas resolvidas ou registradas acima.

---

## User Stories

### P1: Contrato de erro de 3 estados no `useApiQuery` ⭐ MVP

**User Story**: Como profissional de saúde usando o Prontuário (ou qualquer tela que consome API), quero que erro de rede/servidor seja visualmente distinto de "nenhum registro encontrado", para não confundir falha técnica com ausência real de dado clínico.

**Why P1**: É a causa-raiz mais grave — erro mascarado como ausência de dado clínico é um risco de segurança do paciente, não só UX.

**Acceptance Criteria**:

1. WHEN `useApiQuery` está buscando dados pela primeira vez (ou via `refresh`) THEN o hook SHALL retornar `isLoading: true` e `data`/`error` inalterados até a resposta chegar.
2. WHEN a chamada de API falha (4xx, 5xx, erro de rede) THEN o hook SHALL retornar `error` com mensagem acionável, `isLoading: false`, e a página consumidora SHALL renderizar um estado de erro visualmente distinto de "lista vazia" (nunca `EmptyState` genérico).
3. WHEN a chamada de API retorna sucesso com array/objeto vazio THEN a página SHALL renderizar `EmptyState`, nunca a UI de erro.
4. WHEN a página do Prontuário (evoluções, condições, planos de cuidado, fotos) recebe erro 4xx/5xx da API THEN ela SHALL exibir mensagem de erro acionável (com opção de tentar novamente via `refresh`), nunca "nenhum registro".
5. WHEN uma página hoje trata erro como lista vazia (identificada por consumir `useApiQuery` sem checar `error`) THEN ela SHALL ser migrada para checar `error` antes de `data`.

**Independent Test**: Mockar `apiFetch` retornando erro 500 numa página migrada (ex. evoluções do Prontuário) e verificar que a tela mostra mensagem de erro, não "nenhuma evolução registrada".

---

### P1: Sidebar/shell sem scroll horizontal em mobile ⭐ MVP

**User Story**: Como usuário do staff em celular, quero navegar por todas as telas internas sem precisar rolar a página inteira na horizontal, para conseguir operar o sistema em campo.

**Why P1**: A auditoria classifica o app como praticamente inutilizável em mobile na maioria das telas internas — bloqueia uso real fora do desktop.

**Acceptance Criteria**:

1. WHEN o viewport é mobile (abaixo de `1024px`, breakpoint já usado pelo `SidebarProvider`) THEN a sidebar SHALL permanecer off-canvas/drawer (comportamento já existente — apenas confirmado por teste, não reimplementado).
2. WHEN uma tabela larga é renderizada em qualquer página do staff (`faturamento`, `relatorios`, `profissionais`, `pacientes`, `parceiros`, `auditoria`, `procedimentos`, `configuracoes`, `materiais`, e as páginas de documento `plano-cuidados/[carePlanId]`, `relatorio/[conditionId]`) THEN a tabela SHALL estar envolta em um container com `overflow-x-auto`, de modo que o scroll horizontal fique contido na tabela, nunca na página.
3. WHEN o usuário interage com o `SidebarTrigger` ou outros controles do shell (logo, trigger, itens de navegação) em mobile THEN a área de toque SHALL ter no mínimo 44×44px.
4. WHEN a página é carregada em viewport de 375px de largura (mobile comum) THEN `document.documentElement.scrollWidth` SHALL ser igual à largura do viewport (sem overflow horizontal da página).

**Independent Test**: Rodar Playwright com viewport 375×667 em cada uma das 11 páginas listadas e verificar ausência de scroll horizontal na página + presença de `overflow-x-auto` no wrapper da tabela.

---

### P1: `AlertDialog` em todas as ações destrutivas/irreversíveis ⭐ MVP

**User Story**: Como usuário do staff ou portal, quero ser avisado da consequência real antes de uma ação irreversível (excluir, resolver, cancelar), para não perder dado clínico ou operacional por engano.

**Why P1**: Ação destrutiva sem confirmação é o padrão estrutural com maior risco (perda de dado clínico), citado em ~15 pontos do app.

**Acceptance Criteria**:

1. WHEN o usuário aciona qualquer uma das ~15 ações destrutivas/irreversíveis listadas em Design (desativar paciente/profissional/parceiro/procedimento, cancelar fatura, resolver condição, resolver plano de cuidados, excluir foto clínica, cancelar retorno, antecipar retorno, revogar consentimento, remover material, etc.) THEN o sistema SHALL abrir um `AlertDialog` do `@still-void/ui` antes de executar a ação, nomeando a consequência específica daquela ação (ex.: "trava a evolução permanentemente, sem opção de reabrir").
2. WHEN o usuário confirma no `AlertDialog` THEN a ação SHALL executar exatamente como hoje (mesma chamada de API).
3. WHEN o usuário cancela ou fecha o `AlertDialog` (Esc, clique fora, botão cancelar) THEN nenhuma chamada de API SHALL ser disparada.
4. WHEN uma ação destrutiva nova for adicionada ao produto sem `AlertDialog` THEN isso SHALL exigir justificativa registrada (comentário ou ADR), não silêncio.

**Independent Test**: Clicar em "Excluir foto" numa condição do Prontuário, ver o `AlertDialog` com a copy específica, cancelar e confirmar que a foto continua lá; repetir confirmando e ver a foto removida.

---

### P1: Feedback de sucesso (toast) após toda ação de escrita ⭐ MVP

**User Story**: Como usuário do staff ou portal, quero uma confirmação visual sempre que uma ação de criar/editar/excluir dá certo, para saber que a ação realmente aconteceu.

**Why P1**: "Nenhuma escrita confirma hoje" é citado como recorrente em todas as seções da auditoria; usuário repete ações por incerteza.

**Acceptance Criteria**:

1. WHEN uma mutação (POST/PATCH/DELETE) é bem-sucedida nas páginas `pacientes/page.tsx`, `configuracoes/page.tsx`, `portal/patient-view.tsx`, `portal/consent-card.tsx` THEN o sistema SHALL disparar um toast de sucesso via `useToast` (`@still-void/ui`), reaproveitando o padrão já usado nas 14 páginas que já têm toast (`faturamento`, `parceiros`, `anamnesis-section`, etc.).
2. WHEN uma mutação falha THEN o toast SHALL usar `variant="danger"` com a mensagem de erro (não silenciar).
3. WHEN uma mutação é bem-sucedida THEN o toast SHALL usar `variant="success"`.
4. WHEN o padrão de toast for aplicado numa página nova THEN ele SHALL reusar a mesma função/hook central (não implementação ad-hoc divergente da já existente).

**Independent Test**: Editar um paciente em `pacientes/page.tsx`, salvar, e ver toast de sucesso aparecer; forçar erro 500 e ver toast de erro.

---

## Edge Cases

- WHEN `useApiQuery` recebe `url === null` (query condicional, ex. aguardando param) THEN SHALL continuar retornando `isLoading: false, data: null, error: null` (não é nem loading nem erro — comportamento atual preservado).
- WHEN o `AlertDialog` é aberto e a ação subjacente falha após confirmação THEN o toast de erro (história 4) SHALL disparar normalmente — as duas histórias compõem, não competem.
- WHEN uma tabela é vazia (0 registros) THEN a checagem de `overflow-x-auto` continua válida (wrapper sempre presente, independente de ter linhas).
- WHEN dois toasts disparam em sequência rápida (ex. duas mutações) THEN o comportamento de fila/max do `ToastProvider` (já configurado em `providers.tsx`) SHALL ser o padrão da lib, sem mudança nesta fase.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| FASEA-01 | P1: Contrato de erro 3 estados | Design | Pending |
| FASEA-02 | P1: Contrato de erro 3 estados | Design | Pending |
| FASEA-03 | P1: Contrato de erro 3 estados | Design | Pending |
| FASEA-04 | P1: Contrato de erro 3 estados | Design | Pending |
| FASEA-05 | P1: Contrato de erro 3 estados | Design | Pending |
| FASEA-06 | P1: Shell mobile sem scroll horizontal | Design | Pending |
| FASEA-07 | P1: Shell mobile sem scroll horizontal | Design | Pending |
| FASEA-08 | P1: Shell mobile sem scroll horizontal | Design | Pending |
| FASEA-09 | P1: Shell mobile sem scroll horizontal | Design | Pending |
| FASEA-10 | P1: AlertDialog em ações destrutivas | Design | Pending |
| FASEA-11 | P1: AlertDialog em ações destrutivas | Design | Pending |
| FASEA-12 | P1: AlertDialog em ações destrutivas | Design | Pending |
| FASEA-13 | P1: AlertDialog em ações destrutivas | Design | Pending |
| FASEA-14 | P1: Toast de sucesso em escritas | Design | Pending |
| FASEA-15 | P1: Toast de sucesso em escritas | Design | Pending |
| FASEA-16 | P1: Toast de sucesso em escritas | Design | Pending |
| FASEA-17 | P1: Toast de sucesso em escritas | Design | Pending |

**Coverage:** 17 total, 0 mapped to tasks (pending Design/Tasks phase), 0 unmapped ⚠️ (all mapped to stories above)

---

## Success Criteria

- [ ] `useApiQuery` expõe `isLoading`; Prontuário (evoluções/condições/planos/fotos) nunca mais mostra "nenhum registro" para erro 4xx/5xx (coberto por teste).
- [ ] Zero das 11 páginas com tabela larga produz scroll horizontal de página em viewport 375px (coberto por teste Playwright).
- [ ] As ~15 ações destrutivas levantadas passam por `AlertDialog` com copy específica; nenhuma dispara API sem confirmação (coberto por teste).
- [ ] As 4 páginas hoje sem feedback (`pacientes`, `configuracoes`, `portal/patient-view`, `portal/consent-card`) mostram toast de sucesso/erro em toda mutação (coberto por teste).
- [ ] `npm run typecheck`, `npm run lint`, `npm run check:sv`, `npm test` (≥90% cobertura) e `npm run test:e2e` passam.
