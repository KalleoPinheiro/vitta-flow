# Fase 1 — Hardening de Segurança — Specification

## Problem Statement

A análise da base identificou brechas que viram incidente com dado de saúde: sessões staff
sobrevivem à desativação da conta, fotos de ferida carregam GPS (EXIF), a chave do rate limit é
forjável via `x-forwarded-for`, o segredo do cron é comparado sem tempo constante e a auditoria
de ações críticas é best-effort. Nenhum item exige decisão de negócio — todos são executáveis já.

## Goals

- [ ] Conta staff desativada perde acesso em ≤ 60s (não mais até 12h).
- [ ] Nenhuma foto armazenada após o deploy contém metadados EXIF/XMP/comentários.
- [ ] Rate limit usa IP derivado de cadeia de proxy confiável configurável.
- [ ] Guard de sessão único elimina o boilerplate repetido nas rotas do portal.
- [ ] Exportação LGPD e exclusão de foto só respondem sucesso com auditoria gravada.

## Out of Scope

| Feature | Reason |
|---------|--------|
| RBAC granular de staff (recepção/clínico) | Exige matriz de permissões do negócio → Fase 6 (AD-003) |
| Re-encode de bitmap (anti-esteganografia) | AD-002: strip de metadados atinge o objetivo de privacidade |
| Revogação de sessão patient/partner | Já coberta: use cases do portal revalidam `isActive` por email a cada request |
| Sunset da senha master | Fase 6; aqui apenas aviso de uso |
| Cifragem em repouso das fotos | Item maior, depende de estratégia de chaves → backlog |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|-----------------------|----------------|-----------|------------|
| Semântica da revogação | Deny-list: bloqueia só conta existente e inativa | Não quebra Google allowlist nem E2E (AD-001) | y (AD) |
| Falha de banco na checagem de revogação | Fail-open com log | Disponibilidade da equipe; defesa em profundidade (AD-004) | y (AD) |
| TTL do cache de revogação | 60s | Equilíbrio entre custo por request e janela de revogação | y |
| Aviso de senha master | `console.warn` no login master (sem audit event novo) | `AuditAction` não tem ação de login; criar açao nova é escopo além do item | y |
| `TRUSTED_PROXY_HOPS` default | 1 (último IP da cadeia XFF) | Topologia padrão: 1 reverse proxy confiável appenda o IP real | y |
| Foto legada (pré-deploy) com EXIF | Não migrada retroativamente | Migração de binários é operação separada; novas gravações saem limpas | y |

**Open questions:** none — all resolved or logged above.

## User Stories

### P1: Revogar acesso de conta staff desativada ⭐ MVP

**User Story**: Como administrador da clínica, quero que desativar uma conta corte o acesso dela
em minutos, para que um desligamento não deixe prontuários expostos por até 12h.

**Acceptance Criteria**:

1. WHEN uma sessão admin com subject de email pertence a uma conta `user_accounts` com `active=false` THEN o proxy SHALL responder 401 (API) ou redirect para /login (página) — `SEC1-01`
2. WHEN o subject é "local" (senha master) ou email sem linha em `user_accounts` THEN o proxy SHALL permitir a requisição (deny-list, AD-001) — `SEC1-02`
3. WHEN a mesma conta é consultada de novo dentro de 60s THEN o sistema SHALL usar o cache (sem nova consulta ao banco) — `SEC1-03`
4. WHEN a consulta ao banco falha THEN o proxy SHALL permitir a requisição e logar o erro (AD-004) — `SEC1-04`

**Independent Test**: desativar conta via repositório, requisitar rota staff com cookie válido → 401.

### P1: Fotos armazenadas sem metadados sensíveis ⭐ MVP

**User Story**: Como paciente, quero que fotos da minha ferida não carreguem o GPS da minha casa,
para que meu endereço não vaze junto do meu prontuário.

**Acceptance Criteria**:

1. WHEN um JPEG com segmentos APP1 (EXIF/XMP), APP2+ ou COM é ingerido THEN o sistema SHALL gravar o arquivo sem esses segmentos, preservando APP0 (JFIF) e os dados de imagem — `SEC1-05`
2. WHEN um PNG com chunks tEXt/zTXt/iTXt/eXIf/tIME é ingerido THEN o sistema SHALL gravar o arquivo sem esses chunks, preservando IHDR/PLTE/IDAT/IEND e chunks essenciais de renderização — `SEC1-06`
3. WHEN um WebP com chunks EXIF/XMP é ingerido THEN o sistema SHALL gravar o arquivo sem esses chunks, com o tamanho RIFF corrigido e flags EXIF/XMP zeradas no VP8X — `SEC1-07`
4. WHEN a imagem não tem metadados THEN o sistema SHALL gravar bytes com conteúdo de imagem intacto e `sizeBytes` refletindo o arquivo gravado — `SEC1-08`
5. WHEN os bytes não formam JPEG/PNG/WebP válido THEN o sistema SHALL rejeitar com a validação existente (comportamento atual preservado) — `SEC1-09`

**Independent Test**: upload de fixture JPEG com EXIF GPS → ler arquivo gravado → sem marcador APP1.

### P1: Chave de rate limit não forjável ⭐ MVP

**User Story**: Como operador, quero que o rate limit use o IP real do cliente segundo a
topologia de proxies confiáveis, para que brute-force não contorne o limite forjando headers.

**Acceptance Criteria**:

1. WHEN `x-forwarded-for` tem N IPs e `TRUSTED_PROXY_HOPS=1` THEN o sistema SHALL usar o último IP da cadeia como chave — `SEC1-10`
2. WHEN `TRUSTED_PROXY_HOPS=2` THEN o sistema SHALL usar o penúltimo IP — `SEC1-11`
3. WHEN o header está ausente ou a posição não existe THEN o sistema SHALL usar "unknown" — `SEC1-12`
4. WHEN proxy e rota de login derivam o IP THEN ambos SHALL usar a mesma função compartilhada — `SEC1-13`

### P2: Guard de sessão unificado

**User Story**: Como desenvolvedor, quero um guard único `requireRole` para as rotas do portal,
para que um esquecimento de checagem não vire furo de escopo.

**Acceptance Criteria**:

1. WHEN uma rota exige papel e a sessão está ausente THEN o guard SHALL responder 401 com envelope padrão — `SEC1-14`
2. WHEN a sessão tem papel diferente do exigido THEN o guard SHALL responder 403 com a mensagem atual da rota ("Rota exclusiva do portal do paciente" para patient) — `SEC1-15`
3. WHEN o papel confere THEN o guard SHALL retornar a sessão para a rota usar o subject — `SEC1-16`
4. Todas as rotas do portal que hoje repetem o padrão inline SHALL passar a usar o guard, sem mudança de contrato HTTP — `SEC1-17`

### P2: Higiene de credenciais

**Acceptance Criteria**:

1. WHEN `x-cron-secret` é comparado THEN a comparação SHALL ser em tempo constante — `SEC1-18`
2. WHEN o login master é usado com sucesso THEN o servidor SHALL logar aviso de credencial compartilhada — `SEC1-19`

### P2: Auditoria write-ahead em ações críticas

**Acceptance Criteria**:

1. WHEN a exportação LGPD é gerada THEN o evento de auditoria SHALL ser persistido antes da resposta de sucesso; falha na auditoria SHALL falhar a requisição — `SEC1-20`
2. WHEN uma foto é excluída THEN o evento de auditoria SHALL ser persistido antes da resposta de sucesso — `SEC1-21`
3. Demais rotas SHALL manter o comportamento best-effort atual (`after()`) — `SEC1-22`

## Edge Cases

- WHEN JPEG termina truncado no meio de um segmento THEN o strip SHALL devolver os bytes originais sem lançar (fail-safe: nunca corromper) e o pipeline segue com a validação existente
- WHEN PNG tem chunk com length que ultrapassa o buffer THEN o strip SHALL devolver os bytes originais sem lançar
- WHEN WebP não tem VP8X (formato simples) THEN o strip SHALL apenas remover chunks EXIF/XMP se presentes
- WHEN cache de revogação expira exatamente no request THEN nova consulta ao banco é feita e o resultado recacheado

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|----------------|-------|-------|--------|
| SEC1-01..04 | P1 revogação | Execute | Implemented |
| SEC1-05..09 | P1 metadados | Execute | Implemented |
| SEC1-10..13 | P1 rate limit | Execute | Implemented |
| SEC1-14..17 | P2 guard | Execute | Implemented |
| SEC1-18..19 | P2 credenciais | Execute | Implemented |
| SEC1-20..22 | P2 auditoria | Execute | Implemented |

## Success Criteria

- [ ] `npm test`, `npm run lint`, `npm run build` verdes
- [ ] Conta desativada → 401 em ≤ 60s (teste automatizado)
- [ ] Fixture JPEG com EXIF → arquivo gravado sem APP1 (teste automatizado)
