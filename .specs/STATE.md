# STATE

## Decisions

### AD-001
- **Decision**: Revogação de sessão staff usa semântica de deny-list: só bloqueia quando a conta existe em `user_accounts` E está inativa; subject sem linha (login Google via allowlist, sessões E2E forjadas, "local") continua válido.
- **Reason**: allow-list quebraria login Google (GOOGLE_ALLOWED_EMAILS não cria conta) e a suíte E2E que forja cookies.
- **Trade-off**: conta Google desativada só pela allowlist de env não é revogada em tempo real (mitigado: remoção da env + expiração de 12h).
- **Nota de 2026-09-01 (issue #21)**: a premissa mudou de forma, não de conclusão. Com o login Google e a senha mestre removidos (ADR-004), os subjects sem linha em `user_accounts` que a deny-list protegia deixaram de existir em produção — sobram só os cookies forjados pela suíte E2E e sessões de instalações antigas. A semântica de deny-list foi mantida: continua bloqueando conta existente e inativa, e nenhuma sessão perdeu proteção.
- **Scope**: proxy, lib/auth
- **Date**: 2026-08-15
- **Status**: active

### AD-002
- **Decision**: Sanitização de metadados de imagem (EXIF/XMP/comentários) implementada em TypeScript puro no domínio (parser de segmentos JPEG/chunks PNG/chunks RIFF-WebP), sem dependência nativa nova (sharp).
- **Reason**: objetivo é privacidade (GPS em foto de ferida); strip de metadados atinge isso de forma determinística e testável; sharp traria binário nativo e superfície de build.
- **Trade-off**: não re-encoda o bitmap (payload esteganográfico teórico permanece); aceito e documentado.
- **Scope**: domain/clinical, application/clinical
- **Date**: 2026-08-15
- **Status**: active

### AD-003
- **Decision**: Itens que exigem decisão de negócio (matriz RBAC fina, taxa/janela de cancelamento, escolha de PSP, cadência de relatório ao parceiro, multi-tenancy) NÃO são implementados por conta própria — ficam como fases planejadas (5–6) no docs/plano-evolucao-faseado.md.
- **Reason**: inventar requisitos de negócio viola o processo spec-driven; o usuário decide.
- **Trade-off**: brechas conhecidas (ex.: toda conta staff é admin) permanecem até a decisão.
- **Scope**: programa de evolução
- **Date**: 2026-08-15
- **Status**: active

### AD-004
- **Decision**: Falha de infraestrutura na checagem de revogação de sessão é fail-open (loga e deixa passar), diferente do fail-closed da configuração de auth.
- **Reason**: indisponibilidade momentânea do banco não pode derrubar todo acesso da equipe; a checagem é defesa em profundidade sobre sessões já autenticadas.
- **Trade-off**: janela teórica de acesso de conta revogada durante indisponibilidade do banco.
- **Scope**: proxy, lib/auth
- **Date**: 2026-08-15
- **Status**: active

### AD-005
- **Decision**: Todo workaround local que existe por ausência de componente no `@still-void/ui` é marcado no ponto do código com o comentário `sv-gap: <slug>`, e o mesmo `<slug>` tem uma seção em `docs/still-void-gaps.md`. `scripts/check-sv-adoption.sh` (`npm run check:sv`) falha se um dos lados ficar órfão, nos dois sentidos.
- **Reason**: sem a marcação, "isso é `<select>` nativo porque a lib não tem" e "isso é `<select>` nativo porque ninguém migrou" são indistinguíveis no diff — e a dívida vira invisível na revisão seguinte.
- **Trade-off**: exige disciplina de manter o documento junto do código; a exceção `<!-- sv-gap-doc-only -->` cobre a lacuna que é relato sobre a lib e não tem workaround local.
- **Scope**: src/**, docs/still-void-gaps.md, scripts/
- **Date**: 2026-08-22
- **Status**: active

### AD-006
- **Decision**: Todo utilitário de cor em `src/**/*.tsx` resolve para um token `--sv-*` pela ponte `@theme` de `globals.css`. Degrau cru de paleta Tailwind (`slate-*`, `teal-*`, `amber-*`, `emerald-*`, `sky-*`, `red-*`, `violet-*`) é proibido e falha o gate. A única exceção é cor neutra literal (`black`, `white`, `transparent`, `current`) em superfície de impressão, que precisa ignorar o tema — e leva comentário dizendo por quê.
- **Reason**: a ponte anterior remapeava `slate-*`/`teal-*` para os tokens, então a cor certa saía, mas o código mentia sobre o papel: `bg-teal-700` não diz "ação primária", e o apelido travava a leitura e a troca de accent.
- **Trade-off**: a varredura do Tailwind foi restringida a `src/` via `source("../../src")` para que blocos de código em `docs/` e `.specs/` não ressuscitem os apelidos no CSS gerado — se algum dia houver markup fora de `src/`, o `@source` precisa ser estendido.
- **Scope**: src/app/globals.css, src/**/*.tsx
- **Date**: 2026-08-22
- **Status**: active

### AD-007
- **Decision**: `npm run build` invoca o Next via `node --max-old-space-size=4096` em vez de deixar o heap no padrão do V8.
- **Reason**: o build usa ~2,5 GB de pico (medido) e o V8 dimensiona o heap padrão pela memória do host — em máquina de ~8 GB o padrão é 2.240 MB e o build worker morre com `Ineffective mark-compacts near heap limit`. O limite fica na fronteira exata da necessidade, então a falha depende da máquina, não do código.
- **Trade-off**: fixa um número que precisa subir se o pico do build crescer; a forma `node --max-old-space-size=… ./node_modules/next/dist/bin/next build` foi escolhida em vez de `NODE_OPTIONS=…` por ser portável para Windows (sem sintaxe de env do shell) — verificado que os build workers herdam o `execArgv`.
- **Scope**: package.json, Dockerfile (herda pelo `npm run build`)
- **Date**: 2026-08-22
- **Status**: active

### AD-008
- **Decision**: Os 7 findings HIGH de "segredo exposto" (GitLeaks `generic-api-key`) e os 2 de `hardcoded_secrets` (Semgrep) do scan de 2026-08-23 são falsos positivos — não há rotação de credencial nem reescrita de histórico Git.
- **Reason**: todos os valores são fixtures de teste rotuladas (`e2e/support/constants.ts`, `tests/**`); o `.env.example` versionado só contém valores vazios ou placeholder. Nenhuma credencial real chegou ao repositório.
- **Trade-off**: as constantes inline de `tests/**` continuam no código (a suíte precisa delas determinísticas e legíveis). As da suíte E2E foram externalizadas e passaram a ser geradas por execução. **Correção de 2026-08-24**: esta decisão afirmava allowlist em `.semgrepignore` — o arquivo nunca existiu e não será criado (ver AD-012). A supressão real é o `.gitleaks.toml` para execução local e o comentário inline para o GitGuard (AD-011); os findings `node_secret`/`node_password` de `tests/**` permanecem como falso positivo aceito, sem supressão.
- **Scope**: e2e, tests, configuração de scanners
- **Date**: 2026-08-23
- **Status**: active

### AD-009
- **Decision**: As 4 vulnerabilidades MODERATE de `esbuild` (via `@esbuild-kit/*` → `drizzle-kit`) são aceitas, não corrigidas.
- **Reason**: o único remédio oferecido pelo npm é downgrade major de `drizzle-kit` 0.31.10 → 0.18.1. `drizzle-kit` é CLI de migração, dev-only, fora do bundle de produção; e o advisory do `esbuild` afeta o dev-server dele, não o runtime da aplicação.
- **Trade-off**: `npm audit` segue reportando 4 MODERATE. Revisar quando o `drizzle-kit` migrar do `@esbuild-kit` (já deprecado, fundido no `tsx`).
- **Scope**: dependências
- **Date**: 2026-08-23
- **Status**: active

### AD-010
- **Decision**: A varredura de dependências fica limitada a patch/minor. Majors disponíveis (TypeScript 7, ESLint 10, `@types/node` 26, `@testing-library/jest-dom` 7, `googleapis` 176) não são aplicados.
- **Reason**: decisão do usuário; nenhum deles é necessário para fechar os findings de segurança, e cada um exigiria refactor de config/tipos com risco de cascata.
- **Trade-off**: o projeto fica uma major atrás nesses cinco pacotes. É backlog, não pendência de segurança.
- **Scope**: dependências
- **Date**: 2026-08-23
- **Status**: active

### AD-011
- **Decision**: A supressão de falso positivo que precisa alcançar o GitGuard é feita por **comentário inline** (`gitleaks:allow`, `nosemgrep`) na linha do achado, não por arquivo de configuração no repositório. O `.gitleaks.toml` permanece, mas só vale para execução local e CI própria.
- **Reason**: medido por A/B na mesma árvore — sem o `.gitleaks.toml` o gitleaks acha 7 leaks, com ele 0; ainda assim o GitGuard reportou os mesmos 7 antes e depois do PR #9. A precedência do gitleaks é `--config` > `GITLEAKS_CONFIG` > `(target)/.gitleaks.toml`, então um scanner hospedado que passa a própria config sobrepõe a do repo. O comentário inline é processado pelo detector e só é desligado pela flag global `--ignore-gitleaks-allow`.
- **Trade-off**: a justificativa fica repetida em cada linha em vez de centralizada num arquivo; em compensação ela vive ao lado do valor que a motiva, e some junto com ele se a fixture for removida.
- **Scope**: tests/, configuração de scanners
- **Date**: 2026-08-24
- **Status**: active

### AD-012
- **Decision**: Não criar `.semgrepignore`. Os findings `node_secret`/`node_password`/`node_username` das fixtures de `tests/**` ficam como falso positivo aceito e documentado, sem supressão.
- **Reason**: `.semgrepignore` exclui arquivos inteiros, não regras. Excluir `tests/` apagaria toda a cobertura Semgrep sobre a suíte para calar 2 findings que o GitGuard já deduplica — e, por AD-011, nem alcançaria o GitGuard. Verificado que o ignore default do Semgrep **não** exclui `tests/` (`--verbose` mostra `Skipped by .semgrepignore: <none>`).
- **Trade-off**: o relatório do GitGuard segue com 2 findings HIGH de `hardcoded_secrets` que nunca vão sumir; o veredito fica em `.specs/features/ruido-scanners-seguranca/spec.md` (B7).
- **Scope**: tests/, configuração de scanners
- **Date**: 2026-08-24
- **Status**: active

### AD-013
- **Decision**: Relatório de scanner externo só vira trabalho depois de reproduzido localmente. `gitleaks` (binário da release oficial) e `semgrep` (via `uv tool install`) rodam contra a árvore do commit escaneado, e `npm audit`/`npm ls` respondem pelos itens de dependência.
- **Reason**: o scan `cmt60oz29012twtz1z1duza2q` reportou 54 findings contra 35 do anterior, sugerindo regressão. A reprodução mostrou que era o mesmo conjunto com duplicação (`detect-non-literal-regexp` 18→36, um CVE do `brace-expansion` contado 2×) e que dois findings já corrigidos no PR #9 continuavam listados. Sem reproduzir, o caminho natural seria "corrigir" postcss e sharp para versões que a árvore já tinha havia um commit.
- **Trade-off**: exige instalar os scanners no ambiente (nenhum está no `package.json`, e o Semgrep depende de `uv`); em troca o confronto deixa de ser por busca dirigida e passa a ser por execução.
- **Scope**: processo de auditoria
- **Date**: 2026-08-24
- **Status**: active

### AD-014
- **Decision**: A adoção do `@still-void/ui` no VittaFlow é **port, não redesign**: quando uma release da lib passa a exportar um primitivo, o workaround local correspondente é trocado por ele; adotar um padrão de UI que o app ainda não tem (Tabs, Tooltip, DropdownMenu, AlertDialog, Badge, ThemeToggle, Prose) é feature nova e fica fora da migração.
- **Reason**: decisão do usuário em 2026-08-25, ao especificar a 2.0.1 → 3.1.0. Sem essa fronteira, "usar o máximo dos recursos da lib" vira redesenho de navegação e interação embutido numa migração de dependência — e o diff deixa de ser revisável contra um baseline de comportamento.
- **Trade-off**: recursos reais da lib (`fieldMessage` + `aria-invalid`, `Badge`, família `AlertDialog`) ficam sem adoção mesmo existindo necessidade latente; viram backlog próprio em vez de carona na migração.
- **Scope**: src/**, docs/still-void-gaps.md, migrações do design system
- **Date**: 2026-08-25
- **Status**: active

### AD-015
- **Decision**: O `Modal` do app mantém o próprio botão de fechar (`aria-label="Fechar"`) e passa `showCloseButton={false}` ao `DialogContent` da `3.x`.
- **Reason**: o botão que a `3.0.0` passou a renderizar por padrão tem nome acessível `"Close dialog"` **hardcoded** — verificado em `dist/react/client/index.js`; `DialogContentProps` expõe só `showCloseButton`, nenhuma prop de rótulo. Numa interface pt-BR isso é regressão de acessibilidade, e o contrato do app já é asserido por `tests/components/modal.test.tsx`.
- **Trade-off**: a lacuna `dialog-close-button` continua tecnicamente fechada pela lib, mas o app não a consome; a dívida migra para uma lacuna nova, `dialog-close-label`, que é pedido de i18n na lib.
- **Scope**: src/components/modal.tsx, docs/still-void-gaps.md
- **Date**: 2026-08-25
- **Status**: superseded by AD-016

### AD-016
- **Decision**: O `Modal` do app passa a usar `closeLabel="Fechar"` nativo do `DialogContent` da `3.2.0` em vez do botão de fechar manual (`DialogClose`/`Icon` próprios); `showCloseButton={false}` sai, `DialogContent` volta ao botão nativo com `closeLabel="Fechar"`.
- **Reason**: a `3.2.0` passa a expor `DialogContentProps.closeLabel?: string`, que controla o texto do `<span className="sv-sr-only">` interno do botão de fechar nativo (antes hardcoded em inglês, `"Close dialog"`, motivo original de AD-015) — a lacuna `dialog-close-label` de `docs/still-void-gaps.md` fecha porque a lib passa a suportar i18n do rótulo sem precisar desabilitar o botão.
- **Trade-off**: efeito colateral aceito e confirmado com o usuário — a ordem de foco do modal muda, porque o botão de fechar nativo é anexado depois de `{children}` no DOM, não antes como o botão manual estava (ver commit `252df2e` e `tests/components/modal.test.tsx`). Todas as consultas de teste que usavam `getByLabelText("Fechar")` (que só resolve `aria-label`/`<label>`) migraram para `getByRole("button", { name: "Fechar" })`, já que o nome acessível agora vem do `<span className="sv-sr-only">` filho, não de um atributo `aria-label`.
- **Scope**: src/components/modal.tsx, docs/still-void-gaps.md, tests/components/modal.test.tsx, tests/pages/staff-*.test.tsx
- **Date**: 2026-08-26
- **Status**: active

### AD-017
- **Decision**: Todo filtro por `clinic_id` em repositório Drizzle passa por um helper centralizado `withTenant(table, clinicId, extra?)` (`src/infrastructure/persistence/drizzle/tenant-scope.ts`) em vez de `and(eq(table.clinicId, clinicId), extra)` repetido em cada método. `clinicId: null` (papel de sistema) faz o helper retornar `extra` sozinho, sem filtro.
- **Reason**: com ~15 repositórios e ~45 rotas tocados pela fundação de multi-tenancy (issue #19), um filtro repetido manualmente em cada método é o ponto onde "esquecer o filtro numa rota nova" (risco que a própria issue #19 pede um teste para cobrir) mais provavelmente acontece; centralizar dá ao sensor de discriminação do Verifier um único ponto por repositório para mutar e confirmar que os testes de isolamento pegam.
- **Trade-off**: todo repositório precisa importar o helper em vez de compor `and()`/`eq()` livremente; qualquer exceção (query que genuinamente precisa ignorar tenant fora do papel de sistema) precisa ser óbvia no código-review por não usar o helper.
- **Scope**: src/infrastructure/persistence/drizzle/**, todo repositório novo criado a partir de agora
- **Date**: 2026-08-30
- **Status**: active

### AD-018
- **Decision**: E-mail transacional (convite e reset de senha) usa Resend consumido pela API HTTP com `fetch`, sem SDK nem dependência npm nova, atrás da porta `EmailGateway` com implementação nula. A fábrica `buildEmailGateway()` **lança** em `NODE_ENV=production` quando faltam `RESEND_API_KEY`/`EMAIL_FROM`, e só fora de produção cai no gateway nulo (dry-run que loga o link).
- **Reason**: espelha o `MetaWhatsAppGateway`, que já é HTTP puro com timeout — o projeto ganha um canal novo sem ganhar árvore de dependência. A assimetria produção/dev é o que satisfaz ao mesmo tempo a user story 11 da #21 ("falha clara na inicialização") e a AC da #32 que exige a implementação nula "para quando não há credenciais": em produção, um canal mudo significa que ninguém consegue o primeiro acesso.
- **Trade-off**: sem SDK, features futuras do provedor (anexos, templates, webhooks de entrega) exigem escrever o request à mão; trocar de provedor mexe numa classe, não numa dependência.
- **Scope**: src/application/ports/email-gateway.ts, src/infrastructure/email/**, todo fluxo que envia e-mail
- **Date**: 2026-09-01
- **Status**: active

### AD-019
- **Decision**: Token de convite/reset é um segredo opaco de 32 bytes (`randomBytes`, base64url) que circula só no link do e-mail; `auth_tokens` guarda apenas o SHA-256 dele, com `purpose`, `account_id`, `expires_at` e `used_at`. Uso único; emitir um token invalida os anteriores não usados do mesmo propósito; link inexistente, expirado, já usado ou de conta inativa produzem a mesma mensagem (`Link inválido ou expirado — solicite um novo`). A tabela **não** tem `clinic_id`.
- **Reason**: o consumo acontece antes de existir sessão, então não há tenant de contexto — a autorização é o próprio token, e a conta alvo já carrega a empresa. Guardar só o hash impede que leitura do banco vire tomada de conta; a mensagem única impede que a resposta revele se um link já foi usado por outra pessoa ou se um endereço existe.
- **Trade-off**: um token perdido não pode ser reconstruído nem reexibido (só reemitido), e a ausência de `clinic_id` é uma exceção deliberada ao AD-017 — qualquer consulta nova nessa tabela precisa continuar sendo por `secret_hash` ou por `account_id`, nunca por listagem.
- **Scope**: src/domain/auth/auth-token.ts, src/application/auth/auth-token-flow.ts, drizzle/0023_auth-tokens.sql
- **Date**: 2026-09-01
- **Status**: active

### AD-020
- **Decision**: A primeira conta Super Admin de uma instalação nasce de `POST /api/auth/bootstrap`, guardada por duas condições independentes: o header `x-bootstrap-token` igual a `VITTA_BOOTSTRAP_TOKEN` **e** a inexistência de qualquer conta. A conta nasce sem senha usável e recebe o convite normal; quando o gateway de e-mail está desativado (dev/teste), a resposta devolve o `inviteUrl`. Como consequência, `DrizzleUserAccountRepository.save` deixou de recusar repositório de sistema e passa a gravar a empresa que a própria conta carrega (`null` para super_admin).
- **Reason**: sem allowlist e sem senha mestre não sobra caminho de primeiro acesso, e um script CLI não alcança o PGlite em memória usado por dev e pela suíte E2E. As duas guardas se cobrem: sem o segredo ninguém chama; depois da primeira conta a rota some funcionalmente, mesmo com o segredo vazado. Devolver o link quando não há canal de e-mail é o que torna o bootstrap utilizável fora de produção — em produção `buildEmailGateway` falha na inicialização sem credenciais, então o campo vem sempre nulo (AD-018).
- **Trade-off**: existe uma rota pública a mais na superfície de ataque (mitigada por rate limit, segredo e a guarda de zero contas), e uma instalação que esqueça `VITTA_BOOTSTRAP_TOKEN` fica sem caminho de bootstrap — fail-closed deliberado, coerente com a ADR-004, que já aceita que a recuperação extrema exige intervenção no banco.
- **Scope**: src/app/api/auth/bootstrap/**, src/infrastructure/persistence/drizzle/drizzle-foundation-repositories.ts, e2e/global-setup.ts
- **Date**: 2026-09-01
- **Status**: active

## Handoff

- **Feature `rbac-catalogo-papeis` — CONCLUÍDA e VERIFICADA** (issue #20, catálogo de 6 papéis + hierarquia de provisionamento + escopo dinâmico do Profissional por vínculo). Todas as 19 tasks (T1-T19) já estavam implementadas e commitadas antes desta sessão (a sessão anterior travou por crash da IDE logo após o commit da T19, `5ca89b3`, sem rodar o Verifier). Esta sessão retomou do handoff, rodou o gate completo e disparou o Verifier que faltava. Branch `feature/issue-20`, 19 commits: `6ed2762`..`5ca89b3`.
- **Verifier (fresh sub-agent, author ≠ verifier) — PASS**: 18 ACs (user stories P1-P4) amostradas com evidência `file:line`, nenhum gap de precisão de spec; sensor de discriminação (3 mutações — vínculo desabilitado em `professional-patient-scope.ts`, `atendente` adicionado à família `clinical` em `route-family.ts`, `canProvision` de `role-hierarchy.ts` sempre `true`) matou as 3 em worktree isolado (`/tmp/verify-issue20`, removido); árvore real confirmada intacta. Relatório: `.specs/features/rbac-catalogo-papeis/validation.md`. Nenhuma lição nova distilada (PASS limpo).
- **Gate rodado nesta sessão e verde**: `npm run typecheck` (limpo), `npm run lint` (exit 0 — nota: `npm run lint`/`npx eslint` nesta VM passam por um wrapper `rtk` que despeja um resumo com nomes de arquivo ofuscados apontando para `node_modules`/`.next`; é ruído do wrapper, não do ESLint real — `globalIgnores` do `eslint.config.*` já exclui `.next/**`; exit code 0 é o sinal confiável, não o texto do resumo), `npm run test:coverage --no-file-parallelism` (todos passando, 97.01% statements — acima do piso de 90%), `npm run build` (OK), `npm run check:sv` (OK), `npm run test:e2e` (68/68 passed, sem flake).
- **Next step**: nenhum pendente para esta feature. Issue #20 pronta para fechar/merge (decisão do usuário). Próximo trabalho do backlog RBAC, se houver, é o que a spec já marca como fora de escopo: mudanças no mecanismo de autenticação em si.
- **Blockers**: nenhum.
- **Branch**: `feature/issue-20` (não `main` — checkout principal, sem worktree dedicado para esta feature).

- **Feature `fundacao-multi-tenancy` — CONCLUÍDA e VERIFICADA** (issue #19 + sub-issues #22-#27, épico de RBAC multi-empresa). Todas as 24 tasks (T1-T24), 6 phases, 3 batches (A: T1-T7, B: T8-T16, C: T17-T24) executadas inline nesta sessão (sem sub-agentes, por escolha do usuário), direto no checkout principal (`~/projects/vitta-flow`), branch `main`, sem worktree dedicado. Issues #22-#27 fechadas. Relatório completo: `.specs/features/fundacao-multi-tenancy/validation.md`.
- **Verifier (fresh sub-agent, author ≠ verifier) — PASS**: 15/15 requisitos amostrados (MT-02..MT-28) com evidência `file:line` e outcome batendo com o spec; sensor de discriminação (3 mutações — `withTenant` removido de `findById`, rota com `clinicId: null` forçado, guarda `=== null` invertida) matou as 3 em worktree isolado, árvore real confirmada intacta antes/depois. `validate_state.py` confirma o relatório bem-formado.
- **2 gaps não-bloqueantes apontados pelo Verifier, aceitos como follow-up (não corrigidos nesta entrega — fora do escopo das 24 tasks)**:
  1. `src/app/api/patients/[id]/export/route.ts:30` (export LGPD) ainda chama `getRepositories({ clinicId: null })` incondicionalmente — nenhuma task cobria essa rota; sem teste provando se uma sessão comum consegue exportar paciente de outra clínica. Candidato a task futura de isolamento.
  2. 1 warning de lint pré-existente adicional (`tests/components/sidebar-auto-close.test.tsx:3`, import não usado) fora da baseline de 20 documentada — não relacionado a este épico.
- **Gate final rodado nesta sessão (foreground, não background — ver nota abaixo) e verde**: `npm run typecheck`, `npm run lint` (baseline de 20 problemas pré-existentes, nenhum novo), `npm run test:coverage --no-file-parallelism` (1928/1928 testes, 96.86% statements — acima do piso de 90%), `npm run check:sv` (OK), `npm run build` (OK), `npm run test:e2e` (61 passed, 7 flaky por lentidão da VM — todos recuperados no retry, 0 falha real após a correção abaixo).
- **Regressão real encontrada e corrigida rodando o e2e completo** (só apareceu ali, não nos testes unitários/integração): `e2e/support/session-token.ts` é uma réplica documentada do formato de token de `src/lib/auth/session.ts`, mas não foi espelhada quando `createSessionToken` passou a incluir `clinicId` no payload (T6) — `verifySessionToken` rejeitava todo token e2e (campo ausente, não `null`), derrubando os specs de portal do paciente/parceiro. Corrigido no mesmo commit da T24 (`144fc28`), com default `"legacy-clinic"` (mesma clínica do fluxo de login real). **Lição**: specs e2e que replicam formatos de assinatura por design (para não puxar `next/server` no test runner) são um ponto cego real de qualquer suíte unitária — só o e2e completo pega.
- **Achado de ambiente desta sessão**: rodar comandos longos (`npm run test:coverage`, `npx vitest run` sem filtro) em **background** neste WSL foi finalizado externamente (`status: killed`) várias vezes, sem OOM no `dmesg` e sem processo travado — causa não identificada com certeza, mas correlacionada a alguma interrupção do lado da sessão/terminal. **Rodar em foreground (sem `run_in_background`) resolveu 100% das vezes.** Também: os binários do Chromium do Playwright (`~/.cache/ms-playwright`) não estavam instalados nesta VM — `npx playwright install chromium` funciona sem root, mas as libs de sistema (`libnspr4` etc.) exigem `sudo npx playwright install-deps chromium`, que só funciona num terminal interativo de verdade (o prefixo `!` desta sessão não serve, `sudo` não consegue ler senha de um pipe).
- **Padrão consolidado ao longo do épico** (útil para qualquer isolamento futuro, ex.: o gap do export LGPD acima): cada entidade isolada segue o mesmo molde — (1) repositório Drizzle ganha `clinicId: string | null` no construtor, usa `withTenant` em toda leitura, e `save()`/`delete()` lança erro se `clinicId` for `null` (exceção deliberada: `ReminderLogRepository`, cai em `LEGACY_CLINIC_ID` em vez de lançar, porque o cron `/api/reminders/run` é cross-empresa por natureza); (2) `container.ts` passa `tenant.clinicId`; (3) call sites de teste que instanciam o repositório direto (`new Drizzle...Repository(appDb)`) precisam de um clinicId literal (`"legacy-clinic"`); (4) rotas de leitura (GET) usam `guard.session?.clinicId ?? null` (papel de sistema pode ler cross-empresa); rotas de escrita usam `?? LEGACY_CLINIC_ID`; (5) todo `getRepositories({ clinicId: null })` num arquivo tocado precisa ser auditado — call sites fora do escopo da task atual que **escrevem** via um repositório recém-scoped quebram silenciosamente — sempre rodar a suíte COMPLETA pelo menos uma vez por task; (6) nova task de isolamento sempre ganha `tests/api/<entidade>-tenant-isolation.test.ts` usando `tests/support/clinics.ts` (`ensureTestClinics`, `CLINIC_A_ID`, `CLINIC_B_ID`).
- **Decisões técnicas não registradas como AD formal** (candidatas se o épico continuar): `PatientRepository.findClinicIdById` (T7) e `DrizzleConditionPhotoRepository` ganhando `clinicId`+`withTenant` completo (T16) — ambos padrões para o papel de sistema auditar/isolar sem poluir o domínio.
- **Next step**: nenhum pendente para este épico. Se houver trabalho futuro, considerar: (a) isolar `patients/[id]/export`, (b) decidir sobre os 2 gaps do Verifier, (c) próxima feature.
- **Blockers**: nenhum.
- **Branch**: `main` (checkout principal, sem worktree). 26 commits deste épico: `f9ca946`..`144fc28`.

### Baseline de segurança medido em `fcd6110`

Reproduza pelo procedimento do README (seção "Varredura de segurança").

| Medição | Valor esperado |
|---|---|
| `gitleaks dir .` sobre a árvore **sem** `.gitleaks.toml` | `no leaks found` |
| Semgrep (`p/nodejsscan` + regexp + gcm + formatstring) | 58 findings |
| — `node_secret` / `node_password` / `node_username` | 40 / 13 / 4 — falso positivo aceito (AD-012) |
| — `unsafe-formatstring` | 1 — falso positivo (B9) |
| — `detect-non-literal-regexp` | 0 |
| `npm audit` | 0 HIGH/CRITICAL; 4 MODERATE de `esbuild` (AD-009) |

Um scan GitGuard sobre `fcd6110` deve cair de 54 para ~9 findings: 2 `hardcoded_secrets`
deduplicados, 1 `unsafe-formatstring` e os 6 TRIVY obsoletos, que só somem quando o
serviço reindexar o lockfile. Acima disso, reproduza localmente antes de agir.
