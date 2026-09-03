# Login e Portal — achados P0-P3 pontuais (issue #93) Specification

## Problem Statement

`docs/audits/auditoria-ux-2026-08.md` §8 (Login e Portal). A issue afirma que o P0 de copy do
login (#68) e o vazamento de notas clínicas + consentimento LGPD do portal (#69/#70) já estavam
resolvidos pela Fase B/C, restando só P0s de UX de agendamento/sessão sem issue própria e os
P1-P3.

**Verificado no código antes deste spec** (achados reais divergem da premissa da issue em 2
pontos):

1. **`/login` já foi reescrito** desde a auditoria (provavelmente na migração pra autenticação
   nativa, ADR-004): não existe mais senha master, nem botão Google, nem o subtítulo "Acesso
   restrito à equipe" — 4 dos 7 achados de Login (senha master, divisor "ou", botão Google fora do
   foco) já estão resolvidos. Restam autoComplete/name, `?error=` sem allowlist, skeleton e
   `<main>`/`<title>`.
2. **O vazamento de notas clínicas NÃO foi totalmente resolvido pela Fase C** — `PortalAssessmentDto`
   (`src/lib/dto.ts`) remove `notes` mas **mantém `complications`** como texto livre, e
   `describeAssessment` (compartilhado entre paciente e parceiro) renderiza `complicações: ${...}`
   verbatim. É exatamente o exemplo citado no audit doc ("suspeita de recidiva, encaminhar
   oncologia") — tratado aqui como P0 real, não como já resolvido.

## Goals

- [ ] Campos de login com `autoComplete`/`name` corretos
- [ ] `?error=` nunca renderiza texto arbitrário da URL — só mensagens de um allowlist
- [ ] Skeleton enquanto os provedores de autenticação carregam
- [ ] `/login` e `/portal` têm `<main>` e título de rota próprio
- [ ] Sessão expirada no portal mostra tela com ação clara ("Entrar"), não um alerta cru
- [ ] Agendar horário no portal exige confirmação, com alvo de toque ≥36px
- [ ] `complications` não vaza mais texto livre pro paciente/parceiro
- [ ] Consentimento LGPD tem caminho de revogação visível (endpoint já existe, sem UI)
- [ ] Portal mostra orientação de contato/urgência fixa
- [ ] Envio de foto tem preview e passo explícito de confirmação (não envia no `onChange`)
- [ ] Janela de 14 dias do auto-agendamento é explicada na tela
- [ ] Consulta cancelada pela clínica não fica enterrada no histórico
- [ ] Mensagens cruas de sessão (`Não autenticado`, `Rota exclusiva do portal`) viram copy amigável
- [ ] Sanfona do parceiro tem `aria-expanded`
- [ ] Fotos de condição não aparecem reveladas por padrão
- [ ] Faturas têm instrução mínima de pagamento
- [ ] `EmptyState` do portal usa ícone contextual por seção
- [ ] `check:sv` permanece verde

## Out of Scope

| Item | Reason |
| --- | --- |
| Paciente desmarcar a própria consulta | Exige endpoint novo + regra de negócio (janela de corte, notificar a clínica) — real, mas desproporcional a um ajuste pontual; recomendo issue própria |
| Pré-seleção de procedimento antes de mostrar horários | Exige decisão de produto sobre a fonte do procedimento padrão — hoje `FollowUp` não carrega `procedureId`; recomendo issue própria |
| Versão do termo de consentimento LGPD | Exige campo novo no domínio + migração — a lacuna mais urgente (revogar) é resolvida aqui ligando o endpoint que já existe; versionamento fica pra rodada de produto |
| `DatePicker`/`Calendar`, `ToggleGroup`, `FileInput` com progresso nativo, `Accordion`, `Separator` com rótulo centralizado | Gaps de lib já documentados em `docs/backlog-design-system.md` — sem componente novo nesta rodada, resolvido com os primitivos existentes |
| Gráfico "PUSH/DET" com jargão completo | Legenda perde os nomes de token (já corrigido); trocar PUSH/DET por explicação clínica completa exigiria mudar o rótulo do eixo, que serve profissional e paciente ao mesmo tempo — pontual demais pra decidir aqui sem o time clínico |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Canal de contato/urgência | Texto estático de orientação ("procure atendimento presencial/pronto-socorro; não aguarde resposta pelo portal") — sem telefone/WhatsApp dinâmico | `ClinicInfoDto` não tem campo de telefone hoje; inventar um contato fixo seria pior que nenhum | n (default do agente, documentado) |
| Instrução de pagamento nas faturas | Texto estático ("pagamento realizado presencialmente na clínica") | Sem gateway de pagamento no sistema — mesma lógica do item acima | n (default do agente, documentado) |
| Confirmação de agendamento no portal | Reusa `ConfirmAction` (mesmo componente de toda ação destrutiva/consequente do sistema) | Padrão já estabelecido, sem componente novo | n (default do agente, documentado) |
| Preview de foto | `URL.createObjectURL` + botão "Enviar"/"Cancelar" explícitos, sem barra de progresso real (fetch sem tracking nativo) | Resolve o "sem preview, sem desfazer" sem exigir XHR manual só pra progresso | n (default do agente, documentado) |
| Consulta cancelada | Sai de "Histórico" e entra em destaque logo abaixo de "Próximas consultas" quando a data original ainda não passou | Resolve "aparece no dia errado" sem redesenhar a página | n (default do agente, documentado) |

**Open questions:** nenhuma — todas resolvidas ou registradas acima.

---

## User Stories

### P0: Sessão expirada tem saída

**User Story**: Como paciente que voltou ao portal depois da sessão expirar, quero ver um caminho
claro pra entrar de novo, não um alerta vermelho sem ação.

**Why P0**: Achado [P0] "beco sem saída".

**Acceptance Criteria**:

1. WHEN `/api/portal/me` retorna erro de sessão (`Não autenticado`) THEN a página SHALL mostrar um
   estado dedicado com explicação + link "Entrar" pra `/login`, não `ErrorAlert` cru

**Independent Test**: mockar `/api/portal/me` com erro; confirmar link "Entrar" visível.

---

### P0: Agendar horário exige confirmação e alvo adequado

**User Story**: Como paciente agendando um retorno no celular, não quero que um toque errado marque
uma consulta real sem eu confirmar.

**Why P0**: Achado [P0] "alvo de 28px, sem confirmação, sem desfazer".

**Acceptance Criteria**:

1. WHEN o paciente toca um horário THEN SHALL abrir um `ConfirmAction` com o resumo (data/hora)
   antes de chamar a API
2. WHEN o botão de horário renderiza THEN SHALL usar o tamanho `sm` padrão do design system
   (36px), sem override pra 28px

**Independent Test**: clicar um horário; confirmar diálogo antes do POST; cancelar não agenda.

---

### P0: `complications` não vaza pro paciente/parceiro

**User Story**: Como paciente ou parceiro, não quero ler nota clínica interna escrita por um
profissional pra outro ("suspeita de recidiva, encaminhar oncologia").

**Why P0**: Achado real (issue afirmava resolvido pela Fase C — só `notes` foi removido,
`complications` continua em `PortalAssessmentDto`).

**Acceptance Criteria**:

1. WHEN `toPortalAssessmentDto` mapeia uma avaliação THEN `complications` SHALL sair do DTO (mesmo
   padrão já aplicado a `notes`)
2. WHEN `ConditionProgress` (componente compartilhado paciente/parceiro) renderiza uma avaliação do
   portal THEN SHALL tipar por `PortalAssessmentDto`, não `AssessmentDto` — sem depender de campo
   ausente em runtime pra "esconder" o dado

**Independent Test**: DTO de avaliação com `complications` preenchido; resposta de
`/api/portal/patient` e `/api/portal/partner` SHALL não conter a chave.

---

### P0: Consentimento LGPD tem revogação visível

**User Story**: Como paciente que já aceitou o termo, quero poder revogar o consentimento, não só
aceitar uma vez pra sempre.

**Why P0**: Achado [P0] "sem revogação" — endpoint `POST /api/portal/patient/consent/revoke` já
existe e nunca é chamado por nenhuma UI.

**Acceptance Criteria**:

1. WHEN o consentimento está aceito THEN a tela SHALL mostrar um botão "Revogar consentimento"
2. WHEN o paciente confirma a revogação (`ConfirmAction`) THEN SHALL chamar o endpoint existente e
   recarregar o status

**Independent Test**: clicar "Revogar consentimento" → confirmar → card volta a mostrar o termo
pendente.

---

### P0: Orientação de contato/urgência fixa

**User Story**: Como paciente com uma intercorrência à noite, quero saber o que fazer, não só
"mande foto e espere".

**Why P0**: Achado [P0] "nenhum canal de contato/orientação de urgência em toda a superfície".

**Acceptance Criteria**:

1. WHEN qualquer tela do portal renderiza THEN SHALL exibir um bloco fixo de orientação de
   urgência (atendimento presencial/pronto-socorro em caso de sangramento, febre, dor intensa)

**Independent Test**: renderizar `PortalLayout`; confirmar texto de orientação visível.

---

### P1: Campos de login com autoComplete/name

**Why P1**: Achado [P1].

**Acceptance Criteria**:

1. WHEN o formulário de senha renderiza THEN o campo de email SHALL ter
   `autoComplete="username"`/`name="email"` e o de senha `autoComplete="current-password"`/`name="password"`

**Independent Test**: inspecionar os inputs renderizados.

---

### P1: `?error=` com allowlist

**Why P1**: Achado [P1] — phishing por texto refletido.

**Acceptance Criteria**:

1. WHEN `?error=` vem com um código conhecido THEN SHALL mostrar a mensagem mapeada em pt-BR
2. WHEN `?error=` vem com qualquer outro valor THEN SHALL mostrar uma mensagem genérica, nunca o
   texto bruto da URL

**Independent Test**: `?error=oauth_denied` → mensagem mapeada; `?error=<script>` → mensagem
genérica, sem o texto bruto no DOM.

---

### P1: Foto com preview e confirmação

**Why P1**: Achado [P1] "sem preview/progresso/desfazer".

**Acceptance Criteria**:

1. WHEN o paciente escolhe um arquivo THEN SHALL ver uma prévia da imagem antes de enviar
2. WHEN a prévia está visível THEN SHALL haver "Enviar" e "Cancelar" — só "Enviar" chama a API

**Independent Test**: escolher arquivo → prévia aparece, sem POST; "Cancelar" limpa sem POST;
"Enviar" dispara o POST.

---

### P1: Janela de 14 dias explicada

**Why P1**: Achado [P1] "janela invisível".

**Acceptance Criteria**:

1. WHEN o painel de agendamento renderiza THEN SHALL haver texto explicando o limite de 14 dias

**Independent Test**: renderizar `SchedulePanel`; confirmar texto "14 dias" visível.

---

### P1: Escala tipográfica adequada no agendamento

**Why P1**: Achado [P1] "12px numa tela de paciente idoso" + risco de auto-zoom no iOS em campo
`<16px`.

**Acceptance Criteria**:

1. WHEN os campos de Procedimento/Dia do auto-agendamento renderizam THEN SHALL usar o tamanho
   padrão dos componentes (sem override `text-xs`/`h-8` reduzindo a fonte)
2. WHEN a legenda do gráfico de evolução renderiza THEN SHALL usar no mínimo `text-xs` (12px), sem
   `text-[11px]`

**Independent Test**: inspecionar classes dos inputs/legenda.

---

### P1: Consulta cancelada não fica enterrada

**Why P1**: Achado [P1].

**Acceptance Criteria**:

1. WHEN uma consulta futura foi cancelada pela clínica THEN SHALL aparecer destacada logo abaixo de
   "Próximas consultas", não só dentro de "Histórico"

**Independent Test**: consulta com `startsAt` futuro e `status: "cancelled"` → aparece na seção de
destaque.

---

### P1: Mensagens de sessão amigáveis

**Why P1**: Achado [P1] "mensagens de API cruas".

**Acceptance Criteria**:

1. WHEN a sessão do portal está ausente/expirada THEN a tela SHALL mostrar copy amigável, não
   `"Não autenticado"`/`"Rota exclusiva do portal"` cru (mesma correção da story de sessão expirada,
   P0)

**Independent Test**: coberto pelo teste de sessão expirada.

---

### P1: Sanfona do parceiro acessível

**Why P1**: Achado [P1].

**Acceptance Criteria**:

1. WHEN o botão de expandir um paciente indicado renderiza THEN SHALL ter
   `aria-expanded={isOpen}`

**Independent Test**: `getByRole("button", { expanded: false })` → clicar → `expanded: true`.

---

### P2: Skeleton no login

**Why P2**: Achado [P2].

**Acceptance Criteria**:

1. WHEN `/api/auth/providers` ainda não respondeu THEN o card SHALL mostrar um skeleton, não uma
   área vazia

**Independent Test**: mockar resposta pendente; confirmar skeleton visível.

---

### P2: Fotos de condição não reveladas por padrão

**Why P2**: Achado [P2] "foto de ferida aparece de imediato".

**Acceptance Criteria**:

1. WHEN a galeria de fotos renderiza THEN as imagens SHALL começar borradas, revelando só ao clicar

**Independent Test**: renderizar galeria; imagem tem classe de blur; clicar remove o blur.

---

### P2: Faturas com instrução mínima

**Why P2**: Achado [P2].

**Acceptance Criteria**:

1. WHEN a lista de faturas renderiza THEN SHALL haver uma legenda explicando como o pagamento é
   feito

**Independent Test**: renderizar seção de faturas; confirmar texto de instrução.

---

### P3: `<main>` e título por rota

**Why P3**: Achado [P3].

**Acceptance Criteria**:

1. WHEN `/login` ou `/portal` renderizam THEN o conteúdo SHALL estar dentro de um `<main>`
2. WHEN `/login` renderiza THEN o `<title>` SHALL ser específico da rota (não só o título global)

**Independent Test**: `getByRole("main")` presente; `document.title` inclui "Login" (verificação
mais prática via snapshot do `metadata` exportado, já que jsdom não roda o `<head>` do App Router
em teste de componente).

---

### P3: `EmptyState` contextual

**Why P3**: Achado [P2] "genérico servindo 5 contextos".

**Acceptance Criteria**:

1. WHEN uma seção do portal está vazia THEN o `EmptyState` SHALL usar um ícone condizente com o
   contexto (consultas, condições, faturas, pacientes indicados) — props já existem desde #86

**Independent Test**: renderizar cada seção vazia; confirmar ícone esperado.

---

## Edge Cases

- WHEN o paciente cancela o preview de foto e escolhe outro arquivo em seguida THEN o novo preview
  SHALL substituir o anterior sem POST duplo
- WHEN não há consulta cancelada futura THEN a seção de destaque SHALL ficar ausente (sem
  regressão no caminho feliz)
- WHEN `consent.accepted` é `false` (nunca aceito) THEN o botão de revogar SHALL continuar ausente
  (só existe no estado aceito)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PORT-01 | P0: Sessão expirada tem saída | Implement | Pending |
| PORT-02 | P0: Agendar exige confirmação + alvo adequado | Implement | Pending |
| PORT-03 | P0: `complications` não vaza | Implement | Pending |
| PORT-04 | P0: Revogação de consentimento visível | Implement | Pending |
| PORT-05 | P0: Orientação de contato/urgência fixa | Implement | Pending |
| LOG-01 | P1: autoComplete/name no login | Implement | Pending |
| LOG-02 | P1: `?error=` com allowlist | Implement | Pending |
| PORT-06 | P1: Foto com preview e confirmação | Implement | Pending |
| PORT-07 | P1: Janela de 14 dias explicada | Implement | Pending |
| PORT-08 | P1: Tipografia do agendamento | Implement | Pending |
| PORT-09 | P1: Cancelada não enterrada | Implement | Pending |
| PORT-10 | P1: Mensagens de sessão amigáveis | Implement | Pending |
| PORT-11 | P1: Sanfona do parceiro acessível | Implement | Pending |
| LOG-03 | P2: Skeleton no login | Implement | Pending |
| PORT-12 | P2: Fotos borradas por padrão | Implement | Pending |
| PORT-13 | P2: Instrução de pagamento | Implement | Pending |
| LOG-04 | P3: `<main>`/título no login | Implement | Pending |
| PORT-14 | P3: `EmptyState` contextual | Implement | Pending |

**Coverage:** 18 stories, 18 mapeados (execução direta, sem `tasks.md` formal), 0 sem mapeamento.

---

## Success Criteria

- [ ] `npm run typecheck`, `npm run lint`, `npm run check:sv`, `npm run test:coverage` (≥90%) verdes
- [ ] Nenhuma regressão nos testes existentes de `/login` e `/portal`
- [ ] Issue #93 fechada via `Closes #93` no commit/PR
