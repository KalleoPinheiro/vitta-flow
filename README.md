# VittaFlow

Sistema de gestão completo para clínica de estomaterapia: prontuário eletrônico (anamnese, evolução SOAP, acompanhamento de estomias e feridas), agenda com calendário e regras de negócio, faturamento, estoque de insumos, recall de retornos e relatórios gerenciais.

📄 PRD do módulo clínico: [docs/PRD.md](docs/PRD.md)

## Como rodar

### Com Docker Compose (recomendado)

Pré-requisito: Docker + Docker Compose. Sobe PostgreSQL 16 + aplicação; as migrações do Drizzle rodam automaticamente na primeira requisição.

```bash
docker compose up -d --build
# aplicação: http://localhost:3000
# postgres:  localhost:5432 (vitta/vitta, database vitta)
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
| `TZ` | Recomendada | Fuso da clínica — horário comercial é validado em hora local (`America/Sao_Paulo` no compose) |
| `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Não | Email da service account do Google Cloud |
| `GOOGLE_PRIVATE_KEY` | Não | Chave privada da service account (aceita `\n` escapado) |
| `GOOGLE_CALENDAR_ID` | Não | ID do calendário que receberá os eventos |

**Google Calendar**: crie uma service account no Google Cloud, habilite a Calendar API e compartilhe o calendário com o email da service account (permissão "Fazer alterações em eventos"). Sem as 3 variáveis, a sincronização fica desativada e o sistema funciona normalmente.

Qualidade:

```bash
npm test              # 191 testes (domínio, aplicação, integração Postgres via PGlite, API)
npm run test:coverage # cobertura mínima de 80% imposta
npm run lint          # ESLint
```

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
- **Tailwind CSS 4** — UI
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

Testes escritos em estilo BDD (`Feature / Cenário / Dado-Quando-Então`), com cobertura mínima de 80% imposta no vitest:

- `tests/domain/` — invariantes das entidades e value objects
- `tests/application/` — casos de uso com repositórios in-memory
- `tests/infrastructure/` — integração dos repositórios SQLite (`:memory:`)
- `tests/api/` — fluxo completo pela API (paciente → consulta → fatura → resumo)

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
