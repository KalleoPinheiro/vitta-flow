# Autenticação Nativa Validation

## Validation: autenticacao-nativa — FAIL ❌

**Date**: 2026-09-01
**Spec**: `.specs/features/autenticacao-nativa/spec.md`
**Diff range**: `9ec7e00..557204f` (22 commits, 77 files, +9479/-1168)
**Verifier**: independent sub-agent (author ≠ verifier)

**Verdict**: ❌ **FAIL** — o gate de Build não fecha. `npm run lint` sai com código 1 e traz um erro `complexity` **novo**, introduzido por um arquivo criado nesta feature (`src/app/api/integrations/google-calendar/callback/route.ts:39`, complexidade 11, máximo 10). A cobertura de ACs e o sensor de discriminação estão fortes (30/30 ACs com evidência, 10/10 mutantes mortos); o bloqueio é o gate e três lacunas de edge case/asserção listadas abaixo.

---

## Task Completion

| Task | Status | Notes |
| --- | --- | --- |
| T1 | ✅ Done | `EmailGateway` + `NullEmailGateway`, 3 testes |
| T2 | ✅ Done | `ResendEmailGateway` + `buildEmailGateway` fail-closed, 9 testes |
| T3 | ✅ Done | `AuthToken` (issue/isUsable/markUsed), 13 testes |
| T4 | ✅ Done | Migração `0023_auth-tokens.sql` + repositório Drizzle, 6 testes |
| T5 | ✅ Done | `IssueAuthToken` / `ConsumeAuthToken`, 14 testes |
| T6 | ✅ Done | `POST /api/accounts` sem `password`, dispara convite |
| T7 | ✅ Done | `POST /api/auth/set-password`, 9 testes |
| T8 | ✅ Done | `/definir-senha`, 5 testes |
| T9 | ✅ Done | `POST /api/auth/forgot-password`, 6 testes |
| T10 | ✅ Done | Ciclo completo de reset, 5 testes |
| T11 | ✅ Done | `/esqueci-senha`, 4 testes |
| T12 | ✅ Done | `google-calendar-oauth.ts`, 7 testes |
| T13 | ✅ Done | Rota de início do Calendar, 4 testes |
| T14 | ⚠️ Partial | Callback funciona e é testado, mas o handler `GET` viola `complexity` ≤ 10 do ESLint do projeto (erro novo no gate) |
| T15 | ✅ Done | Container monta o gateway pela config dedicada |
| T16 | ✅ Done | `POST /api/auth/bootstrap`, 10 testes |
| T17 | ✅ Done | `src/app/api/auth/google/**`, `resolve-user-role.ts`, `google-oauth.ts` removidos |
| T18 | ✅ Done | Conformidade estrutural de rotas + varredura de `src/**` |
| T19 | ✅ Done | `AUTH_PASSWORD` some de `src/**`; login exige `email` |
| T20 | ✅ Done | `/login` sem Google; E2E migrado para bootstrap + convite |
| T21 | ✅ Done | `.env.example`, `AGENTS.md`, `README.md`, `.specs/STATE.md` |

---

## Spec-Anchored Acceptance Criteria

### P1: Convite por e-mail define a senha inicial (AUTH-01..09)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AUTH-01 porta de e-mail com implementação nula que loga em vez de enviar | `enabled === false`; log contém destinatário, assunto e corpo | `tests/infrastructure/email-gateway.test.ts:14` `expect(new NullEmailGateway().enabled).toBe(false)`; `:34-36` `expect(logged).toContain("pessoa@clinica.com" / "Defina sua senha" / "https://app.local/definir-senha?token=abc")` | ✅ PASS |
| AUTH-02 produção sem credenciais falha nomeando as duas variáveis | Erro citando `RESEND_API_KEY` **e** `EMAIL_FROM`; fora de produção → gateway nulo | `tests/infrastructure/resend-email-gateway.test.ts:118-119` `expect(() => buildEmailGateway()).toThrow(/RESEND_API_KEY/)` + `toThrow(/EMAIL_FROM/)`; `:126` `expect(buildEmailGateway()).toBeInstanceOf(NullEmailGateway)` | ✅ PASS |
| AUTH-03 persistir só o hash SHA-256 + propósito, conta, expiração, uso | `secretHash === sha256(secret)`, campos preservados | `tests/domain/auth-token.test.ts:26` `expect(token.secretHash).toBe(createHash("sha256").update(secret).digest("hex"))`; `tests/infrastructure/drizzle-auth-token-repository.test.ts:65-69` `expect(found?.purpose).toBe("invite")`, `expect(found?.expiresAt.getTime()).toBe(token.expiresAt.getTime())`, `expect(found?.usedAt).toBeNull()` | ✅ PASS |
| AUTH-04 `POST /api/accounts` emite convite de 24 h com link `{APP_URL}/definir-senha?token=…` | e-mail para o endereço da conta contendo o link; TTL 24 h | `tests/api/account-invite.test.ts:47-48` `expect(emails.bodies[0]).toContain("convidada@x.com")` + `toContain("https://app.vitta.test/definir-senha?token=")`; `tests/application/auth-token-flow.test.ts:97` `expect(email.sent[0].text).toContain("24 horas")`; `tests/domain/auth-token.test.ts:42` `expect(token.expiresAt.getTime()).toBe(NOW + INVITE_TTL_MS)` | ✅ PASS |
| AUTH-05 token válido + senha ≥ 8 → grava hash, marca usado, 200 | status 200; hash da nova senha na conta; token consumido | `tests/api/set-password-route.test.ts:69` `expect(response.status).toBe(200)`; `tests/application/auth-token-flow.test.ts:191` `expect(await verifyPassword("senha-nova-1", updated!.passwordHash)).toBe(true)`; `tests/api/set-password-route.test.ts:98-99` reuso → `400` + `INVALID_TOKEN_MESSAGE` | ✅ PASS |
| AUTH-06 login passa a aceitar e-mail+senha, 200 + cookie com o papel da conta | 200, `Set-Cookie` de sessão, papel = o da conta | `tests/api/set-password-route.test.ts:78-79` `expect(response.status).toBe(200)` + `expect(response.headers.get("set-cookie")).toContain("vitta_session=")`; papel: `tests/api/bootstrap-route.test.ts:153` `expect(verifySessionToken(...)?.role).toBe("super_admin")` e `tests/api/auth-routes.test.ts:181` `expect(session?.role).toBe("profissional")` | ⚠️ PASS parcial — ver Gap 5 |
| AUTH-07 token expirado/usado/inexistente → 400 com mensagem literal, sem alterar senha | `400` + `"Link inválido ou expirado — solicite um novo"` | `tests/api/set-password-route.test.ts:98-99` (usado), `:106-107` (inexistente), `:118-119` (expirado) `expect(json.error).toBe(INVALID_TOKEN_MESSAGE)`; senha intacta: `tests/application/auth-token-flow.test.ts:238` `expect(await verifyPassword("senha-nova-1", unchanged!.passwordHash)).toBe(false)` | ✅ PASS |
| AUTH-08 conta sem convite consumido → login 401 com qualquer senha | `401` | `tests/api/account-invite.test.ts:71` `expect(response.status).toBe(401)`; hash sentinela como senha: `:82` `expect(response.status).toBe(401)` | ✅ PASS |
| AUTH-09 falha no envio mantém conta criada, 200 com DTO, erro logado | `200`, DTO da conta, conta persistida, `console.error` chamado | `tests/api/account-invite.test.ts:96-102` `expect(response.status).toBe(200)`, `expect(json.data.email).toBe("envio-falhou@x.com")`, `expect(errors).toHaveBeenCalled()`, `expect(stored).not.toBeNull()` | ✅ PASS (ver Gap 7: a tabela de Assumptions da spec diz 201, a AC diz 200) |

### P2: Reset self-service (AUTH-10..14)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AUTH-10 e-mail de conta ativa → token de reset de 1 h + link | 200, e-mail com link, validade 1 h | `tests/api/forgot-password-route.test.ts:53-57` `expect(response.status).toBe(200)`, `toContain("https://app.vitta.test/definir-senha?token=")`, `toContain("1 hora")`; `tests/domain/auth-token.test.ts:50` `expect(token.expiresAt.getTime()).toBe(NOW + RESET_TTL_MS)` | ✅ PASS |
| AUTH-11 e-mail inexistente → mesmo status e mesmo corpo, sem envio | status idêntico, corpo idêntico, 0 e-mails | `tests/api/forgot-password-route.test.ts:73-75` `expect(missing.status).toBe(existing.status)`, `expect(missingJson).toEqual(existingJson)`, `expect(emailsMissing.bodies).toHaveLength(0)` | ✅ PASS |
| AUTH-12 reset válido grava a senha nova; a antiga passa a 401 | nova → 200, antiga → 401 | `tests/api/reset-password-flow.test.ts:83-84` `expect((await login(..., "senha-nova-1")).status).toBe(200)` e `expect((await login(..., "senha-antiga-1")).status).toBe(401)` | ✅ PASS |
| AUTH-13 token de reset expirado/usado → 400 com a mensagem única | `400` + `INVALID_TOKEN_MESSAGE` | `tests/api/reset-password-flow.test.ts:95-96` (usado), `:108-109` (expirado > 1 h) `expect(json.error).toBe(INVALID_TOKEN_MESSAGE)`; fronteira: `:118` 59 min ainda vale → 200 | ✅ PASS |
| AUTH-14 novo token de reset invalida os anteriores não usados | primeiro link → 400; segundo continua válido | `tests/api/reset-password-flow.test.ts:129-131` `expect(stale.status).toBe(400)` + `expect((await setPasswordWith(second, ...)).status).toBe(200)`; `tests/application/auth-token-flow.test.ts:149-154` `expect(await tokens.findUsableBySecretHash(hash(first), ...)).toBeNull()` | ✅ PASS |

### P3: Calendar desacoplado do login (AUTH-15..20)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AUTH-15 sessão de equipe → redirect ao Google só com `calendar.events`, `access_type=offline`, cookie de estado | escopo exato, offline, cookie de state | `tests/api/calendar-integration-routes.test.ts:73-76` `expect(location.searchParams.get("scope")).toBe("https://www.googleapis.com/auth/calendar.events")` + `expect(...get("access_type")).toBe("offline")`; `:88-90` `expect(setCookie).toContain(\`${CALENDAR_OAUTH_STATE_COOKIE}=${state}\`)`; escopo declarado: `tests/lib/google-calendar-oauth.test.ts:26` | ✅ PASS |
| AUTH-16 sem sessão → 401, sem iniciar fluxo | `401` e nenhum `location` | `tests/api/calendar-integration-routes.test.ts:100-101` `expect(response.status).toBe(401)` + `expect(response.headers.get("location")).toBeNull()` | ✅ PASS |
| AUTH-17 `state` confere + refresh token → credencial cifrada em `google_accounts` sob o `subject` | linha existe sob o subject; token não em claro | `tests/api/calendar-integration-routes.test.ts:141-143` `const stored = await googleAccounts.findByEmail("agenda@clinica.com")`, `expect(stored).not.toBeNull()`, `expect(stored!.encryptedRefreshToken).not.toContain("refresh-token-real")` | ✅ PASS |
| AUTH-18 callback não cria, renova ou troca sessão | resposta sem `Set-Cookie` do cookie de sessão | `tests/api/calendar-integration-routes.test.ts:158` `expect(response.headers.get("set-cookie") ?? "").not.toContain(\`${SESSION_COOKIE}=\`)` | ✅ PASS |
| AUTH-19 `state` ausente/divergente → recusa sem persistir credencial | recusa (400) **e** nenhuma credencial gravada | `tests/api/calendar-integration-routes.test.ts:174-175` `expect(response.status).toBe(400)` + `expect(json.error).toContain("Fluxo de conexão inválido")`; ausente: `:185` `expect(response.status).toBe(400)` | ⚠️ PASS parcial — ver Gap 4 (a não-persistência não é asserida) |
| AUTH-20 credencial conectada monta o gateway de agenda, sincronização preservada | gateway construído da credencial, sem allowlist | `tests/api/calendar-gateway-source.test.ts:39` `expect(calendar.constructor.name).toBe("GoogleCalendarGateway")`; `:54` sem credencial → `"NullCalendarGateway"`; `tests/lib/google-calendar-oauth.test.ts:52` `expect(googleCalendarOAuthConfigFromEnv()).not.toBeNull()` sem `GOOGLE_ALLOWED_EMAILS` | ⚠️ PASS parcial — ver Gap 6 |

### P4: Remoção + bootstrap (AUTH-21..30)

| Criterion | Spec-defined outcome | `file:line` + assertion | Result |
| --- | --- | --- | --- |
| AUTH-21 nenhuma rota sob `/api/auth/google`; teste falha se reaparecer | lista de rotas sob esse caminho vazia | `tests/api/route-guard-conformance.test.ts:147-150` `expect(googleRoutes.map((f) => f.relative)).toEqual([])` | ✅ PASS |
| AUTH-22 nenhuma leitura de `GOOGLE_ALLOWED_EMAILS` em `src/**` | varredura textual devolve `[]` | `tests/api/route-guard-conformance.test.ts:154` `expect(sourceFilesMentioning("GOOGLE_ALLOWED_EMAILS")).toEqual([])`; `:158` `expect(PUBLIC_PATHS.filter((p) => p.includes("google"))).toEqual([])` | ✅ PASS |
| AUTH-23 nenhuma leitura de `AUTH_PASSWORD`; login exige `email` e `password` | varredura `[]`; schema exige os dois | `tests/api/route-guard-conformance.test.ts:163` `expect(sourceFilesMentioning("AUTH_PASSWORD")).toEqual([])`; `src/app/api/auth/login/route.ts:19-21` schema com `email` obrigatório, exercitado em `tests/api/auth-routes.test.ts:82` | ✅ PASS |
| AUTH-24 login sem `email` → 401 sem sessão | `401` e nenhum `Set-Cookie` | `tests/api/auth-routes.test.ts:82-84` `expect(response.status).toBe(401)`, `expect(body.error).toContain("Credenciais inválidas")`, `expect(response.headers.get("set-cookie")).toBeNull()`; senha-mestre-legada: `:98` `expect(response.status).toBe(401)` | ✅ PASS |
| AUTH-25 `AUTH_SECRET` definido → auth configurada, independente do Google | `resolveAuthMode() === "configured"` | `tests/lib/access-policy.test.ts:98` `expect(resolveAuthMode()).toBe("configured")`; `:107` mesmo sem nenhuma variável do Google; `tests/api/auth-routes.test.ts:257` `expect(Object.keys(body.data)).toEqual(["password"])` | ✅ PASS |
| AUTH-26 sem `AUTH_SECRET` e sem modo aberto → 503 em toda rota | `503` em API e página | `tests/proxy.test.ts:134` `expect(response.status).toBe(503)`; `:144-145` `expect((await proxy(request("/api/patients"))).status).toBe(503)` e `expect((await proxy(request("/agenda"))).status).toBe(503)`; `tests/lib/access-policy.test.ts:113,126` `toBe("unconfigured")` | ✅ PASS |
| AUTH-27 header correto + base vazia → cria `super_admin` e emite convite | conta com `role: "super_admin"`, e-mail com link | `tests/api/bootstrap-route.test.ts:74-76` `expect(response.status).toBe(200)`, `expect(json.data.role).toBe("super_admin")`; `:115-117` `expect(emails.bodies[0]).toContain("convite-sa@clinica.com")` + `toContain("https://app.vitta.test/definir-senha?token=")` | ✅ PASS |
| AUTH-28 já existe conta → 403 e não cria nada | `403` + conta não criada | `tests/api/bootstrap-route.test.ts:167-171` `expect(response.status).toBe(403)`, `expect(json.error).toBe(BOOTSTRAP_UNAVAILABLE_MESSAGE)`, `expect(await userAccounts.findByEmail("segundo@clinica.com")).toBeNull()` | ✅ PASS |
| AUTH-29 header ausente/incorreto ou `VITTA_BOOTSTRAP_TOKEN` não configurado → 403, sem criar | `403` + `hasAnyAccount() === false` | `tests/api/bootstrap-route.test.ts:180-184` (ausente), `:194-197` (incorreto), `:208-211` (não configurado) `expect(response.status).toBe(403)` + `expect(await userAccounts.hasAnyAccount()).toBe(false)` | ✅ PASS |
| AUTH-30 `/login` só com e-mail+senha e link para `/esqueci-senha` | sem elementos do Google; link presente | `tests/pages/login.test.tsx:98-100` `expect(screen.queryByText("Entrar com Google")).not.toBeInTheDocument()` + `queryByRole("separator")` ausente; `:120` `expect(link).toHaveAttribute("href", "/esqueci-senha")`; `:109` `expect(email.required).toBe(true)` | ✅ PASS |

**Status**: 30/30 ACs com evidência `file:line`. 27 PASS integrais, 3 PASS parciais (AUTH-06, AUTH-19, AUTH-20) com asserção mais fraca que o enunciado da AC.

---

## Discrimination Sensor

Escopo: P0 / caminho crítico de autenticação → 10 mutações comportamentais em áreas de risco distintas. Isolamento: worktree temporário `git worktree add /tmp/verify-issue21 HEAD` + `node_modules` por symlink; nenhum `git stash`. `git status --porcelain` do worktree real vazio antes e depois.

| # | File:line | Mutação | Killed? | Teste que matou |
| --- | --- | --- | --- | --- |
| M1 | `src/domain/auth/auth-token.ts:68` | Remove `usedAt === null` de `isUsable` (uso único some) | ✅ Killed | `tests/domain/auth-token.test.ts` "token já usado … false mesmo dentro da validade" (+2) |
| M2 | `src/domain/auth/auth-token.ts:68` | `expiresAt > nowMs` → `>=` (fronteira da expiração) | ✅ Killed | `tests/domain/auth-token.test.ts` "token exatamente no instante da expiração … false" |
| M3 | `src/application/auth/auth-token-flow.ts:56` | Remove `markAllUnusedAsUsed` da emissão | ✅ Killed | `tests/api/reset-password-flow.test.ts` "segundo pedido de reset … 400"; `tests/application/auth-token-flow.test.ts` "primeiro link deixa de ser usável" |
| M4 | `src/application/auth/auth-token-flow.ts:109` | Deixa de persistir `token.markUsed(...)` | ✅ Killed | `tests/api/set-password-route.test.ts` "mesmo token usado duas vezes → 400" (+2) |
| M5 | `src/app/api/auth/bootstrap/route.ts:61` | Anula a guarda `hasAnyAccount()` | ✅ Killed | `tests/api/bootstrap-route.test.ts` "já existe uma conta → 403 e não cria nada" |
| M6 | `src/app/api/auth/bootstrap/route.ts:26-28` | Enfraquece a comparação do `x-bootstrap-token` (sempre verdadeira) | ✅ Killed | `tests/api/bootstrap-route.test.ts` "segredo incorreto → 403" (+1) |
| M7 | `src/app/api/auth/forgot-password/route.ts:39` | Conta inexistente passa a responder 404 (oráculo de e-mails) | ✅ Killed | `tests/api/forgot-password-route.test.ts` "e-mail inexistente … responde igual ao caso existente" |
| M8 | `src/app/api/integrations/google-calendar/callback/route.ts:27` | Remove a comparação de `state` do `extractValidatedCode` | ✅ Killed | `tests/api/calendar-integration-routes.test.ts` "state divergente → 400" + "state ausente → 400" |
| M9 | `src/lib/auth/access-policy.ts:111` | `isAuthUsable()` retorna `true` incondicionalmente | ✅ Killed | `tests/proxy.test.ts` "produção sem autenticação → 503" (+10) |
| M10 | `src/infrastructure/email/resend-email-gateway.ts:67` | Produção sem credenciais devolve `NullEmailGateway` em vez de lançar | ✅ Killed | `tests/infrastructure/resend-email-gateway.test.ts` "produção sem credenciais … lança erro nomeando RESEND_API_KEY e EMAIL_FROM" |

**Sensor depth**: P0-full (10 mutações, ≥ 5 exigidas)
**Result**: 10/10 mutações mortas, 0 sobreviventes (sensor verde)
**Isolamento**: `git status --porcelain` vazio antes e depois; worktree temporário removido (`git worktree list` confirma).

---

## Code Quality

| Principle | Status |
| --- | --- |
| Minimum code | ✅ |
| Surgical changes | ✅ — remoções acompanham a ADR-004; nada de refactor oportunista |
| No scope creep | ✅ |
| Matches patterns | ⚠️ — `complexity` ≤ 10 do ESLint do projeto violado no novo `google-calendar/callback/route.ts`; `secretMatches` no bootstrap duplica `passwordMatches` de `src/lib/auth/session.ts` (DRY) |
| Spec-anchored outcome check | ⚠️ — 3 ACs com asserção mais fraca que o enunciado (AUTH-06, AUTH-19, AUTH-20) |
| Per-layer Coverage Expectation | ✅ — domínio 1:1 com ACs; toda rota nova tem happy + edge + erro (incl. 429) |
| Every test maps to a spec requirement | ✅ — nenhum teste órfão no diff |
| Documented guidelines followed | ⚠️ — `AGENTS.md` ("ESLint `complexity` max 10") não cumprido no arquivo novo |
| Test integrity (nenhum teste enfraquecido/apagado sem justificativa) | ✅ — as remoções em `tests/api/google-callback-tenant-ambiguity.test.ts`, `tests/application/rbac-portal.test.ts` e `tests/lib/access-policy.test.ts` correspondem exatamente ao caminho de login por Google / senha mestre removido pela ADR-004 |

---

## Edge Cases

- [x] Token com propósito diferente do esperado pela rota → tratado como inválido — **NÃO verificável**: `/api/auth/set-password` é a única rota consumidora e aceita os dois propósitos por design; `ConsumeAuthToken` nunca lê `token.purpose`. Nenhum teste. Ver Gap 3.
- [x] Senha com menos de 8 caracteres → 400 sem consumir o token: `tests/api/set-password-route.test.ts:126-129` (`400`, depois o mesmo token ainda responde `200`)
- [x] `forgot-password` repetido do mesmo IP → 5/min: `tests/api/forgot-password-route.test.ts:132-133` (`5×200` depois `429`)
- [x] Conta inativa → mesma mensagem de link inválido: `tests/api/set-password-route.test.ts:142-143`
- [ ] Consumir um convite invalida os demais convites não usados da conta — **NÃO implementado e NÃO testado**: `ConsumeAuthToken.execute` (`src/application/auth/auth-token-flow.ts:90-111`) só grava `markUsed` do token consumido. Ver Gap 2.
- [x] Falha na construção do gateway de e-mail em produção propaga o erro: `tests/infrastructure/resend-email-gateway.test.ts:118-119`

---

## Gate Check

- **Gate command** (Build, de `tasks.md`): `npm run typecheck && npm run lint && npm run check:sv && npx vitest run && npm run build`

| Gate | Exit | Resultado |
| --- | --- | --- |
| `npm run typecheck` | 0 | ✅ limpo |
| `npm run lint` | **1** | ❌ 3 erros, 7 warnings — **1 erro novo** (`src/app/api/integrations/google-calendar/callback/route.ts:39` complexidade 11 > 10) e **1 warning novo** (`tests/api/auth-portal-gaps.test.ts:56` `resetGoogleEnv` atribuída e nunca usada). Baseline pré-existente: 2 erros `complexity` (`src/app/api/patients/[id]/evolutions/route.ts:51`, `src/infrastructure/persistence/drizzle/drizzle-patient-repository.ts:107`) + 6 warnings em arquivos de teste fora do diff |
| `npm run check:sv` | 0 | ✅ "OK — adoção do @still-void/ui v2 completa" |
| `npm run test:coverage -- --no-file-parallelism` | 0 | ✅ 157 arquivos, **2432/2432 testes passando**, 0 falhas, 0 skips. Stmts 96.91 % (6035/6227), Branch 91.51 % (3665/4005), Funcs 96.78 % (2109/2179), Lines 97 % (5640/5814) — piso 90/90/90/90 |
| `npm run build` | 0 | ✅ inclui `/definir-senha` e `/esqueci-senha` na rota estática |

> Nota de isolamento: durante a redação deste relatório, `src/app/api/integrations/google-calendar/callback/route.ts` apareceu **modificado e não commitado** no worktree real, por outro processo (extração de `persistCalendarCredential`). Não é alteração do Verifier: as mutações do sensor rodaram só em `/tmp/verify-issue21` e o `git status --porcelain` estava vazio imediatamente após a limpeza do sensor. Essa alteração não faz parte do range `9ec7e00..557204f` avaliado aqui e, verificada com `npx eslint .`, **ainda não resolve** o problema: `GET` continua com complexidade 11 (agora na linha 70).

- **Test count antes da feature**: 2432 − 172 ≈ 2260 (o diff acrescenta ~172 testes líquidos e remove os do caminho de login por Google)
- **Test count depois**: 2432
- **Skipped**: nenhum
- **Failures**: nenhuma falha de teste. A reprovação do gate vem do `lint`.

> Correção ao relatório do autor: `npm run lint` **não** sai com código 0. Sai com 1, e passou a incluir um erro que não existia em `9ec7e00`, num arquivo criado por esta feature.

---

## Fix Plans

### Fix 1 (Blocker): erro `complexity` novo no callback do Calendar

- **Root cause**: `GET` em `src/app/api/integrations/google-calendar/callback/route.ts:39` acumula guarda de sessão, guarda de config, validação de `state`, ausência de refresh token, persistência e `catch` num único handler → complexidade 11.
- **Fix task**: extrair a troca do `code` + persistência para uma função auxiliar (o arquivo já tem o padrão com `extractValidatedCode` e `clearState`), até `complexity ≤ 10`. Reexecutar `npm run lint` e confirmar volta ao baseline de 2 erros.
- **Priority**: Blocker (quebra o gate de Build declarado em `tasks.md` e o Success Criteria "Gate completo verde").

### Fix 2 (Major): edge case "consumir convite invalida os demais convites"

- **Root cause**: `ConsumeAuthToken.execute` não chama `markAllUnusedAsUsed`. Hoje isso só não é explorável porque a emissão já invalida os anteriores — a garantia depende de uma invariante externa, não do consumo.
- **Fix task**: chamar `tokens.markAllUnusedAsUsed(account.id, token.purpose, new Date(nowMs))` no consumo, e cobrir com um teste que insere dois convites não usados diretamente no repositório e confirma que o segundo deixa de ser usável após o primeiro ser consumido.
- **Priority**: Major.

### Fix 3 (Minor): edge case de `purpose` divergente

- **Root cause**: a spec exige rejeitar token cujo `purpose` diverge do esperado pela rota, mas a única rota consumidora aceita os dois propósitos e o use-case nunca lê `purpose`. A AC é inverificável como escrita.
- **Fix task**: decidir e registrar — (a) reescrever o edge case como "a rota de definição de senha aceita convite e reset", ou (b) passar o `purpose` esperado ao `ConsumeAuthToken` e testar a divergência.
- **Priority**: Minor (spec-precision gap).

### Fix 4 (Minor): AUTH-19 sem asserção de não-persistência

- **Root cause**: `tests/api/calendar-integration-routes.test.ts:161-186` afirma "não persiste credencial" no título, mas só assere status e mensagem.
- **Fix task**: acrescentar `expect(await googleAccounts.findByEmail(<subject>)).toBeNull()` nos casos de `state` divergente e ausente.
- **Priority**: Minor.

### Fix 5 (Minor): warning novo de `no-unused-vars`

- **Root cause**: `tests/api/auth-portal-gaps.test.ts:56` mantém `resetGoogleEnv` após a remoção do caminho do Google.
- **Fix task**: remover a variável ou prefixar com `_`.
- **Priority**: Minor.

### Fix 6 (Minor): duplicação de comparação em tempo constante

- **Root cause**: `src/app/api/auth/bootstrap/route.ts:23-30` reimplementa `passwordMatches` de `src/lib/auth/session.ts:135`.
- **Fix task**: importar `passwordMatches` em vez de duplicar.
- **Priority**: Minor.

### Fix 7 (Cosmetic): inconsistência interna da spec

- **Root cause**: a linha "Falha no envio do e-mail de convite durante o cadastro" das Assumptions diz "responde 201"; a AUTH-09 diz 200. Código e testes usam 200.
- **Fix task**: corrigir a linha das Assumptions para 200.
- **Priority**: Cosmetic.

---

## Requirement Traceability Update

| Requirement | Previous Status | New Status |
| --- | --- | --- |
| AUTH-01..05, AUTH-07..18, AUTH-21..30 | Verified | ✅ Verified |
| AUTH-06 | Verified | ⚠️ Verified com ressalva (papel no cookie asserido em teste vizinho, não no fluxo de convite) |
| AUTH-19 | Verified | ⚠️ Verified com ressalva (não-persistência não asserida) |
| AUTH-20 | Verified | ⚠️ Verified com ressalva (sincronização bidirecional não reasserida) |

---

## Summary

**Overall**: ❌ Not Ready

**Spec-anchored check**: 30/30 ACs com evidência; 27 exatas, 3 parciais; 1 edge case não implementado, 1 edge case inverificável
**Sensor**: 10/10 mutações mortas
**Gate**: 4 de 5 verdes; `npm run lint` sai 1 com um erro novo

**O que funciona**: o primitivo de token (hash SHA-256, uso único, TTL por propósito) é rigoroso e resiste a todas as mutações; convite, reset, bootstrap e o desacoplamento do Calendar estão cobertos ponta a ponta com PGlite real; a remoção do Google/senha mestre é travada estruturalmente por varredura de `src/**` no teste de conformidade; 2432 testes verdes com cobertura de 96,9 % / 91,5 %.

**Issues encontradas**: um erro `complexity` novo no handler do callback do Calendar quebra o gate de `lint` (e contradiz o resultado reportado pelo autor); o edge case "consumir um convite invalida os demais convites da conta" não está implementado; três ACs têm asserção mais fraca que o enunciado.

**Next steps**: aplicar Fix 1 (blocker) e Fix 2 (major), depois reexecutar `npm run lint` e a suíte, e re-despachar o Verifier. Fixes 3–7 podem seguir juntos ou virar backlog.

---

**Ranked gaps**

1. **Gate de Build reprovado** — `npm run lint` exit 1; erro `complexity` novo em `src/app/api/integrations/google-calendar/callback/route.ts:39` (11 > 10). Success Criteria da spec exige "lint verde".
2. **Edge case não implementado** — "consumir um convite invalida os demais convites não usados da conta": `src/application/auth/auth-token-flow.ts:90-111` não chama `markAllUnusedAsUsed`; sem teste.
3. **Spec-precision gap** — edge case de `purpose` divergente é inverificável: nenhuma rota espera um propósito específico e `ConsumeAuthToken` nunca lê `purpose`. Sem evidência.
4. **AUTH-19 payload gap** — "recusar sem persistir credencial" asserido só por status/mensagem em `tests/api/calendar-integration-routes.test.ts:174-175` e `:185`.
5. **AUTH-06 asserção parcial** — `tests/api/set-password-route.test.ts:79` confirma a presença do cookie, não o papel dentro dele; o papel é asserido em `tests/api/auth-routes.test.ts:181` e `tests/api/bootstrap-route.test.ts:153`, fora do fluxo de convite genérico.
6. **AUTH-20 asserção parcial** — "preservando a sincronização bidirecional" reduzida a `expect(calendar.constructor.name).toBe("GoogleCalendarGateway")` (`tests/api/calendar-gateway-source.test.ts:39`).
7. **Warning novo de lint** — `tests/api/auth-portal-gaps.test.ts:56` `resetGoogleEnv` sem uso.
8. **DRY** — `src/app/api/auth/bootstrap/route.ts:23-30` duplica `passwordMatches` (`src/lib/auth/session.ts:135`).
9. **Inconsistência interna da spec** — Assumptions dizem 201 para a falha de envio no cadastro; AUTH-09 diz 200 (código e testes: 200).
