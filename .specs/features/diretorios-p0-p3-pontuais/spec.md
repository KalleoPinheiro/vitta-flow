# Profissionais e Parceiros — achados P0-P3 pontuais (issue #91) Specification

## Problem Statement

`docs/audits/auditoria-ux-2026-08.md` §6 (Profissionais e Parceiros). Nenhuma Fase anterior cobriu
esta superfície — igual à #89, os P0 listados nunca foram corrigidos. Verificado no código antes
deste spec: **3 dos 8 P0/P1 listados já estão resolvidos** (confirmação em Desativar nas duas
páginas via `ConfirmAction`; toast de sucesso pós-save nas duas). Restam 2 P0 reais (comissão
ausente do POST; email sem `.email()` no servidor) + P1-P3 selecionados.

## Goals

- [ ] `commissionPct` pode ser definido na criação de um profissional, não só depois via PATCH
- [ ] Email de parceiro é validado no servidor (é a credencial de login do portal)
- [ ] Modal de parceiro usável em 390px
- [ ] Linha inativa com contraste correto nas duas tabelas
- [ ] Ações das duas tabelas com alvo de toque real
- [ ] Desativar parceiro explica o impacto em pacientes indicados
- [ ] Email/telefone de parceiro acionáveis (`mailto:`/`tel:`)
- [ ] Nomenclatura única ("Parceiros", não "Médicos parceiros")
- [ ] `check:sv` permanece verde

## Out of Scope

| Item | Reason |
| --- | --- |
| `DirectoryPage` compartilhado (busca+filtro+paginação unificados) | O próprio audit doc já trata como task própria (T5 de Parceiros) — abstração real sobre 4 páginas (profissionais, parceiros, procedimentos, materiais), desproporcional a um ajuste pontual desta issue |
| Coluna "Indicações" + contagem de pacientes afetados no `ConfirmAction` de desativar parceiro | Exigiria query nova (contar pacientes por `referredByPartnerId`) — o achado é real, mas a correção mínima (copy explicando a consequência, sem contagem) já resolve "silenciosamente" sem inventar feature de contagem |
| P0 mobile das **tabelas** (Profissionais/Parceiros) | Já mitigado por `overflow-x-auto` (Fase A) — confirmado no código antes deste spec. O P0 mobile real que sobra é o grid interno do modal de Parceiro (`grid-cols-2` sem breakpoint), esse sim corrigido aqui |
| `Field`/`Label` novo no catálogo | Gap de lib (`docs/still-void-gaps.md`), infraestrutura cross-page — os `<label>` atuais já associam corretamente ao `<input>` por aninhamento (acessível), só falta hint persistente pontual (incluído) |
| Hint de COREN persistente vs. só placeholder | **Incluído** — pequeno, contido |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| P1 "Desativar sem confirmação" (Profissionais/Parceiros) | Nenhuma mudança — já tem `ConfirmAction` nas duas páginas | Verificado no código antes do spec | y (verificado) |
| P2 "Nenhuma confirmação de sucesso" (Profissionais) | Nenhuma mudança — toast já existe (`"Profissional salvo"`) | Verificado no código antes do spec | y (verificado) |
| P0 mobile das tabelas | Nenhuma mudança — `overflow-x-auto` já cobre | Verificado no código antes do spec | y (verificado) |
| Impacto do "Desativar parceiro" em pacientes | Copy do `ConfirmAction` ganha a frase "Pacientes indicados por este parceiro podem perder a referência na próxima edição do cadastro." — sem contar quantos (ver Out of Scope) | Resolve "sem aviso nenhum" sem inventar query nova | n (default do agente, documentado) |
| Nomenclatura única | H1 de `/parceiros` muda de "Médicos parceiros" para "Parceiros" (bate com o menu e o empty state, que já dizem "Parceiros"/"parceiro") | "Parceiros" já é maioria (2 de 3 lugares) — mudar o H1 é a menor mudança que unifica | n (default do agente, documentado) |
| Coluna de comissão na tabela | Adiciona coluna "Repasse" na tabela de Profissionais (`—` quando `null`) | Sem visibilidade na própria tela, o campo editável no form fica sem confirmação visual do que foi salvo | n (default do agente, documentado) |

**Open questions:** nenhuma — todas resolvidas ou registradas acima.

---

## User Stories

### P0: Comissão configurável na criação do profissional ⭐ MVP

**User Story**: Como administrador, quero definir o percentual de repasse já ao cadastrar um
profissional, sem precisar editar depois.

**Why P0**: Achado [P0] Profissionais — `commissionPct` existe no domínio e no PATCH, mas o POST
não aceita e o formulário não tem o campo; a coluna "Repasse" do relatório fica morta.

**Acceptance Criteria**:

1. WHEN `POST /api/professionals` recebe `commissionPct` THEN SHALL validar (inteiro 0-100,
   opcional) e salvar
2. WHEN `ProfessionalForm` renderiza (criar ou editar) THEN SHALL ter um campo "Repasse (%)"
3. WHEN a tabela de profissionais renderiza THEN SHALL ter uma coluna "Repasse" mostrando o
   percentual ou "—"

**Independent Test**: criar profissional com `commissionPct: 15` → aparece na tabela como "15%";
editar um existente e mudar o valor → reflete na tabela.

---

### P0: Email de parceiro validado no servidor

**User Story**: Como administrador, não quero conseguir cadastrar um parceiro com email inválido —
é a credencial de login dele no portal.

**Why P0**: Achado [P0] Parceiros — `z.string().min(1).max(200)` sem `.email()`.

**Acceptance Criteria**:

1. WHEN `POST /api/partners` ou `PUT /api/partners/:id` recebem `email` inválido THEN SHALL
   retornar 400 com mensagem clara, antes de gravar

**Independent Test**: `POST /api/partners` com `email: "não-é-email"` → 400.

---

### P1: Modal de parceiro usável em 390px

**User Story**: Como usuário no celular, quero preencher Telefone e CRM sem os campos espremidos a
~120px cada.

**Why P1**: Achado [P0] Parceiros ("mesmo colapso mobile, agravado por `grid-cols-2` sem
breakpoint").

**Acceptance Criteria**:

1. WHEN o grid de Telefone/CRM renderiza THEN SHALL ser `grid-cols-1 sm:grid-cols-2`

**Independent Test**: inspecionar classe do grid no formulário.

---

### P1: Contraste da linha inativa

**User Story**: Como usuário, quero ler o nome de um profissional/parceiro inativo sem forçar a
vista.

**Why P1**: Achado [P1] Profissionais — `opacity-50` reprova contraste (mesmo achado já corrigido
em `/pacientes` na issue #88).

**Acceptance Criteria**:

1. WHEN `professional.active === false` OU `partner.active === false` THEN a `TableRow` SHALL usar
   `bg-surface-2/60` em vez de `opacity-50`

**Independent Test**: renderizar item inativo em cada tabela; confirmar `bg-surface-2/60`, sem
`opacity-50`.

---

### P1: Alvo de toque nas ações

**User Story**: Como usuário, quero botões de ação com alvo de toque real nas duas tabelas.

**Why P1**: Achado [P1] Profissionais ("'Desativar' não parece clicável, alvo a 8px de 'Editar'").

**Acceptance Criteria**:

1. WHEN as linhas das duas tabelas renderizam THEN "Editar"/"Desativar"/"Reativar" SHALL ser
   `Button variant="ghost" size="sm"`

**Independent Test**: inspecionar classes `sv-btn--ghost sv-btn--sm` nos botões de ação das duas
tabelas.

---

### P1: Desativar parceiro explica o impacto

**User Story**: Como administrador, quero saber que desativar um parceiro pode afetar pacientes
indicados por ele, antes de confirmar.

**Why P1**: Achado [P1] Parceiros.

**Acceptance Criteria**:

1. WHEN o `ConfirmAction` de desativar parceiro renderiza THEN a descrição SHALL mencionar que
   pacientes indicados por ele podem perder a referência

**Independent Test**: abrir o diálogo de desativar parceiro; confirmar o texto do aviso.

---

### P2: Hint de registro profissional persistente

**User Story**: Como usuário digitando o registro, quero continuar vendo o formato esperado mesmo
depois de começar a digitar.

**Why P2**: Achado [P2] Profissionais — hint só no `placeholder`, que some ao digitar.

**Acceptance Criteria**:

1. WHEN o campo "Registro profissional" renderiza THEN SHALL ter um texto de ajuda persistente
   abaixo do input (não só `placeholder`)

**Independent Test**: digitar no campo; confirmar que o texto de ajuda continua visível.

---

### P2: Email e telefone acionáveis

**User Story**: Como usuário, quero clicar no email/telefone do parceiro pra abrir o app de
email/discador.

**Why P2**: Achado [P2] Parceiros.

**Acceptance Criteria**:

1. WHEN a coluna Contato renderiza THEN o email SHALL ser um link `mailto:` e o telefone um link
   `tel:`

**Independent Test**: inspecionar `href` dos dois links na tabela.

---

### P2: Nomenclatura única

**User Story**: Como usuário, quero ver "Parceiros" em todo lugar, não "Médicos parceiros" só no
título.

**Why P2**: Achado [P2] Parceiros.

**Acceptance Criteria**:

1. WHEN a página `/parceiros` renderiza THEN o `<h1>` SHALL ser "Parceiros"

**Independent Test**: `getByRole("heading", {name: "Parceiros"})`.

---

### P3: Composição de erro consistente entre as páginas

**User Story**: Como desenvolvedor, quero o mesmo padrão de composição de erro nas duas páginas
irmãs.

**Why P3**: Achado [P3] Parceiros — `??` com cast em Parceiros vs. `||`+`??` sem cast em
Profissionais.

**Acceptance Criteria**:

1. WHEN `PartnersPage` compõe a mensagem de erro THEN SHALL usar `actionError ?? error ?? ""`, sem
   cast `as string`, igual a `ProfessionalsPage`

**Independent Test**: leitura de código — mesmo padrão nas duas.

---

## Edge Cases

- WHEN `commissionPct` não é enviado no POST THEN SHALL continuar `null` (comportamento atual
  preservado — campo é opcional)
- WHEN `email` é válido mas duplicado THEN o comportamento de unicidade já existente (se houver)
  SHALL ser preservado — este spec só adiciona a validação de formato
- WHEN `partner.email`/`phone` estão vazios (não deveria acontecer, campos obrigatórios) THEN os
  links `mailto:`/`tel:` SHALL ainda renderizar sem quebrar (href vazio é inofensivo)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| PROF-01 | P0: Comissão na criação | Implement | Pending |
| PART-01 | P0: Email validado no servidor | Implement | Pending |
| PART-02 | P1: Modal responsivo | Implement | Pending |
| DIR-01 | P1: Contraste linha inativa | Implement | Pending |
| DIR-02 | P1: Alvo de toque | Implement | Pending |
| PART-03 | P1: Impacto ao desativar parceiro | Implement | Pending |
| PROF-02 | P2: Hint persistente | Implement | Pending |
| PART-04 | P2: mailto/tel | Implement | Pending |
| PART-05 | P2: Nomenclatura única | Implement | Pending |
| PART-06 | P3: Composição de erro consistente | Implement | Pending |

**Coverage:** 10 stories, 10 mapeados (execução direta, sem `tasks.md` formal), 0 sem mapeamento.

---

## Success Criteria

- [ ] `npm run typecheck`, `npm run lint`, `npm run check:sv`, `npm run test:coverage` (≥90%) verdes
- [ ] Nenhuma regressão nos testes existentes de `/profissionais` e `/parceiros`
- [ ] Issue #91 fechada via `Closes #91` no commit/PR
