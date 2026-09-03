# Auditoria e Configurações — achados P0-P3 pontuais (issue #92) Specification

## Problem Statement

`docs/audits/auditoria-ux-2026-08.md` §7 (Auditoria e Configurações). Buracos de cobertura de
trilha (#71) e dados da clínica (#61) já foram cobertos pelas Fases C/B — confirmado na issue.
Verificado no código antes deste spec: **mais 4 achados já estão resolvidos** (P0-1 "trilha não
identifica pessoas" — a migração pra autenticação nativa fez todo `actorId` ser uma conta real, não
mais "admin/local"; P0-10 dados da clínica — Fase B; confirmação em Desativar conta já existe;
mobile de Auditoria já tem `overflow-x-auto`). Resta 1 P0 real de cobertura (professionals/accounts
sem evento), 1 P0 real de mensagens contraditórias em Configurações, e P1-P3 selecionados.

## Goals

- [ ] Ações e recursos da trilha de auditoria aparecem em pt-BR, não em inglês/snake_case cru
- [ ] Trocar o filtro de paciente não deixa a tabela mostrando dados do filtro anterior
- [ ] Auditoria tem filtro de período
- [ ] Criar profissional ou conta de acesso gera evento de auditoria
- [ ] Salvar a grade de horários não produz mensagens contraditórias
- [ ] Os 3 campos numéricos da grade têm validação no cliente
- [ ] Linha de conta inativa com contraste correto
- [ ] `check:sv` permanece verde

## Out of Scope

| Item | Reason |
| --- | --- |
| Aviso de impacto ("consultas fora da nova janela") ao estreitar a grade | Exigiria query nova (contar consultas fora da janela candidata) — real, mas desproporcional a um ajuste pontual; recomendo issue própria |
| Reordenar pílulas de dia pra Seg→Dom + `type=time` nos campos de hora | Cosmético/i18n de baixo risco clínico, cortado por tempo desta rodada — acumula como candidato de issue futura |
| `TableCaption`/cabeçalho fixo em Auditoria | Gap de lib (`table-sticky-header`), mesmo padrão de exclusão já usado em #90 |
| P0-1 "trilha não identifica pessoas" | Já resolvido — a migração pra autenticação nativa (ADR-004) fez todo `actorId` vir de uma conta individual real; confirmado no código antes deste spec |
| P0-10 dados da clínica ausentes | Já resolvido pela Fase B (#61) — `ClinicInfoSection` existe |
| P1-15 (parte) confirmação ao desativar conta | Já existe `ConfirmAction` — só o contraste (`opacity-50`) fica pontual aqui |
| P2-17 sucesso sem anúncio | Já resolvido — toda ação usa `useToast()`, que já anuncia via o componente de toast do catálogo |
| P1-14 config/contas sem evento de auditoria | Amplamente já coberto: `settings/schedule` e `settings/clinic-info` já auditam (Fase C); o que falta é só a criação de profissional/conta, coberto por este spec |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| P0-1 trilha não identifica pessoas | Nenhuma mudança — `actorId` já vem de `Session` real desde a autenticação nativa | Verificado no código (`src/lib/audit.ts`) antes do spec | y (verificado) |
| Filtro de período | 2 campos `type="date"` (De/Até) somados ao filtro de paciente já existente, na mesma querystring (`from`/`to`, já suportados pela API) | API já suporta, achado é só a UI que falta | n (default do agente, documentado) |
| Cobertura de auditoria que falta | `POST /api/professionals` e `POST /api/accounts` ganham `recordAudit`, mesmo padrão já usado em `POST /api/patients` | Únicos 2 gaps reais confirmados por grep no código — o resto (`login`/`logout`/`set-password`/`patients`/`settings/*`) já audita | n (default do agente, documentado) |
| Validação client-side da grade | Espelha as faixas que `validateScheduleConfig` já valida no domínio (`startHour < endHour`, `minGapMinutes` 15-120) — bloqueia o salvar com erro inline, sem duplicar a mensagem exata do domínio | Resolve "zero prevenção" sem reescrever a regra em dois lugares de forma divergente | n (default do agente, documentado) |

**Open questions:** nenhuma — todas resolvidas ou registradas acima.

---

## User Stories

### P0: Ações e recursos da trilha em pt-BR ⭐ MVP

**User Story**: Como gestor lendo a trilha de auditoria, quero ver "Pagamento | Fatura", não
"pay | invoice" — a tela é lida por quem não é dev.

**Why P0**: Achado [P0-2].

**Acceptance Criteria**:

1. WHEN um evento renderiza THEN `ACTION_LABELS`/`RESOURCE_LABELS` SHALL cobrir todos os valores
   reais emitidos por `recordAudit`/`recordAuditNow` no código (levantados por grep antes deste
   spec)
2. WHEN um valor não mapeado aparecer (defensivo, para valor futuro) THEN SHALL cair de volta pro
   valor bruto, sem quebrar a tela

**Independent Test**: renderizar evento com `resourceType: "care_plan_intervention"` → mostra label
em pt-BR, não o snake_case cru.

---

### P0: Criar profissional/conta gera evento de auditoria

**User Story**: Como gestor, quero que criar um profissional ou uma conta de acesso apareça na
trilha, como já acontece com criar paciente.

**Why P0**: Achado [P0-3] — `patients`/`settings/*`/`auth/*` já auditam (Fase C); `professionals` e
`accounts` (criação) ainda não.

**Acceptance Criteria**:

1. WHEN `POST /api/professionals` cria com sucesso THEN SHALL chamar `recordAudit` com
   `action: "create"`, `resourceType: "professional"`
2. WHEN `POST /api/accounts` cria com sucesso THEN SHALL chamar `recordAudit` com
   `action: "create"`, `resourceType: "account"`

**Independent Test**: criar profissional/conta via API; consultar `/api/audit`; confirmar o evento.

---

### P1: Filtro não mostra dados do paciente anterior

**User Story**: Como gestor, ao trocar o filtro de paciente, não quero ver por um instante a tabela
ainda com as linhas do paciente anterior.

**Why P1**: Achado [P1-5].

**Acceptance Criteria**:

1. WHEN `usePagedQuery` está buscando a 1ª página de uma nova `baseUrl` THEN SHALL expor
   `isLoading: true`
2. WHEN `isLoading` é `true` e já existe uma lista renderizada THEN a tabela SHALL ficar
   `aria-busy="true"` + visualmente esmaecida, sem apagar a lista antiga (mesmo padrão já usado em
   `/pacientes` #88 e `/materiais`/`/procedimentos` #89)

**Independent Test**: mockar 2 respostas de `/api/audit` com atraso; trocar o filtro; confirmar
`aria-busy="true"` antes da 2ª resposta.

---

### P1: Filtro de período

**User Story**: Como gestor, quero limitar a trilha a um intervalo de datas.

**Why P1**: Achado [P1-4] — API já suporta `from`/`to`.

**Acceptance Criteria**:

1. WHEN o usuário preenche "De" e/ou "Até" THEN a busca SHALL incluir `from`/`to` na querystring
2. WHEN os campos de período estão vazios THEN o comportamento atual (sem filtro de data) SHALL ser
   preservado

**Independent Test**: preencher "De" → chamada inclui `from=`; preencher os dois → inclui `from=` e
`to=`.

---

### P2: Timestamp com segundos

**User Story**: Como gestor investigando dois eventos no mesmo minuto, quero distinguir a ordem
exata.

**Why P2**: Achado [P2-7].

**Acceptance Criteria**:

1. WHEN a coluna "Quando" renderiza THEN SHALL incluir segundos (`HH:mm:ss`)

**Independent Test**: formatar um timestamp conhecido; confirmar segundos no texto.

---

### P2: Select de filtro com rótulo acessível

**User Story**: Como usuário de leitor de tela, quero saber que o select filtra por paciente.

**Why P2**: Achado [P2-9].

**Acceptance Criteria**:

1. WHEN o select de paciente renderiza THEN SHALL ter `aria-label="Filtrar por paciente"`

**Independent Test**: `getByLabelText("Filtrar por paciente")`.

---

### P0: Salvar grade não produz mensagens contraditórias

**User Story**: Como administrador, depois de salvar a grade, não quero ver "Grade salva" ao lado
de "usando padrão — nada salvo ainda".

**Why P0**: Achado [P0-11] — `refresh()` nunca é chamado após o `PUT`.

**Acceptance Criteria**:

1. WHEN `PUT /api/settings/schedule` retorna sucesso THEN a UI SHALL recarregar o estado (`refresh()`
   do `useApiQuery`), fazendo `isDefault` refletir a config recém-salva

**Independent Test**: salvar a grade; confirmar que a frase "(usando padrão — nada salvo ainda)"
desaparece sem reload de página.

---

### P1: Validação client-side na grade

**User Story**: Como administrador, quero saber que uma janela inválida (fechar antes de abrir,
intervalo fora da faixa) está errada antes de tentar salvar.

**Why P1**: Achado [P1-13] — `validateScheduleConfig` só existe no domínio.

**Acceptance Criteria**:

1. WHEN `startHour >= endHour` THEN o formulário SHALL bloquear o salvar com erro inline
2. WHEN `minGapMinutes` está fora de 15-120 THEN SHALL bloquear o salvar com erro inline

**Independent Test**: definir `startHour: 18, endHour: 8` → erro inline, sem chamar a API.

---

### P1: Contraste da linha de conta inativa

**User Story**: Como usuário, quero ler o email de uma conta desativada sem forçar a vista.

**Why P1**: Achado [P1-15] (parte — confirmação já existe).

**Acceptance Criteria**:

1. WHEN `account.active === false` THEN a `TableRow` SHALL usar `bg-surface-2/60` em vez de
   `opacity-50`

**Independent Test**: renderizar conta inativa; confirmar `bg-surface-2/60`, sem `opacity-50`.

---

## Edge Cases

- WHEN nenhum evento corresponde ao período+paciente filtrados THEN a mensagem de vazio atual SHALL
  ser preservada (sem mudança de comportamento aqui)
- WHEN `startHour`/`endHour`/`minGapMinutes` estão todos válidos THEN o salvar SHALL prosseguir
  normalmente (sem regressão no caminho feliz)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| AUD-01 | P0: Labels pt-BR completos | Implement | Pending |
| AUD-02 | P0: Cobertura de auditoria (professional/account) | Implement | Pending |
| AUD-03 | P1: Sem dado obsoleto no filtro | Implement | Pending |
| AUD-04 | P1: Filtro de período | Implement | Pending |
| AUD-05 | P2: Timestamp com segundos | Implement | Pending |
| AUD-06 | P2: Select acessível | Implement | Pending |
| CFG-01 | P0: Mensagens consistentes pós-save | Implement | Pending |
| CFG-02 | P1: Validação client-side | Implement | Pending |
| CFG-03 | P1: Contraste conta inativa | Implement | Pending |

**Coverage:** 9 stories, 9 mapeados (execução direta, sem `tasks.md` formal), 0 sem mapeamento.

---

## Success Criteria

- [ ] `npm run typecheck`, `npm run lint`, `npm run check:sv`, `npm run test:coverage` (≥90%) verdes
- [ ] Nenhuma regressão nos testes existentes de `/auditoria` e `/configuracoes`
- [ ] Issue #92 fechada via `Closes #92` no commit/PR
