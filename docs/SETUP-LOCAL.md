# Setup local — VittaFlow

Guia detalhado pra configurar e rodar app local. Duas vias: Docker Compose (recomendado) ou Node direto contra Postgres do compose.

## Pré-requisitos

| Ferramenta | Versão | Obrigatório p/ |
|---|---|---|
| Docker + Docker Compose | atual | via A (tudo) e via B (só DB) |
| Node.js | 20+ (testado 24) | via B, scripts, testes |
| npm | vem com Node | install/build/test |
| openssl | qualquer | gerar `AUTH_SECRET` |
| gh CLI | opcional | baixar gitleaks (seção segurança) |

## Via A — Docker Compose (recomendado)

Sobe Postgres 16 + app numa tacada. Migrações Drizzle rodam sozinhas no boot (advisory lock, seguro com múltiplas réplicas).

```bash
AUTH_PASSWORD=sua-senha AUTH_SECRET=$(openssl rand -hex 32) docker compose up -d --build
```

- App: http://localhost:3000 (login com `AUTH_PASSWORD`)
- Postgres: `localhost:5432` (user/pass `vitta`/`vitta`, db `vitta`)

Porta ocupada? Sobrescreve:

```bash
POSTGRES_PORT=5477 APP_PORT=3001 AUTH_PASSWORD=sua-senha AUTH_SECRET=$(openssl rand -hex 32) docker compose up -d --build
```

Parar: `docker compose down` (volume `pgdata` mantém dados). Apagar dados: `docker compose down -v`.

Rebuild após mudar código: repete o `docker compose up -d --build` (Dockerfile faz build multi-stage: deps → build → runner standalone).

## Via B — Node local + Postgres do compose

Só sobe o banco no container; app roda direto na máquina (hot reload do `next dev`).

```bash
docker compose up -d db          # só Postgres
cp .env.example .env             # DATABASE_URL já aponta pra localhost:5432
npm install
npm run dev                      # http://localhost:3000
```

Sem autenticação configurada (`AUTH_PASSWORD`/`AUTH_SECRET` vazios) e fora de produção: app roda em **modo aberto** com aviso — ver seção Auth abaixo. Se quiser senha local, edita `.env` e reinicia `npm run dev`.

### Migrações manuais (opcional)

Por padrão rodam no boot. Pra rodar à parte (ex.: deploy com step dedicado) e desligar o auto-run:

```bash
npm run db:migrate                    # aplica migrações pendentes em drizzle/
# .env: VITTA_MIGRATE_ON_BOOT=false
```

## Variáveis de ambiente

Copia `.env.example` → `.env` e ajusta. Referência completa:

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim (fora do compose) | `postgres://vitta:vitta@localhost:5432/vitta` |
| `AUTH_PASSWORD` | Sim em produção* | Senha de acesso (login local da equipe) |
| `AUTH_SECRET` | Sim em produção | Assina sessão + cifra credenciais — `openssl rand -hex 32` |
| `APP_URL` | P/ login Google | URL pública (redirect OAuth), ex. `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | P/ login Google | OAuth client (Web) no Google Cloud Console |
| `GOOGLE_ALLOWED_EMAILS` | P/ login Google | Allowlist obrigatória, emails separados por vírgula |
| `TZ` | Recomendada | Fuso da clínica (horário comercial validado em hora local) |
| `CRON_SECRET` | P/ lembretes | Header `x-cron-secret` em `POST /api/reminders/run`; sem ele rota fica 503 |
| `API_RATE_LIMIT_MAX` | Não | Req/min por IP em `/api/*` (padrão 120) |
| `VITTA_ALLOW_OPEN_MODE` | Não | `true` roda sem auth (só fora de produção) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` / `GOOGLE_PRIVATE_KEY` / `GOOGLE_CALENDAR_ID` | Não | Calendar via service account (alternativa ao OAuth) |
| `PG_POOL_MAX` / `PG_CONNECT_TIMEOUT_MS` / `PG_IDLE_TIMEOUT_MS` / `PG_STATEMENT_TIMEOUT_MS` | Não | Tuning do pool Postgres |
| `UPLOADS_DIR` | Não | Diretório de fotos de evolução (fora de `public/`) |
| `CLINIC_NAME` / `CLINIC_CNPJ` / `CLINIC_ADDRESS` / `CLINIC_CITY` / `CLINIC_PROFESSIONAL_NAME` / `CLINIC_PROFESSIONAL_REGISTRY` | Não | Cabeçalho/assinatura de documentos clínicos |
| `WHATSAPP_TOKEN` / `WHATSAPP_PHONE_NUMBER_ID` | Não | Lembretes via WhatsApp (Meta Cloud API); sem elas roda em dry-run |

\* Produção precisa de ao menos um método de login (senha ou Google). Sem nenhum: 503 fail-closed.

### Modo aberto (dev/demo sem login)

Sem auth configurada e sem `VITTA_ALLOW_OPEN_MODE`: app responde **503 em todas as rotas**, mesmo em dev (fail-closed por padrão). Pra rodar sem login:

```bash
# .env
VITTA_ALLOW_OPEN_MODE=true
```

Ignorada quando `NODE_ENV=production` — nunca dá pra rodar produção sem auth. Auditoria registra ator `anonymous`.

### Login Google + Calendar (opcional, recomendado)

1. Google Cloud Console → APIs & Services → Credentials → **OAuth client ID** (tipo Web application).
2. Redirect URI: `{APP_URL}/api/auth/google/callback`.
3. Habilita **Google Calendar API** no projeto.
4. Preenche `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `APP_URL`, `GOOGLE_ALLOWED_EMAILS`.

Resultado: tela de login mostra "Entrar com Google" (só allowlist entra); refresh token fica cifrado AES-256-GCM; eventos de agenda sincronizam no calendário `primary` da conta logada (sobrescrevível via `GOOGLE_CALENDAR_ID`).

### Google Calendar via service account (alternativa)

Sem login Google, só sincronização de agenda:

1. Cria service account no Google Cloud, habilita Calendar API.
2. Compartilha o calendário-alvo com o email da service account, permissão "Fazer alterações em eventos".
3. Preenche `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY`, `GOOGLE_CALENDAR_ID`.

Usada só quando nenhuma conta Google está conectada via OAuth. Sem nenhuma das duas: agenda funciona normal, sem sync.

## Scripts úteis

```bash
npm run dev              # dev server, http://localhost:3000
npm run build            # build produção (heap fixado 4GB, ver nota abaixo)
npm run start            # roda build de produção
npm run typecheck         # tsc --noEmit
npm run lint              # ESLint
npm run db:migrate        # aplica migrações Drizzle pendentes
npm run import-taxonomy   # tsx scripts/import-taxonomy.ts
npm run check:sv          # gate de adoção do design system @still-void/ui
```

Nota sobre `npm run build`: fixa heap do Node em 4GB (`--max-old-space-size=4096`) porque o build usa ~2,5GB de pico (React Compiler + geração estática de 52 rotas); em host de ~8GB o heap padrão do V8 fica em ~2,2GB e o worker morre com `Ineffective mark-compacts near heap limit`. Se o pico subir, ajusta o valor em `package.json`.

## Testes

```bash
npm test                 # 191 testes: domínio, aplicação, integração Postgres via PGlite, API
npm run test:watch       # modo watch
npm run test:coverage    # cobertura mínima 90% imposta (limiar em vitest.config.ts)
npm run test:e2e         # Playwright — primeira execução (ou após bump do @playwright/test): npx playwright install
npm run test:e2e:ui      # Playwright modo UI
```

Suíte E2E sobe os próprios servidores Next e gera credenciais a cada execução — nada fica hardcoded, nada a configurar no fluxo normal. Pra reaproveitar um `npm run dev` já rodando: `webServer.env` do Playwright não se aplica, então `E2E_AUTH_SECRET`/`E2E_AUTH_PASSWORD` (suíte) e `AUTH_SECRET`/`AUTH_PASSWORD` (servidor) precisam ter os mesmos valores.

## Estrutura do projeto (DDD em camadas)

```
src/
├── domain/            # Entidades, value objects, erros, contratos de repositório
├── application/       # Casos de uso (um por arquivo) + ports (CalendarGateway)
├── infrastructure/     # Repositórios Drizzle/Postgres + in-memory, Google Calendar, container
├── app/               # Next.js: páginas + api/ (route handlers, envelope {success,data,error})
├── components/        # UI compartilhada
└── lib/               # DTOs, fetch client, formatação pt-BR, hooks
```

Migrações Drizzle: `drizzle/`. Schema fonte: `src/infrastructure/persistence/drizzle/schema.ts` (`drizzle.config.ts`).

## Varredura de segurança (opcional, sob demanda)

`npm audit` é a fonte da verdade pra dependências:

```bash
npm audit
```

Gitleaks e Semgrep não vêm no `package.json` — instala sob demanda:

```bash
mkdir -p /tmp/gl && gh release download v8.30.1 --repo gitleaks/gitleaks --pattern 'gitleaks_8.30.1_linux_x64.tar.gz' --dir /tmp/gl --clobber && tar -xzf /tmp/gl/gitleaks_8.30.1_linux_x64.tar.gz -C /tmp/gl gitleaks
uv tool install 'semgrep==1.174.0'
```

Escaneia árvore de commit específico (não working dir, pra ficar fora `node_modules`/build):

```bash
rm -rf /tmp/scan && mkdir -p /tmp/scan && git archive <commit> | tar -x -C /tmp/scan
cd /tmp/scan && /tmp/gl/gitleaks dir . --no-banner
cd /tmp/scan && semgrep scan --config=p/nodejsscan --config=r/javascript.lang.security.audit.detect-non-literal-regexp --metrics=off src e2e tests scripts
```

Detalhes completos (por que reproduzir local, divergência de scanner hospedado, AD-011/AD-013) em [README.md](../README.md#varredura-de-segurança).

## Troubleshooting

| Sintoma | Causa provável | Ação |
|---|---|---|
| 503 em toda rota | Sem `AUTH_PASSWORD`/`AUTH_SECRET` nem `VITTA_ALLOW_OPEN_MODE` | Define auth ou `VITTA_ALLOW_OPEN_MODE=true` (fora de produção) |
| Porta 5432/3000 ocupada | Outro serviço na porta | `POSTGRES_PORT=`/`APP_PORT=` no compose, ou ajusta `DATABASE_URL` na via B |
| Build mata processo (`Ineffective mark-compacts`) | Heap V8 padrão baixo pra máquina | Já mitigado via `--max-old-space-size=4096`; se persistir, sobe o valor em `package.json` |
| Login Google recusa conta | Email fora de `GOOGLE_ALLOWED_EMAILS` | Adiciona email à allowlist (separado por vírgula) |
| Consulta rejeitada com 400 | Fora do horário comercial (seg-sex 08h-18h, `TZ`) | Ajusta horário ou `TZ` |
| Consulta rejeitada com 409 | Conflito de agenda (folga mínima 15min) | Escolhe outro horário |
| E2E falha só ao reaproveitar `npm run dev` | `E2E_AUTH_*` e `AUTH_*` divergentes | Usa os mesmos valores nos dois pares, ou deixa a suíte subir seu próprio servidor |

## Referências

- [README.md](../README.md) — funcionalidades, API, arquitetura, stack
- [PRD.md](PRD.md), [PRD-FASE-2.md](PRD-FASE-2.md), [PRD-FASE-3.md](PRD-FASE-3.md) — requisitos por fase
- [ANALISE-SEGURANCA-ESCALABILIDADE.md](ANALISE-SEGURANCA-ESCALABILIDADE.md) — análise de segurança/escalabilidade
- [.env.example](../.env.example) — todas as variáveis com comentários inline
