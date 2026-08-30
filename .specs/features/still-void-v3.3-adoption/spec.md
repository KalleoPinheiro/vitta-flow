---
title: Adoção @still-void/ui 3.3.0 — Sidebar responsivo, Toast, Alert semântico
type: spec
status: draft
---

# Adoção `@still-void/ui@3.3.0` (Sidebar / Toast / Alert) — Specification

## Problem Statement

A auditoria UX completa (`docs/audits/auditoria-ux-2026-08.md`, 18 superfícies) e a auditoria de design system (`docs/audits/auditoria-design-system-2026-08.md`) identificaram 3 gaps de maior alcance na versão então instalada (`3.2.0`): sidebar sem breakpoint (come 57% do viewport em 390px, 11/18 superfícies), zero notificação transitória de ação de escrita (9/18), e `Alert` sem variantes semânticas forçando repintura manual em ~8 lugares (9/18). A `3.3.0`, já publicada e instalada (`package.json` em `^3.3.0`), fecha os três. Esta feature é a adoção no app — port, não redesenho (AD-014: só troca workaround por primitivo já existente na lib, nenhum padrão novo).

## Goals

- [ ] Sidebar do staff funciona em qualquer largura de viewport sem amputar conteúdo (drawer abaixo do breakpoint, rail fixo acima)
- [ ] Toda ação de escrita mapeada abaixo dá feedback transitório de sucesso ou falha
- [ ] Todo painel de aviso/erro/sucesso repintado à mão vira `Alert variant=...`

## Out of Scope

| Item | Motivo |
|---|---|
| Gaps #4-13 do documento de auditoria (empty-state, field-wrapper, table responsiva, Calendar/DatePicker, ToggleGroup, ícone inline, impressão, chart, componentes menores) | Fora do alcance desta rodada — ficam pra próxima |
| Seção "adoção pendente" (Tabs, AlertDialog, Badge, Tooltip, DropdownMenu, Prose, ThemeToggle) | AD-014: são feature nova, não port — fora de qualquer rodada de migração |
| `collapsible="icon"` no rail desktop | Lib suporta, mas app não tem necessidade hoje expressa (nenhuma tela pediu ícone-only); manter `collapsible="offcanvas"` (drawer abaixo do breakpoint, rail fixo estático acima — comportamento equivalente ao atual acima do breakpoint) |
| Mudar o texto de erro já existente (`ErrorAlert`/`actionError`/`setError`) | Só troca o componente visual (`Alert variant="danger"` em vez de classes manuais); a string de mensagem em si não muda |
| Migrar `seriesNotice` (agenda, série de consultas) para toast | Fica como `Alert` inline — é informação que vale permanecer visível (lista de sessões puladas), não é confirmação pontual |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|---|---|---|---|
| Breakpoint do `SidebarProvider` | `1024` (default da lib, não passar prop) | Nenhuma tela do staff pede um valor diferente; é o mesmo valor que a lib já usa como fallback interno | n — assumido |
| `ExpiryBanner` (materiais) tem 2 níveis (vencido/a vencer) hoje num único bloco `danger` | Split em 2 `Alert`: `variant="danger"` (vencidos) + `variant="warning"` (a vencer), cada um só renderiza se a lista correspondente não for vazia | Achado do levantamento: são severidades diferentes, não deveriam compartilhar `role`; a lib deriva `role="alert"` pra ambas variantes, então a leitura de tela já melhora | n — assumido |
| `seriesNotice` (agenda) — variante quando há sessões puladas vs. todas criadas | `success` quando `skipped.length === 0`, `warning` quando há puladas | Puladas = "algo não saiu como o esperado", mesmo não sendo erro | n — assumido |
| `configuracoes/page.tsx` "Grade salva" (`saved`, hoje `<p>` que fica visível indefinidamente) | Vira `Alert variant="success"` inline, MANTÉM o comportamento persistente atual (não expira sozinho) — não migra pra toast | É o único caso de sucesso hoje já visível in-page (não é "ação sumiu sem confirmação" como os outros); trocar de padrão de interação (persistente → transitório) é decisão de produto fora do escopo "port" | n — assumido |
| Escopo de "6 operações de escrita no prontuário" citado na auditoria original | Cobrir TODAS as 14 operações de escrita encontradas em `pacientes/[id]/*` (anamnese, 3× condições, evolução, 7× planos de cuidado, 2× fotos), não só 6 | A auditoria original contou "6" antes do levantamento fino; a causa raiz (nenhum feedback) é a mesma em todas — cobrir só um subconjunto deixaria o padrão inconsistente dentro da própria tela do prontuário | n — assumido, revisitar se o usuário preferir reduzir |
| Onde montar `ToastProvider` | Um único provider no root (`src/app/layout.tsx`), envolvendo `{children}` dentro do `<body>` | Cobre staff + portal + documentos num ponto só; não há requisito de posicionamento/z-index diferente por área hoje | n — assumido |
| Texto dos toasts de sucesso | Padrão "`<Objeto> <particípio>`" curto, sem "com sucesso" (espelha o padrão já usado nas mensagens de erro do app, que são sempre "Erro ao \<verbo\> \<objeto\>") | Consistência de tom com o que já existe; strings completas na tabela da User Story P3 abaixo | n — assumido |
| Toast de erro nas ações que hoje engolem exceção sem tratamento (`resolveFollowUp`, `handleCreate` de consulta única/fatura) | Adicionar `try/catch` onde não existe, toast `variant="danger"` no catch com a mensagem de erro (`err.message` com fallback igual ao padrão já usado nos outros `catch` do mesmo arquivo) | Sem isso a promise rejeitada vira unhandled rejection silenciosa — é bug de tratamento de erro, não só de feedback ausente; consertar é pré-requisito pra ter *algum* feedback de falha nesses pontos | n — assumido |
| `Modal`/formulários que já usam `setActionError`/`ErrorAlert` para erro | Erro continua no `Alert` inline existente (não duplica em toast); só o caminho de SUCESSO ganha toast | Erro já tem tratamento e é informação que vale ficar visível perto do form; toast é aditivo só onde falta algo (sucesso) |  n — assumido |

**Open questions:** nenhuma sem resposta — todas as acima têm default assumido e razão registrada. Se o usuário discordar de algum default, ele é revisado antes do Design.

---

## User Stories

### P1: Sidebar responsiva (drawer + rail) ⭐ MVP

**User Story**: Como usuário do staff em qualquer dispositivo, quero que a navegação lateral não tome a tela em mobile, pra conseguir usar o sistema em qualquer largura.

**Why P1**: Prioridade máxima do documento de auditoria — bloqueia uso mobile em 11/18 superfícies, é o defeito mais repetido de toda a auditoria de UX.

**Acceptance Criteria**:

1. WHEN a viewport tem largura ≥ 1024px THEN o sistema SHALL renderizar a sidebar como rail fixo em fluxo (não portal/dialog), idêntico visualmente ao `<Sidebar>` estático atual (mesma largura `w-56`, mesmo conteúdo: `BrandLogo`, `SidebarSection` com `StaffNav`, `LogoutButton`)
2. WHEN a viewport tem largura < 1024px THEN o sistema SHALL renderizar a sidebar como drawer em portal (overlay + `role="dialog"` + `aria-modal`), fechado por padrão
3. WHEN o usuário abaixo do breakpoint aciona o `SidebarTrigger` THEN o sistema SHALL abrir o drawer com foco movido pro primeiro elemento focável dentro dele — comportamento de foco-trap-ao-abrir é garantia do próprio `Dialog.Root`/`SidebarPanel` da lib (unit-testado no round-5 do `@still-void/ui`); esta feature não re-testa mecanismo de foco no nível do app, só confirma que o drawer abre e fica navegável
4. WHEN o drawer está aberto e o usuário fecha (botão fechar, overlay, Esc, ou navega pra outra rota) THEN o sistema SHALL fechar o drawer e devolver o foco ao `SidebarTrigger` — devolução de foco é o `onCloseAutoFocus` já implementado e testado na lib (round-5); esta feature testa que o drawer FECHA (inclusive via `SidebarAutoClose` em navegação), não reafirma o destino exato do foco
5. WHEN a viewport cruza o breakpoint com o drawer aberto (rotação de tela, resize de janela) THEN o sistema SHALL liberar o scroll-lock do `<body>` sem deixá-lo travado
6. WHEN qualquer uma das 13 telas do staff é acessada em 390px de largura THEN o sistema SHALL deixar 100% do conteúdo da tela alcançável (sem amputar — troca o `overflow-x-hidden` do `<main>` atual, avaliar se ainda é necessário com o novo layout)

**Independent Test**: abrir `/` (dashboard) em viewport 390px — sidebar não aparece por padrão, `SidebarTrigger` visível no topo, clique abre drawer com todos os links de `StaffNav`; redimensionar pra 1280px — sidebar vira rail fixo, sem trigger visível (ou trigger correto para o modo, conforme AC-2/3 da lib).

---

### P2: `Alert` com variantes semânticas

**User Story**: Como usuário do staff/portal, quero que avisos, erros e confirmações tenham cor, ícone e semântica de leitor de tela corretos, pra distinguir rápido a severidade de cada mensagem.

**Why P2**: Segundo maior alcance (9/18), e mais simples/isolado que Toast — cada call site é independente, sem necessidade de provider novo.

**Acceptance Criteria**:

1. WHEN `ErrorAlert` (`src/components/feedback.tsx`) renderiza THEN o sistema SHALL usar `Alert variant="danger"` em vez de `className="border-danger"` + `text-danger` manual, mantendo a mensagem recebida via prop
2. WHEN `AllergyBanner` (`pacientes/[id]/page.tsx`) renderiza com alergias presentes THEN o sistema SHALL usar `Alert variant="danger"` com o texto "Alergias: {allergies}" mantido
3. WHEN `LowStockBanner` (`materiais/page.tsx`) renderiza com insumos abaixo do mínimo THEN o sistema SHALL usar `Alert variant="warning"`
4. WHEN `ExpiryBanner` (`materiais/page.tsx`) renderiza THEN o sistema SHALL emitir até 2 `Alert` separados: `variant="danger"` só se houver lotes vencidos, `variant="warning"` só se houver lotes a vencer — cada um omitido se a lista correspondente for vazia
5. WHEN a grade de horários é salva em `configuracoes/page.tsx` THEN o sistema SHALL mostrar `Alert variant="success"` com o texto atual ("Grade salva — vale imediatamente para novos agendamentos."), permanecendo visível até a próxima interação (comportamento atual preservado)
6. WHEN `handleCreate` de série de consultas (`agenda/page.tsx`) completa THEN o sistema SHALL mostrar `Alert variant="success"` se `skipped.length === 0`, `variant="warning"` caso contrário, mantendo o texto atual de `seriesNotice`
7. WHEN o termo de consentimento do portal está aceito (`consent-card.tsx`) THEN o sistema SHALL usar `Alert variant="success"` com o texto atual
8. WHEN o termo de consentimento do portal está pendente (`consent-card.tsx`) THEN o sistema SHALL manter o `Card` com as classes manuais `border-warning`/`bg-warning-soft` no título — este ponto NÃO vira `Alert` (é um `Card` de seção, não um alerta pontual; `Card` não tem variante semântica na 3.3.0, fora de escopo desta rodada) — documentado inline no código com um comentário curto explicando por que continua manual
9. WHEN `PatientPhotoUpload` bloqueia envio por consentimento pendente (`consent-card.tsx`) THEN o sistema SHALL usar `Alert variant="warning"` com o texto atual
10. WHEN qualquer `Alert` acima renderiza THEN o sistema SHALL confiar no `role` derivado automaticamente pela lib (não passar `role` manual) — `alert` para `danger`/`warning`, `status` para `success`/`info`

**Independent Test**: forçar cada condição (erro de fetch, alergia cadastrada, estoque baixo, lote vencido/a vencer, salvar grade, criar série com/sem pulados, aceitar/pendenciar consentimento, bloquear upload) e inspecionar classe (`sv-alert--<variant>`) + `role` computado no DOM.

---

### P3: `ToastProvider` + `useToast()` em ações de escrita

**User Story**: Como usuário do staff/portal, quero confirmação visual toda vez que uma ação de escrita (salvar, criar, ativar/desativar, registrar) é concluída ou falha, pra saber se minha ação realmente aconteceu.

**Why P3**: Maior número de call sites (14 write paths), depende de um provider novo montado uma vez — feito por último pra reaproveitar o padrão validado em P1 (client component sendo introduzido em layout).

**Acceptance Criteria — infraestrutura**:

1. WHEN o app renderiza qualquer rota THEN o sistema SHALL ter `ToastProvider` montado uma única vez em `src/app/layout.tsx`, envolvendo `{children}` dentro do `<body>`
2. WHEN dois toasts são disparados em sequência rápida THEN o sistema SHALL empilhar (comportamento padrão do `ToastProvider`, sem `max` customizado)

**Acceptance Criteria — call sites** (arquivo → função → toast de sucesso; erro tratado com `variant="danger"` e a msg já usada no `catch` existente, ou nova se o catch precisar ser criado):

| # | Arquivo | Função | Toast sucesso | Precisa criar try/catch? |
|---|---|---|---|---|
| 3 | `(staff)/page.tsx` | `resolveFollowUp` | "Retorno concluído" / "Retorno cancelado" (conforme `status`) | sim |
| 4 | `agenda/page.tsx` | `handleCreate` (consulta única, ramo `else`) | "Consulta criada" | não — `AppointmentForm` já embrulha `onSubmit` no próprio `try/catch` (`ErrorAlert` inline + modal aberto); `handleCreate` NÃO cria catch próprio, deixa o erro propagar pro form (ver AC 34/35 abaixo — achado pós-PASS, ver `validation.md`) |
| 5 | `faturamento/page.tsx` | `handleCreate` | "Fatura criada" | não — mesmo padrão de #4, com `InvoiceForm` |
| 6 | `faturamento/page.tsx` | `handlePay` | "Pagamento registrado" | não (já tem) |
| 7 | `faturamento/page.tsx` | `handleCancel` | "Fatura cancelada" | não (já tem) |
| 8 | `faturamento/page.tsx` | `PackageForm.handleSubmit` | "Pacote vendido" | verificar no Design |
| 9 | `procedimentos/page.tsx` | `toggleActive` | "Procedimento ativado" / "Procedimento desativado" | não (já tem) |
| 10 | `procedimentos/page.tsx` | `ProcedureForm.handleSubmit` | "Procedimento salvo" | verificar no Design |
| 11 | `procedimentos/page.tsx` | `KitForm.save` | "Kit atualizado" | verificar no Design |
| 12 | `materiais/page.tsx` | `MovementForm.handleSubmit` | "Entrada registrada" / "Saída registrada" (conforme `type`) | não (já tem) |
| 13 | `materiais/page.tsx` | `SupplyForm.handleSubmit` | "Insumo salvo" | verificar no Design |
| 14 | `profissionais/page.tsx` | `toggleActive` | "Profissional ativado" / "Profissional desativado" | não (já tem) |
| 15 | `profissionais/page.tsx` | `ProfessionalForm.handleSubmit` | "Profissional salvo" | verificar no Design |
| 16 | `parceiros/page.tsx` | `toggleActive` | "Parceiro ativado" / "Parceiro desativado" | não (já tem) |
| 17 | `parceiros/page.tsx` | `PartnerForm.handleSubmit` | "Parceiro salvo" | verificar no Design |
| 18 | `pacientes/[id]/anamnesis-section.tsx` | `handleSubmit` | "Anamnese salva" (substitui o `Salvo às {hora}` textual) | verificar no Design |
| 19 | `pacientes/[id]/conditions-section.tsx` | `resolveCondition` | "Condição resolvida" | verificar no Design |
| 20 | `pacientes/[id]/conditions-section.tsx` | `ConditionForm.handleSubmit` | "Condição registrada" | verificar no Design |
| 21 | `pacientes/[id]/conditions-section.tsx` | assessment `handleSubmit` | "Avaliação registrada" | verificar no Design |
| 22 | `pacientes/[id]/evolutions-section.tsx` | `handleSubmit` | "Evolução registrada" | verificar no Design |
| 23 | `pacientes/[id]/care-plans-section.tsx` | `OpenCarePlanForm.handleSubmit` | "Plano de cuidados aberto" | verificar no Design |
| 24 | `pacientes/[id]/care-plans-section.tsx` | `CarePlanPanel.resolvePlan` | "Plano de cuidados encerrado" | verificar no Design |
| 25 | `pacientes/[id]/care-plans-section.tsx` | `RecordInterventionButton` | "Execução registrada" | verificar no Design |
| 26 | `pacientes/[id]/care-plans-section.tsx` | `AddDiagnosisForm` | "Diagnóstico adicionado" | verificar no Design |
| 27 | `pacientes/[id]/care-plans-section.tsx` | `PrescribeOutcomeForm` | "Resultado prescrito" | verificar no Design |
| 28 | `pacientes/[id]/care-plans-section.tsx` | `PrescribeInterventionForm` | "Intervenção prescrita" | verificar no Design |
| 29 | `pacientes/[id]/care-plans-section.tsx` | `EvaluateOutcomeForm` | "Avaliação de resultado registrada" | verificar no Design |
| 30 | `pacientes/[id]/condition-photos.tsx` | `upload` | "Foto enviada" | verificar no Design |
| 31 | `pacientes/[id]/condition-photos.tsx` | `remove` | "Foto excluída" | verificar no Design |
| 32 | `portal/schedule-return.tsx` | `schedule` | "Retorno agendado" | não (já tem) |
| 32b | `(staff)/page.tsx` | `TriageQueue.triage` | "Foto revisada" (decisão `reviewed`) / "Foto escalada" (decisão `escalated`) | não (já tem) — **achado por review de PR (CodeRabbit) depois do PASS do Verifier**, ausente do levantamento original; mesmo padrão dos demais, `catch` já existe com `setError`, só falta o toast de sucesso |

**Acceptance Criteria — comportamento genérico**:

33. WHEN qualquer função da tabela acima completa com sucesso THEN o sistema SHALL disparar `toast({ description: "<texto>", variant: "success" })`
34. WHEN uma função da tabela acima lança erro E não tem nenhum tratamento de erro visível hoje (coluna "Precisa criar try/catch?" = "sim") THEN o sistema SHALL criar `try/catch` novo e disparar `toast({ description: <mensagem de erro>, variant: "danger" })` como ÚNICO feedback de erro — reaproveitando a mensagem já extraída (`err instanceof Error ? err.message : "<fallback existente>"`) — **esta AC não se aplica** às funções cobertas pela AC 35 abaixo (coluna = "não"), que já tinham feedback de erro antes desta feature
35. WHEN uma função já tem um `Alert`/`setActionError` inline pro erro OU o erro é consumido por um form filho que já embrulha `onSubmit` no próprio `try/catch` (ex.: `faturamento/handlePay`, `agenda handleCreate` → `AppointmentForm`, `faturamento handleCreate` → `InvoiceForm`) THEN o sistema SHALL manter esse tratamento INTACTO, sem criar `try/catch` novo em volta, e apenas adicionar o toast de sucesso — não duplicar/interceptar o erro com um toast (interceptar aqui impediria o form dono de mostrar o próprio erro; achado real pós-PASS, ver `validation.md`)

**Independent Test**: disparar cada ação (ex.: concluir um retorno pendente) e observar o toast aparecer com o texto esperado e sumir sozinho após a duração default; simular falha de rede (endpoint offline/mock 500) e observar toast `danger`.

---

## Edge Cases

- WHEN o `SidebarProvider` monta em SSR THEN o sistema SHALL renderizar o estado mobile (drawer fechado) até a hidratação resolver a media query real — sem flash de rail desktop em mobile real (comportamento já garantido pela lib, confirmar em teste manual)
- WHEN o usuário está no drawer mobile e navega via `StaffNav` (client-side route change) THEN o sistema SHALL fechar o drawer automaticamente (evitar overlay preso após navegação) — **a confirmar no Design**: `SidebarPanel`/`SidebarProvider` não fecha sozinho em navegação; precisa de `onOpenChange`/efeito ligado a `usePathname()` no `layout.tsx` do staff
- WHEN uma ação de escrita da tabela P3 é disparada duas vezes rápido (duplo clique) THEN o sistema SHALL manter o comportamento atual de cada handler (nenhum ganha debounce novo nesta feature — fora de escopo)
- WHEN o `Alert` de `ExpiryBanner` split (AC P2-4) resulta em zero lotes vencidos E zero a vencer THEN o sistema SHALL não renderizar nenhum `Alert` (banner inteiro omitido, igual ao comportamento atual do bloco único)

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|---|---|---|---|
| SV33-01..06 | P1: Sidebar | Design | Pending |
| SV33-07..16 | P2: Alert | Design | Pending |
| SV33-17..35 | P3: Toast | Design | Pending |

**ID format:** `SV33-NN` sequencial, mapeado 1:1 aos ACs numerados acima dentro de cada story.

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 35 ACs totais (6 Sidebar + 10 Alert + 19 Toast — 2 infra + 17 comportamento/call-site, cobrindo as 26 linhas de call site da tabela colapsadas por padrão comum nos ACs 33-35), 0 mapeados a tasks ainda.

---

## Success Criteria

- [ ] `npm run check:sv` continua verde (nenhum workaround novo introduzido, só remoção dos existentes)
- [ ] `npm run typecheck` e suíte de testes existente continuam verdes
- [ ] Nenhuma das 13 telas do staff amputa conteúdo em 390px (verificação manual/Playwright)
- [ ] Zero `catch` silencioso remanescente nos 32 call sites da tabela P3
- [ ] Zero `className="border-danger"`/`bg-warning-soft`/`bg-success-soft` manual remanescente nos 8 pontos da P2 que viram `Alert` (grep confirma) — exceto o ponto 8 (título do `Card` de consentimento pendente), que fica manual por decisão explícita (ver AC P2-8 acima)
