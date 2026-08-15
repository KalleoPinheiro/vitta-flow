# Fase 3 — Compliance e UX Clínico — Validação

**Data**: 2026-08-15
**Spec**: `.specs/features/fase-3-compliance-ux-clinico/spec.md`
**Design**: `.specs/features/fase-3-compliance-ux-clinico/design.md`
**Range do diff**: `6454f64..c9132f8` (`src/`, `tests/`, `drizzle/`)
**Commits da fase**: `628ea3d` (gate de consentimento), `867e223` (validade de pacotes), `c9132f8` (triagem enriquecida)
**Verificador**: sub-agente independente (autor ≠ verificador), cobertura re-derivada do zero, evidence-or-zero

**Veredito**: ❌ **FAIL** — 1 mutante sobrevivente + 1 AC sem evidência + 1 AC coberto apenas parcialmente

---

## Task Completion

O design usa execução inline em 3 tarefas (não há `tasks.md` separado).

| Task | Status | Notas |
| ---- | ------ | ----- |
| T1 — Gate de consentimento no envio remoto (COMP3-01..03) | ⚠️ Parcial | Rota implementada; **o aviso no portal UI previsto no design ("Portal UI: aviso na seção de envio quando `accepted=false`") não foi implementado** — nenhum arquivo do portal foi tocado no range |
| T2 — Validade de pacotes (COMP3-07..10) | ⚠️ Parcial | Domínio, schema, migração `0017_package-expiry`, repos e rota OK; **nenhuma UI lista/renderiza a validade** (ver COMP3-10) |
| T3 — Fila de triagem enriquecida (COMP3-04..06) | ⚠️ Parcial | Rota e UI OK; `waitingHours` não tem teste discriminante (mutante sobreviveu) |

---

## Spec-Anchored Acceptance Criteria

| Critério (WHEN X THEN Y) | Desfecho definido na spec | `file:line` + expressão da asserção | Resultado |
| ------------------------ | ------------------------- | ----------------------------------- | --------- |
| **COMP3-01** — paciente sem consentimento vigente envia foto → 403 + mensagem orientando o aceite + NÃO grava | HTTP 403; mensagem clara direcionando ao aceite no portal; foto não persistida | `tests/api/auth-portal-gaps.test.ts:389` — `expect(response.status).toBe(403)`; `:390` — `expect(body.error).toContain("Consentimento pendente")`; `:397` — `expect(photosBody.data).toHaveLength(0)` (GET `/api/conditions/[id]/photos` confirma estado vazio) | ✅ PASS |
| **COMP3-02** — paciente com consentimento vigente envia foto → fluxo idêntico ao atual | upload segue normalmente (nenhum desfecho numérico novo definido) | `tests/api/auth-portal-gaps.test.ts:441-443` (POST consent) + `:487` — `expect(conditionEntry?.photos.length).toBeGreaterThan(0)`; `tests/api/audit-lgpd-routes.test.ts:114-119` (consent no setup, todo o suite de fotos/triagem segue verde) | ✅ PASS |
| **COMP3-03** — texto do termo muda (novo hash) → aceites antigos deixam de valer **para o gate** | envio remoto passa a ser bloqueado (403) para aceite com hash antigo | **sem evidência no nível do gate.** Só há teste da regra genérica `covers`: `tests/domain/consent-record.test.ts:68` — `expect(record.covers("Texto do termo alterado")).toBe(false)` e `tests/application/platform-wave4.test.ts:33` — `expect(record.covers("TERMO v2 — texto atualizado")).toBe(false)`. Nenhum teste exercita `POST /api/portal/patient/photos` com registro de consentimento de hash defasado | ❌ GAP |
| **COMP3-04a** — item da fila inclui `latestScore` ({kind, value}) da condição | ferida 20mm×15mm + exsudato moderado + granulação → `{kind:"push", value:9}` | `tests/api/audit-lgpd-routes.test.ts:393` — `expect(entry?.latestScore).toEqual({ kind: "push", value: 9 })` | ✅ PASS — **valor 9 conferido contra a tabela PUSH 3.0** (ver nota abaixo) |
| **COMP3-04b** — item da fila inclui `waitingHours` (horas desde o envio) | horas inteiras decorridas desde `photo.createdAt` | `tests/api/audit-lgpd-routes.test.ts:371` — `expect(entry?.waitingHours).toBe(0)` (**único caso: foto recém-criada; 0 é o valor degenerado**); `tests/pages/staff-dashboard.test.tsx:293/308` usa fixture (`waitingHours: 30` / `2`) e **não exercita o cálculo da rota** | ❌ GAP — mutante sobreviveu (Sensor #5) |
| **COMP3-05** — condição sem avaliação com score calculável → `latestScore` null | `null` | `tests/api/audit-lgpd-routes.test.ts:370` — `expect(entry?.latestScore).toBeNull()`; UI: `tests/pages/staff-dashboard.test.tsx:313` — `expect(screen.queryByText(/PUSH\|DET/)).not.toBeInTheDocument()` | ✅ PASS |
| **COMP3-06** — pendências com mais de 24h ganham destaque visual na UI | classe de destaque no elemento de idade | `tests/pages/staff-dashboard.test.tsx:301-302` — `waitingHours: 30` → `expect(waiting).toHaveClass("text-red-700")`; caso negativo `:311-312` — `waitingHours: 2` → `.not.toHaveClass("text-red-700")` | ✅ PASS (⚠️ fronteira exata não testada — código usa `>= 24`, spec diz "mais de 24h") |
| **COMP3-07** — pacote criado com `expiresAt` → data persistida e exposta no DTO | ISO string idêntica ao input; `null` quando ausente | `tests/api/billing-catalog-routes.test.ts:286` — `expect(body.data.expiresAt).toBe("2030-06-30T00:00:00.000Z")`; persistência real (PGlite + migração): `tests/infrastructure/drizzle-repositories-extra.test.ts:230-232` — `expect((await repo.findById(expired.id))?.expiresAt?.toISOString()).toBe("2020-01-01T00:00:00.000Z")` | ✅ PASS |
| **COMP3-08** — conclusão com pacote expirado (`expiresAt < agora`) → ignorado, fatura avulsa | `usedSessions` inalterado + fatura criada | `tests/application/operations-wave3.test.ts:201` — `expect((await packageRepo.findById(pkg.id))?.usedSessions).toBe(0)`; `:202` — `expect(await invoiceRepo.findByAppointmentId(appointment.id)).not.toBeNull()`; camada SQL: `tests/infrastructure/drizzle-repositories-extra.test.ts:233` — `expect(await repo.findUsable(patient.id, procedure.id)).toBeNull()` e `:243` — `expect((await repo.findUsable(...))?.id).toBe(valid.id)` | ✅ PASS |
| **COMP3-09** — pacote sem validade (null) → comportamento atual preservado | consome normalmente; `expiresAt === null` | `tests/application/operations-wave3.test.ts:228-230` — `expect(semValidade.expiresAt).toBeNull()`, `expect(semValidade.isUsableAt(now)).toBe(true)`, `expect(noPrazo.isUsableAt(now)).toBe(true)` + regressão do caminho antigo em `:167-168` (`usedSessions` 1, fatura null) | ✅ PASS |
| **COMP3-10** — portal/staff lista pacotes → validade aparece quando existir | validade visível na listagem | `tests/api/billing-catalog-routes.test.ts:292` — `expect(listBody.data.some((p) => p.expiresAt === "2030-06-30T00:00:00.000Z")).toBe(true)` (**apenas nível de DTO da API**). Nenhuma UI consome a listagem: `grep "api/packages" src/app/` retorna só o POST de venda em `src/app/(staff)/faturamento/page.tsx:322`; o portal do paciente não lista pacotes | ⚠️ Parcial + Spec-precision gap |

**Status**: ❌ 8/11 critérios com evidência plena; 2 GAPs (COMP3-03, COMP3-04b); 1 parcial (COMP3-10).

### Conferência do valor esperado do COMP3-04 (PUSH 9) — CORRETO

Cadeia re-derivada de `src/domain/clinical/condition-assessment.ts`:

- `areaMm2` (`:197-202`) = `lengthMm * widthMm` = 20 × 15 = **300 mm²**
- `pushScore` (`:267`) converte para cm²: `300 / 100` = **3,0 cm²**
- `PUSH_AREA_STEPS` (`:50-61`): primeiro passo com `3.0 <= max` é `[3.0, 5]` → subscore de área **5**
- `EXUDATE_SCORE.moderate` (`:45`) → **2**
- `TISSUE_SCORE.granulation` (`:37`) → **2**
- Total = 5 + 2 + 2 = **9** ✅ O valor assertado bate com a tabela PUSH 3.0 do domínio.

`kind: "push"` também confere: `condition.kind === "wound"` → `pushScore` (`src/app/api/photos/triage/route.ts:16-20`).

---

## Regra payload/conjunção — asserções em valor/estado, não só na chamada

| Payload | Verificação | Resultado |
| ------- | ----------- | --------- |
| Item da fila de triagem | `latestScore` é comparado por **objeto completo** (`toEqual({ kind: "push", value: 9 })`, `audit-lgpd-routes.test.ts:393`) — kind e value em conjunção, não campo isolado. `latestScore` null via `toBeNull()` (`:370`). `waitingHours` comparado por valor (`toBe(0)`, `:371`), **mas só no valor degenerado 0** | ✅ para `latestScore` / ⚠️ para `waitingHours` |
| DTO de pacote com `expiresAt` | Valor ISO exato no POST (`billing-catalog-routes.test.ts:286`) **e** re-lido no GET da listagem (`:292`) **e** re-lido do banco real após round-trip (`drizzle-repositories-extra.test.ts:230`) — estado persistido, não só a chamada | ✅ |
| Resposta 403 do gate | Conjunção de três fatos: status (`:389`), conteúdo da mensagem (`:390`) e **estado do sistema** — nenhuma foto gravada, verificado por consulta independente ao endpoint de fotos da condição (`:397`) | ✅ |

Nenhuma asserção do escopo se limita a "foi chamado" (não há `toHaveBeenCalled` sobre a lógica nova). O ponto fraco é a **falta de variação de entrada** em `waitingHours`, não a forma da asserção.

---

## Discrimination Sensor

Mutações comportamentais aplicadas em estado descartável (working tree), revertidas com `git checkout -- <arquivo>` imediatamente após cada execução. Nenhuma mutação foi commitada.

| # | Arquivo:linha | Mutação | Testes executados | Killed? |
| - | ------------- | ------- | ----------------- | ------- |
| 1 | `src/app/api/portal/patient/photos/route.ts:54` | Gate de consentimento desativado (`if (false && !consents.some(...))`) — envio passa sem aceite | `tests/api/auth-portal-gaps.test.ts` | ✅ **Killed** — 1 failed / 19 passed; `auth-portal-gaps.test.ts:389` `expected 200 to be 403` |
| 2 | `src/domain/billing/package.ts:74-77` | `isUsableAt` ignora `expiresAt` (`return this.hasBalance`) | `tests/application/operations-wave3.test.ts` | ✅ **Killed** — 2 failed / 12 passed; `:231` `expected true to be false` (COMP3-09) e falha no cenário COMP3-08 (`:202`) |
| 3 | `src/infrastructure/persistence/drizzle/drizzle-package-repository.ts:65-66` | Removida a cláusula `or(isNull(expiresAt), gt(expiresAt, now))` do `findUsable` | `tests/infrastructure/drizzle-repositories-extra.test.ts` | ✅ **Killed** — 1 failed / 20 passed; `:233` `findUsable` retornou o pacote expirado em vez de `null` |
| 4 | `src/app/api/photos/triage/route.ts:13-15` | `latestScoreFor` retornando sempre `null` | `tests/api/audit-lgpd-routes.test.ts` | ✅ **Killed** — 1 failed / 22 passed; `:393` `expected { kind: "push", value: 9 }, received null` |
| 5 | `src/app/api/photos/triage/route.ts:61` | `waitingHours` fixo em `0` (constante, cálculo descartado) | `tests/api/audit-lgpd-routes.test.ts` + `tests/pages/staff-dashboard.test.tsx` (41 passed) e **gate completo do escopo (470 passed)** | ❌ **SOBREVIVEU** |

**Profundidade do sensor**: P0-full (5 mutações — fluxo de compliance LGPD + integridade financeira).
**Resultado**: **4/5 killed** — ❌ FAIL.

### Análise do mutante sobrevivente (#5)

`waitingHours` é o cálculo central do COMP3-04 e a entrada do destaque do COMP3-06, mas **nenhum teste o exercita com um `createdAt` antigo**:

- `tests/api/audit-lgpd-routes.test.ts:371` cria a foto no instante do teste, então o valor correto (0) coincide exatamente com o valor que uma implementação quebrada retorna. A asserção não distingue "calculado" de "hardcoded".
- `tests/pages/staff-dashboard.test.tsx:293/308` injeta `waitingHours` por fixture de fetch mockado — testa a renderização, nunca o cálculo da rota.

Consequência prática: uma regressão que zere a idade da pendência (ex.: fuso/UTC, unidade errada, campo trocado) passaria pelo gate **e desativaria silenciosamente o destaque de 24h do COMP3-06**, que é o objetivo declarado da fase ("fila de triagem sem idade da pendência").

---

## Edge Cases

- [x] **Pacote expira entre a compra e a primeira sessão → não consome** — `tests/application/operations-wave3.test.ts:188-203`: pacote criado com `expiresAt: 2026-01-01` (passado), primeira e única conclusão → `usedSessions` 0 e fatura avulsa criada. A regra é avaliada no momento da conclusão (`isUsableAt(now)` / `findUsable(..., now)`), sem job de expiração. ✅
- [ ] **Duas condições do paciente, uma com consentimento pendente → gate é por paciente, não por condição** — ❌ **sem evidência**. Por construção o gate consulta `consentRecords.findByPatientId(patient.id)` (`src/app/api/portal/patient/photos/route.ts:53`), sem qualquer referência a `conditionId`, mas **nenhum teste cria duas condições para o mesmo paciente e demonstra o comportamento uniforme**. Uma refatoração que introduzisse escopo por condição não seria detectada.

---

## Gate Check

- **Comando**: `node_modules/.bin/vitest run tests/api tests/application/operations-wave3.test.ts tests/infrastructure tests/pages/staff-dashboard.test.tsx`
- **Resultado**: **19 arquivos, 470 testes, 470 passed, 0 failed, 0 skipped** (29,2 s)
- **Testes adicionados pela fase (derivado do diff)**: **+9** — `audit-lgpd-routes` +2, `auth-portal-gaps` +1, `billing-catalog-routes` +1, `operations-wave3` +2, `drizzle-repositories-extra` +1, `staff-dashboard` +2
- **Contagem antes da fase (escopo)**: 461 (derivada; não re-executada no commit base)
- **Integridade de testes**: nenhum teste removido; nenhuma asserção existente enfraquecida. Dois testes preexistentes foram **fortalecidos com pré-condição** (POST de consentimento em `auth-portal-gaps.test.ts:441` e `audit-lgpd-routes.test.ts:114`) — mudança necessária e correta dado o novo gate, não um relaxamento.
- **Skips**: nenhum.
- **Nota de infraestrutura**: `tests/infrastructure/drizzle-repositories-extra.test.ts` roda contra PGlite com as migrações reais aplicadas (`migrate(db, { migrationsFolder: "drizzle" })`, `:41`), então a migração `0017_package-expiry.sql` está efetivamente exercitada.

---

## Code Quality

| Princípio | Status |
| --------- | ------ |
| Código mínimo (sem features além do pedido) | ✅ |
| Mudanças cirúrgicas | ✅ |
| Sem abstrações para uso único | ✅ — `latestScoreFor` é helper local justificado |
| Sem "flexibilidade" desnecessária | ✅ — `now` como parâmetro default é exigido pela testabilidade da regra |
| Só tocou arquivos necessários | ✅ |
| Não "melhorou" código não relacionado | ✅ |
| Segue padrões existentes | ✅ — migração aditiva nullable (padrão 0009/0016), `ConsentRequiredError` mapeado em `statusForDomainError` como os demais erros de domínio, `expiresAt` espelha o padrão já usado em `SupplyBatch` |
| Sem mutação / imutabilidade | ✅ |
| Spec-anchored outcome check (valores assertados batem com a spec) | ⚠️ — `waitingHours` (COMP3-04b) assertado apenas no valor degenerado; PUSH 9 conferido e correto |
| Per-layer Coverage Expectation (domínio 1:1; rotas happy+edge+error) | ⚠️ — domínio de pacotes 1:1 OK; rota de fotos do portal cobre happy+403; **rota de triagem não cobre o caminho de idade > 0** |
| Todo teste do escopo mapeia para AC/edge case/critério | ✅ — os 9 testes novos citam COMP3-xx no título |
| Diretrizes documentadas do projeto seguidas | ✅ — `AGENTS.md` (Next.js desta versão), padrão AAA e nomenclatura "Dado/Quando/Então" consistentes com a suíte |
| Design implementado integralmente | ❌ — design prevê "Portal UI: aviso na seção de envio quando `accepted=false`" (design.md:21-22); nenhum arquivo do portal foi alterado no range |

---

## Fix Plans

### Fix 1 — `waitingHours` sem teste discriminante (mutante sobrevivente) — **Blocker**

- **Causa raiz**: o único teste de rota (`tests/api/audit-lgpd-routes.test.ts:371`) valida `waitingHours` numa foto recém-criada, onde o resultado correto (0) é idêntico ao de uma implementação constante. O teste de página usa fixture e não toca a rota.
- **Tarefa**: adicionar um cenário na rota de triagem com uma foto cujo `createdAt` seja retroativo (ex.: 30h atrás — gravar direto pelo repositório/`ConditionPhoto.restore` ou usar `vi.setSystemTime`) e assertar `expect(entry?.waitingHours).toBe(30)`. Complementar com um caso de arredondamento (`Math.floor`), ex.: 90 min → `1`.
- **Onde**: `tests/api/audit-lgpd-routes.test.ts` (bloco `GET /api/photos/triage`).
- **Done when**: a mutação `waitingHours: 0` falha o suite.

### Fix 2 — COMP3-03 sem evidência no nível do gate — **Major**

- **Causa raiz**: a invalidação por mudança de hash só é testada no agregado `ConsentRecord`; a integração "aceite defasado ⇒ envio bloqueado" nunca é exercitada.
- **Tarefa**: teste que grava um `ConsentRecord` com hash de texto antigo (ex.: `ConsentRecord.create({ consentText: "TERMO ANTIGO" })` via repositório) e então faz `POST /api/portal/patient/photos` → `expect(response.status).toBe(403)` + nenhuma foto gravada.
- **Onde**: `tests/api/auth-portal-gaps.test.ts`.
- **Done when**: mutação que troque `record.covers(CONSENT_TEXT)` por `true`/comparação frouxa é morta.

### Fix 3 — Edge case "gate por paciente, não por condição" sem evidência — **Major**

- **Causa raiz**: nenhum cenário com duas condições ativas do mesmo paciente.
- **Tarefa**: criar duas condições para o mesmo paciente; sem consentimento, ambas retornam 403; após um único aceite, ambas aceitam upload.
- **Onde**: `tests/api/auth-portal-gaps.test.ts`.
- **Done when**: o teste falha se o gate passar a consultar consentimento por condição.

### Fix 4 — COMP3-10 coberto só no DTO; nenhuma UI mostra a validade — **Major**

- **Causa raiz**: `expiresAt` é exposto pela API (`/api/packages` GET), mas nenhuma tela consome a listagem de pacotes — nem staff (`faturamento/page.tsx` só faz POST de venda) nem portal do paciente. O AC diz "portal/staff lista pacotes".
- **Tarefa**: decidir com o negócio se COMP3-10 é requisito de API ou de UI. Se UI: renderizar a validade na listagem de pacotes + teste de página. Se API: **ajustar o texto do AC na spec** para "a API de pacotes SHALL expor `expiresAt` quando existir" (spec-precision gap).
- **Onde**: `.specs/features/fase-3-compliance-ux-clinico/spec.md` e/ou `src/app/(staff)/faturamento/page.tsx` + `tests/pages/`.

### Fix 5 — Aviso de consentimento no portal previsto no design não implementado — **Minor**

- **Causa raiz**: `design.md:21-22` prevê aviso na seção de envio quando `accepted=false`; nenhum arquivo do portal foi tocado. Sem isso o paciente só descobre o bloqueio ao receber o 403.
- **Tarefa**: exibir o aviso na UI do portal, ou registrar explicitamente como fora de escopo no design.

### Spec-precision gaps sinalizados

1. **COMP3-01** — "mensagem orientando o aceite no portal" não fixa o texto; o teste valida só o prefixo `"Consentimento pendente"`, não a parte de orientação. Aceitável, mas a spec não define o desfecho com precisão.
2. **COMP3-06** — "mais de 24h" vs. implementação `waitingHours >= 24`; a fronteira exata (24h) não é definida sem ambiguidade na spec nem testada.
3. **COMP3-10** — "portal/staff lista pacotes" não define se é requisito de API ou de UI (ver Fix 4).

---

## Requirement Traceability Update

| Requisito | Status anterior | Novo status |
| --------- | --------------- | ----------- |
| COMP3-01 | Implemented | ✅ Verified |
| COMP3-02 | Implemented | ✅ Verified |
| COMP3-03 | Implemented | ❌ Needs Fix (sem evidência no gate) |
| COMP3-04 | Implemented | ❌ Needs Fix (`latestScore` verificado; `waitingHours` não discriminado) |
| COMP3-05 | Implemented | ✅ Verified |
| COMP3-06 | Implemented | ✅ Verified (fronteira 24h não testada) |
| COMP3-07 | Implemented | ✅ Verified |
| COMP3-08 | Implemented | ✅ Verified |
| COMP3-09 | Implemented | ✅ Verified |
| COMP3-10 | Implemented | ⚠️ Partial (só DTO da API) |

---

## Summary

**Geral**: ❌ **Not Ready** (correções pontuais de teste; o código de produção está correto no que foi verificado)

**Spec-anchored check**: 8/11 ACs com evidência plena batendo o desfecho da spec; 2 GAPs; 1 parcial; 3 spec-precision gaps sinalizados
**Sensor**: 4/5 mutações mortas — 1 sobrevivente (`waitingHours`)
**Gate**: 470 passed, 0 failed, 0 skipped

**O que funciona (verificado empiricamente)**:
- Gate de consentimento bloqueia com 403, mensagem correta e **sem gravar a foto** — mutação que remove o gate é morta
- Validade de pacote é honrada em **três camadas** (invariante de domínio `isUsableAt`, SQL do `findUsable` com PGlite real, caso de uso de conclusão) — cada camada tem mutação própria e todas morrem
- `latestScore` da fila calcula PUSH corretamente; o valor 9 esperado pela spec confere com a tabela PUSH 3.0 do domínio (área 5 + exsudato 2 + tecido 2)
- Destaque visual > 24h na UI da fila, com caso positivo e negativo
- Migração `0017_package-expiry` é aditiva e nullable, exercitada pelas migrações reais nos testes

**Problemas encontrados**: Fix 1 (Blocker), Fix 2/3/4 (Major), Fix 5 (Minor) — todos detalhados acima.

**Próximos passos**: aplicar Fix 1 (obrigatório para matar o mutante), depois Fix 2 e Fix 3; decidir com o negócio o escopo do COMP3-10 (Fix 4) e o aviso do portal (Fix 5). Re-verificar após as correções.

---

## Re-verificação (iteração 1)

**Data**: 2026-08-15
**Commits de correção**: `124f648` (testes discriminantes) e `209f479` (UI de validade + aviso no portal)
**Verificador**: sub-agente independente (autor ≠ verificador), evidence-or-zero
**Escopo**: os 5 gaps do relatório acima, re-verificados por mutação; histórico anterior preservado intacto

**Veredito**: ✅ **PASS** — 5/5 gaps fechados; 7/7 mutações mortas; gate verde

### Gaps re-verificados

| # | Gap | Evidência (`file:line` + asserção) | Mutação aplicada | Resultado |
| - | --- | ---------------------------------- | ---------------- | --------- |
| 1 | **(Blocker)** `waitingHours` não discriminado | `tests/api/audit-lgpd-routes.test.ts:374` — o teste envelhece a foto no banco via `ConditionPhoto.restore({ createdAt: Date.now() - 30h })` e assere `:404` `expect(entry?.waitingHours).toBe(30)` + `:405` `expect(entry?.createdAt).toBe(thirtyHoursAgo.toISOString())` (conjunção: idade **e** timestamp de origem) | (a) `waitingHours: 0` constante; (b) `Math.ceil` em vez de `Math.floor`; (c) divisor errado (`MS_PER_HOUR * 24`) | ✅ **3/3 killed** — (a) `expected +0 to be 30`; (b) `expected 31 to be 30` **e** `expected 1 to be +0` no caso de 0h; (c) `expected 1 to be 30` |
| 2 | **(Major)** COMP3-03 hash defasado | `tests/api/auth-portal-gaps.test.ts:400` — grava `ConsentRecord.create({ consentText: "Versão anterior do termo…" })` direto no repositório e faz POST real; `:445` `expect(response.status).toBe(403)` + `:446` `expect(body.error).toContain("Consentimento pendente")` | `consents.length > 0` no lugar de `consents.some((r) => r.covers(CONSENT_TEXT))` (`src/app/api/portal/patient/photos/route.ts:54`) | ✅ **Killed** — falha isolada e exata no teste COMP3-03: `expected 200 to be 403` |
| 3 | **(Major)** Edge case gate por paciente | `tests/api/auth-portal-gaps.test.ts:449` — um único aceite + duas condições do mesmo paciente; loop assere `:492` `expect(response.status).toBe(200)` e `:493` `expect(body.data.triageStatus).toBe("pending")` para **ambas** | Escopo do gate trocado para condição: `findByPatientId(condition.id)` (`:53`) | ✅ **Killed** — `expected 403 to be 200` |
| 4 | **(Major)** COMP3-10 sem UI | Prontuário: `tests/pages/staff-paciente-detail.test.tsx:1402` (3 casos) — `:1427` saldo `"7 de 10 sessões restantes"`, `:1428` `/Válido até 30\/06\/2030/`, `:1454` `/Expirado em 01\/01\/2020/` com `toHaveClass("text-red-700")`, `:1465` estado vazio. Venda: `tests/pages/staff-faturamento.test.tsx:590` — `:623` `expiresAt: "2030-06-30T23:59:59.000Z"` no corpo exato do POST | (a) exibição da validade substituída por `"Sem validade"` fixo em `packages-section.tsx`; (b) `expiresAt: null` fixo no payload de venda (`faturamento/page.tsx`) | ✅ **2/2 killed** — (a) 2 testes falham (`Unable to find … /Válido até 30\/06\/2030/` e `/Expirado em 01\/01\/2020/`); (b) `staff-faturamento` COMP3-07 falha |
| 5 | **(Minor)** Aviso de consentimento no portal | `tests/pages/portal.test.tsx:680` — `:692` `findByText("Aceite o termo de consentimento acima para enviar fotos à equipe.")` **e** `:694` `expect(document.querySelector('input[type="file"]')).toBeNull()` (conjunção: avisa **e** remove o caminho de envio) | `consentPending = false` em `src/app/portal/consent-card.tsx` | ✅ **Killed** — `Unable to find an element with the text: Aceite o termo…` |

### Contrato real da UI de pacotes (verificado, não assumido)

Os testes de página usam `fetch` mockado, então o contrato foi conferido contra a rota real: `GET /api/packages` (`src/app/api/packages/route.ts:33-45`) aceita `?patientId=`, chama `sessionPackages.findByPatientId` e devolve `procedureName` e `expiresAt` no DTO (`:19-31`) — exatamente os campos que `packages-section.tsx` consome. A UI não depende de um contrato inexistente.

### Sensor — iteração 1

| # | Arquivo | Mutação | Killed? |
| - | ------- | ------- | ------- |
| 1 | `src/app/api/photos/triage/route.ts:61` | `waitingHours: 0` constante | ✅ |
| 2 | `src/app/api/photos/triage/route.ts:61` | `Math.ceil` em vez de `Math.floor` | ✅ |
| 3 | `src/app/api/photos/triage/route.ts:61` | divisor `MS_PER_HOUR * 24` | ✅ |
| 4 | `src/app/api/portal/patient/photos/route.ts:54` | `consents.length > 0` (ignora o hash) | ✅ |
| 5 | `src/app/api/portal/patient/photos/route.ts:53` | consentimento por condição (`findByPatientId(condition.id)`) | ✅ |
| 6 | `src/app/(staff)/pacientes/[id]/packages-section.tsx:45-47` | validade sempre `"Sem validade"` | ✅ |
| 7 | `src/app/(staff)/faturamento/page.tsx:330` | `expiresAt: null` fixo no POST de venda | ✅ |
| 8 | `src/app/portal/consent-card.tsx:79` | `consentPending = false` | ✅ |

**Resultado**: **8/8 killed** (0 sobreviventes). Todas as mutações em working tree descartável, revertidas com `git checkout -- <arquivo>` imediatamente após cada execução; nenhuma commitada; `git status` limpo em `src/` e `tests/` ao final.

### Gate Check — iteração 1

- **Comando**: `node_modules/.bin/vitest run tests/api tests/pages tests/application/operations-wave3.test.ts tests/infrastructure`
- **Resultado**: **29 arquivos, 763 testes, 763 passed, 0 failed, 0 skipped** (35,7 s)
- **Integridade de testes**: `git diff 96bc6aa..HEAD -- tests/` = **262 inserções, 0 deleções** — nenhum teste removido, nenhuma asserção enfraquecida. A única mudança em teste preexistente foi **fortalecimento**: o corpo exato esperado no POST de venda ganhou `expiresAt: null` (`staff-faturamento.test.tsx`), refletindo o novo campo.
- **Skips**: nenhum (as ocorrências de `skipped` na suíte são asserções de domínio sobre agendamento em lote, não `it.skip`).
- **Determinismo de datas**: `vitest.config.ts:19-20` fixa `TZ: "UTC"`, então as asserções de data formatada (`30/06/2030`, `01/01/2020`) não dependem do fuso da máquina — confirmado executando com `TZ=America/Sao_Paulo` (50/50 passed).

### Requirement Traceability — atualização

| Requisito | Status anterior | Novo status |
| --------- | --------------- | ----------- |
| COMP3-01 | ✅ Verified | ✅ Verified (+ aviso preventivo no portal) |
| COMP3-02 | ✅ Verified | ✅ Verified |
| COMP3-03 | ❌ Needs Fix | ✅ **Verified** — gate exercitado com hash defasado |
| COMP3-04 | ❌ Needs Fix | ✅ **Verified** — `waitingHours` discriminado (30h) e `latestScore` |
| COMP3-05 | ✅ Verified | ✅ Verified |
| COMP3-06 | ✅ Verified | ✅ Verified (fronteira exata 24h segue sem teste — spec-precision) |
| COMP3-07 | ✅ Verified | ✅ Verified (+ campo de validade na venda) |
| COMP3-08 | ✅ Verified | ✅ Verified |
| COMP3-09 | ✅ Verified | ✅ Verified |
| COMP3-10 | ⚠️ Partial | ✅ **Verified** — aba Pacotes no prontuário exibe validade e destaca expirado |
| Edge case "gate por paciente" | ❌ sem evidência | ✅ **Verified** |
| Edge case "expira entre compra e sessão" | ✅ Verified | ✅ Verified |

### Observações remanescentes (não bloqueantes)

1. **COMP3-06 — fronteira 24h** (spec-precision, herdado): a spec diz "mais de 24h", o código usa `waitingHours >= 24`. O novo teste de 30h não toca a fronteira. Divergência de 1h numa faixa de baixo impacto; recomenda-se fixar o texto da spec numa próxima fase.
2. **Fim do dia em UTC na venda**: o formulário monta `${data}T23:59:59.000Z` (`faturamento/page.tsx:330`). Para uma clínica em UTC-3, o pacote expira às 20:59:59 locais do dia escolhido, não às 23:59:59 locais. Comportamento consistente e testado, mas é uma decisão de produto implícita — vale confirmar com o negócio.
3. **Portal do paciente não lista pacotes**: COMP3-10 diz "portal/staff"; a leitura disjuntiva está satisfeita pela tela de staff. Se o negócio quiser a visão do paciente, é escopo novo.

### Summary — iteração 1

**Geral**: ✅ **Ready**

**Spec-anchored check**: 10/10 ACs + 2 edge cases com evidência plena batendo o desfecho da spec (antes: 8/11 + 1 edge case)
**Sensor**: 8/8 mutações mortas, 0 sobreviventes (antes: 4/5)
**Gate**: 763 passed, 0 failed, 0 skipped
**Integridade**: +262 linhas de teste, 0 deleções; nenhuma asserção enfraquecida

Os cinco gaps da verificação anterior foram fechados com evidência empírica. O `waitingHours` agora é discriminado por três mutações independentes (constante, arredondamento e unidade), o gate de consentimento é exercitado tanto no caminho do hash defasado quanto no escopo por paciente, e o COMP3-10 deixou de ser só DTO — a validade é alcançável pela venda e visível no prontuário, com o caso expirado destacado.
