# Fase 4 — Portal: Auto-agendamento e Recall — Tasks

## Execution Protocol (MANDATORY -- do not skip)

Implement these tasks with the `tlc-spec-driven` skill (Execute flow + Critical Rules).

**Design**: `.specs/features/fase-4-portal-auto-agendamento/design.md`
**Status**: Done — commits c7dd752 (T1), b33019e (T2), a7cf03d (T3)

## Test Coverage Matrix

> Guidelines: `vitest.config.ts` (v8, threshold do projeto), BDD pt-br em `tests/**`,
> `AGENTS.md` (consultar `node_modules/next/dist/docs/` ao tocar APIs do Next).

| Code Layer | Required Test Type | Coverage Expectation | Location Pattern | Run Command |
|------------|--------------------|----------------------|------------------|-------------|
| Use cases do portal (ListAvailableSlots, ScheduleOwnAppointment) | unit | 1:1 com ACs; todos os edge cases da spec | `tests/application/*.test.ts` | `node_modules/.bin/vitest run <file>` |
| Rotas do portal (slots, procedures, appointments) | integration (PGlite) | happy + cada edge case + erros (401/403/404/409) | `tests/api/*.test.ts` | `npm test` |
| Lembretes (recall com link) | unit | mensagem contém destino do portal | `tests/application/send-reminders.test.ts` | idem |
| UI do portal | page (jsdom) | fluxo de agendar retorno + refresh | `tests/pages/portal.test.tsx` | idem |

## Parallelism Assessment

| Test Type | Parallel-Safe? | Isolation Model | Evidence |
|-----------|----------------|-----------------|----------|
| unit | Yes | repos in-memory por teste | `tests/application/*` |
| integration | Yes | PGlite por worker | `vitest.config.ts` |
| page | Yes | jsdom + fetch stub por teste | `tests/pages/portal.test.tsx` |

## Gate Check Commands

| Gate Level | Command |
|------------|---------|
| Quick | `node_modules/.bin/vitest run <arquivos do task>` |
| Full | `npm test` |
| Build | `npm test && npm run lint && npm run build` |

## Execution Plan

### Phase A (Sequential): leitura de disponibilidade
T1

### Phase B (Sequential): escrita (agendar) + recall
T2

### Phase C (Sequential): interface
T3

## Task Breakdown

### T1: `ListAvailableSlots` + rotas GET de slots e procedimentos do portal
**What**: use case que gera slots candidatos e valida cada um com `assertSlotAvailable`;
rotas `GET /api/portal/patient/slots` e `GET /api/portal/patient/procedures`.
**Where**: `src/application/portal/list-available-slots.ts` (novo),
`src/app/api/portal/patient/slots/route.ts` (novo),
`src/app/api/portal/patient/procedures/route.ts` (novo),
`tests/application/portal-scheduling.test.ts` (novo), `tests/api/portal-routes.test.ts`
**Depends on**: None | **Requirement**: PORT4-01..03
**Reuses**: `assertSlotAvailable`, `ScheduleConfig`, `requireRole` (fase 1)
**Done when**:
- [ ] Slots do dia respeitam grade, gap e conflitos (PORT4-01)
- [ ] Dia fora da grade → lista vazia (PORT4-02)
- [ ] Procedimento inativo/inexistente → 404 (PORT4-03)
- [ ] Slots no passado não são ofertados (edge case)
- [ ] Guard: 401 sem sessão, 403 para partner/admin
- [ ] Full gate passa
**Tests**: unit + integration | **Gate**: full
**Commit**: `feat(portal): horários disponíveis para auto-agendamento`

### T2: `ScheduleOwnAppointment` + rota POST + auditoria + recall com destino
**What**: agendamento escopado à sessão do paciente, fechando o follow-up de origem;
mensagem de recall passa a apontar para o portal.
**Where**: `src/application/portal/schedule-own-appointment.ts` (novo),
`src/app/api/portal/patient/appointments/route.ts` (novo),
`src/application/reminders/send-reminders.ts` (mensagem),
`tests/application/portal-scheduling.test.ts`, `tests/application/send-reminders.test.ts`,
`tests/api/portal-routes.test.ts`
**Depends on**: T1 | **Requirement**: PORT4-04..09
**Reuses**: `ScheduleAppointment`, `FollowUp.markScheduled()`, `recordAudit`, `scheduleCalendarSync`
**Done when**:
- [ ] Consulta criada para o próprio paciente com preço/duração do catálogo (PORT4-04)
- [ ] Conflito → erro atual, nada criado (PORT4-05)
- [ ] `followUpId` próprio → follow-up vira `scheduled` (PORT4-06)
- [ ] `followUpId` de outro paciente → 404 (PORT4-07)
- [ ] Evento de auditoria com ator paciente (PORT4-08)
- [ ] Mensagem de recall contém o destino do portal (PORT4-09)
- [ ] Full gate passa
**Tests**: unit + integration | **Gate**: full
**Commit**: `feat(portal): paciente agenda retorno pelo portal e recall aponta para o portal`

### T3: UI do portal — agendar retorno
**What**: ação "Agendar retorno" na pendência do portal, com escolha de procedimento, data e horário.
**Where**: `src/app/portal/patient-view.tsx` (+ componente de agendamento),
`tests/pages/portal.test.tsx`
**Depends on**: T2 | **Requirement**: PORT4-10..11
**Reuses**: `useApiQuery`, `apiFetch`, padrões visuais do portal
**Done when**:
- [ ] Follow-up pendente exibe "Agendar retorno" (PORT4-10)
- [ ] Após agendar, a lista de consultas reflete a nova consulta (PORT4-11)
- [ ] Erro da API exibido (ErrorAlert), sem tela quebrada
- [ ] Build gate passa (último task da fase)
**Tests**: page | **Gate**: build
**Commit**: `feat(portal): fluxo de agendamento de retorno na interface do paciente`

## Diagram-Definition Cross-Check

| Task | Depends On (body) | Diagrama | Status |
|------|-------------------|----------|--------|
| T1 | None | Phase A (início) | ✅ Match |
| T2 | T1 | Phase B após A | ✅ Match |
| T3 | T2 | Phase C após B | ✅ Match |

## Test Co-location Validation

| Task | Camadas criadas/alteradas | Matrix exige | Task declara | Status |
|------|---------------------------|--------------|--------------|--------|
| T1 | use case + 2 rotas | unit + integration | unit + integration | ✅ OK |
| T2 | use case + rota + lembretes | unit + integration | unit + integration | ✅ OK |
| T3 | UI do portal | page | page | ✅ OK |

**Tools**: nenhum MCP externo; skill `tlc-spec-driven`; docs do Next em `node_modules/next/dist/docs/`.
