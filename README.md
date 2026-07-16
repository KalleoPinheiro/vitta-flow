# VittaFlow

Sistema de gestão para clínica de estomaterapia: cadastro de pacientes, agendamento de consultas com calendário e controle de faturamento.

## Como rodar

Pré-requisito: Node.js 20+ (testado com 24).

```bash
npm install
npm run dev          # desenvolvimento — http://localhost:3000
```

Produção:

```bash
npm run build
npm start            # http://localhost:3000 (PORT=xxxx para trocar a porta)
```

O banco SQLite é criado automaticamente na primeira execução em `data/vitta.db` — nenhuma migração manual é necessária. Para usar outro caminho: `VITTA_DB_PATH=/caminho/arquivo.db npm start`.

Qualidade:

```bash
npm test             # 117 testes (domínio, aplicação, integração SQLite, API)
npm run test:coverage # cobertura mínima de 80% imposta
npm run lint         # ESLint
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
- **Detecção de conflito de horário**: agendar ou remarcar sobre consulta ativa é bloqueado (HTTP 409); consultas canceladas/faltas liberam o horário.
- **Clique em uma consulta** abre detalhes com ações conforme o status:
  - **Confirmar** (agendada → confirmada)
  - **Concluir + faturar** — conclui e **gera fatura pendente automaticamente** (idempotente, nunca duplica)
  - **Registrar falta** (no-show)
  - **Cancelar**
  - **Remarcar** para nova data/horário mantendo a duração

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

### Regras de negócio garantidas por teste
- Máquina de estados da consulta: `scheduled → confirmed → completed`, com desvios para `cancelled`/`no_show`; transições inválidas são rejeitadas.
- Fatura: `pending → paid` ou `pending → cancelled`; nunca paga/cancela duas vezes.
- Valores monetários sempre em centavos inteiros (value object `Money`, formatação BRL).
- Sobreposição de horários calculada por value object `TimeSlot` (slots adjacentes não conflitam).

## Stack

- **Next.js 16** (App Router) — frontend + backend (route handlers)
- **TypeScript** estrito
- **SQLite** (better-sqlite3) — persistência local em `data/vitta.db`
- **Zod** — validação de entrada nas rotas de API
- **Vitest** — testes unitários, de aplicação e integração
- **Tailwind CSS 4** — UI

## Arquitetura

DDD em camadas, com dependências apontando para dentro (SOLID/DIP):

```
src/
├── domain/            # Entidades, value objects, erros e contratos de repositório
│   ├── shared/        # Money, TimeSlot, erros de domínio
│   ├── patient/       # Patient + PatientRepository
│   ├── scheduling/    # Appointment (máquina de estados) + AppointmentRepository
│   └── billing/       # Invoice + InvoiceRepository
├── application/       # Casos de uso (um por arquivo)
│   ├── patients/      # criar, atualizar, listar, buscar, ativar/desativar
│   ├── appointments/  # agendar (sem conflito), remarcar, confirmar/cancelar/falta,
│   │                  # concluir (gera fatura automaticamente), listar por período
│   └── billing/       # emitir, pagar, cancelar, listar, resumo financeiro
├── infrastructure/    # Implementações de repositório (SQLite e in-memory) + container
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
