# Fase 1 — Hardening de Segurança — Validation

**Data**: 2026-08-15
**Spec**: `.specs/features/fase-1-hardening-seguranca/spec.md`
**Diff range**: `2065377..d5d0a42` (commits da feature: 0befade, 71da476, d482a28, 06581c8, 1580c1a, dda18d9, d5d0a42)
**Verifier**: sub-agente independente (author ≠ verifier), regra evidence-or-zero

---

## Task Completion

| Task | Status | Notas |
| ---- | ------ | ----- |
| T1 (client-ip) | ✅ Done | commit 0befade |
| T2 (guard) | ✅ Done | commit d482a28 |
| T3 (revogação staff) | ✅ Done | commit 06581c8 |
| T4 (cron timing-safe + aviso master) | ✅ Done | commit 1580c1a |
| T5 (auditoria write-ahead) | ✅ Done | commit dda18d9 |
| T6 (sanitizer de imagem) | ✅ Done | commit d5d0a42 |
| 71da476 (fix não planejado) | ✅ Done | testes imunes à data; **nenhuma asserção enfraquecida** (ver abaixo) |

**Auditoria do 71da476**: `git show 71da476` — mudanças são (a) relógio pinado com
`vi.useFakeTimers`/`setSystemTime("2026-07-15")` em 2 arquivos, (b) primeiro dia útil
calculado em vez de dia 01 fixo, (c) fixture `julyAppointmentFixture` com data fixa na
grade de julho. A única asserção alterada (`toHaveBeenCalledWith(julyAppointmentFixture)`
em `tests/pages/staff-agenda.test.tsx`) troca o objeto esperado pelo mesmo fixture
injetado — força equivalente. Nenhuma asserção removida ou afrouxada.

---

## Spec-Anchored Acceptance Criteria

### P1: Revogação de sessão staff (SEC1-01..04)

| Criterion | Desfecho da spec | `file:line` + asserção | Result |
| --------- | ---------------- | ---------------------- | ------ |
| SEC1-01 conta `active=false` → 401 (API) | status 401 + envelope padrão | `tests/lib/proxy-revocation.test.ts:40-42` — `expect(response.status).toBe(401)`; `expect(body).toEqual({ success: false, data: null, error: "Não autenticado" })` | ✅ PASS |
| SEC1-01 conta `active=false` → redirect (página) | redirect para /login | `tests/lib/proxy-revocation.test.ts:50-52` — `expect(response.headers.get("location")).toBe("http://localhost/login")` (3xx assertado em :50-51) | ✅ PASS |
| SEC1-01 (semântica revogado) | conta existente + inativa = revogada | `tests/lib/staff-revocation.test.ts:23` — `expect(await isStaffSessionRevoked(...)).toBe(true)` com `lookup → { isActive: false }` | ✅ PASS |
| SEC1-02 subject "local" → permite | válida sem consultar banco | `tests/lib/staff-revocation.test.ts:35-36` — `toBe(false)` + `expect(lookup).not.toHaveBeenCalled()` | ✅ PASS |
| SEC1-02 email sem linha → permite (deny-list) | válida | `tests/lib/staff-revocation.test.ts:42` — `toBe(false)` com `lookup → null` | ✅ PASS |
| SEC1-03 consulta repetida < 60s → cache | sem nova consulta ao banco | `tests/lib/staff-revocation.test.ts:62-63` — `expect(revoked).toBe(true)`; `expect(lookup).toHaveBeenCalledTimes(1)` (2ª chamada em now+30s) | ✅ PASS |
| SEC1-04 falha de banco → fail-open + log | permite e loga (AD-004) | `tests/lib/staff-revocation.test.ts:84-85` — `toBe(false)` com `lookup` rejeitando + `expect(consoleSpy).toHaveBeenCalled()` | ✅ PASS |

Wiring do proxy: `src/proxy.ts:63-65` — `if (await isStaffSessionRevoked(session)) return unauthorized(request);` (chamada com lookup default) + `tests/lib/proxy-revocation.test.ts:61-63` asserta a sessão passada (`subject`, `role`).

### P1: Fotos sem metadados (SEC1-05..09)

| Criterion | Desfecho da spec | `file:line` + asserção | Result |
| --------- | ---------------- | ---------------------- | ------ |
| SEC1-05 JPEG APP1/APP2+/COM removidos, APP0 e imagem preservados | arquivo sem esses segmentos | `tests/domain/image-sanitizer.test.ts:85-90` — `includesSubsequence(output, EXIF_APP1)→false`, `COMMENT→false`, `JFIF_APP0→true`, `DQT→true`, `detectImageType(output)→"image/jpeg"`, EOI `[0xff,0xd9]` no final; pipeline: `tests/application/condition-photos.test.ts:86` — `not.toContain(0xe1)` | ⚠️ Parcial (ver Gaps: sem fixture APP2..APP15; impl cobre via range `src/domain/clinical/image-sanitizer.ts:72-74`) |
| SEC1-06 PNG tEXt/zTXt/iTXt/eXIf/tIME removidos, IHDR/PLTE/IDAT/IEND preservados | arquivo sem esses chunks | `tests/domain/image-sanitizer.test.ts:98-102` — `TEXT→false`, `IHDR→true`, `IDAT→true`, `IEND→true`, tipo png | ⚠️ Parcial (só tEXt exercitado; os 5 tipos passam pelo mesmo `Set` em `image-sanitizer.ts:99`) |
| SEC1-07 WebP EXIF/XMP removidos + RIFF corrigido + flags VP8X zeradas | os três desfechos | `tests/domain/image-sanitizer.test.ts:114-121` — `"EXIF"→false`, `"XMP "→false`, `expect(output[12+8]).toBe(0x00)`, `expect(riffSize).toBe(output.length - 8)` | ✅ PASS |
| SEC1-08 imagem sem metadados → intacta, sizeBytes do arquivo gravado | bytes intactos; sizeBytes coerente | `tests/domain/image-sanitizer.test.ts:139` — `expect(Array.from(output)).toEqual(Array.from(input))`; `tests/application/condition-photos.test.ts:87-88` — `expect(stored?.byteLength).toBe(jpegWithExif.byteLength - 11)`; `expect(photo.sizeBytes).toBe(stored?.byteLength)` | ✅ PASS |
| SEC1-09 bytes inválidos → rejeição pela validação existente | comportamento atual preservado | `tests/domain/image-sanitizer.test.ts:145` — `expect(stripImageMetadata(input)).toBe(input)`; `tests/application/condition-photos.test.ts:92-93` — `rejects.toThrow(ValidationError)` + `expect(storage.files.size).toBe(0)` | ✅ PASS |

### P1: Rate limit não forjável (SEC1-10..13)

| Criterion | Desfecho da spec | `file:line` + asserção | Result |
| --------- | ---------------- | ---------------------- | ------ |
| SEC1-10 N IPs + hops=1 → último IP | último da cadeia | `tests/lib/client-ip.test.ts:6` — `expect(clientIpFromHeader("203.0.113.7, 10.0.0.2, 172.16.0.1", 1)).toBe("172.16.0.1")` | ✅ PASS |
| SEC1-11 hops=2 → penúltimo | penúltimo | `tests/lib/client-ip.test.ts:10` — `...toBe("10.0.0.2")` | ✅ PASS |
| SEC1-12 header ausente / posição inexistente → "unknown" | "unknown" | `tests/lib/client-ip.test.ts:14` (`null→"unknown"`), `:18` (hops > cadeia), `:22-23` (vazio/só vírgulas) | ✅ PASS |
| SEC1-13 proxy e login usam a mesma função | função compartilhada | **Estrutural**: `src/proxy.ts:5` importa `clientIp` de `@/lib/auth/client-ip` e usa em `:41`; diff `2065377..d5d0a42` de `src/app/api/auth/login/route.ts` remove o parse inline (`split(",")[0]`) e adota `const ip = clientIp(request)` | ✅ PASS |

### P2: Guard unificado (SEC1-14..17)

| Criterion | Desfecho da spec | `file:line` + asserção | Result |
| --------- | ---------------- | ---------------------- | ------ |
| SEC1-14 sem sessão → 401 envelope padrão | 401 + envelope | `tests/lib/guard.test.ts:36-38` — `expect(result.error?.status).toBe(401)`; `expect(body).toEqual({ success: false, data: null, error: "Não autenticado" })` | ✅ PASS |
| SEC1-15 papel errado → 403 mensagem da rota | "Rota exclusiva do portal do paciente" (patient) | `tests/lib/guard.test.ts:44-46` — `toBe(403)` + `expect(body.error).toBe("Rota exclusiva do portal do paciente")`; parceiro em `:52-54` | ✅ PASS |
| SEC1-16 papel confere → retorna sessão | sessão com subject | `tests/lib/guard.test.ts:60-62` — `expect(result.session?.subject).toBe("paciente@x.com")`; `role→"patient"`; `error` undefined | ✅ PASS |
| SEC1-17 rotas do portal adotam o guard sem mudar contrato | adoção nas 6 rotas | **Estrutural** (diff `2065377..d5d0a42 -- src/app/api/portal/`): 6 arquivos trocam o padrão inline por `requireRole` — `portal/partner/route.ts`, `portal/patient/route.ts`, `portal/patient/consent/route.ts` (GET+POST, remove o helper local `requirePatientSession`), `portal/patient/photos/route.ts`, `portal/patient/photos/[id]/route.ts`, `portal/patient/appointments/[id]/confirm/route.ts`. Mensagens/códigos idênticos aos inline removidos (mesmos literais em `src/lib/auth/guard.ts:6-10`); contrato confirmado pela suíte integra verde (gate 433/433) | ✅ PASS |

### P2: Higiene de credenciais (SEC1-18..19)

| Criterion | Desfecho da spec | `file:line` + asserção | Result |
| --------- | ---------------- | ---------------------- | ------ |
| SEC1-18 x-cron-secret em tempo constante | comparação constant-time | **Estrutural**: diff de `src/app/api/reminders/run/route.ts` troca `!==` por `passwordMatches(secret, header ?? "")`; `src/lib/auth/session.ts:109-116` implementa via `timingSafeEqual` com checagem de length. Contrato preservado: `tests/api/audit-lgpd-routes.test.ts:374-383` (secret errado → 401) e `:385-393` (correto → roda) | ✅ PASS (timing em si não é assertável por teste; estrutura verificada) |
| SEC1-19 login master → aviso | log de credencial compartilhada | `tests/api/auth-routes.test.ts:129` — `expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining("senha master"))` | ✅ PASS |

### P2: Auditoria write-ahead (SEC1-20..22)

| Criterion | Desfecho da spec | `file:line` + asserção | Result |
| --------- | ---------------- | ---------------------- | ------ |
| SEC1-20 export LGPD: evento persistido antes do sucesso; falha → falha o request | write-ahead awaited + propagação | Unit: `tests/lib/audit.test.ts:108-112` — `expect(auditEvents.save).toHaveBeenCalledTimes(1)` + payload assertado (`saved.actorId`, `saved.resourceType`); `:119-125` — `await expect(recordAuditNow(...)).rejects.toThrow("banco indisponível")`. **Estrutural**: `src/app/api/patients/[id]/export/route.ts` faz `await recordAuditNow(...)` antes de retornar o payload, dentro de `handleRequest`, cujo catch genérico devolve 500 (`src/lib/api-response.ts:46-47`) | ✅ PASS (⚠️ nota: sem teste de rota "auditoria falha → 500", ver Gaps) |
| SEC1-21 exclusão de foto: idem | write-ahead awaited | Unit: `tests/lib/audit.test.ts:119-125` (payload `action: "delete"`, `resourceType: "photo"`). **Estrutural**: `src/app/api/photos/[id]/route.ts` (DELETE) usa `await recordAuditNow(...)` dentro de `handleRequest` | ✅ PASS (mesma nota) |
| SEC1-22 demais rotas mantêm best-effort (`after()`) | comportamento atual preservado | **Estrutural**: grep pós-diff mostra 17 call sites de `recordAudit(` intactos (conditions, anamnesis, evolutions, assessments, portal, PATCH de foto — `src/app/api/photos/[id]/route.ts:87`); só export GET e photo DELETE migraram. Comportamento best-effort assertado em `tests/lib/audit.test.ts:87-91` — `await expect(afterTasks[0]!()).resolves.toBeUndefined()` + `consoleSpy` com mensagem exata | ✅ PASS |

**Regra payload/conjunção**: as asserções de auditoria verificam o VALOR do evento salvo
(`tests/lib/audit.test.ts:49-55` e `:110-111`: actorRole, actorId, action, resourceType,
resourceId, patientId, detail), não apenas a chamada. Fotos: bytes gravados e tamanho
assertados por valor (`tests/application/condition-photos.test.ts:86-88`). ✅

---

## Edge Cases (da spec)

- [x] JPEG truncado no meio de segmento → devolve original sem lançar: `tests/domain/image-sanitizer.test.ts:148-152` — `expect(Array.from(stripImageMetadata(input))).toEqual(Array.from(input))`
- [x] PNG com chunk length além do buffer → devolve original: `tests/domain/image-sanitizer.test.ts:154-161` — idem
- [x] WebP sem VP8X (formato simples) → conteúdo preservado: `tests/domain/image-sanitizer.test.ts:124-132` — `includesSubsequence(output, vp8)→true` (⚠️ variante "sem VP8X mas COM chunk EXIF" não exercitada; mesmo caminho de código do Set em `image-sanitizer.ts:156`)
- [x] Cache expira exatamente no request → nova consulta: `tests/lib/staff-revocation.test.ts:70-77` — 2ª chamada em `now + REVOCATION_CACHE_TTL_MS` (fronteira exata; impl usa `nowMs < expiresAtMs`) + `expect(lookup).toHaveBeenCalledTimes(2)`. Recache do novo resultado não assertado diretamente (menor).

---

## Discrimination Sensor

Sensor rodado em estado descartável (edição direta + `git checkout --` imediato após cada
rodada; nada commitado). Profundidade: P0/auth → 5 mutações.

| # | Mutação | File:line | Comando | Resultado |
| - | ------- | --------- | ------- | --------- |
| 1 | `!account.isActive` → `account.isActive` (inverte revogação) | `src/lib/auth/staff-revocation.ts:46` | `vitest run tests/lib/staff-revocation.test.ts` | ✅ Killed (3 failed / 5 passed) |
| 2 | `chain[chain.length - hops]` → `chain[0]` (volta ao 1º IP forjável) | `src/lib/auth/client-ip.ts:22` | `vitest run tests/lib/client-ip.test.ts` | ✅ Killed (5 failed / 2 passed) |
| 3 | `keep: !isJpegMetadataMarker(marker)` → `keep: true` (mantém APP1/COM) | `src/domain/clinical/image-sanitizer.ts:68` | `vitest run tests/domain/image-sanitizer.test.ts tests/application/condition-photos.test.ts` | ✅ Killed (2 failed / 13 passed — unit E wiring do use case) |
| 4 | `recordAuditNow` engole erro (try/catch vazio) | `src/lib/audit.ts:43` | `vitest run tests/lib/audit.test.ts` | ✅ Killed (1 failed — o teste "rejeita") |
| 5 | Guard pula checagem de papel (`&& false`) | `src/lib/auth/guard.ts:26` | `vitest run tests/lib/guard.test.ts` | ✅ Killed (2 failed / 2 passed) |

**Sensor depth**: P0-full (5 mutações)
**Result**: 5/5 killed — ✅ PASS. `git status` limpo em `src/` e `tests/` após restauração.

---

## Gate Check

- **Comando**: `node_modules/.bin/vitest run tests/lib tests/domain tests/application/condition-photos.test.ts tests/api/auth-routes.test.ts tests/api/audit-lgpd-routes.test.ts`
- **Resultado**: **36 arquivos / 433 testes passed, 0 failed, 0 skipped** (9.4s)
- **Integridade da suíte**: diff `2065377..d5d0a42 -- tests/` só ADICIONA testes (5 arquivos novos: client-ip 7, guard 4, staff-revocation 8, proxy-revocation 3, image-sanitizer 8; + adições em audit, condition-photos e auth-routes ≈ +34 testes). Nenhum teste removido. 71da476 alterou fixtures/relógio sem enfraquecer asserções (auditado acima).

---

## Code Quality

| Princípio | Status |
| --------- | ------ |
| Código mínimo, sem scope creep (diff toca só os arquivos dos 6 tasks) | ✅ |
| Mudanças cirúrgicas; padrões existentes (BDD pt-br, envelope de API, DDD) | ✅ |
| Spec-anchored outcome check (valores assertados batem com a spec) | ✅ |
| Cobertura por camada: domain 1:1 com ACs; rotas happy+edge+error | ⚠️ (falta o caminho de erro write-ahead em nível de rota) |
| Todos os testes em escopo mapeiam para AC/edge case/Done-when | ✅ |
| Guidelines do projeto (matriz em tasks.md, vitest.config, AGENTS.md) | ✅ |

---

## Gaps (menores — nenhum invalida AC; recomendações de robustez)

1. **SEC1-05/06 amplitude de fixtures**: só APP1+COM (JPEG) e tEXt (PNG) exercitados; a spec
   enumera APP2+, zTXt/iTXt/eXIf/tIME. A implementação cobre todos pelo mesmo branch
   (range `0xe1..0xef`; `Set` de chunks), mas remover um item do Set hoje não seria
   detectado. Sugestão: 1 fixture APP2 e 1 eXIf/tIME.
2. **SEC1-20/21 nível de rota**: a matriz de tasks previa "write-ahead falha → 500" em
   integração; existe só como unit (`rejects`) + cadeia estrutural (`await` dentro de
   `handleRequest` → 500). Sugestão: teste de rota com repositório de auditoria stubado
   para falhar → `expect(response.status).toBe(500)`.
3. **Edge WebP**: variante "sem VP8X mas com chunk EXIF presente" sem fixture (mesmo
   caminho de código já morto pela mutação 3, risco baixo).

---

## Requirement Traceability

| Requirement | Status anterior | Novo status |
| ----------- | --------------- | ----------- |
| SEC1-01..04 | Implemented | ✅ Verified |
| SEC1-05..09 | Implemented | ✅ Verified (com nota de amplitude em 05/06) |
| SEC1-10..13 | Implemented | ✅ Verified |
| SEC1-14..17 | Implemented | ✅ Verified |
| SEC1-18..19 | Implemented | ✅ Verified |
| SEC1-20..22 | Implemented | ✅ Verified (com nota de rota em 20/21) |

---

## Summary

**Overall**: ✅ Ready

**Spec-anchored check**: 22/22 ACs com evidência `file:line` batendo o desfecho da spec
(2 parciais de amplitude de fixture sinalizados, não bloqueantes); 4/4 edge cases cobertos
(1 variante menor sinalizada).
**Sensor**: 5/5 mutações mortas (P0-full).
**Gate**: 433 passed, 0 failed, 0 skipped.

**O que funciona**: revogação staff ≤60s com deny-list/cache/fail-open; strip de
EXIF/XMP/COM/tEXt em JPEG/PNG/WebP fail-safe; IP por cadeia de proxy confiável compartilhado
entre proxy e login; guard `requireRole` nas 6 rotas do portal sem mudança de contrato;
cron timing-safe; write-ahead de auditoria em export LGPD e exclusão de foto com payload
assertado por valor.

**Próximos passos**: opcionais — os 3 gaps menores acima como tasks de robustez de teste.
