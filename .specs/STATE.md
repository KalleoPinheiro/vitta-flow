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

- **Feature `autenticacao-nativa` — CONCLUÍDA e VERIFICADA** (issue #21 + sub-issues #32 A1 convite, #34 A2 reset, #33 A3 Calendar desacoplado, #35 A4 remoção+bootstrap). Executa a ADR-004 (Opção A: autenticação 100 % nativa). Pipeline spec-driven completo (Specify → gray areas resolvidas como assumptions → Design → Tasks → Execute) rodado inline, sem sub-agentes de batch, num worktree dedicado (`.claude/worktrees/agent-a7af95ed531c2c8f4`), branch `feature/issue-21`. 21 tasks (T1-T21) em 6 phases + 1 commit de correção do Verifier: 23 commits, `7dec63d`..`9b0371d`. Relatório: `.specs/features/autenticacao-nativa/validation.md`.
- **O que mudou**: toda conta autentica com e-mail + senha própria, definida pela própria pessoa por link de convite (24 h, uso único) ou reset self-service (1 h). Novos: porta `EmailGateway` + `NullEmailGateway` (dry-run) + `ResendEmailGateway` sem SDK; primitivo `AuthToken` (segredo de 32 bytes no link, só SHA-256 em `auth_tokens`, migração `0023`); rotas `set-password`, `forgot-password`, `bootstrap`; telas `/definir-senha` e `/esqueci-senha`; fluxo dedicado `/api/integrations/google-calendar[/callback]`. Removidos: `api/auth/google/**`, `google-oauth.ts`, `ResolveUserRole`, `GOOGLE_ALLOWED_EMAILS`, `AUTH_PASSWORD`. Fail-closed passa a depender só de `AUTH_SECRET`.
- **Verifier (fresh sub-agent, author ≠ verifier) — 2 iterações**. Iteração 1: **FAIL** — pegou um erro `complexity` **novo** (11 > 10) no `GET` do callback do Calendar que eu não tinha visto, mais um edge case não implementado (consumo de token não invalidava os irmãos), um gap de precisão de spec e 4 achados menores. Iteração 2 (após o commit `9b0371d`): **PASS** — os 7 itens do plano de correção confirmados um a um. Sensor de discriminação: 10/10 mortas na iteração 1 (uso único, expiração, invalidação em lote, as 2 guardas do bootstrap, oráculo do forgot-password, `state` do OAuth, fail-closed de auth e de e-mail) + 9/9 sobre o código novo do fix na iteração 2 = **19/19 mutações mortas**. `validate_state.py` exit 0.
- **ARMADILHA DE FERRAMENTAL — corrige o AD-001 do handoff anterior**: `npm run lint` passa por um wrapper `rtk` que **retorna exit 0 sempre**, inclusive com erros reais. O handoff da feature anterior registrou "exit code 0 é o sinal confiável" — **isso está errado e foi exatamente como o erro de `complexity` passou pelo meu gate**. O sinal confiável é `npx eslint . ; echo $?`. Além disso, `npx eslint .` neste repo **já sai 1 no baseline** (2 erros `complexity` em `src/app/api/patients/[id]/evolutions/route.ts` e `drizzle-patient-repository.ts`, + 6 warnings `no-unused-vars` em `tests/**`), todos herdados de `9ec7e00`. O critério utilizável é "zero achados novos atribuíveis ao diff", cruzando os arquivos apontados contra `git diff --name-only <base> HEAD` — não "exit 0".
- **Gate final verde**: `npm run typecheck` (limpo), `npx eslint .` (exit 1 = baseline pré-existente, 0 achados do diff — verificado arquivo a arquivo), `npm run check:sv` (OK), `npm run test:coverage --no-file-parallelism` (157 arquivos, **2434/2434** testes, 96,91 % stmts / 91,51 % branches / 96,78 % funcs / 97 % lines, piso 90), `npm run build` (OK), `npm run test:e2e` (**70/70**, sem flake, rodado 2×).
- **Decisões novas**: `AD-018` (Resend por `fetch` sem SDK; fail-closed em produção, dry-run fora dela), `AD-019` (token opaco, só hash no banco, sem `clinic_id` — exceção deliberada ao AD-017), `AD-020` (bootstrap por rota com dupla guarda: segredo de deploy + zero contas; `DrizzleUserAccountRepository.save` deixou de recusar repositório de sistema). `AD-001` ganhou nota: a premissa mudou de forma (não sobram mais subjects sem linha em produção), a conclusão não.
- **2 estreitamentos aceitos, não bloqueantes** (documentados no `validation.md`): (1) AUTH-20 verifica "sincronização preservada" pelo nome do construtor do gateway, não por um round-trip real de evento; (2) o edge case de `purpose` divergente foi **reescrito** na spec — era inverificável como estava, já que `/api/auth/set-password` é a única rota consumidora e aceita os dois propósitos de propósito.
- **Ambiente**: o worktree precisou de `npm ci` próprio — `next build` do Turbopack recusa `node_modules` symlinkado para fora da raiz do projeto ("Symlink is invalid, it points out of the filesystem root"), e o script `build` usa caminho relativo. Confirmado de novo: comandos longos em **background** morrem neste WSL; rodar em foreground resolve.
- **Next step**: nenhum pendente. Candidatos de backlog levantados pelo Verifier: issue própria para a dívida de lint pré-existente do repo (2 erros + 6 warnings), e o gap conhecido de `google_accounts` ser global (sem `clinic_id`, `findMostRecent()` faz a última conexão vencer para todas as empresas) — pré-existente e explicitamente fora do escopo da ADR-004.
- **Revisão do CodeRabbit no PR #44 — 17 apontamentos, 10 aplicados, 7 recusados com justificativa** (commit `540b06d`). Os que valeram de verdade:
  1. **`docker-compose.yml` estava quebrado** e nem o Verifier nem eu pegamos: ainda exigia `AUTH_PASSWORD` (`:?defina AUTH_PASSWORD`) e passava `GOOGLE_ALLOWED_EMAILS`, ambos removidos por esta própria feature, e não tinha `RESEND_API_KEY`/`EMAIL_FROM`/`VITTA_BOOTSTRAP_TOKEN`. O stack não subia. **Lição**: o gate (`typecheck`/`lint`/`test`/`build`) não toca arquivos de orquestração — remover uma env var exige varrer `docker-compose.yml`, `Dockerfile` e `playwright.config.ts` à mão.
  2. **TOCTOU no resgate do token (CWE-367)**: `findUsableBySecretHash` + `save(markUsed)` era checar-e-depois-marcar; duas requisições simultâneas com o mesmo link passavam as duas. Virou `claimBySecretHash`, um `UPDATE … WHERE used_at IS NULL AND expires_at > now RETURNING *`. As 19 mutações do sensor não pegaram isso porque mutação de linha única não modela concorrência.
  3. **Oráculo de tempo no `forgot-password` (CWE-204)**: o corpo era idêntico, mas o caso "conta existe" aguardava emissão + POST ao provedor. O envio deixou de ser aguardado.
  4. **`APP_URL` sem garantia de origem**: passa a exigir `https://` em produção (loopback liberado para o compose local) — o link carrega o segredo que define a senha.
  5. **Estado do OAuth de agenda não amarrado à sessão**: o cookie passa a levar `<state>:<subject>` e o callback recusa se a sessão do retorno for outra.
  6. **Falha de envio no bootstrap devolvia 500** com a conta já criada — como a rota é de uso único, a instalação ficava sem primeiro acesso. Agora responde 200 com o `inviteUrl`.
- **Recusados com motivo** (registrados no PR): sincronizar contagens de teste de `tasks.md` com as finais (são plano vs. resultado, o histórico é deliberado); pôr `test:e2e` no gate de uma task; exigir `npx eslint .` exit 0 (a dívida é herdada de `9ec7e00` e fora do diff); transação no bootstrap (exige o segredo + janela de ms, e o índice único parcial já cobre o mesmo e-mail); `reuseExistingServer` idempotente no `globalSetup` (falhar alto num servidor com estado sujo é o comportamento desejável).
- **Gate re-rodado após as correções**: 158 arquivos, **2444/2444** testes, 96,9 % stmts / 91,48 % branches, `build` OK, **E2E 70/70** (terceira execução).
- **Blockers**: nenhum.
- **Branch**: `feature/issue-21` (worktree dedicado). 26 commits: `7dec63d`..`540b06d`. PR #44.

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

### AD-021
- **Decision**: `eslint.config.mjs` usa `**/` na frente de todo padrão de `globalIgnores` (`**/.next/**`, `**/.next-open-mode/**`, etc.) e ignora `.claude/worktrees/**` explicitamente.
- **Reason**: sem `**/`, o glob só bate na raiz do projeto. Checkouts de worktree aninhados em `.claude/worktrees/*/` (usados por sessões de agente em paralelo, ver `docs/agents/*`) escapavam do ignore, e o build Turbopack deles inundava `npx eslint .` com milhares de "erros" em bundles compilados do Next/React — isso, não um bug do ESLint ou de `npm run lint`, era a causa do ruído investigado nas issues #48/#49. `npm run lint`/`npx eslint .` sempre propagaram o exit code real; a suspeita registrada em AD anterior (ver handoff de `autenticacao-nativa`, linha ~171) de que um "wrapper `rtk`" mascarava o exit code não reproduziu nesta sessão — não teve como confirmar a causa raiz daquela observação, mas o sintoma descrito (`npm run lint` "sempre" exit 0 mesmo com erro) não bate com o comportamento atual, testado com erro proposital introduzido e revertido.
- **Trade-off**: nenhum — só corrige o glob para o comportamento que o comentário original já pretendia.
- **Scope**: eslint.config.mjs
- **Date**: 2026-09-02
- **Status**: active

- **Batch de correção de issues abertas — CONCLUÍDA e MERGEADA** (#38, #39, #42, #46, #48, #49, #50, #51). Branch `fix/resolve-open-issues-batch-1`, executado inline sem sub-agentes de batch. PR #56, squash-merge `31771aa` em `main`. As 8 issues fecharam automaticamente via `Closes #N` nos commits. #43 pulada por pedido explícito do usuário (é decisão de design, não bug) — segue **aberta**. #45 (E2E real do Google Calendar) comentada e deixada **aberta** — exige decisão de infraestrutura de teste (conta/sandbox dedicada do Google) fora do alcance de um agente automatizado. #47 já estava corrigida por commit anterior (`d2ef69e`) — fechada à parte, sem código novo, antes de abrir o PR.
- **O que mudou**: isolamento por clínica no export LGPD (#38); `ConsumeAuthToken` valida `purpose` (#46); emissão de `auth_token` e bootstrap do Super Admin atômicos contra corrida via índice único parcial + retry em `23505` (#50, #51) — `src/lib/db-errors.ts` novo, compartilhado; `ensureLink` em melhor esforço não derruba mais o registro clínico principal se falhar (#42) — `src/lib/patient-link.ts` novo; dívida de lint real corrigida (2 `complexity` + 6 `no-unused-vars`) e causa raiz do ruído do `eslint.config.mjs` corrigida (AD-021) — ver #48/#49.
- **Revisão do CodeRabbit no PR #56 — 5 achados acionáveis, todos aplicados** (commit de fixes após o primeiro push): (1) migrations `0024`/`0025` ganharam saneamento de duplicatas antes do `CREATE UNIQUE INDEX` — sem isso, uma instalação onde a corrida já tivesse ocorrido antes da migração teria o deploy travado pelo Postgres; (2) export LGPD ganhou `Cache-Control: no-store` (CWE-525); (3) teste de evolução resiliente passou a confirmar persistência real, não só status 200; (4) `InMemoryAuthTokenRepository` de `send-invite.test.ts` corrigido para invalidar os irmãos em `replaceUnused`, espelhando o contrato real; (5) spies de teste restaurados em `finally` em 4 testes. Re-review automática não rodou (plano CodeRabbit com cota de 1 review/hora esgotada; `@coderabbitai review` manual respondeu "rate limited, incremental review não aplicável") — mergeado com o gate local 100% verde e os achados já corrigidos/verificados, sem esperar a cota renovar.
- **Gate completo rodado nesta sessão e verde**: `npm run typecheck` (limpo), `npx eslint .` / `npm run lint` (exit 0, zero achados), `npm run check:sv` (OK), `npx vitest run tests/` (2476/2476), `npm run test:coverage --no-file-parallelism` (96.63% stmts / 91.13% branches / 96.6% funcs / 96.7% lines — acima do piso de 90%), `npm run build` (OK), `npm run test:e2e` (70/70, sem flake). Migrations 0024/0025 (incluindo o saneamento de duplicatas) confirmadas aplicando limpo contra pglite.
- **Next step**: nenhum pendente deste batch. Backlog restante: #43 (decisão de design pendente do usuário) e #45 (decisão de infra de teste do Google Calendar).
- **Blockers**: nenhum.
- **Branch**: `main`. Squash-merge `31771aa` (PR #56, base `100c692`). Branch de trabalho `fix/resolve-open-issues-batch-1` deletada (remota e local) após o merge.

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
