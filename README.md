# VittaFlow

Sistema de gestão completo para clínica de estomaterapia: prontuário eletrônico (anamnese, evolução SOAP, acompanhamento de estomias e feridas), agenda com calendário e regras de negócio, faturamento, estoque de insumos, recall de retornos e relatórios gerenciais.

⚙️ Setup local detalhado: [docs/setup-local.md](docs/setup-local.md)
📄 PRD do módulo clínico: [docs/product/prd-fase-1.md](docs/product/prd-fase-1.md)
🔐 Análise de segurança/escalabilidade + plano de ação: [docs/audits/analise-seguranca-escalabilidade.md](docs/audits/analise-seguranca-escalabilidade.md)
🎨 Lacunas do design system, para backlog da lib: [docs/still-void-gaps.md](docs/still-void-gaps.md)

## Como rodar

### Com Docker Compose (recomendado)

Pré-requisito: Docker + Docker Compose. Sobe PostgreSQL 16 + aplicação; as migrações do Drizzle rodam automaticamente na primeira requisição.

```bash
AUTH_SECRET=$(openssl rand -hex 32) VITTA_BOOTSTRAP_TOKEN=$(openssl rand -hex 24) \
  docker compose up -d --build
# aplicação: http://localhost:3000
# postgres:  localhost:5432 (vitta/vitta, database vitta)

# primeira conta (instalação vazia): cria o Super Admin e devolve o link de convite
curl -sX POST http://localhost:3000/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -H "x-bootstrap-token: $VITTA_BOOTSTRAP_TOKEN" \
  -d '{"email":"voce@suaclinica.com"}'
# sem canal de e-mail configurado, a resposta traz `inviteUrl` — abra-o e defina a senha
```

Portas ocupadas? Use variáveis: `POSTGRES_PORT=5477 APP_PORT=3001 docker compose up -d`.

Para parar: `docker compose down` (dados ficam no volume `pgdata`; `down -v` apaga).

### Desenvolvimento local (Node + Postgres do compose)

Pré-requisito: Node.js 20+ (testado com 24).

```bash
docker compose up -d db          # só o PostgreSQL
cp .env.example .env             # DATABASE_URL já aponta para localhost:5432
npm install
npm run dev                      # http://localhost:3000
```

### Variáveis de ambiente

| Variável | Obrigatória | Descrição |
|----------|-------------|-----------|
| `DATABASE_URL` | Sim (fora do compose) | Conexão PostgreSQL, ex.: `postgres://vitta:vitta@localhost:5432/vitta` |
| `AUTH_SECRET` | Sim em produção | Segredo de assinatura da sessão e da cifra de credenciais — `openssl rand -hex 32` |
| `APP_URL` | Sim em produção | URL pública da aplicação — compõe os links de convite/reset e o redirect do OAuth da agenda |
| `RESEND_API_KEY` / `EMAIL_FROM` | Sim em produção | Provedor de e-mail transacional (convite e reset). Faltando em produção, a inicialização falha com erro explícito |
| `VITTA_BOOTSTRAP_TOKEN` | P/ primeira conta | Segredo do header `x-bootstrap-token` em `POST /api/auth/bootstrap`; sem ele não há caminho de bootstrap |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | P/ Google Agenda | OAuth client (Web) do Google Cloud Console — usado só pela integração de agenda, nunca por login |
| `TZ` | Recomendada | Fuso da clínica — horário comercial é validado em hora local (`America/Sao_Paulo` no compose) |
| `CRON_SECRET` | P/ lembretes | Segredo do header `x-cron-secret` em `POST /api/reminders/run`; sem ele a rota fica desativada (503) |
| `API_RATE_LIMIT_MAX` | Não | Requisições/minuto por IP em `/api/*` (padrão 120) |
| `VITTA_ALLOW_OPEN_MODE` | Não | `true` roda **sem autenticação** (só fora de produção) — ver abaixo |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Não | Email da service account do Google Cloud |
| `GOOGLE_PRIVATE_KEY` | Não | Chave privada da service account (aceita `\n` escapado) |
| `GOOGLE_CALENDAR_ID` | Não | ID do calendário que receberá os eventos |

**Autenticação (ADR-004)**: existe um único método de login — e-mail + senha da própria conta. Não há senha mestre, allowlist de e-mails nem login via Google. Quem é cadastrado recebe um e-mail de convite com um link de 24 h para definir a própria senha; "esqueci minha senha" emite um link equivalente de 1 h. Em produção, `AUTH_SECRET` ausente responde 503 em toda rota (fail-closed).

**Primeira conta**: numa instalação sem nenhuma conta, `POST /api/auth/bootstrap` cria o Super Admin. A rota exige o header `x-bootstrap-token` igual a `VITTA_BOOTSTRAP_TOKEN` **e** que não exista nenhuma conta — depois da primeira, responde 403 para sempre.

**Modo aberto (`VITTA_ALLOW_OPEN_MODE`)**: sem autenticação configurada e sem esta variável, o app responde **503 em todas as rotas** — inclusive em desenvolvimento (fail-closed). Para rodar sem login (demo local, testes E2E de navegação), defina `VITTA_ALLOW_OPEN_MODE=true`. A variável é ignorada quando `NODE_ENV=production`: **nunca** é possível rodar produção sem autenticação. Em modo aberto o app registra a auditoria com o ator `anonymous`.

**Google Calendar via OAuth (recomendado)**: no Google Cloud Console crie um *OAuth client ID* (tipo Web application) com redirect URI `{APP_URL}/api/integrations/google-calendar/callback` e habilite a **Google Calendar API**. Preencha `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` e `APP_URL`. A partir daí:
- Em **Configurações → Google Agenda**, uma conta de equipe já logada clica em "Conectar Google Agenda". O fluxo pede apenas o escopo `calendar.events` e **não** cria, renova ou troca sessão — é integração, não login.
- O sistema guarda o refresh token **cifrado (AES-256-GCM)** e passa a criar/atualizar/remover os eventos da agenda **no calendário da conta conectada** (`primary`). `GOOGLE_CALENDAR_ID` pode sobrescrever o destino.

**Google Calendar via service account (alternativa sem OAuth)**: crie uma service account, habilite a Calendar API e compartilhe o calendário com o email dela (permissão "Fazer alterações em eventos"); preencha `GOOGLE_SERVICE_ACCOUNT_EMAIL`, `GOOGLE_PRIVATE_KEY` e `GOOGLE_CALENDAR_ID`. Usada apenas quando nenhuma conta Google está conectada. Sem nenhuma das duas integrações, a agenda funciona normalmente sem sincronização.

Qualidade:

```bash
npm test              # 191 testes (domínio, aplicação, integração Postgres via PGlite, API)
npm run test:coverage # cobertura mínima de 90% imposta (vitest.config.ts)
npm run lint          # ESLint
```

**Memória do build.** `npm run build` fixa o heap do Node em 4 GB. O build usa
~2,5 GB de pico (React Compiler + geração estática de 52 rotas), e o V8 dimensiona
o heap padrão pela memória da máquina: em host de ~8 GB o padrão fica em ~2,2 GB e
o build worker morre com `Ineffective mark-compacts near heap limit`. Em host com
mais memória o padrão já seria suficiente — o valor fixo só garante que o build se
comporte igual em qualquer máquina. Se o pico do build subir, ajuste o número em
`package.json`.

## Funcionalidades

### Dashboard (`/`)
- Cards do mês corrente: **valor recebido**, **valor a receber**, **nº de consultas** e **faturas pendentes**.
- Lista das **consultas de hoje** com horário, paciente, procedimento e status.
- Atalho para a agenda completa.

### Agenda (`/agenda`)
- **Calendário mensal** com navegação entre meses; dia atual destacado.
- Consultas exibidas no dia, ordenadas por horário e coloridas por status (agendada, confirmada, concluída, cancelada, falta).
- **Clique em um dia** abre o formulário de nova consulta com a data pré-preenchida.
- **Nova consulta**: paciente (apenas ativos), data, horário de início, duração (30–120 min), procedimento, valor e observações.
- **Horário comercial obrigatório**: consultas só podem ser marcadas de segunda a sexta, das 08:00 às 18:00 (hora local da clínica, via `TZ`); fora disso a API rejeita com HTTP 400.
- **Intervalo mínimo de 15 minutos entre consultas**: dois pacientes nunca ocupam o mesmo horário e é exigida folga de pelo menos 15min antes e depois de cada consulta ativa (HTTP 409 se violado); consultas canceladas/faltas liberam o horário.
- **Sincronização com Google Calendar** (quando configurado): agendar cria evento no calendário; remarcar atualiza o evento; cancelar/falta remove o evento. Falhas na integração não bloqueiam a operação.
- **Clique em uma consulta** abre detalhes com ações conforme o status:
  - **Confirmar** (agendada → confirmada)
  - **Concluir + faturar** — conclui e **gera fatura pendente automaticamente** (idempotente, nunca duplica)
  - **Registrar falta** (no-show)
  - **Cancelar**
  - **Remarcar (reagendamento)** para nova data/horário mantendo a duração — sujeito às mesmas regras de horário comercial e intervalo mínimo

### Pacientes (`/pacientes`)
- Listagem com **busca com debounce** por nome, email ou telefone.
- **Cadastro e edição**: nome, email (único no sistema), telefone, data de nascimento e observações clínicas.
- **Desativar/reativar** paciente (soft delete — pacientes inativos não podem receber novos agendamentos e aparecem esmaecidos).
- Validações de domínio: nome mínimo de 3 caracteres, email válido, telefone obrigatório.

### Faturamento (`/faturamento`)
- Cards de **total recebido** e **total a receber** da lista atual.
- **Filtros por status**: todas, pendentes, pagas, canceladas.
- Tabela com emissão, paciente, descrição, valor, status e detalhes do pagamento.
- **Fatura avulsa**: emitir manualmente para qualquer paciente ativo (descrição, valor, vencimento opcional) — além das geradas automaticamente pelas consultas concluídas.
- **Receber pagamento** escolhendo o método: Pix, dinheiro, cartão de crédito, cartão de débito, convênio ou transferência; registra data do pagamento.
- **Cancelar fatura** pendente (faturas pagas não podem ser canceladas).

### Prontuário do paciente (`/pacientes/[id]`)
- **Anamnese estruturada** (1 por paciente, editável): comorbidades, alergias, medicações em uso, histórico cirúrgico e observações.
- **Destaque de segurança**: alergias registradas aparecem em banner vermelho no topo do prontuário.
- **Evoluções de enfermagem no padrão SOAP** (Subjetivo, Objetivo, Avaliação, Plano) — imutáveis após registradas (integridade de prontuário, exigência COFEN); exigem ao menos um campo preenchido; listadas em ordem cronológica reversa.
- **Condições clínicas** com linha do tempo de avaliações:
  - **Estomia**: tipo obrigatório (colostomia/ileostomia/urostomia), data de confecção, avaliações de pele periestomal e complicações (dermatite, prolapso, hérnia…).
  - **Ferida**: medidas C×L×P em mm com **área calculada (C×L)** para acompanhar a cicatrização, tecido predominante (granulação/esfacelo/necrose/epitelização), nível de exsudato e **escala de dor 0–10**.
  - Condição pode ser marcada como **resolvida** (alta); condição resolvida não recebe novas avaliações.

### Materiais e estoque (`/materiais`)
- Catálogo de insumos (bolsas, placas, coberturas, cremes) com unidade, **estoque mínimo** e preço.
- **Movimentações de entrada e saída** com motivo obrigatório e histórico auditável.
- **Estoque nunca fica negativo**: saída maior que o disponível é bloqueada com mensagem clara.
- **Alerta de estoque baixo** (quantidade ≤ mínimo) na listagem e no dashboard.

### Recall de retornos
- Ao **concluir uma consulta**, opção de programar retorno em 7/15/30/60/90 dias — cria pendência automática.
- **Painel de retornos pendentes no dashboard**, com atrasados destacados em vermelho e ações de concluir/cancelar.
- Retornos manuais via API (`POST /api/follow-ups`).

### Relatórios gerenciais (`/relatorios`)
- Seleção de mês; consultas por status; **taxa de falta (no-show)** com alerta visual acima de 15%.
- Recebido × a receber no mês; **receita por procedimento** das consultas concluídas.

### Papéis de acesso (RBAC) e portais
Três papéis, resolvidos automaticamente no login com Google pelo email da conta (senha local = admin):

| Papel | Quem | O que acessa |
|-------|------|--------------|
| **admin** | Equipe da clínica (contas em `user_accounts`) | Sistema completo |
| **partner** | Médico parceiro cadastrado em `/parceiros` | Portal com **apenas os pacientes que ele indicou**: consultas e evolução clínica (sem financeiro, sem anamnese) |
| **patient** | Paciente cadastrado em `/pacientes` | Portal com **apenas os próprios dados**: próximas consultas, retornos recomendados, evolução clínica, histórico e faturas |

- **Parceria e indicação**: cadastro de médicos parceiros (`/parceiros` — nome, email, CRM, especialidade) e campo "Indicado por" no cadastro do paciente.
- **Portais** em `/portal` (layout próprio, sem menu da clínica): a visão é escolhida pelo papel da sessão.
- **Enforcement no proxy**: papel embutido no cookie assinado; rotas da clínica são exclusivas do admin (paciente/parceiro recebem 403 na API e redirect para `/portal` nas páginas); rotas `/api/portal/*` revalidam o papel e escopam os dados pelo email da sessão no servidor.
- Parceiro/paciente desativado perde o login imediatamente (resolução nega o acesso).
- Login Google de paciente/parceiro **não** grava credencial de Calendar (ela pertence à equipe).

### Regras de negócio garantidas por teste
- Máquina de estados da consulta: `scheduled → confirmed → completed`, com desvios para `cancelled`/`no_show`; transições inválidas são rejeitadas.
- Fatura: `pending → paid` ou `pending → cancelled`; nunca paga/cancela duas vezes.
- Valores monetários sempre em centavos inteiros (value object `Money`, formatação BRL).
- **Horário comercial**: segunda a sexta, 08:00–18:00 (`src/domain/scheduling/business-hours.ts`); consulta não pode atravessar o fechamento nem cair em fim de semana.
- **Intervalo mínimo de 15 minutos** entre consultas: o slot é expandido em 15min para os dois lados na checagem de conflito (`TimeSlot.expand`).
- **Google Calendar**: evento criado no agendamento (id persistido em `google_event_id`), atualizado na remarcação e removido no cancelamento/falta; indisponibilidade da integração nunca impede a operação.

## Stack

- **Next.js 16** (App Router) — frontend + backend (route handlers)
- **TypeScript** estrito
- **PostgreSQL 16** + **Drizzle ORM** — persistência (migrações em `drizzle/`, aplicadas automaticamente no boot)
- **PGlite** — Postgres em memória para testes de integração (sem Docker no `npm test`)
- **googleapis** — sincronização de eventos com Google Calendar (service account)
- **Zod** — validação de entrada nas rotas de API
- **Vitest** — testes unitários, de aplicação e integração
- **Tailwind CSS 4** — UI (CSS-first: a ponte de tokens vive em `src/app/globals.css`, sem `tailwind.config.ts`)
- **@still-void/ui 2.x** — design system (tokens, receitas e componentes shadcn). Lacunas do catálogo em [docs/still-void-gaps.md](docs/still-void-gaps.md)
- **Docker Compose** — PostgreSQL + app conteinerizados

## Arquitetura

DDD em camadas, com dependências apontando para dentro (SOLID/DIP):

```
src/
├── domain/            # Entidades, value objects, erros e contratos de repositório
│   ├── shared/        # Money, TimeSlot, erros de domínio
│   ├── patient/       # Patient + PatientRepository
│   ├── scheduling/    # Appointment (máquina de estados), horário comercial + AppointmentRepository
│   └── billing/       # Invoice + InvoiceRepository
├── application/       # Casos de uso (um por arquivo) + ports (CalendarGateway)
│   ├── patients/      # criar, atualizar, listar, buscar, ativar/desativar
│   ├── appointments/  # agendar (horário comercial + folga 15min), remarcar,
│   │                  # confirmar/cancelar/falta, concluir (gera fatura), listar por período
│   └── billing/       # emitir, pagar, cancelar, listar, resumo financeiro
├── infrastructure/    # Repositórios Drizzle/Postgres e in-memory, Google Calendar, container
├── app/               # Next.js: páginas (dashboard, agenda, pacientes, faturamento)
│   └── api/           # Route handlers REST com envelope {success, data, error}
├── components/        # UI compartilhada (modal, badges, feedback)
└── lib/               # DTOs, fetch client, formatação pt-BR, hook useApiQuery
```

## Testes (BDD + TDD)

Testes escritos em estilo BDD (`Feature / Cenário / Dado-Quando-Então`), com cobertura mínima de **90%** imposta no vitest (limiar em `vitest.config.ts` — fonte da verdade):

- `tests/domain/` — invariantes das entidades e value objects
- `tests/application/` — casos de uso com repositórios in-memory
- `tests/infrastructure/` — integração dos repositórios SQLite (`:memory:`)
- `tests/api/` — fluxo completo pela API (paciente → consulta → fatura → resumo)
- `tests/components/` e `tests/pages/` — renderização e interação (jsdom + Testing Library)
- `e2e/` — jornadas ponta a ponta no browser (Playwright, `npm run test:e2e`; na primeira execução, ou após um bump do `@playwright/test`, rode `npx playwright install`)

`npm run check:sv` é um gate à parte: falha se um `<button>`/`<input>` cru voltar, se uma cor sair da ponte de tokens, ou se uma marcação `sv-gap:` ficar sem entrada em [docs/still-void-gaps.md](docs/still-void-gaps.md).

A suíte E2E sobe os próprios servidores Next e **gera as credenciais a cada execução** — nenhum segredo fica no código-fonte, e no fluxo normal não é preciso configurar nada. Para reaproveitar um `npm run dev` já em pé, o `webServer.env` do Playwright não se aplica: os pares precisam bater — `E2E_AUTH_SECRET`/`E2E_BOOTSTRAP_TOKEN` para a suíte e `AUTH_SECRET`/`VITTA_BOOTSTRAP_TOKEN` com os mesmos valores para o servidor. O `globalSetup` cria o Super Admin da suíte pelo fluxo real (bootstrap → convite → definir senha → login), sem senha mestre.

## Varredura de segurança

`npm audit` é a fonte da verdade para dependências. Para os outros dois scanners, o
relatório de um serviço hospedado (GitGuard) já divergiu da árvore mais de uma vez —
apontando versões que não existiam mais e repetindo achados já corrigidos. Por isso a
regra é reproduzir localmente antes de agir (AD-013).

```bash
npm audit
```

O gitleaks e o semgrep não estão no `package.json` — instale sob demanda, nas versões
que produziram os números registrados em `validation.md` (o asset do gitleaks é
`linux_x64`; troque pelo da sua plataforma):

```bash
mkdir -p /tmp/gl && gh release download v8.30.1 --repo gitleaks/gitleaks --pattern 'gitleaks_8.30.1_linux_x64.tar.gz' --dir /tmp/gl --clobber && tar -xzf /tmp/gl/gitleaks_8.30.1_linux_x64.tar.gz -C /tmp/gl gitleaks
```

```bash
uv tool install 'semgrep==1.174.0'
```

Escaneie a árvore de um commit específico, não o diretório de trabalho — assim o
`node_modules` e os artefatos de build ficam de fora. O `tar` não cria o destino, então
o `mkdir -p` não é opcional:

```bash
rm -rf /tmp/scan && mkdir -p /tmp/scan && git archive <commit> | tar -x -C /tmp/scan
```

O gitleaks roda **de dentro da árvore, com o alvo `.`** — os `paths` do `.gitleaks.toml`
são regex ancorada em caminho relativo à raiz da varredura, e com alvo absoluto não
casam:

```bash
cd /tmp/scan && /tmp/gl/gitleaks dir . --no-banner
```

```bash
cd /tmp/scan && semgrep scan --config=p/nodejsscan --config=r/javascript.lang.security.audit.detect-non-literal-regexp --metrics=off src e2e tests scripts
```

Para reproduzir o que um scanner hospedado enxerga — e com isso o AC-002.1 de
`ruido-scanners-seguranca` —, apague o `.gitleaks.toml` da cópia antes de escanear:

```bash
rm -rf /tmp/scan-nocfg && mkdir -p /tmp/scan-nocfg && git archive <commit> | tar -x -C /tmp/scan-nocfg && rm -f /tmp/scan-nocfg/.gitleaks.toml && cd /tmp/scan-nocfg && /tmp/gl/gitleaks dir . --no-banner
```

Rodando isso em `f725554` (base) o resultado é `leaks found: 7`; em `HEAD` é
`no leaks found`. A diferença são os comentários inline — e é essa a razão de eles
existirem:

- **O `.gitleaks.toml` do repositório não alcança um scanner hospedado.** A precedência
  do gitleaks é `--config` > `GITLEAKS_CONFIG` > `(target)/.gitleaks.toml`, então quem
  passa a própria config sobrepõe a do repo. Falso positivo que precisa ser suprimido lá
  leva comentário inline `gitleaks:allow` / `nosemgrep` na linha (AD-011).

O veredito de cada achado dos scans de 2026-08-23 fica em
[`.specs/features/auditoria-seguranca-dependencias/spec.md`](.specs/features/auditoria-seguranca-dependencias/spec.md)
e [`.specs/features/ruido-scanners-seguranca/spec.md`](.specs/features/ruido-scanners-seguranca/spec.md).

## API

Todas as respostas usam o envelope `{ success, data, error }`.

| Método | Rota | Descrição |
|--------|------|-----------|
| GET/POST | `/api/patients` | Listar (`?search=`) / cadastrar paciente |
| GET/PUT/PATCH | `/api/patients/:id` | Buscar / atualizar / ativar-desativar |
| GET/POST | `/api/appointments` | Listar por período (`?from=&to=`) / agendar |
| PATCH | `/api/appointments/:id` | `{action: confirm\|cancel\|no_show\|complete\|reschedule}` |
| GET/POST | `/api/invoices` | Listar (`?status=&from=&to=`) / emitir fatura |
| PATCH | `/api/invoices/:id` | `{action: pay, method}` ou `{action: cancel}` |
| GET | `/api/summary` | Resumo do mês (`?month=YYYY-MM`) para o dashboard |
| GET/PUT | `/api/patients/:id/anamnesis` | Buscar / criar-atualizar anamnese |
| GET/POST | `/api/patients/:id/evolutions` | Listar / registrar evolução SOAP (imutável) |
| GET/POST | `/api/patients/:id/conditions` | Listar / criar condição (estomia ou ferida) |
| PATCH | `/api/conditions/:id` | `{action: resolve}` — marcar condição resolvida |
| GET/POST | `/api/conditions/:id/assessments` | Listar / registrar avaliação seriada |
| GET/POST | `/api/supplies` | Listar (com flag estoque baixo) / cadastrar insumo |
| PUT | `/api/supplies/:id` | Atualizar insumo (nome, mínimo, preço, ativo) |
| GET/POST | `/api/supplies/:id/movements` | Histórico / registrar entrada-saída de estoque |
| GET/POST | `/api/follow-ups` | Listar retornos (`?status=`) / criar retorno manual |
| PATCH | `/api/follow-ups/:id` | `{status: done\|cancelled}` |
| GET | `/api/reports` | Relatório gerencial do mês (`?month=YYYY-MM`) |

`PATCH /api/appointments/:id` com `{action: complete}` aceita `followUpInDays` (7/15/30/60/90) para programar retorno automático.
