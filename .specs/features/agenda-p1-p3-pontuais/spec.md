# Agenda — achados P1-P3 pontuais (issue #87) Specification

## Problem Statement

`docs/audits/auditoria-ux-2026-08.md` §2 (Agenda) lista achados P0-P3. Os P0 (grade inacessível por
teclado, sem prevenção de erro, consulta criada some sem confirmação, mobile inutilizável) **não**
viraram issue de tracking — decisão já tomada na sessão anterior (ver `.specs/STATE.md`, feature
`still-void-adocao-remanescente`: só adoção still-void + achados P1-P3 entraram em escopo das 9
issues #86-94). Esta issue cobre só os P1-P3 listados nela.

## Goals

- [ ] Dias inválidos (fim de semana fora da config, passado) marcados como não-clicáveis
- [ ] Aviso de regra de negócio vem da `ScheduleConfig` real (banco), não de constante de build
- [ ] Legenda de cores de status + estado vazio do mês com mensagem útil
- [ ] Mês renderiza com capitalização correta ("Agosto de 2026") e filtro de profissional não rouba
      hierarquia visual da toolbar
- [ ] Erro 409 (conflito de horário) visualmente distinto de 400 (validação)
- [ ] Célula do dia tem teto de altura com "+N mais" em vez de crescer sem limite
- [ ] Aviso de série pulada é anunciado a leitor de tela e pode ser fechado
- [ ] `check:sv` permanece verde

## Out of Scope

| Item | Reason |
| --- | --- |
| P0-1..P0-4 (navegação pós-criação, `SlotPicker`/prevenção real, grade por teclado, responsivo mobile) | Decisão já tomada na sessão anterior: só P1-P3 destas 9 issues entram em escopo (ver `.specs/STATE.md`) — a própria issue nota que nenhuma Fase cobre esses P0 ainda; recomendo issue própria se o usuário priorizar, não expandir esta |
| Alternador Dia/Semana/Mês (P2-8, metade) | O audit doc já marca essa tarefa como **L** (grande) no seu próprio plano de ação (T10) — desproporcional a um achado "pontual"; célula com teto/"+N mais" (a outra metade do P2-8) fica dentro do escopo |
| Sugestão de horário livre no erro 409 (parte de P2-10) | Exige a mesma engine de `ListAvailableSlots` do P0-2 (fora de escopo); esta issue cobre só distinguir 409 de 400 visualmente, sem inventar sugestão de slot |
| `useScheduleConfig()` como hook compartilhado (mencionado no audit doc) | Só 2 consumidores hoje (`/agenda`, `/configuracoes`), cada um já busca via `useApiQuery` direto — extrair hook agora é abstração sem 3º consumidor real (YAGNI); ambos passam a ler o mesmo endpoint, a extração fica fácil se um 3º aparecer |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| P1-5 "dia inválido" | Dia é inválido quando `date < hoje` (comparação por dia local, sem hora) OU `!scheduleConfig.weekdays.includes(date.getDay())` | Espelha exatamente a regra que `assertWithinBusinessHours` já valida no backend — marcar como inválido no cliente é UI sobre uma regra que já existe, não regra nova | n (default do agente, documentado) |
| P1-5 comportamento do dia inválido | Célula fica com `aria-disabled`, estilo visualmente distinto (`opacity-50 cursor-not-allowed`), e `onDayClick` não abre o modal de criação | Correção mínima pedida pelo P1 ("clicável e idêntico a dia válido") sem promover a validação completa do formulário (isso é P0-2, fora de escopo) | n (default do agente, documentado) |
| P2-8 teto de célula | `max-h-32 overflow-hidden` na lista de consultas do dia + link "+N mais" quando `dayAppointments.length` excede o que cabe (mostrar 3, "+N mais" pro resto) | Resolve "célula sem teto" sem construir visão de dia (fora de escopo, ver acima) | n (default do agente, documentado) |
| P2-10 distinção 400/409 | `ApiError.status === 409` → `Alert variant="warning"`; outros erros → `variant="danger"` (comportamento atual) | `ApiError` já expõe `.status` (`src/lib/client.ts`); variante semântica já existe na lib — menor mudança que resolve "indistinguíveis, exigindo ações opostas" | n (default do agente, documentado) |
| P3-11 "fechar" o aviso de série | Botão "Dispensar" no slot `action` do `Alert` (prop já suportada pela lib), que zera `seriesNotice` | `Alert` do `@still-void/ui` aceita `action?: React.ReactNode` — reuso direto, sem componente novo | n (default do agente, documentado) |

**Open questions:** nenhuma — todas resolvidas ou registradas acima.

---

## User Stories

### P1: Dias inválidos não são clicáveis ⭐ MVP

**User Story**: Como recepcionista, quero que sábado, domingo (fora da config) e dias passados
apareçam visualmente diferentes e não abram o formulário de nova consulta ao clicar — para não
tentar agendar num horário que o backend vai recusar.

**Why P1**: Achado [P1-5] — hoje todo dia da grade é visualmente idêntico e clicável, inclusive o
botão "+ Nova consulta" abre com `new Date()` sem checar validade.

**Acceptance Criteria**:

1. WHEN um dia da grade é anterior a hoje (comparação por data local) OU seu `getDay()` não está em
   `scheduleConfig.weekdays` THEN a célula SHALL renderizar com `aria-disabled="true"` e estilo
   visualmente distinto (opacidade reduzida, cursor `not-allowed`)
2. WHEN o usuário clica numa célula inválida THEN `onDayClick` SHALL **não** abrir o modal de criação
3. WHEN `scheduleConfig` ainda não carregou THEN a grade SHALL usar `DEFAULT_SCHEDULE_CONFIG`
   (comportamento atual preservado, sem tela de loading extra)

**Independent Test**: renderizar a grade com um domingo no mês visível e confirmar que a célula tem
`aria-disabled="true"` e que clicar nela não dispara `onDayClick`.

---

### P1: Aviso de regra de negócio vem da configuração real

**User Story**: Como recepcionista, quero que o texto "Atendimento de segunda a sexta, das 8h às
18h..." no formulário reflita a configuração real da clínica, não um valor fixo do build.

**Why P1**: Achado [P1-6] — `/configuracoes` grava uma config no banco, mas `AppointmentForm` lê de
`BUSINESS_HOURS`, constante de build. As duas podem divergir e o aviso mentir.

**Acceptance Criteria**:

1. WHEN `AppointmentForm` renderiza THEN SHALL buscar `/api/settings/schedule` e exibir
   `describeSchedule(config)` no lugar do texto fixo de `BUSINESS_HOURS`
2. WHEN a busca ainda não respondeu THEN SHALL exibir o texto derivado de
   `DEFAULT_SCHEDULE_CONFIG` (mesmo valor que `BUSINESS_HOURS` tinha, sem regressão perceptível)

**Independent Test**: mockar `/api/settings/schedule` com config custom (ex.: só terça e quinta,
9h-17h) e confirmar que o texto exibido bate com `describeSchedule` daquela config.

---

### P1: Legenda de status e mês vazio com mensagem útil

**User Story**: Como usuário, quero saber o que cada cor da grade significa, e ver uma mensagem
quando o mês não tem nenhuma consulta.

**Why P1**: Achado [P1-7] — 5 cores sem legenda; heurística 6 (reconhecimento).

**Acceptance Criteria**:

1. WHEN a grade renderiza THEN SHALL exibir uma legenda com as 5 cores de `STATUS_COLORS` e o
   rótulo de `APPOINTMENT_STATUS_LABELS` correspondente
2. WHEN o mês visível não tem nenhuma consulta (`appointments.length === 0`) THEN SHALL exibir uma
   mensagem de estado vazio (ex.: "Nenhuma consulta agendada neste mês.") acima ou junto da grade

**Independent Test**: renderizar com `appointments: []` e confirmar a mensagem de vazio; renderizar
com consultas e confirmar que a legenda lista os 5 status.

---

### P2: Capitalização do mês e hierarquia da toolbar

**User Story**: Como usuário, quero ler "Agosto de 2026" (não "Agosto De 2026"), e que o filtro de
profissional não domine visualmente o título do mês.

**Why P2**: Achado [P2-9].

**Acceptance Criteria**:

1. WHEN o mês renderiza THEN o rótulo SHALL ter só a primeira letra maiúscula ("Agosto de 2026"),
   sem depender da classe Tailwind `capitalize` (que maiúsculiza cada palavra, incluindo "de")
2. WHEN a toolbar renderiza THEN `ProfessionalFilter` SHALL ter largura limitada (`max-w-56` ou
   equivalente) em vez de esticar livremente

**Independent Test**: `monthLabel` custom para agosto de 2026 deve retornar exatamente
`"Agosto de 2026"`; snapshot/RTL confirma a classe de largura do filtro.

---

### P2: Erro 409 visualmente distinto de 400

**User Story**: Como recepcionista, quero que um conflito de horário (409) apareça diferente de um
erro de validação (400), para saber que ações opostas resolvem cada um.

**Why P2**: Achado [P2-10] (parte).

**Acceptance Criteria**:

1. WHEN `AppointmentForm` recebe um erro com `err instanceof ApiError && err.status === 409` THEN
   `ErrorAlert`/`Alert` SHALL renderizar com `variant="warning"` em vez de `variant="danger"`
2. WHEN o erro não é 409 (ex.: 400, 500) THEN o comportamento atual (`danger`) SHALL ser preservado

**Independent Test**: mockar `apiFetch` rejeitando com `new ApiError("Horário indisponível", 409)` e
confirmar a variante `warning`; rejeitar com 400 e confirmar `danger`.

---

### P2: Célula do dia com teto

**User Story**: Como recepcionista, quero que um dia com muitas consultas não estoure a grade —
prefiro ver as 3 primeiras e um link "+N mais".

**Why P2**: Achado [P2-8] (parte — visão de Dia/Semana fica fora, ver Out of Scope).

**Acceptance Criteria**:

1. WHEN um dia tem mais de 3 consultas THEN a célula SHALL mostrar as 3 primeiras (por horário) e um
   indicador "+N mais" (N = total − 3)
2. WHEN um dia tem 3 ou menos consultas THEN SHALL mostrar todas, sem indicador

**Independent Test**: renderizar um dia com 5 consultas mockadas e confirmar que só 3 aparecem como
botão clicável + texto "+2 mais".

---

### P3: Aviso de série pulada anunciado e dispensável

**User Story**: Como recepcionista, quero poder fechar o aviso de "série criada, N sessões puladas"
depois de ler, e que ele seja anunciado por leitor de tela.

**Why P3**: Achado [P3-11].

**Acceptance Criteria**:

1. WHEN `seriesNotice` é definido THEN o `Alert` SHALL receber um botão "Dispensar" via prop
   `action` que zera `seriesNotice` ao clicar
2. WHEN `seriesNotice` é `warning` (houve sessões puladas) THEN o `Alert` SHALL manter o
   comportamento de anúncio já dado pela variante (sem mudança de variant needed — mesma classe
   `Alert` já usada)

**Independent Test**: renderizar com `seriesNotice` preenchido, clicar em "Dispensar" e confirmar
que o alerta some.

---

## Edge Cases

- WHEN `scheduleConfig` falha ao carregar (erro de rede) THEN a grade SHALL cair para
  `DEFAULT_SCHEDULE_CONFIG` sem travar a página (mesmo padrão de `assertWithinBusinessHours`)
- WHEN todos os dias do mês são inválidos (config vazia — não deveria acontecer, `validateScheduleConfig`
  exige ao menos 1 dia) THEN a grade SHALL renderizar normalmente, só com todas as células desabilitadas
- WHEN um dia tem exatamente 4 consultas THEN SHALL mostrar 3 + "+1 mais" (limite exato do AC)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| AGENDA-01 | P1: Dias inválidos não clicáveis | Implement | Pending |
| AGENDA-02 | P1: Aviso vem da config real | Implement | Pending |
| AGENDA-03 | P1: Legenda + mês vazio | Implement | Pending |
| AGENDA-04 | P2: Capitalização + toolbar | Implement | Pending |
| AGENDA-05 | P2: 409 distinto de 400 | Implement | Pending |
| AGENDA-06 | P2: Célula com teto | Implement | Pending |
| AGENDA-07 | P3: Série pulada dispensável | Implement | Pending |

**Coverage:** 7 total, 7 mapeados (execução direta, sem `tasks.md` formal — escopo Medium), 0 sem
mapeamento.

---

## Success Criteria

- [ ] `npm run typecheck`, `npm run lint`, `npm run check:sv`, `npm run test:coverage` (≥90%) verdes
- [ ] Nenhuma regressão nos testes existentes de `/agenda`
- [ ] Issue #87 fechada via `Closes #87` no commit/PR
