# Fase B — Clínico/legal crítico Specification

## Problem Statement

A auditoria UX de 2026-08 (`docs/audits/auditoria-ux-2026-08.md`) identificou 8 achados P0/P1 no fluxo clínico e de login que carregam risco jurídico direto: documentos emitidos sem responsável técnico/CNPJ (nulidade documental), atestado de comparecimento sem checar se a consulta de fato ocorreu (falsidade documental), autoria de nota de evolução forjável (compliance COFEN), erro de rede confundido com "sem histórico clínico" (decisão clínica às cegas), e perda silenciosa de documentação clínica ao trocar de aba. Corrigir agora, antes que gere incidente com paciente real.

## Goals

- [ ] Dados cadastrais da clínica (CNPJ, responsável técnico) passam a existir no banco, editáveis por Admin de Empresa, e alimentam os documentos emitidos.
- [ ] Nenhum documento clínico (Atestado/Relatório/Plano de Cuidados) sai sem responsável técnico e CNPJ — bloqueio fail-closed.
- [ ] Atestado de comparecimento só é gerado para consulta com status "realizada".
- [ ] Autoria de nota de evolução é sempre o profissional autenticado — sem seletor livre.
- [ ] Falha de API no prontuário (anamnese) é visualmente distinta de "sem dado clínico".
- [ ] Trocar de aba com SOAP/anamnese não salvos pede confirmação antes de descartar.
- [ ] Complicações de estomia gravadas aparecem na tela de visualização do prontuário.
- [ ] Login validado para os 3 perfis (staff/paciente/parceiro) sem copy que presuma acesso exclusivo de equipe.

## Out of Scope

Explicitamente excluído. Documentado para prevenir scope creep.

| Feature | Reason |
| --- | --- |
| Fluxo auditado de "registro em nome de outro profissional" (supervisão) | Mencionado como possibilidade no critério de aceite do #64, descartado nesta fase — ver `context.md` |
| Bloqueio fail-closed no Consentimento LGPD | É aceite do paciente, não laudo clínico sob responsabilidade técnica |
| Autosave/rascunho de SOAP/anamnese | Decisão de UX foi confirmação de descarte, não persistência automática |
| Mudança de copy adicional na tela de login (#68) | Achado já resolvido por commit anterior; esta fase só valida |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Estrutura de dados da clínica | Estender tabela `clinics` existente (novas colunas nullable) em vez de tabela separada | 1 linha por empresa já existe; evita join extra | y (discrição do agente, sem objeção) |
| Quem edita dados da clínica | `company_admin` e `super_admin` | Mesmo padrão de outras seções de Configurações | y |
| Onde bloqueia o atestado com status inválido | Na própria página de renderização (client), não em endpoint dedicado | Não existe endpoint de emissão — é renderização a partir do agendamento já buscado | y |
| Campos obrigatórios para desbloquear emissão de documento | CNPJ + nome do responsável técnico + registro profissional (endereço/cidade continuam opcionais) | São os dados com relevância jurídica direta na assinatura do documento | y |

**Open questions:** none — todas resolvidas via discussão (ver `context.md`).

---

## User Stories

### P1: Cadastro de dados da clínica ⭐ MVP

**User Story**: Como Admin de Empresa, quero cadastrar CNPJ, razão social e responsável técnico da minha clínica, para que documentos emitidos sejam juridicamente válidos.

**Why P1**: Bloqueia #62 (documentos sem responsável) — é pré-requisito.

**Acceptance Criteria**:

1. WHEN Admin de Empresa abre Configurações THEN o sistema SHALL exibir uma seção "Dados da clínica" com campos: razão social, CNPJ, endereço, cidade, nome do responsável técnico, registro profissional.
2. WHEN Admin de Empresa salva a seção com CNPJ e responsável técnico preenchidos THEN o sistema SHALL persistir os dados associados ao `clinic_id` da sessão.
3. WHEN um papel diferente de `company_admin`/`super_admin` acessa a rota de salvamento THEN o sistema SHALL rejeitar com 403.
4. WHEN não há dados cadastrados ainda THEN a seção SHALL exibir os campos vazios (não erro).

**Independent Test**: Login como Admin de Empresa, preencher e salvar CNPJ/responsável técnico em Configurações, recarregar a página e ver os valores persistidos.

---

### P1: Bloqueio fail-closed de documentos sem responsável técnico ⭐ MVP

**User Story**: Como clínica, não quero emitir Atestado/Relatório/Plano de Cuidados sem CNPJ e responsável técnico cadastrados, para evitar documento juridicamente nulo.

**Why P1**: Corrige #62 — risco de nulidade jurídica já identificado em produção.

**Acceptance Criteria**:

1. WHEN a clínica não tem CNPJ, nome do responsável técnico ou registro profissional cadastrados THEN as páginas de Atestado, Relatório e Plano de Cuidados SHALL exibir mensagem de bloqueio clara em vez do documento.
2. WHEN a clínica tem os 3 campos cadastrados THEN o documento SHALL renderizar normalmente, incluindo CNPJ e responsável técnico no cabeçalho/rodapé.
3. WHEN a página de Consentimento LGPD é acessada sem esses dados THEN o sistema SHALL renderizar normalmente (fora do escopo do bloqueio).

**Independent Test**: Sem cadastro de responsável técnico, acessar `/documentos/atestado/[id]` e ver bloqueio; cadastrar os dados e ver o documento completo.

---

### P1: Atestado só para consulta realizada ⭐ MVP

**User Story**: Como clínica, não quero poder emitir atestado de comparecimento para consulta cancelada ou com falta registrada, para evitar falsidade documental.

**Why P1**: Corrige #63 — risco de falsidade documental já identificado.

**Acceptance Criteria**:

1. WHEN o agendamento vinculado ao atestado tem status diferente de `completed` THEN a página SHALL exibir mensagem de bloqueio explícita em vez do texto de comparecimento.
2. WHEN o agendamento tem status `completed` THEN a página SHALL renderizar a declaração de comparecimento normalmente.

**Independent Test**: Marcar uma consulta como cancelada e tentar abrir o atestado — ver bloqueio; marcar outra como concluída e ver o atestado normal.

---

### P1: Autoria de evolução travada na sessão ⭐ MVP

**User Story**: Como clínica, quero que toda nota de evolução (SOAP) seja atribuída ao profissional autenticado, nunca a um seletor livre, para não correr risco de autoria falsa (COFEN).

**Why P1**: Corrige #64 — risco de compliance com conselhos profissionais.

**Acceptance Criteria**:

1. WHEN qualquer papel (`profissional`, `atendente`, `company_admin`) registra uma evolução THEN o sistema SHALL atribuir a autoria exclusivamente a partir do `professionalId` vinculado à conta da sessão, ignorando qualquer valor de `professionalId` enviado no corpo da requisição.
2. WHEN a conta da sessão não tem `professionalId` vinculado THEN a evolução SHALL ser salva com autor nulo (comportamento já existente quando ninguém era selecionado).
3. WHEN o usuário abre o formulário de nova evolução THEN a UI SHALL NOT exibir seletor de profissional.

**Independent Test**: Logar como atendente e registrar evolução — autor fica nulo ou o vinculado à conta, nunca escolhido livremente; tentar forjar `professionalId` de outro profissional via requisição direta e confirmar que é ignorado.

---

### P1: Erro de API distinto de "sem histórico" no prontuário ⭐ MVP

**User Story**: Como profissional, quero ver um erro explícito quando a anamnese falha ao carregar, para não confundir com "paciente sem histórico".

**Why P1**: Corrige #65 (P0-R1) — decisão clínica às cegas é o pior cenário do padrão de erro de 3 estados.

**Acceptance Criteria**:

1. WHEN a chamada à API de anamnese falha (5xx/erro de rede) THEN a aba Anamnese SHALL exibir um estado de erro explícito com opção de retry, distinto do formulário vazio de "sem histórico".
2. WHEN a chamada é bem-sucedida e não há anamnese cadastrada THEN a aba SHALL exibir o formulário vazio normalmente (comportamento atual preservado).

**Independent Test**: Simular erro 5xx no endpoint de anamnese e confirmar que a aba mostra erro, não formulário vazio; teste automatizado cobrindo o cenário.

---

### P1: Confirmação antes de descartar SOAP/anamnese não salvos ⭐ MVP

**User Story**: Como profissional, quero ser avisado antes de perder texto não salvo ao trocar de aba do prontuário, para não perder documentação clínica.

**Why P1**: Corrige #66 (P0-R2) — perda de documentação clínica sem aviso.

**Acceptance Criteria**:

1. WHEN o formulário de evolução (SOAP) está aberto com algum campo preenchido e o usuário clica em outra aba THEN o sistema SHALL exibir um diálogo de confirmação antes de trocar de aba.
2. WHEN o formulário de anamnese tem alterações não salvas (valores diferentes do último estado persistido) e o usuário clica em outra aba THEN o sistema SHALL exibir o mesmo diálogo de confirmação.
3. WHEN o usuário confirma o diálogo THEN o sistema SHALL trocar de aba e descartar as alterações.
4. WHEN o usuário cancela o diálogo THEN o sistema SHALL permanecer na aba atual com o formulário intacto.
5. WHEN não há alterações não salvas THEN trocar de aba SHALL ocorrer sem diálogo (comportamento atual preservado).

**Independent Test**: Digitar texto em um campo SOAP sem salvar, clicar em outra aba, ver diálogo; cancelar e confirmar que o texto permanece; repetir confirmando e ver o texto descartado.

---

### P1: Complicações de estomia visíveis na leitura ⭐ MVP

**User Story**: Como profissional, quero ver as complicações de estomia registradas em avaliações anteriores, para não perder informação clínica relevante no acompanhamento.

**Why P1**: Corrige #67 (P0-R3) — dado gravado e nunca lido é, na prática, dado perdido.

**Acceptance Criteria**:

1. WHEN uma avaliação tem `complicationCodes` preenchido THEN a tabela de avaliações SHALL exibir os labels em pt-BR correspondentes (via `COMPLICATION_OPTIONS`).
2. WHEN uma avaliação não tem `complicationCodes` THEN a célula SHALL exibir "—" (comportamento atual do texto livre preservado, agora lado a lado).

**Independent Test**: Registrar uma avaliação com complicações selecionadas (checkboxes), reabrir a lista de avaliações e ver os labels exibidos.

---

### P2: Validação do login para os 3 perfis

**User Story**: Como paciente ou parceiro, quero conseguir logar pela mesma tela da equipe sem me sentir barrado, para efetivamente usar o portal.

**Why P2**: O código já foi corrigido incidentalmente (commit `c521841`); esta história é só validação, não implementação nova.

**Acceptance Criteria**:

1. WHEN staff, paciente e parceiro logam pela tela `/login` THEN nenhum SHALL ver copy que presuma acesso exclusivo de equipe.
2. WHEN paciente ou parceiro loga com sucesso THEN o sistema SHALL redirecionar para `/portal` (via proxy, comportamento já existente).

**Independent Test**: Rodar/estender E2E de login cobrindo os 3 perfis; fechar a issue #68 com a evidência. Staff cobre a copy e o formulário real de `/login`; paciente/parceiro cobrem a copy (mesma página) e o redirecionamento pós-sessão para `/portal` via cookie assinado — `POST /api/accounts` não expõe o link de convite na resposta, então o formulário real de senha não é alcançável por um paciente/parceiro criado via teste (mesmo precedente de `portal-paciente.spec.ts`/`portal-parceiro.spec.ts`).

---

## Edge Cases

- WHEN a clínica tem CNPJ mas não tem responsável técnico (cadastro parcial) THEN o bloqueio de documento SHALL considerar incompleto e bloquear mesmo assim.
- WHEN o usuário troca de aba duas vezes em sequência rápida com formulário sujo THEN o diálogo de confirmação SHALL aparecer a cada tentativa até ser resolvido (confirmado ou cancelado).
- WHEN uma evolução antiga (antes desta fase) já tem `professionalId` de um profissional diferente do autor real THEN o sistema SHALL NOT tentar corrigir retroativamente — a trava vale só para novos registros.
- WHEN o agendamento do atestado ainda não foi carregado (loading) THEN a página SHALL exibir o indicador de carregamento, não o bloqueio nem o documento.

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| CLIN-01 | P1: Cadastro de dados da clínica | Design | Pending |
| CLIN-02 | P1: Bloqueio fail-closed de documentos | Design | Pending |
| CLIN-03 | P1: Atestado só para consulta realizada | Design | Pending |
| CLIN-04 | P1: Autoria de evolução travada na sessão | Design | Pending |
| CLIN-05 | P1: Erro de API distinto de "sem histórico" (anamnese) | Design | Pending |
| CLIN-06 | P1: Confirmação antes de descartar SOAP/anamnese | Design | Pending |
| CLIN-07 | P1: Complicações de estomia visíveis na leitura | Design | Pending |
| CLIN-08 | P2: Validação do login para os 3 perfis | Design | Pending |

**ID format:** `CLIN-NN`

**Status values:** Pending → In Design → In Tasks → Implementing → Verified

**Coverage:** 8 total, 8 mapeados para issues (#61–#68), 0 sem rastreio ⚠️ nenhum

---

## Success Criteria

- [ ] `npm run typecheck`, `npm run lint`, `npm run check:sv`, `npm run test:coverage` (≥90%) e `npm run test:e2e` verdes.
- [ ] Issues #61–#67 fechadas via `Closes #N` nos commits; #68 fechada após validação E2E sem código novo além do teste.
- [ ] Nenhum documento (Atestado/Relatório/Plano de Cuidados) renderiza sem responsável técnico/CNPJ quando os dados faltam.
