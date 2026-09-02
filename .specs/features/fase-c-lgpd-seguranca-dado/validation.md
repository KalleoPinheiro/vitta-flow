# Fase C — LGPD / Segurança de Dado Validation

**Date**: 2026-09-02
**Spec**: `.specs/features/fase-c-lgpd-seguranca-dado/spec.md`
**Diff range**: `d0addcb..HEAD` (21 commits: T1–T20 + 1 fixup de lint)
**Verifier**: independent sub-agent (author ≠ verifier)

---

## Task Completion

| Task | Status  | Notes |
| ---- | ------- | ----- |
| T1   | ✅ Done | `6e8e7cb` — `toPortalConditionDto`/`toPortalAssessmentDto` em `src/lib/dto.ts:244-264,308-342` |
| T2   | ✅ Done | `1d10441` — `src/app/api/portal/patient/route.ts` usa DTOs allowlist |
| T3   | ✅ Done | `5a8d761` — `src/app/api/portal/partner/route.ts` usa DTOs allowlist |
| T4   | ✅ Done | `18f40ae` — `ConsentRecord.revoke`/`resolveStatus` em `src/domain/consent/consent-record.ts` |
| T5   | ✅ Done | `a87a055` — migration `drizzle/0027_consent-versioning.sql` + `findLatestByPatientId` |
| T6   | ✅ Done | `bd9a06e` — `GET`/`POST /api/portal/patient/consent`, novo `POST .../consent/revoke` |
| T7   | ✅ Done | `940661e` — `photos/route.ts` usa `resolveStatus` em vez de `.some(covers)` |
| T8   | ✅ Done | `3a547a2` — `actorOverride` em `src/lib/audit.ts` |
| T9   | ✅ Done | `e34a80c` — auditoria de login sucesso/falha |
| T10  | ✅ Done | `a3e7104` — auditoria de logout |
| T11  | ✅ Done | `aa45959` — auditoria de set-password (convite/reset) |
| T12  | ✅ Done | `7196793` — auditoria de criação de paciente |
| T13  | ✅ Done | `bd13260` — auditoria de clinic-info |
| T14  | ✅ Done | `528024e` — auditoria de schedule |
| T15  | ✅ Done | `d07d328` — `encryptField`/`decryptField`/`isEncryptedPayload` em `src/lib/auth/crypto.ts` |
| T16  | ✅ Done | `696e14d` — `DrizzleEvolutionNoteRepository` cifra 4 campos SOAP |
| T17  | ✅ Done | `a581113` — `DrizzleClinicalConditionRepository` cifra `notes` |
| T18  | ✅ Done | `8ac72c6` — `DrizzleConditionAssessmentRepository` cifra `notes` |
| T19  | ✅ Done | `ca19a7a` — `container.ts` fail-closed sem `AUTH_SECRET` |
| T20  | ✅ Done | `39baec1` — `scripts/encrypt-clinical-fields.ts` idempotente |
| fixup | ✅ Done | `3fe648f` — extrai `resolveActor` de `persistAuditEvent` (redução de complexidade ciclomática, sem mudança de comportamento) |

Todas as 20 tasks + fixup presentes no `git log` no range auditado, cada commit message batendo com o `Commit:` definido em `tasks.md`.

---

## Spec-Anchored Acceptance Criteria

### P1: Portal não vaza nota clínica interna (#69)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC-1: DTO de `GET /api/portal/patient` sem `notes` em tempo de compilação | Tipo `PortalConditionDto`/`PortalAssessmentDto` literalmente sem a chave `notes` | `src/lib/dto.ts:244-253,308-324` — tipos declarados sem `notes`; `tests/lib/dto.test.ts:359` — `expect(dto).not.toHaveProperty("notes")` | ✅ PASS |
| AC-2: `GET /api/portal/partner` usa o mesmo DTO allowlist | Mesmas funções `toPortalConditionDto`/`toPortalAssessmentDto` | `src/app/api/portal/partner/route.ts:11,43` — importa e usa `toPortalConditionDto`/`toPortalAssessmentDto` | ✅ PASS |
| AC-3: Campo novo no domínio não vaza automaticamente (allowlist, não blocklist) | Função com cada campo citado explicitamente, não spread/`Omit` | `src/lib/dto.ts:255-264,326-342` — literal object, cada campo nomeado individualmente (sem `...condition`) | ✅ PASS |
| AC-4: Resposta JSON serializada não contém `"notes"` mesmo com `notes` preenchido no banco | String de teste não aparece em `JSON.stringify` da resposta | `tests/lib/dto.test.ts:360` — `expect(JSON.stringify(dto)).not.toContain("nota interna teste")`; `tests/api/portal-routes.test.ts` (rota completa, condições do portal) | ✅ PASS |

### P1: Consentimento LGPD versionado com revogação (#70)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC-1: Aceite grava `CONSENT_TEXT_VERSION` vigente | `textVersion` = versão vigente no aceite | `tests/domain/consent-record.test.ts:26` — `expect(record.textVersion).toBe("v1")`; `tests/infrastructure/consent-record-tenant-isolation.test.ts:121` — `expect(found.textVersion).toBe("v1")` | ✅ PASS |
| AC-2: Portal exibe versão do aceite mais recente + data | `GET` retorna `textVersion`/`acceptedAt` do status resolvido | `src/app/api/portal/patient/consent/route.ts:27-33` — retorna `textVersion: status.current?.textVersion ?? null`, `acceptedAt` | ✅ PASS |
| AC-3: Revogação grava evento imutável append-only; status passa a "revogado" | Novo registro `kind: "revoke"`, aceite original preservado; `resolveStatus` → `revoked: true` | `src/domain/consent/consent-record.ts:58-72` (`revoke()` cria novo registro, nunca apaga); `tests/api/portal-routes.test.ts:476-509` — `revokeBody.data.revoked === true`, GET subsequente confirma `revoked: true` | ✅ PASS |
| AC-4: Revogação mais recente → fluxos de `covers()` tratam como sem consentimento (ex.: upload de foto) | `resolveStatus(...).accepted === false` mesmo com aceite antigo do mesmo texto no histórico | `src/app/api/portal/patient/photos/route.ts:55` — usa `ConsentRecord.resolveStatus(...).accepted`; `tests/api/portal-routes.test.ts:666-690` — upload bloqueado pós-revogação mesmo com aceite antigo válido no histórico | ✅ PASS |
| AC-5: Revogar e aceitar de novo é permitido (não terminal) | Novo aceite após revogação → `accepted: true` | `tests/domain/consent-record.test.ts:210-239` — `status.accepted === true` após revoke+accept; `tests/api/portal-routes.test.ts:511-539` — rota E2E confirma o mesmo | ✅ PASS |
| AC-6: Revogação gera evento de auditoria (`resourceType: "consent"`, `action: "update"`) | Valores exatos citados no spec | `src/app/api/portal/patient/consent/revoke/route.ts:37-43` — `recordAudit(..., { action: "update", resourceType: "consent", ... })` | ✅ PASS |

### P1: Trilha de auditoria (#71)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC-1: Login sucesso → `action: "read"`, `resourceType: "session"`, ator = conta, empresa = `clinicId`/`LEGACY_CLINIC_ID` | Valores exatos | `src/app/api/auth/login/route.ts:60-65` — `action: "read"`, `resourceType: "session"`, `actorOverride: { role: identity.role, id: identity.subject, clinicId: identity.clinicId }`; `src/lib/audit.ts:93` fallback `LEGACY_CLINIC_ID` | ✅ PASS |
| AC-2: Login falha → `detail` indica falha, sem vazar existência da conta além da resposta HTTP | `detail: "invalid_credentials"` igual para senha errada e conta inexistente | `src/app/api/auth/login/route.ts:50-56`; `tests/api/auth-routes.test.ts` — evento com `detail === "invalid_credentials"`, `actorRole === "anonymous"` para ambos os casos (mesmo detail, sem distinção) | ✅ PASS |
| AC-3: Logout com sessão válida → evento antes de invalidar cookie | Evento gravado, `action`/`resourceType` não pinados no spec | `src/app/api/auth/logout/route.ts:10-19` — lê sessão, grava `recordAuditNow` com `action: "delete"`, `resourceType: "session"`, ANTES de limpar cookie (linha 22) | ⚠️ Spec-precision gap — AC-03 não define o valor exato de `action`; autor escolheu `"delete"` (documentado em comentário no próprio código, linha 13-14) e é razoável (session encerrada), mas não é o valor literal do spec |
| AC-4: Criar paciente → `action: "create"`, `resourceType: "patient"`, `resourceId`/`patientId` = id criado | Valores exatos | `src/app/api/patients/route.ts:81-86`; `tests/api/api-flow.test.ts:59-63` — `event.resourceType === "patient"`, `event.action === "create"`, `resourceId === patientId` | ✅ PASS |
| AC-5: `PUT clinic-info` → `action: "update"`, `resourceType: "clinic-info"` | Valores exatos | `src/app/api/settings/clinic-info/route.ts:55-59`; `tests/api/clinic-info-settings.test.ts:96-99` — `event.resourceType === "clinic-info"`, `event.action === "update"` | ✅ PASS |
| AC-6: `PUT schedule` → `action: "update"`, `resourceType: "clinic-schedule"` | Valores exatos | `src/app/api/settings/schedule/route.ts:43-47`; `tests/api/schedule-settings-tenant-isolation.test.ts:100-103` — mesmos valores confirmados | ✅ PASS |
| AC-7: Set-password (convite/reset) → `action: "update"`, `resourceType: "account-password"`, ator = conta alterada, propósito no `detail` | Valores exatos | `src/app/api/auth/set-password/route.ts:40-46`; `tests/api/set-password-route.test.ts:155-201` — `event.action === "update"`, `detail === "invite"` / `"reset"` | ✅ PASS |
| AC-8a: Falha de auditoria em rota crítica (login/logout/set-password) propaga erro (`recordAuditNow`) | Falha derruba o request | `src/lib/audit.ts:57-63` — `recordAuditNow` é `await` direto (propaga); `tests/lib/audit.test.ts:208-220` — `recordAuditNow` com save rejeitado → `rejects.toThrow` | ✅ PASS |
| AC-8b: Falha de auditoria em rota não crítica é best-effort (`recordAudit`) | Loga e não derruba resposta | `src/lib/audit.ts:38-50` — `after()` + `try/catch` loga; `tests/lib/audit.test.ts:99-115` — falha no `save` não lança, `console.error` chamado | ✅ PASS |

### P1: Campos clínicos sensíveis cifrados em repouso (#72)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AC-1: `AddEvolutionNote` grava os 4 campos SOAP cifrados (AES-256-GCM via `encryptSecret`) | Coluna não contém texto plano | `src/infrastructure/persistence/drizzle/drizzle-clinical-repositories.ts:111-114` — `encryptField(note.subjective, this.secret)` etc.; `tests/api/evolution-note-tenant-isolation.test.ts:107-111` — `expect(rows[0]?.subjective).not.toContain(plainText)` | ✅ PASS |
| AC-2: Leitura decifra os 4 campos antes de devolver ao domínio | Round-trip texto plano | `drizzle-clinical-repositories.ts:89-97` (`toEntity` decifra); `tests/api/evolution-note-tenant-isolation.test.ts:126` — `expect(body.data.some((n) => n.subjective === plainText)).toBe(true)` | ✅ PASS |
| AC-3: `clinical_conditions.notes`/`condition_assessments.notes` cifrados na escrita, decifrados na leitura | Mesmo mecanismo | `drizzle-clinical-repositories.ts:160,232,265` (`encryptField`/`decryptField`); `tests/api/clinical-routes.test.ts:358-359` e `tests/api/condition-tenant-isolation.test.ts:137-147` — round-trip confirmado com asserts de não-conter-texto-plano e depois texto-plano-de-volta | ✅ PASS |
| AC-4: Campo `null` persiste/lê como `null` sem tentar cifrar string vazia | `null` in → `null` out, sem exceção | `src/lib/auth/crypto.ts:58-65` — `encryptField`/`decryptField` retornam `value` direto quando `null`/`""`; `tests/api/condition-tenant-isolation.test.ts:150-173` — `rows[0]?.notes` e `getBody.data?.notes` ambos `null` | ✅ PASS |
| AC-5: Migração de dado cifra linhas existentes, idempotente | Rodar 2x não recifra | `scripts/encrypt-clinical-fields.ts:30-35` (`planField` pula via `isEncryptedPayload`) — sem teste dedicado (Test Coverage Matrix marca script como "none", só gate de build); comportamento idempotente é lógica direta e auditável por leitura, mas não há teste automatizado de round-trip do script em si | ✅ PASS (com ressalva: cobertura só por leitura de código, conforme Test Coverage Matrix aceito na fase Tasks — não é gap, é decisão de escopo já registrada) |
| AC-6: `AUTH_SECRET` ausente → falha explícita, nunca grava em claro | Erro lançado, sem fallback silencioso | `src/infrastructure/container.ts:225-230` — `throw new Error(...)` se `!auth`; `tests/api/evolution-note-tenant-isolation.test.ts:129-137` — `expect(getRepositories(...)).rejects.toThrow()` | ✅ PASS |
| AC-7: Backup (`pg_dump`) sai cifrado — nenhuma config adicional necessária | Garantia documentada, não implementação nova | Documentado em `design.md:117` (Data Models) e no comentário de `scripts/encrypt-clinical-fields.ts:10-19`; natureza da cifra em nível de aplicação (antes do INSERT) torna isso estruturalmente verdadeiro — não há teste possível para "o pg_dump sai cifrado" além de inspecionar que a coluna já armazena ciphertext, o que os testes de T16-T18 já provam indiretamente | ✅ PASS (evidência estrutural, não um teste dedicado — natureza do requisito) |

**Status**: ⚠️ 24/25 ACs bateram exatamente o outcome do spec; 1 spec-precision gap (AUDIT-03, valor de `action` no logout não pinado pelo spec, autor escolheu `"delete"` e documentou a decisão no próprio código).

---

## Discrimination Sensor

| Mutation | File:line | Description | Killed? |
| --- | --- | --- | --- |
| 1 | `src/lib/dto.ts:255-264` (`toPortalConditionDto`) | Reintroduzido campo `notes` no objeto retornado (vazamento simulado) | ✅ Killed — `tests/lib/dto.test.ts` falhou em "Dado condição com nota interna preenchida, Quando toPortalConditionDto, Então omite notes" (`AssertionError: expected {…(9)} to deeply equal {…(8)}`) |
| 2 | `src/domain/consent/consent-record.ts:99-101` (`resolveStatus`) | Invertida a lógica: `kind === "revoke"` passou a retornar `accepted: true` | ✅ Killed — `tests/domain/consent-record.test.ts` falhou em "Dado revogação mais recente que o aceite, Quando resolver status, Então não aceito" (`expected true to be false`) |
| 3 | `src/infrastructure/persistence/drizzle/drizzle-clinical-repositories.ts:111-114` (`DrizzleEvolutionNoteRepository.save`) | Removida a cifra: campos SOAP gravados em texto plano | ✅ Killed — `tests/api/evolution-note-tenant-isolation.test.ts` falhou em 2 testes (SQL direto retornou o texto plano; leitura subsequente também quebrou por efeito colateral do teste anterior) |

**Sensor depth**: lightweight (3 mutações, conforme tier default) — feature toca dado sensível de saúde/LGPD, mas escopo é extensão de infraestrutura já madura (`encryptSecret`, `recordAudit`, `ConsentRecord`), não superfície nova de payment/auth core; 3 mutações cobrindo as 3 issues de maior risco (#69 vazamento, #70 revogação, #72 cifra) foi considerado proporcional.
**Result**: 3/3 killed — PASS ✅
**Working tree**: todas as 3 mutações revertidas via `git checkout --`; `git status --short` confirmado limpo (só `.specs/features/fase-c-lgpd-seguranca-dado/` não trackeada) antes e depois do sensor.

---

## Code Quality

Spot-check em arquivos de 3 fases diferentes: `src/lib/dto.ts` (#69), `src/domain/consent/consent-record.ts` (#70), `src/infrastructure/persistence/drizzle/drizzle-clinical-repositories.ts` (#72).

| Principle | Status |
| --- | --- |
| Minimum code | ✅ — DTOs allowlist literais mínimos, sem abstração extra; `encryptField`/`decryptField` são wrappers finos |
| Surgical changes | ✅ — `toConditionDto`/`toAssessmentDto` (staff) intactas; `encryptSecret`/`decryptSecret` não alterados, só estendidos com wrappers |
| No scope creep | ✅ — `anamnesis` e `condition_photos.patient_note` deliberadamente fora do escopo (spec Out of Scope), confirmado não tocados no diff |
| Matches patterns | ✅ — segue padrão `toXxxDto`/`DrizzleXxxRepository` já existente; migration numerada na sequência (`0027`) |
| Spec-anchored outcome check (asserted values match spec) | ✅ — ver tabela acima, 24/25 exatos |
| Per-layer Coverage Expectation met (domain 1:1 ACs; routes happy+edge+error) | ✅ — `consent-record.test.ts` cobre todos os branches de `resolveStatus`; rotas de portal/auth cobrem happy+edge (rate limit, sem sessão, token expirado, etc.) |
| Every test maps to a spec requirement — no unclaimed tests | ✅ — testes novos referenciam `#69`/`#70`/`#71`/`#72` ou o AC específico no nome do `it(...)` |
| Documented guidelines followed | AGENTS.md (complexity max 10, max-depth 4, max-lines-per-function 120/320) — `npm run lint` passou sem violações; fixup `3fe648f` existe justamente para atender `complexity` em `persistAuditEvent`, extraindo `resolveActor` |

Nenhum "No" na checklist — nenhuma feature além do pedido, nenhuma abstração de uso único, nenhuma refatoração de código não relacionado.

---

## Edge Cases

- [x] Payload cifrado corrompido/formato inválido lança erro explícito — `tests/lib/auth.test.ts:207-233` (`decryptSecret` rejeita tag truncada, IV de tamanho inesperado)
- [x] Paciente sem nenhum aceite → "sem consentimento registrado" (`revoked: false`, distinto de revogado) — `tests/api/portal-routes.test.ts:452-465`
- [ ] **Duas revogações em sequência rápida (duplo clique) são idempotentes, sem erro nem evento duplicado inválido** — NÃO há teste explícito chamando `POST /consent/revoke` duas vezes seguidas e confirmando ausência de erro/estado inconsistente. O comportamento é *implicitamente* seguro pela lógica de `resolveStatus` (monotônica: qualquer revogação mais recente vence) e pelo comentário no código (`revoke/route.ts:11-17`), mas não está coberto por teste automatizado — GAP
- [x] Rate limit (429) não gera evento de auditoria adicional — `tests/api/auth-routes.test.ts:318-341` (`rateLimitEvents` tem exatamente 5, não 6)
- [x] `/api/portal/partner` sem paciente indicado retorna lista vazia — comportamento pré-existente preservado, não alterado por este diff (confirmado por ausência de mudança na lógica de `referredPatients`)

---

## Gate Check

- **Gate command**: `npm run typecheck && npm run lint && npm run test:coverage`
- **Result**: typecheck ✅ (exit 0, sem erros) · lint ✅ ("ESLint: No issues found") · test:coverage ✅ — 166 test files passed (166), **2621 tests passed (2621)**, 0 failed, 0 skipped
- **Coverage**: Statements 96.79%, Branches 91.22%, Functions 96.72%, Lines 96.91% — acima do mínimo de 90% (`AGENTS.md`)
- **Skipped tests**: nenhum
- **Failures**: nenhuma

---

## Fix Plans (if issues found)

### Fix 1: Cobertura de teste para idempotência de dupla revogação (edge case do spec.md)

- **Root cause**: A rota `POST /api/portal/patient/consent/revoke` (`src/app/api/portal/patient/consent/revoke/route.ts`) e o domínio `ConsentRecord.revoke`/`resolveStatus` implementam corretamente o comportamento idempotente (cada chamada cria um novo registro `kind: "revoke"`; `resolveStatus` sempre olha só o mais recente), mas nenhum teste em `tests/api/portal-routes.test.ts` ou `tests/domain/consent-record.test.ts` exercita a chamada dupla explicitamente.
- **Fix task**: Adicionar teste de integração em `tests/api/portal-routes.test.ts` — chamar `POST /consent/revoke` duas vezes em sequência com a mesma sessão, confirmar: (a) ambas retornam 200 sem erro; (b) `GET /consent` após as duas chamadas retorna `revoked: true`, `accepted: false` (estado final correto); (c) opcionalmente, contar quantos registros `consentRecords.findByPatientId` retornou para confirmar 2 registros de revogação (não é "duplicado inválido", é o comportamento append-only esperado, mas o teste deve deixar isso explícito).
- **Priority**: Minor — o comportamento correto já existe e é coberto indiretamente pela lógica testada de `resolveStatus`; é uma lacuna de cobertura de teste do edge case explícito, não um bug funcional.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| PORTAL-01 | Design | ✅ Verified |
| PORTAL-02 | Design | ✅ Verified |
| PORTAL-03 | Design | ✅ Verified |
| PORTAL-04 | Design | ✅ Verified |
| CONSENT-01 | Design | ✅ Verified |
| CONSENT-02 | Design | ✅ Verified |
| CONSENT-03 | Design | ✅ Verified |
| CONSENT-04 | Design | ✅ Verified |
| CONSENT-05 | Design | ✅ Verified |
| CONSENT-06 | Design | ✅ Verified |
| AUDIT-01 | Design | ✅ Verified |
| AUDIT-02 | Design | ✅ Verified |
| AUDIT-03 | Design | ⚠️ Verified com spec-precision gap (valor de `action` não pinado pelo spec) |
| AUDIT-04 | Design | ✅ Verified |
| AUDIT-05 | Design | ✅ Verified |
| AUDIT-06 | Design | ✅ Verified |
| AUDIT-07 | Design | ✅ Verified |
| AUDIT-08 | Design | ✅ Verified |
| CRYPTO-01 | Design | ✅ Verified |
| CRYPTO-02 | Design | ✅ Verified |
| CRYPTO-03 | Design | ✅ Verified |
| CRYPTO-04 | Design | ✅ Verified |
| CRYPTO-05 | Design | ✅ Verified |
| CRYPTO-06 | Design | ✅ Verified |
| CRYPTO-07 | Design | ✅ Verified |

---

## Summary

**Overall**: ✅ Ready (com 1 fix task Minor recomendado, não bloqueante)

**Spec-anchored check**: 24/25 ACs bateram o outcome exato do spec; 1 spec-precision gap documentado (AUDIT-03/logout `action` não pinado)
**Sensor**: 3/3 mutações mortas
**Gate**: 2621 testes passados, 0 falhas, 0 skips, coverage 96.79%/91.22%/96.72%/96.91% (≥ 90% exigido)

**What works**:
- Portal allowlist (#69) é genuinamente allowlist em tempo de compilação — mutante que reintroduziu `notes` foi morto imediatamente
- Consentimento versionado + revogação (#70) é append-only, `resolveStatus` corretamente monotônico — mutante de inversão de lógica morto
- Trilha de auditoria (#71) cobre os 7 pontos do spec com valores exatos de `action`/`resourceType`, incluindo o caso write-ahead vs. best-effort
- Cifra em repouso (#72) verificada por SQL direto (bypass do repositório) nas 3 tabelas — mutante que removeu cifra foi morto; fail-closed sem `AUTH_SECRET` confirmado por teste

**Issues found**:
1. Edge case "duas revogações em sequência rápida" do spec.md não tem teste explícito de dupla chamada — comportamento correto por construção, mas sem cobertura direta (ver Fix 1 acima)
2. `design.md` descreve `isEncryptedPayload` como "tenta decifrar com o secret" mas a implementação real (`crypto.ts:72-92`) é puramente estrutural (checagem de formato base64url + tamanhos), sem tentar decifrar de fato — não é um gap de spec (CRYPTO-05 não pina o mecanismo), só uma imprecisão do design.md que não teve impacto em nenhum AC

**Next steps**: Nenhuma ação bloqueante. Recomenda-se adicionar o teste de Fix 1 em um follow-up de baixa prioridade antes de fechar a issue #70 formalmente, mas isso não impede o merge.
