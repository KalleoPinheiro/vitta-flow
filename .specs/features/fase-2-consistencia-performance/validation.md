# Fase 2 — Consistência Transacional e Performance — Validation

**Data**: 2026-08-15
**Spec**: `.specs/features/fase-2-consistencia-performance/spec.md`
**Diff range**: `6fca9d3..8ba4d4f` (commits 59e19fe, 47baaf0, cc6ffdd, 3684089, 8ba4d4f) — `git diff 6fca9d3..8ba4d4f -- src/ tests/`
**Verifier**: sub-agente independente (author ≠ verifier), evidence-or-zero

---

## Task Completion

| Task | Status | Notes |
|------|--------|-------|
| T1 (findByIds + triagem em lote) | ✅ Done | commit 59e19fe |
| T2 (cache de relatório) | ✅ Done | commit 47baaf0 |
| T3 (adjustStock condicional) | ✅ Done | commit cc6ffdd — ver sensor: mutante sobrevivente no ramo de corrida |
| T4 (porta TransactionManager) | ✅ Done | commit 3684089 |
| T5 (conclusão transacional) | ✅ Done | commit 8ba4d4f |

---

## Spec-Anchored Acceptance Criteria

Caminhos relativos à raiz do worktree.

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
|-----------|----------------------|-------------------------|--------|
| CONS2-01 — falha da fatura na transação → nada persiste | erro; consulta volta a scheduled; nenhuma fatura | `tests/api/api-flow.test.ts:140-165` — `expect(response.status).toBe(500)` (l.152), `expect(afterBody.data.status).toBe("scheduled")` (l.159), `expect(invoices.data).toHaveLength(0)` (l.165); reforço em `tests/infrastructure/drizzle-repositories.test.ts:249-269` — `rejects.toThrow("falha simulada após o save")` + `expect(await appointmentRepo.findById(failing.id)).toBeNull()` | ✅ PASS |
| CONS2-02 — sucesso → comportamento externo idêntico | fatura pendente criada, pacote consumido, retorno criado, contrato HTTP igual | Parcialmente estrutural. Testes pré-existentes intactos e verdes: `tests/api/api-flow.test.ts:169-188` — `expect(body.data.status).toBe("completed")` (l.176), `expect(invoices.data[0].amountCents).toBe(25000)` (l.186); pacote: `tests/application/operations-wave3.test.ts:154-188` (consome sessão/não fatura; esgotado volta a faturar); retorno: `tests/application/inventory-followup-reports.test.ts:149-171` (com/sem followUpInDays); commit: `tests/infrastructure/drizzle-repositories.test.ts:270-288` — `expect(await invoiceRepo.findById(invoice.id)).not.toBeNull()`. Diff da rota (`src/app/api/appointments/[id]/route.ts`) mostra apenas o wrap em `services.transactions.run` com os mesmos argumentos do `CompleteAppointment` — contrato preservado | ✅ PASS |
| CONS2-03 — driver in-memory → run no-op | fn executada diretamente com os repos injetados | `tests/application/ports.test.ts:24-33` — `expect(received).toBe(repos)` (l.29), `expect(result).toBe(42)` (l.33); erro propaga: l.39 `rejects.toThrow("boom")` | ✅ PASS |
| CONS2-04 — reexecução sobre concluída → reparo idempotente | fatura criada se faltar; repetição não duplica | pré-existentes, intactos no diff e verdes: `tests/application/appointments.test.ts:183-198` — `expect(invoices).toHaveLength(1)` + repetição `expect(await invoiceRepo.findAll()).toHaveLength(1)`; `tests/application/operations-wave3.test.ts:171-184` — reparo não consome segunda sessão | ✅ PASS |
| CONS2-05 — saída com saldo → decremento condicional retorna atualizado | `stock_qty + delta >= 0` no UPDATE; insumo atualizado retornado | `tests/infrastructure/drizzle-clinical-inventory.test.ts:153-160` — `expect(afterExit?.stockQty).toBe(6)`; in-memory: `tests/infrastructure/in-memory-repositories.test.ts:637` — `expect((await repo.adjustStock(supply.id, -3))?.stockQty).toBe(2)` | ✅ PASS |
| CONS2-06 — saída deixaria negativo → repo null; use case lança com mensagem atual | repo retorna null e nada muda; use case lança erro do domínio | Repo: `tests/infrastructure/drizzle-clinical-inventory.test.ts:163-164` — `expect(await supplyRepo.adjustStock(supply.id, -11)).toBeNull()` + `stockQty` segue 10; `tests/infrastructure/in-memory-repositories.test.ts:639-640` — `toBeNull()` + saldo intacto. Use case (caminho via snapshot de domínio): `tests/application/inventory-followup-reports.test.ts:71-80` — `rejects.toThrow(InsufficientStockError)` + `stockQty` segue 5. **Ramo do use case quando `adjustStock` retorna null (corrida) não tem teste — mutante sobreviveu (sensor M5)**. Nota de precisão: a spec diz "ValidationError", mas o erro atual do domínio (pré-existente, `src/domain/inventory/supply.ts:77`) é `InsufficientStockError`; a implementação preserva classe e formato de mensagem atuais — imprecisão da spec, não regressão | ⚠️ PASS com gap de discriminação + spec-precision |
| CONS2-07 — entrada usa o mesmo caminho atômico | incremento via `adjustStock` | `tests/infrastructure/drizzle-clinical-inventory.test.ts:159-160` — `expect(afterEntry?.stockQty).toBe(10)` (delta +4); `tests/infrastructure/in-memory-repositories.test.ts:638` — delta +1 → 3; use case: `src/application/inventory/register-stock-movement.ts:67-68` (`delta = input.quantity` p/ "in", único caminho) + `tests/application/inventory-followup-reports.test.ts:57-67` (entrada persiste 50) | ✅ PASS |
| CONS2-08 — saídas concorrentes → no máximo uma excede | garantido pela condição no UPDATE; testado via semântica do repo | `src/infrastructure/persistence/drizzle/drizzle-inventory-repositories.ts:45-52` — `WHERE ... AND stock_qty + delta >= 0` num único UPDATE; semântica testada em `tests/infrastructure/drizzle-clinical-inventory.test.ts:163-164` (null quando excede, estado intacto). Sensor M2 confirma que remover a condição é detectado | ✅ PASS |
| CONS2-09 — fila com K condições → UMA chamada (`findByIds`) | busca em lote única | Rota: `src/app/api/photos/triage/route.ts:12` — `await conditions.findByIds(conditionIds)` (loop `Promise.all`+`findById` removido no diff). Repo drizzle: `tests/infrastructure/drizzle-clinical-inventory.test.ts:257-260` — `findByIds([])` → `[]`, dedup e filtro de inexistente; in-memory: `tests/infrastructure/in-memory-repositories.test.ts:429-437` — `expect(found.map((c) => c.id)).toEqual(["cond-2"])` | ✅ PASS |
| CONS2-10 — payload da fila idêntico | payload atual preservado | Parcialmente estrutural. Teste pré-existente intacto e verde: `tests/api/audit-lgpd-routes.test.ts:334-348` — `expect(entry?.patientId).toBe(patientId)`, `expect(entry?.patientName).toBe("Beatriz Auditoria")`, `expect(entry?.conditionTitle).toBe("Ferida sacral")`. Diff da rota altera só a montagem do `conditionById`; o `return pending.map(...)` (shape com 7 campos) está intocado. Sensor M4 confirma que quebrar o lote é detectado por esse teste | ✅ PASS |
| CONS2-11 — mês encerrado 2x → segunda do cache | use case executado uma vez | `tests/api/followups-reports-routes.test.ts:400-411` — `expect(executeSpy).toHaveBeenCalledTimes(1)` após dois GET de `2020-01` | ✅ PASS |
| CONS2-12 — mês corrente/futuro → recalcula sempre | use case executado a cada acesso | `tests/api/followups-reports-routes.test.ts:417-426` — dois GET do mês corrente (`reportMonth`) → `expect(executeSpy).toHaveBeenCalledTimes(2)` | ✅ PASS |
| CONS2-13 — cache responde → payload idêntico | resposta cacheada == cálculo direto | `tests/api/followups-reports-routes.test.ts:412` — `expect(secondBody).toEqual(firstBody)` (igualdade profunda do envelope inteiro — conjunção completa do payload) | ✅ PASS |

**Status**: ⚠️ 13/13 ACs com evidência; 1 gap de discriminação (CONS2-06, ramo de corrida) + 1 nota de spec-precision (CONS2-06 "ValidationError")

### Regra payload/conjunção nos payloads

- **Relatório (CONS2-13)**: conjunção completa — `toEqual(firstBody)` compara o envelope inteiro (deep equality). ✅
- **Fila de triagem (CONS2-10)**: conjunção parcial — o teste ancora `id`, `patientId`, `patientName`, `conditionTitle`; os campos `conditionId`, `patientNote`, `createdAt` do payload (rota l.19-31) não são assertados individualmente. Aceitável (campos derivados diretos), registrado como observação menor.
- **Fatura (CONS2-02)**: conjunção nos campos de negócio — `toHaveLength(1)`, `amountCents === 25000`, `appointmentId` (api-flow l.185-187), com status implícito pelo filtro `?status=pending`. ✅

---

## Discrimination Sensor

Executado em estado descartável; cada mutação revertida com `git checkout -- <arquivo>` imediatamente após o run. Nenhum commit.

| # | Mutação | File:line | Testes rodados | Killed? |
|---|---------|-----------|----------------|---------|
| M1 | `DrizzleTransactionManager.run` sem transação (repos sobre `this.db`) | `src/infrastructure/persistence/drizzle/drizzle-transaction-manager.ts:19-27` | `tests/infrastructure/drizzle-repositories.test.ts` + `tests/api/api-flow.test.ts` | ✅ Morta — 2 falhas (teste do tx manager e rollback do PATCH complete) |
| M2 | `adjustStock` drizzle sem `stock_qty + delta >= 0` no WHERE | `src/infrastructure/persistence/drizzle/drizzle-inventory-repositories.ts:49` | `tests/infrastructure/drizzle-clinical-inventory.test.ts` | ✅ Morta — 1 falha (CONS2-05..08) |
| M3 | Rota de reports cacheando também o mês corrente (`isClosedMonth = true`) | `src/app/api/reports/route.ts:24` | `tests/api/followups-reports-routes.test.ts` | ✅ Morta — 1 falha (CONS2-12) |
| M4 | Rota de triagem com lote vazio (`findByIds([])`) | `src/app/api/photos/triage/route.ts:12` | `tests/api/audit-lgpd-routes.test.ts` | ✅ Morta — 1 falha (fila com nome do paciente) |
| M5 | `RegisterStockMovement` ignorando `null` de `adjustStock` (`?? supply`, sem lançar) | `src/application/inventory/register-stock-movement.ts:68-73` | `tests/application/inventory-followup-reports.test.ts` + `tests/api/inventory-routes.test.ts` | ❌ **Sobreviveu** — 26/26 verdes. O teste de estoque insuficiente lança antes, no `registerExit` do snapshot; nenhum teste exercita o ramo `!updated` (corrida CONS2-06/08). `grep adjustStock tests/` confirma: só testes de repo, nenhum de use case → fix task |

**Sensor depth**: lightweight+ (5 mutações comportamentais)
**Result**: 4/5 mortas — ❌ FAIL (1 mutante sobrevivente)

---

## Code Quality

| Principle | Status |
|-----------|--------|
| Código mínimo, sem scope creep (diff toca só os arquivos das 5 tasks; porta `TransactionScope` enxuta/YAGNI) | ✅ |
| Mudanças cirúrgicas (rotas: só wrap/lote/cache; use case: só o caminho atômico) | ✅ |
| Segue padrões existentes (DIP com ports, dedup em `findByIds` igual a `findByPatientIds`, BDD pt-br nos testes) | ✅ |
| Spec-anchored outcome check | ⚠️ CONS2-06: spec diz "ValidationError", código lança `InsufficientStockError` (comportamento pré-existente do domínio preservado — imprecisão da spec) |
| Per-layer Coverage Expectation (matrix em tasks.md) | ⚠️ "Use case RegisterStockMovement: ACs 05–07" — ramo null do use case sem teste unitário (M5) |
| Todo teste novo mapeia para AC/edge case (sem testes órfãos) | ✅ |
| Guidelines do projeto seguidas (vitest, BDD pt-br, PGlite por worker — tasks.md) | ✅ |

---

## Edge Cases

- [x] Transação falha após consumo do pacote → revertido: **estrutural** — `sessionPackages` é reconstruído sobre o `tx` (`drizzle-transaction-manager.ts:25`) e o `CompleteAppointment` recebe `tx.sessionPackages` (`route.ts`); o rollback da mesma transação é provado com appointments+invoices (`drizzle-repositories.test.ts:249-269`). Sem teste direto com pacote no cenário de falha — observação menor.
- [x] `adjustStock` para insumo inexistente → `NotFoundError` atual preservado: use case lança no `findById` (`register-stock-movement.ts:34-37`), teste pré-existente verde `tests/application/inventory-followup-reports.test.ts:84-92` — `rejects.toThrow(NotFoundError)`; nível repo: `adjustStock("nao-existe")` → null (`drizzle-clinical-inventory.test.ts:167`, `in-memory-repositories.test.ts:641`).
- [x] Mês que termina exatamente hoje (mês corrente) → não cacheia: `to <= startOfCurrentMonth` (`reports/route.ts:23-24`) exclui o mês corrente; testado por CONS2-12 (`followups-reports-routes.test.ts:417-426`, mês corrente recalculado 2x) e o sensor M3 confirma a discriminação da fronteira.

---

## Gate Check

- **Gate command**: `node_modules/.bin/vitest run tests/api/api-flow.test.ts tests/api/followups-reports-routes.test.ts tests/infrastructure tests/application/ports.test.ts`
- **Result**: **198 passed, 0 failed, 0 skipped** (9 arquivos, 10.4s)
- **Âncoras pré-existentes** (CONS2-02/04/06/10): `vitest run tests/application/appointments.test.ts tests/application/operations-wave3.test.ts tests/application/inventory-followup-reports.test.ts tests/api/audit-lgpd-routes.test.ts` → **59 passed, 0 failed**
- **Integridade**: diff só adiciona testes (+~130 linhas em 6 arquivos, nenhum removido/enfraquecido); testes pré-existentes de conclusão/reparo/estoque/triagem intactos no diff

---

## Fix Plans

### Fix 1: Mutante sobrevivente — ramo `!updated` de RegisterStockMovement (M5)

- **Root cause**: o único cenário de estoque insuficiente testado lança no `registerExit` do snapshot, antes do `adjustStock`; o ramo de proteção contra corrida (repo retorna null com snapshot válido) nunca é exercitado.
- **Fix task**: teste unitário em `tests/application/inventory-followup-reports.test.ts` com stub/spy de `SupplyRepository.adjustStock` retornando `null` (snapshot com saldo suficiente) → `rejects.toThrow(InsufficientStockError)` e nenhuma movimentação salva (`movements.findBySupplyId` vazio).
- **Priority**: Major (é exatamente a garantia anti-corrida que motivou CONS2-06/08).

### Fix 2 (menor): reconciliar texto do CONS2-06 na spec

- **Root cause**: spec cita "ValidationError", domínio atual lança `InsufficientStockError` (código `INSUFFICIENT_STOCK`, mensagem preservada).
- **Fix task**: atualizar a redação do AC para "erro atual do domínio (`InsufficientStockError`)" — mudança de documentação, sem código.
- **Priority**: Cosmetic.

### Fix 3 (opcional, menor): teste direto do edge "rollback reverte consumo de pacote"

- Cenário PGlite: consulta com pacote ativo + falha na fatura → `usedSessions` inalterado. Hoje coberto só estruturalmente.
- **Priority**: Minor.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
|-------------|-----------------|------------|
| CONS2-01..04 | Implemented | ✅ Verified |
| CONS2-05 | Implemented | ✅ Verified |
| CONS2-06 | Implemented | ❌ Needs Fix (teste do ramo de corrida — Fix 1) |
| CONS2-07..08 | Implemented | ✅ Verified |
| CONS2-09..10 | Implemented | ✅ Verified |
| CONS2-11..13 | Implemented | ✅ Verified |

---

## Summary

**Overall**: ⚠️ Issues — FAIL apenas pelo sensor (1 mutante sobrevivente); implementação e demais 12 ACs verificados

**Spec-anchored check**: 13/13 ACs com evidência; 1 spec-precision (CONS2-06 "ValidationError" vs `InsufficientStockError`)
**Sensor**: 4/5 mutações mortas (M5 sobreviveu)
**Gate**: 198 passed / 0 failed (+ 59 âncoras pré-existentes verdes)

**What works**: rollback real em PGlite (rota e tx manager), no-op in-memory, decremento condicional no banco (drizzle e in-memory), triagem em lote com payload preservado, cache só de mês encerrado com payload idêntico, reparo idempotente intacto.

**Issues found**: (1) ramo `!updated` do use case de estoque sem teste discriminante — Fix 1; (2) redação do CONS2-06 imprecisa — Fix 2; (3) edge do pacote no rollback só estrutural — Fix 3.

**Next steps**: implementar Fix 1 (Major) e re-verificar M5; Fix 2/3 a critério do orquestrador.

---

## Re-verificação (iteração 1)

**Data**: 2026-08-15
**Commit de correção**: `6454f64` — `test(inventory): cobrir ramo anti-corrida e rollback de consumo de pacote`
**Escopo**: apenas os gaps do relatório anterior (Fix 1 Major, Fix 2 Cosmetic, Fix 3 Minor)

### Resultado por gap

| Gap | Verificação | Resultado |
|-----|-------------|-----------|
| Fix 1 (Major) — mutante M5, ramo `!updated` | Novo teste `tests/application/inventory-followup-reports.test.ts:207-229` ("Baixa de estoque anti-corrida CONS2-06/08"): spy em `adjustStock` retornando `null` sob snapshot com saldo → `rejects.toThrow(InsufficientStockError)` + `movements.findBySupplyId` vazio + `stockQty` intacto (10). **Sensor re-executado**: mutação aplicada em `src/application/inventory/register-stock-movement.ts:68-73` (`?? supply`, throw removido) → `vitest run tests/application/inventory-followup-reports.test.ts` = **1 failed / 10 passed** (falha exatamente no `rejects.toThrow(InsufficientStockError)`, l.224). Mutação revertida com `git checkout --`; re-run = **11 passed**. | ✅ Mutante M5 MORTO |
| Fix 2 (Cosmetic) — redação CONS2-06 na spec | `spec.md:58` agora diz "o use case SHALL lançar \`InsufficientStockError\` com a mensagem atual do domínio" (antes: "ValidationError"). Diff do commit 6454f64 confirma a troca. | ✅ Reconciliado |
| Fix 3 (Minor) — rollback de consumo de pacote | Novo teste `tests/infrastructure/drizzle-repositories.test.ts:293-328`: consumo de pacote (`consumeSession` + `recordConsumption`) dentro de `manager.run` que lança → `expect((await packageRepo.findById(pkg.id))?.usedSessions).toBe(0)` (l.326) e `expect(await packageRepo.wasConsumedBy("appt-tx-falha")).toBe(false)` (l.327). Executado verde no run baseline. | ✅ Coberto |

### Gate da re-verificação

- `node_modules/.bin/vitest run tests/application/inventory-followup-reports.test.ts tests/infrastructure/drizzle-repositories.test.ts` → **41 passed, 0 failed** (2 arquivos, 3.4s)
- Estado final: `git status` limpo em `src/` e `tests/` (mutação do sensor revertida; nenhuma alteração de código pela verificação)

### Sensor atualizado

| # | Mutação | Killed? |
|---|---------|---------|
| M5 (re-run) | `RegisterStockMovement` ignorando `null` de `adjustStock` (`?? supply`, sem lançar) | ✅ Morta — 1 falha (teste anti-corrida novo) |

**Sensor**: 5/5 mutações mortas.

### Traceability atualizada

| Requirement | Previous Status | New Status |
|-------------|-----------------|------------|
| CONS2-06 | ❌ Needs Fix | ✅ Verified |

### Veredito final

**✅ PASS** — 13/13 ACs verificados com evidência; sensor 5/5 mutantes mortos; gate verde; edge case do rollback de pacote agora com teste direto; spec reconciliada. Nenhum gap remanescente.
