# Fase 4 — Portal: Auto-agendamento e Recall — Validação

**Data**: 2026-08-15
**Spec**: `.specs/features/fase-4-portal-auto-agendamento/spec.md`
**Range do diff**: `a85019a..a7cf03d` (c7dd752 slots · b33019e agendar+recall · a7cf03d UI) — `src/`, `tests/`
**Verificador**: sub-agente independente (autor ≠ verificador), cobertura re-derivada do zero, evidence-or-zero

---

## Conclusão de Tarefas

| Tarefa | Status | Notas |
| ------ | ------ | ----- |
| T1 — `ListAvailableSlots` + rotas GET slots/procedures | ✅ Feito | c7dd752 |
| T2 — `ScheduleOwnAppointment` + POST + auditoria + recall | ✅ Feito | b33019e |
| T3 — UI do portal (agendar retorno) | ✅ Feito | a7cf03d — inclui refatoração fora de escopo (ver Qualidade de Código) |

---

## Critérios de Aceite Ancorados na Spec

| Critério (QUANDO X ENTÃO Y) | Desfecho definido pela spec | `file:line` + expressão da asserção | Resultado |
| --------------------------- | --------------------------- | ----------------------------------- | --------- |
| **PORT4-01** GET slots → horários livres conforme grade, folga e conflitos | slots da grade (08–18, passo = duração), sem os ocupados e sem vizinhos dentro da folga mínima de 15 min | `tests/application/portal-scheduling.test.ts:49-53` — `expect(slots).toHaveLength(10)`, `expect(slots[0].startsAt.toISOString()).toBe("2026-07-20T08:00:00.000Z")`, último `17:00→18:00` (grade) · `:68-72` — `expect(starts).not.toContain("…10:00…")` (ocupado), `.not.toContain("…09:00…")` e `.not.toContain("…11:00…")` (vizinhos sem folga), `.toContain("…08:00…")`, `.toContain("…12:00…")` (folga+conflito) · `:135-136` — `expect(slots).toHaveLength(20)` e `slots[1]` `08:30` (passo = duração) · rota: `tests/api/portal-routes.test.ts:565-569` — `expect(body.data[0]).toEqual({startsAt:"2027-03-15T08:00:00.000Z", endsAt:"2027-03-15T09:00:00.000Z"})` + `toHaveLength(10)` | ✅ PASS |
| **PORT4-02** data fora da grade → lista vazia | `[]` | `tests/application/portal-scheduling.test.ts:76` — `expect(await listSlots("2026-07-25")).toEqual([])` (sábado) · rota: `tests/api/portal-routes.test.ts:583-584` — `expect(response.status).toBe(200)` + `expect(body.data).toEqual([])` | ✅ PASS |
| **PORT4-03** procedimento inativo/inexistente → 404/400 | spec diz "404/400 conforme padrão" (não fixa qual) | `tests/application/portal-scheduling.test.ts:91-93` (inativo) e `:97-99` (inexistente) — `rejects.toThrow(NotFoundError)` · rota: `tests/api/portal-routes.test.ts:610` — `expect(response.status).toBe(404)` (inexistente) · `:597` — `toBe(400)` (params ausentes) | ✅ PASS (⚠️ spec-precision: a spec não fixa o código; os testes fixam 404/400) |
| **PORT4-04** agendar slot válido → consulta do próprio paciente com procedimento e preço do catálogo | paciente da sessão, nome/preço/duração vindos do catálogo | `tests/application/portal-scheduling.test.ts:183-188` — `expect(appointment.patientId).toBe(maria.id)`, `.procedure).toBe("Curativo")`, `.price.cents).toBe(15000)`, `.procedureId).toBe(curativo.id)`, `.slot.end…).toBe("2026-07-20T10:00:00.000Z")` (duração 60 do catálogo), `.status).toBe("scheduled")` · rota: `tests/api/portal-routes.test.ts:660-672` — `procedure`, `startsAt`, `endsAt`, `status` + `expect(portalBody.data.appointments.some(a => a.id === body.data.id)).toBe(true)` (escopo do próprio paciente) | ✅ PASS |
| **PORT4-05** slot em conflito → erro de conflito **sem criar consulta** | erro de conflito atual + nenhuma consulta nova | `tests/application/portal-scheduling.test.ts:194-197` — `rejects.toThrow(/Horário indisponível/)` **e** `expect(await appointmentRepo.findByPatientId(maria.id)).toHaveLength(1)` → **estado confirmado**, não só o erro · rota: `tests/api/portal-routes.test.ts:721` — `expect(response.status).toBe(409)` | ✅ PASS |
| **PORT4-06** `followUpId` próprio → follow-up vira `scheduled` | status `scheduled` na mesma operação | `tests/application/portal-scheduling.test.ts:211` — `expect((await followUpRepo.findById(followUp.id))?.status).toBe("scheduled")` · rota: `tests/api/portal-routes.test.ts:743-748` — `toBe(200)` + `expect(listBody.data.some(i => i.id === followUpId)).toBe(true)` em `?status=scheduled` | ✅ PASS |
| **PORT4-07** `followUpId` de outro paciente → NotFound (sem vazar existência) | NotFound; nada criado, follow-up alheio intacto | `tests/application/portal-scheduling.test.ts:228-230` — `rejects.toThrow(NotFoundError)`, `expect(await appointmentRepo.findByPatientId(maria.id)).toHaveLength(0)`, `expect((await followUpRepo.findById(alheio.id))?.status).toBe("pending")` · rota: `tests/api/portal-routes.test.ts:770` — `expect(response.status).toBe(404)` | ✅ PASS |
| **PORT4-08** agendamento criado → auditoria registra o ator paciente | evento de auditoria com ator paciente | `tests/api/portal-routes.test.ts:703-708` — `expect(event).toBeDefined()`, `event?.action).toBe("create")`, `.resourceType).toBe("appointment")`, `.actorRole).toBe("patient")`, `.actorId).toBe(patientEmail)`, `.detail).toBe("agendado pelo portal do paciente")` → **assere valores**, não só existência | ✅ PASS |
| **PORT4-09** recall → mensagem orienta agendar pelo portal (com APP_URL) | link `{APP_URL}/portal` no lugar de "entre em contato" | `tests/application/send-reminders.test.ts:132-135` — `toContain("Agende seu retorno no portal: https://clinica.example.com/portal.")` **e** `.not.toContain("Entre em contato com a clínica")` · fallback sem APP_URL: `:161` — `toContain("Entre em contato com a clínica para agendar.")` | ✅ PASS |
| **PORT4-10** follow-up pendente → ação "Agendar retorno" abre procedimento/data/horário | botão visível na pendência que abre o painel | `tests/pages/portal.test.tsx:421-427` — `fireEvent.click(await screen.findByText("Agendar retorno"))`, `findByLabelText(/Procedimento/)`, `getByLabelText(/Dia/)`, `findByText(formatTime(scheduled.startsAt))` (horário ofertado clicável) | ✅ PASS |
| **PORT4-11** agendamento concluído → lista de consultas do portal reflete a consulta nova | portal recarregado exibindo a nova consulta | `tests/pages/portal.test.tsx:432-441` — `expect(JSON.parse(postBody)).toEqual({procedureId:"proc-1", startsAt:"2099-03-02T12:00:00.000Z", followUpId:"fu-1"})`, `expect(await screen.findByText(/Curativo/)).toBeInTheDocument()` (consulta nova renderizada), `waitFor(() => expect(screen.queryByText("Retornos recomendados")).not.toBeInTheDocument())` (pendência sai). Mutação (g) prova que a asserção depende do recarregamento real | ✅ PASS |

**Status**: ✅ 11/11 ACs cobertos com `file:line` + asserção ancorada no desfecho da spec · 1 ⚠️ spec-precision (PORT4-03: a spec escreve "404/400 conforme padrão" sem fixar o código; a implementação e os testes fixam 404 para procedimento e 400 para parâmetros ausentes).

### Regra payload/conjunção

| Payload | Campos exigidos | Asserção conjunta? |
| ------- | --------------- | ------------------ |
| Slot (`{startsAt, endsAt}`) | ambos | ✅ `tests/api/portal-routes.test.ts:565-568` — `toEqual({startsAt, endsAt})` (igualdade exata do objeto, não campo isolado); unidade também assere `endsAt` em `portal-scheduling.test.ts:51` |
| Consulta criada (procedimento / preço / duração) | os três | ✅ `tests/application/portal-scheduling.test.ts:184-187` — `procedure` + `price.cents` + `slot.end` (duração) na mesma asserção de caso. Na rota o preço **não** é asserido porque `PortalAppointmentDto` (`src/lib/dto.ts:48-54`) deliberadamente não expõe `price` ao portal; duração é verificada via `endsAt` (`tests/api/portal-routes.test.ts:661-662`) |
| Evento de auditoria | action, resourceType, resourceId, actorRole, actorId, detail | ✅ `tests/api/portal-routes.test.ts:701-708` — os 6 campos asseridos por valor no mesmo teste |

---

## Sensor de Discriminação

Mutações comportamentais aplicadas em estado descartável na worktree, revertidas com `git checkout -- <arquivo>` imediatamente após cada execução. Nenhuma mutação foi commitada; `git status` limpo ao final.

| # | Arquivo:linha | Mutação | Comando | Morta? |
| - | ------------- | ------- | ------- | ------ |
| a | `src/application/portal/list-available-slots.ts:53-56` | Removido o filtro de horários passados (`slot.startsAt > now`) | `vitest run tests/application/portal-scheduling.test.ts tests/api/portal-routes.test.ts` | ✅ Morta — `portal-scheduling.test.ts:121` `expected '2026-07-20T08:00:00.000Z' to be '2026-07-20T14:00:00.000Z'` |
| b | `src/application/portal/list-available-slots.ts:60-62` | Ignorado o resultado de `isFree` (oferta todos os candidatos) | idem | ✅ Morta — `portal-scheduling.test.ts:68` `expected […] to not include '2026-07-20T10:00:00.000Z'` |
| b′ | `src/application/portal/list-available-slots.ts:94` | `minGapMinutes: 0` em `assertSlotAvailable` (mantém conflito, remove a folga) | idem | ✅ Morta — `portal-scheduling.test.ts:69` `expected […] to not include '2026-07-20T09:00:00.000Z'` → **prova que o teste de PORT4-01 discrimina a folga de 15 min, não apenas o horário ocupado** |
| c | `src/application/portal/schedule-own-appointment.ts:78` | Removida a checagem `followUp.patientId !== patientId` (aceita follow-up alheio) | idem | ✅ Morta (2 testes) — `portal-routes.test.ts:770` `expected 200 to be 404`; `portal-scheduling.test.ts:228` `promise resolved "Appointment{…}" instead of rejecting` |
| d | `src/application/portal/schedule-own-appointment.ts:62-65` | `markScheduled()` movido para **antes** do `ScheduleAppointment` | idem | ✅ Morta — `portal-scheduling.test.ts:246` `expected 'scheduled' to be 'pending'` (edge case do conflito) |
| e | `src/application/reminders/send-reminders.ts:36-39` | Ignorado `APP_URL` (sempre "Entre em contato com a clínica") | `vitest run tests/application/send-reminders.test.ts` | ✅ Morta — `send-reminders.test.ts:132` `expected 'Olá, Maria!…' to contain 'Agende seu retorno no portal: https:…'` |
| f | `src/app/api/portal/patient/appointments/route.ts:46` | `detail` da auditoria alterado para "agendado" | `vitest run tests/api/portal-routes.test.ts` | ✅ Morta — `portal-routes.test.ts:708` `expected 'agendado' to be 'agendado pelo portal do paciente'` |
| g | `src/app/portal/patient-view.tsx:92` | `onScheduled={refresh}` → `onScheduled={() => {}}` (portal não recarrega) | `vitest run tests/pages/portal.test.tsx` | ✅ Morta — `portal.test.tsx` `Unable to find an element with the text: /Curativo/` → **prova que PORT4-11 exige a consulta nova renderizada após o recarregamento** |

**Nota sobre a mutação (f) planejada como escopo de sessão**: `body.patientId ?? session.subject` **não é aplicável** — o schema Zod da rota (`src/app/api/portal/patient/appointments/route.ts:11-15`) só aceita `procedureId`, `startsAt` e `followUpId`; o paciente vem exclusivamente de `session.subject` (`:36`) e o caso de uso resolve o paciente por email (`schedule-own-appointment.ts:37-40`). Não existe caminho pelo corpo para escapar do escopo. Conforme instrução, foi mutado o `detail` da auditoria.

**Profundidade do sensor**: P0-full (7 mutações — caminho de escrita com dado clínico e escopo por sessão)
**Resultado**: **7/7 mortas** — ✅ PASS

---

## Verificação anti-mock

| Contrato consumido pela UI | Rota real | Bate? | Teste de integração real (PGlite + sessão assinada) |
| -------------------------- | --------- | ----- | --------------------------------------------------- |
| `GET /api/portal/patient/procedures` — `schedule-return.tsx:65` `useApiQuery<ProcedureDto[]>` usa `procedure.id`/`.name` | `src/app/api/portal/patient/procedures/route.ts:11-22` devolve `toProcedureDto` (`src/lib/dto.ts:415-421`: id, name, priceCents, durationMinutes, active) | ✅ | `tests/api/portal-routes.test.ts:531-549` — `entry?.name`, `entry?.durationMinutes`, `body.data.every(i => i.active)` |
| `GET /api/portal/patient/slots?procedureId=…&date=…` — `schedule-return.tsx:156-158` monta exatamente esses parâmetros e lê `{startsAt, endsAt}` | `src/app/api/portal/patient/slots/route.ts:14-33` lê `procedureId`/`date` e devolve `{startsAt, endsAt}` em ISO | ✅ | `tests/api/portal-routes.test.ts:551-611` — 200 + payload exato, 200 + `[]` (sábado), 400 (params), 404 (procedimento) |
| `POST /api/portal/patient/appointments` — `schedule-return.tsx:81-84` envia `{procedureId, startsAt, followUpId}` | `route.ts:11-15` schema `{procedureId, startsAt: z.iso.datetime(), followUpId nullish}` | ✅ | `tests/api/portal-routes.test.ts:615-784` — 403, 200 (+ aparece no portal do paciente), auditoria, 409, 200 c/ follow-up, 404 follow-up alheio, 400 corpo inválido |

As três rotas existem em disco e são **importadas de verdade** pelos testes (`portal-routes.test.ts:68-70`), executadas contra PGlite com token de sessão assinado (`:143-160`) — não há stub de handler. O teste de página usa `fetch` mockado, mas **assere o corpo do POST por igualdade exata** (`portal.test.tsx:432-436`) contra o mesmo shape que o schema Zod da rota aceita, e as respostas mockadas usam os DTOs reais (`ProcedureDto`, `PortalAppointmentDto`). A cobertura da UI portanto não repousa apenas no mock: cada contrato tem par de teste na camada de rota.

---

## Casos de Borda

- [x] **Dia consultado é hoje → slots passados não ofertados** — `tests/application/portal-scheduling.test.ts:109-123` (`now` 13:30 → `slots[0]` 14:00 e `not.toContain("…08:00…")`); mutação (a) confirma discriminação
- [x] **Dois pacientes disputam o mesmo slot → constraint de exclusão do banco decide (comportamento atual)** — cobertura herdada, fora do range do diff: `tests/infrastructure/drizzle-repositories.test.ts:185-205` (`rejects.toThrow(SchedulingConflictError)` em inserção sobreposta direta) e `:207+` (folga de 10 min rejeitada, 15 min aceita). Conforme a spec, é o comportamento pré-existente — nenhuma regressão introduzida
- [x] **Paciente inativo → 404 (regra atual do portal)** — `tests/application/portal-scheduling.test.ts:102-107` (slots: email desconhecido e paciente desativado → `NotFoundError`) e `:260-264` (agendar → `NotFoundError`). ⚠️ Não reasserido na camada de rota (ver Achado LOW-1)
- [x] **Extra (não listado na spec, coberto)**: data em formato inválido → `[]` (`:79-81`); conflito com `followUpId` informado → retorno permanece `pending` (`:233-247`, matou a mutação (d))

---

## Gate

- **Comando (escopo desta validação)**: `node_modules/.bin/vitest run tests/application tests/api tests/pages`
- **Resultado**: **47 arquivos, 834 testes, 834 passaram, 0 falharam, 0 pulados** (33,5 s) — executado duas vezes (antes e depois do sensor), mesmo resultado
- **Gate Build declarado** (`npm test && npm run lint && npm run build`):
  - `npm run lint` → **0 erros**, 7 warnings (todos pré-existentes, em arquivos fora deste diff)
  - `npm run build` → **exit 0**. Observação de ambiente: com o heap padrão do Node o passo "Running TypeScript" estoura memória (`FATAL ERROR: Ineffective mark-compacts near heap limit`); com `NODE_OPTIONS=--max-old-space-size=8192` conclui normalmente. Não é defeito do código da feature
- **Delta de testes**: +34 `it(` novos no range (`git diff a85019a..a7cf03d -- tests/`); nenhum teste removido, nenhuma asserção enfraquecida
- **Pulados**: nenhum

---

## Qualidade de Código

| Princípio | Status |
| --------- | ------ |
| Código mínimo | ✅ |
| Mudanças cirúrgicas | ⚠️ ver MED-1 |
| Sem scope creep | ⚠️ ver MED-1 |
| Segue os padrões existentes | ✅ (`assertSlotAvailable` reusado, `handleRequest`/`requireRole`/`recordAudit` como nas demais rotas do portal) |
| Verificação ancorada na spec (valores asseridos batem com o desfecho da spec) | ✅ (1 ⚠️ spec-precision em PORT4-03) |
| Expectativa de cobertura por camada (domínio 1:1 com ACs; rotas happy+edge+erro) | ⚠️ ver LOW-1 |
| Todo teste do escopo mapeia para AC/edge case/critério "Done when" | ✅ — sem testes órfãos |
| Diretrizes documentadas seguidas | ✅ `tasks.md` (Test Coverage Matrix), BDD pt-br em `tests/**`, `AGENTS.md` |

### Achados

**MED-1 — Refatoração fora de escopo no commit da UI.** `src/application/inventory/register-stock-movement.ts` foi alterado em `a7cf03d` (extração da função `assertMovementAllowed`), arquivo não declarado no "Where" do T3 e sem relação com PORT4-*. É refatoração pura, sem mudança comportamental (gate verde), mas polui o range da feature.

**MED-2 — Erro de tipo introduzido no teste de página.** `tests/pages/portal.test.tsx:366` declara `notes: null` em um literal tipado como `PortalAppointmentDto`, propriedade que não existe no DTO (`src/lib/dto.ts:48-54`). `node_modules/.bin/tsc --noEmit` falha com **TS2353** — é o **único** erro de tipo do repositório. Não quebra nenhum gate declarado (não há script `typecheck`; o passo TypeScript do `next build` não cobre esse arquivo e o build sai 0), mas é um erro real e trivial de corrigir (remover a propriedade).

**LOW-1 — Guardas 401/403 cobertas por par, não por rota.** `GET /slots` tem 403 (`portal-routes.test.ts:518-529`) mas não 401; `GET /procedures` tem 401 (`:510-516`) mas não 403; `POST /appointments` tem 403 (`:629-640`) mas não 401. As três usam o mesmo `requireRole(request, "patient")`, então o risco é baixo, mas a matriz do `tasks.md` pede "happy + cada edge case + erros (401/403/404/409)" por rota. Também não há teste de rota com paciente inativo → 404 (coberto só na unidade).

---

## Rastreabilidade de Requisitos

| Requisito | Status anterior | Novo status |
| --------- | --------------- | ----------- |
| PORT4-01 | Implemented | ✅ Verificado |
| PORT4-02 | Implemented | ✅ Verificado |
| PORT4-03 | Implemented | ✅ Verificado (⚠️ spec-precision) |
| PORT4-04 | Implemented | ✅ Verificado |
| PORT4-05 | Implemented | ✅ Verificado |
| PORT4-06 | Implemented | ✅ Verificado |
| PORT4-07 | Implemented | ✅ Verificado |
| PORT4-08 | Implemented | ✅ Verificado |
| PORT4-09 | Implemented | ✅ Verificado |
| PORT4-10 | Implemented | ✅ Verificado |
| PORT4-11 | Implemented | ✅ Verificado |

---

## Resumo

**Geral**: ✅ Pronto (com 2 achados MEDIUM não bloqueantes)

**Verificação ancorada na spec**: 11/11 ACs com asserção sobre o desfecho definido pela spec · 1 ⚠️ spec-precision (PORT4-03)
**Sensor**: 7/7 mutações mortas
**Gate**: 834 passaram, 0 falharam · lint 0 erros · build exit 0

**O que funciona**: geração de slots que nunca diverge da regra da equipe (mesmo `assertSlotAvailable`, folga de 15 min comprovada pela mutação b′); escopo por sessão sem caminho pelo corpo da requisição; conflito não deixa resíduo (nem consulta, nem follow-up marcado); auditoria com ator/detalhe asseridos por valor; recall com deep-link e fallback; fluxo de UI ponta a ponta com corpo do POST validado contra o schema real da rota.

**Problemas encontrados**:
1. MED-1: refatoração de `register-stock-movement.ts` fora do escopo do T3 — separar em commit próprio em futuras fases.
2. MED-2: `tests/pages/portal.test.tsx:366` — remover `notes: null` do literal `PortalAppointmentDto` (único erro de `tsc --noEmit` do repo).
3. LOW-1: completar 401/403 por rota do portal e um caso de rota com paciente inativo → 404.

**Próximos passos**: nenhum bloqueio para concluir a fase. MED-2 é correção de uma linha e deveria entrar antes do próximo commit; considerar adicionar um script `typecheck` (`tsc --noEmit`) ao gate Build, já que o `next build` não cobre `tests/**`.
