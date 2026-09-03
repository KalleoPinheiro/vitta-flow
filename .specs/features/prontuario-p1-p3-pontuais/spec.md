# Prontuário — achados P1-P3 pontuais (issue #88) Specification

## Problem Statement

`docs/audits/auditoria-ux-2026-08.md` §3 (Pacientes e Prontuário) — superfície de maior risco
clínico da auditoria. Os P0 (erro/vazio indistinguível, perda de SOAP ao trocar de aba, complicações
gravadas e nunca exibidas, ações irreversíveis sem confirmação, mobile da lista) já foram entregues
pela Fase A (#57-60) e Fase B (#61-68) — confirmado lendo o código atual: `useApiQuery` já expõe
`error`/`isLoading` nas 4 seções clínicas, `useDirtyTabGuard` já bloqueia troca de aba com SOAP
sujo, `complicationsCellText` já renderiza `complicationCodes`, `ConfirmAction` já cobre resolver
condição/plano e excluir foto, `Desativar` da lista já pede confirmação. Restam os P1-P3 abaixo.

## Goals

- [ ] Lista de pacientes: alvo de toque e hierarquia nas ações da linha; lista não fica obsoleta
      durante a busca; contraste da linha inativa; estado vazio distingue base vazia de busca sem
      resultado
- [ ] Prontuário: contador de aba conta só itens ativos; SOAP exibido em blocos rotulados, campo
      vazio marcado explicitamente; tira de fotos corre na mesma direção da comparação acima; valor
      clínico anormal (dor alta, complicação) ganha destaque visual; aba é endereçável por URL
      (`?aba=`); formulários de avaliação usáveis em 390px; toda escrita confirma com toast; lista
      de evoluções não cresce sem limite; aba "Pacotes" visualmente separada das clínicas
- [ ] `check:sv` permanece verde

## Out of Scope

| Item | Reason |
| --- | --- |
| **[R9]** `HealingChart` com escalas separadas + marcadores por forma | O próprio audit doc trata isso como task própria (T13) do plano de ação — rework real de biblioteca de gráfico (eixos Y independentes por escala, encoding por forma além de cor), não ajuste pontual. Recomendo issue própria se o usuário priorizar |
| **[R11]** Aba padrão vira "Resumo" somente-leitura | É uma tela nova (agregação read-only do estado do paciente), não um ajuste da tela existente — desproporcional a um achado "pontual"; o plano de ação do audit doc já trata isso como task própria (T10) dentro de uma feature maior |
| **[R12]** Seletor de profissional permite assinar em nome de outro | **Não está na lista de achados da issue #88** (o audit doc o descreve como "falta de ética/problema legal, não questão de UX") — fora do pedido, não expandir escopo |
| **[P0-L1, P0-R1..R5]** Achados P0 desta superfície | Já entregues pela Fase A/B — confirmado no código antes de escrever este spec (ver Problem Statement) |
| Visão de dia/agrupamento avançado da lista de evoluções (R16) | Escopo restrito a um teto simples com "ver mais" (client-side, sem paginação nova) — filtro/agrupamento por data é feature maior, YAGNI sem pedido explícito |
| Endpoint de contagem total para a lista de pacientes (parte de L5) | Paginação é por cursor (issue #75), sem total — expor contagem exigiria endpoint novo; a mensagem de vazio já resolve a ambiguidade citada no achado sem precisar de contagem |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| L2 hierarquia/alvo de toque | "Prontuário" continua link mas em `font-semibold`; "Editar"/"Desativar"/"Reativar" viram `Button variant="ghost" size="sm"` (mesmo padrão da Fase A para ações menores) | Sem `Button size="xs"` no catálogo (gap conhecido, `docs/still-void-gaps.md`), `size="sm"` é o menor com alvo de toque ≥24px real | n (default do agente, documentado) |
| L3 lista obsoleta durante busca | `useCursorPagedQuery` ganha `isLoading` (mesmo padrão de `useApiQuery`); `PatientsTable` recebe `aria-busy` + opacidade reduzida (`opacity-60 pointer-events-none`) enquanto uma nova busca está em voo, sem apagar a lista antiga (evita flash) | Apagar a lista component causaria layout shift a cada tecla digitada; sinalizar "desatualizado, aguarde" resolve o risco de clique errado sem regressão de UX | n (default do agente, documentado) |
| L4 contraste da linha inativa | Troca `opacity-50` (afeta contraste de todo o texto da linha) por `bg-surface-2/60` (tinge o fundo, texto mantém contraste total) — `StatusBadge` "Inativo" já é o sinal semântico principal | `opacity-50` em cima de texto reduz o contraste efetivo abaixo de 4.5:1 (achado original); mudar pra fundo preserva a legibilidade do nome do paciente | n (default do agente, documentado) |
| R6 "ativo vs resolvido" | Contador do rótulo da aba conta só `status === "active"` pra `condicoes` e `planoCuidados`; `evolucoes` continua contando o total (não tem estado resolvido/ativo — é log imutável) | `ConditionDto`/`CarePlanDto` já têm campo `status`; evolução não tem análogo | n (default do agente, documentado) |
| R7 "campo vazio some sem rastro" | Cada campo SOAP vira bloco rotulado (`dt`/`dd` em `grid`, não mais inline); campo vazio renderiza `"— não preenchido —"` em `text-ink-3 italic` em vez de sumir | Resolve os dois achados (parágrafo corrido + campo indistinguível de "não perguntado") na mesma revisão de markup | n (default do agente, documentado) |
| R13 "hierarquia pra dado anormal" | `painScale >= 7` → célula em `font-semibold text-danger`; `complicationsCellText` não-vazio → célula em `font-semibold text-danger`. Sem módulo `clinical-severity.ts` novo (audit doc sugere um, mas 2 regras isoladas não justificam abstração — YAGNI) | Cobre a hierarquia pedida sem inventar uma camada de domínio nova pra 2 comparações | n (default do agente, documentado) |
| R14 "formulário quebra no mobile" | Só os `grid-cols-3`/`grid-cols-2` sem breakpoint do `AssessmentForm`/`DetDomainInputs` ganham `grid-cols-1 sm:grid-cols-3` (etc.) — tabelas já têm `overflow-x-auto` da Fase A, não mexo nelas de novo | O achado original citava "tabela de 9 colunas E formulários em grade fixa"; a tabela já está resolvida, só o formulário ficou pra trás | n (default do agente, documentado) |

**Open questions:** nenhuma — todas resolvidas ou registradas acima.

---

## User Stories

### P1: Contador de aba conta só itens ativos ⭐ MVP

**User Story**: Como enfermeira, quero que "Estomias e feridas (3)" conte só condições em
acompanhamento, não condições já resolvidas — para não pensar que há mais pendência do que existe.

**Why P1**: Achado [P1-R6].

**Acceptance Criteria**:

1. WHEN a aba "Estomias e feridas" renderiza THEN o contador SHALL ser `conditions.filter(c =>
   c.status === "active").length`
2. WHEN a aba "Plano de Cuidados" renderiza THEN o contador SHALL ser `carePlans.filter(p => p.status
   === "active").length`
3. WHEN a aba "Evoluções" renderiza THEN o contador SHALL continuar sendo o total (sem mudança —
   evolução não tem status ativo/resolvido)

**Independent Test**: montar `conditions` com 2 ativas + 1 resolvida, confirmar rótulo "(2)".

---

### P1: SOAP em blocos rotulados, campo vazio visível

**User Story**: Como enfermeira lendo o histórico, quero ver S/O/A/P como blocos distintos, e saber
quando um campo não foi preenchido (não que ele "sumiu").

**Why P1**: Achado [P1-R7].

**Acceptance Criteria**:

1. WHEN uma evolução renderiza THEN cada um dos 4 campos SOAP SHALL aparecer em bloco próprio
   (rótulo completo, não só a inicial, em linha separada do conteúdo)
2. WHEN um campo SOAP está vazio (`null`/string vazia) THEN SHALL renderizar `"— não preenchido —"`
   em vez de omitir o bloco

**Independent Test**: renderizar evolução com só `plan` preenchido; confirmar que os 4 rótulos
aparecem e S/O/A mostram "— não preenchido —".

---

### P1: Tira cronológica de fotos na mesma direção da comparação

**User Story**: Como enfermeira, quero que a tira de fotos abaixo do "Primeira × Atual" corra na
mesma direção (mais antiga → mais recente), não ao contrário.

**Why P1**: Achado [P1-R8].

**Acceptance Criteria**:

1. WHEN a galeria de fotos renderiza com 2+ fotos THEN a tira SHALL usar a mesma ordem cronológica
   (mais antiga primeiro) já usada no par de comparação acima

**Independent Test**: 3 fotos com datas distintas; confirmar que a ordem de renderização da tira
bate com `chronological` (crescente por `createdAt`).

---

### P1: Aba endereçável por URL

**User Story**: Como enfermeira, quero poder mandar um link "veja a aba de evoluções da Maria" que
abre direto naquela aba.

**Why P1**: Achado [P1-R10] — parte de deep-link; a parte de ARIA/teclado já foi resolvida pela
issue #85 (migração pra `Tabs` do `@still-void/ui`, Radix já dá `role="tablist"`, `aria-selected` e
navegação por teclado de graça — confirmado lendo `page.tsx` atual).

**Acceptance Criteria**:

1. WHEN a página carrega com `?aba=evolucoes` na URL THEN a aba inicial SHALL ser "Evoluções" em
   vez do padrão "Anamnese"
2. WHEN o usuário troca de aba (sem bloqueio do guard de "descartar alterações") THEN a URL SHALL
   atualizar para `?aba=<chave>` via `router.replace` (sem novo entry no histórico, sem scroll)
3. WHEN `?aba=` tem um valor que não é uma chave válida THEN SHALL cair no padrão "Anamnese" sem
   erro

**Independent Test**: montar a página com `useSearchParams` mockado retornando `aba=evolucoes`,
confirmar que `TabsContent` inicial é o de evoluções.

---

### P2: Dado clínico anormal com destaque visual

**User Story**: Como enfermeira, quero que dor 9/10 e uma complicação registrada saltem aos olhos
na tabela de avaliações, não tenham o mesmo peso de "área 4mm²".

**Why P2**: Achado [P2-R13].

**Acceptance Criteria**:

1. WHEN `painScale >= 7` THEN a célula "Dor" SHALL renderizar em `font-semibold text-danger`
2. WHEN `complicationsCellText` não é `"—"` THEN a célula "Complicações" SHALL renderizar em
   `font-semibold text-danger`
3. WHEN `painScale < 7` ou complicações vazio THEN a célula SHALL manter o estilo padrão atual

**Independent Test**: avaliação com `painScale: 9` e `complicationCodes: ["prolapse"]`; confirmar
`font-semibold text-danger` nas 2 células; avaliação sem essas condições mantém estilo normal.

---

### P2: Formulário de avaliação usável em 390px

**User Story**: Como enfermeira registrando uma avaliação no leito pelo celular, quero que os campos
numéricos empilhem em vez de espremer 3 colunas numa tela de 390px.

**Why P2**: Achado [P2-R14] (parte — tabela já resolvida pela Fase A).

**Acceptance Criteria**:

1. WHEN `AssessmentForm` renderiza os campos C×L×P (ferida) THEN o grid SHALL ser `grid-cols-1
   sm:grid-cols-3` em vez de `grid-cols-3` fixo
2. WHEN `AssessmentForm` renderiza tecido/exsudato THEN o grid SHALL ser `grid-cols-1 sm:grid-cols-2`
3. WHEN `DetDomainInputs` (escala DET) renderiza THEN o grid pai (fieldset) SHALL ser `grid-cols-1
   sm:grid-cols-3`

**Independent Test**: snapshot/RTL confirma as classes responsivas nos 3 grids.

---

### P2: Toda escrita confirma com toast

**User Story**: Como enfermeira, quero um retorno visível toda vez que salvo algo, mesmo quando o
modal já fechou.

**Why P2**: Achado [P2-R15]. **SPEC_DEVIATION descoberta na implementação**: a leitura inicial do
código (antes de escrever este spec) sugeriu que `ConditionForm` não tinha `toast` de sucesso — na
hora de implementar, a linha `toast({ description: "Condição registrada", variant: "success" })`
já existia (`conditions-section.tsx`). Rechecando as demais 6+ escritas do prontuário
(`AnamnesisSection`, `EvolutionsSection`, `ConditionPhotos` upload/exclusão, `CarePlansSection` — 6
call sites), **todas já tinham `toast`**. O achado do audit doc (2026-08) não reproduz mais no
código atual — provavelmente corrigido incidentalmente por Fase A/B. Nenhuma mudança de código
necessária para esta AC.

**Acceptance Criteria**:

1. WHEN `ConditionForm` salva com sucesso THEN SHALL disparar toast de sucesso — **já satisfeito no
   código atual, verificado, sem mudança**

**Independent Test**: não aplicável — comportamento já coberto por teste existente (nenhum teste
novo necessário).

---

### P3: Lista de evoluções com teto

**User Story**: Como enfermeira, quero ver as evoluções mais recentes primeiro e não rolar 2 anos de
histórico numa lista só.

**Why P3**: Achado [P3-R16] (parte — sem filtro/agrupamento, ver Out of Scope).

**Acceptance Criteria**:

1. WHEN há mais de 10 evoluções THEN a lista SHALL mostrar só as 10 mais recentes por padrão, com
   um botão "Ver mais" que revela o restante (client-side, sem nova chamada de API)
2. WHEN há 10 ou menos evoluções THEN SHALL mostrar todas, sem o botão

**Independent Test**: 15 evoluções mockadas; confirmar 10 renderizadas + botão "Ver mais"; clicar e
confirmar as 15.

---

### P3: Aba "Pacotes" separada visualmente

**User Story**: Como usuário, quero que a aba financeira "Pacotes" não pareça mais uma aba clínica
entre as outras.

**Why P3**: Achado [P3-R17].

**Acceptance Criteria**:

1. WHEN a lista de abas renderiza THEN "Pacotes" SHALL ter `className="ml-auto"` no `TabsTrigger`,
   empurrando-a visualmente pra direita, separada das 4 abas clínicas

**Independent Test**: inspecionar a classe do `TabsTrigger` de "Pacotes".

---

### P1: Lista de pacientes não fica obsoleta durante a busca

**User Story**: Como recepcionista digitando uma busca, quero saber que a lista na tela está
desatualizada enquanto o servidor responde, pra não clicar em "Prontuário" de um resultado da busca
anterior.

**Why P1**: Achado [P1-L3] — risco de abrir o prontuário errado.

**Acceptance Criteria**:

1. WHEN `useCursorPagedQuery` está buscando a 1ª página de uma nova `baseUrl` (busca mudou) THEN
   SHALL expor `isLoading: true`
2. WHEN `isLoading` é `true` e já existe uma lista anterior renderizada THEN `PatientsTable` SHALL
   receber `aria-busy="true"` e estilo `opacity-60 pointer-events-none` — sem apagar a lista antiga
3. WHEN a nova página resolve THEN `isLoading` SHALL voltar a `false` e a tabela volta ao normal

**Independent Test**: mockar 2 respostas de `/api/patients` com atraso; digitar uma busca; confirmar
`aria-busy="true"` na tabela antes da 2ª resposta chegar.

---

### P1: Alvo de toque e hierarquia nas ações da lista

**User Story**: Como recepcionista, quero que "Prontuário" (95% dos meus cliques) se destaque de
"Editar"/"Desativar", e que os botões tenham alvo de toque real, não texto de 16px colado.

**Why P1**: Achado [P1-L2].

**Acceptance Criteria**:

1. WHEN a linha do paciente renderiza THEN o link "Prontuário" SHALL estar em `font-semibold`
2. WHEN a linha renderiza THEN "Editar"/"Desativar"/"Reativar" SHALL ser `Button variant="ghost"
   size="sm"` em vez de `variant="link" className="h-auto p-0"`

**Independent Test**: inspecionar classes; "Prontuário" tem `font-semibold`, os outros têm
`sv-btn--ghost sv-btn--sm` (ou equivalente da lib).

---

### P2: Contraste da linha inativa

**User Story**: Como usuário, quero conseguir ler o nome de um paciente inativo sem forçar a vista.

**Why P2**: Achado [P2-L4].

**Acceptance Criteria**:

1. WHEN `patient.active === false` THEN a `TableRow` SHALL usar `bg-surface-2/60` em vez de
   `opacity-50`

**Independent Test**: renderizar paciente inativo; confirmar classe `bg-surface-2/60` e ausência de
`opacity-50` na linha.

---

### P2: Estado vazio distingue base vazia de busca sem resultado

**User Story**: Como recepcionista, quero saber se não há pacientes cadastrados ou se só a minha
busca não encontrou nada.

**Why P2**: Achado [P2-L5] (parte — contagem de resultados fora de escopo, ver Out of Scope).

**Acceptance Criteria**:

1. WHEN a lista está vazia E não há busca ativa THEN a mensagem SHALL ser "Nenhum paciente
   cadastrado."
2. WHEN a lista está vazia E há uma busca ativa (`debouncedSearch` não vazio) THEN a mensagem SHALL
   ser `Nenhum paciente encontrado para "${debouncedSearch}".`

**Independent Test**: renderizar sem busca → mensagem base; renderizar com busca preenchida e lista
vazia → mensagem com o termo buscado.

---

## Edge Cases

- WHEN a URL tem `?aba=pacotes` e o usuário está no meio de um SOAP não salvo THEN a troca inicial
  (montagem da página) SHALL respeitar o parâmetro sem disparar o guard (guard só se aplica a
  trocas pós-montagem, via clique)
- WHEN `useCursorPagedQuery` está em `isLoading` mas já tinha `items` de uma busca anterior THEN a
  tabela SHALL continuar visível (dimmed), nunca voltar a `null`/loading de página inteira
- WHEN `evolutions.length` é exatamente 10 THEN SHALL mostrar as 10 sem o botão "Ver mais" (limite
  exato do AC)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PRONT-01 | P1: Contador só ativos | Implement | Pending |
| PRONT-02 | P1: SOAP em blocos | Implement | Pending |
| PRONT-03 | P1: Tira cronológica correta | Implement | Pending |
| PRONT-04 | P1: Aba na URL | Implement | Pending |
| PRONT-05 | P2: Destaque de dado anormal | Implement | Pending |
| PRONT-06 | P2: Formulário responsivo | Implement | Pending |
| PRONT-07 | P2: Toast na criação de condição | Implement | Pending |
| PRONT-08 | P3: Teto na lista de evoluções | Implement | Pending |
| PRONT-09 | P3: Aba Pacotes separada | Implement | Pending |
| PRONT-10 | P1: Lista não fica obsoleta na busca | Implement | Pending |
| PRONT-11 | P1: Alvo de toque + hierarquia da lista | Implement | Pending |
| PRONT-12 | P2: Contraste da linha inativa | Implement | Pending |
| PRONT-13 | P2: Estado vazio distingue base/busca | Implement | Pending |

**Coverage:** 13 total, 13 mapeados (execução direta, sem `tasks.md` formal), 0 sem mapeamento.

---

## Success Criteria

- [ ] `npm run typecheck`, `npm run lint`, `npm run check:sv`, `npm run test:coverage` (≥90%) verdes
- [ ] Nenhuma regressão nos testes existentes de `/pacientes` e `/pacientes/[id]`
- [ ] Issue #88 fechada via `Closes #88` no commit/PR
