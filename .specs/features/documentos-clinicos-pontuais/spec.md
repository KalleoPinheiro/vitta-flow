# Documentos clínicos — achados pontuais (issue #94) Specification

## Problem Statement

`docs/audits/auditoria-ux-2026-08.md` §9 (Documentos clínicos: atestado, consentimento, plano de
cuidados, relatório). A auditoria recomenda uma família de 11 tasks (camada CSS `@page`, gramática
de documento extraída — `DocumentMeta`/`DocumentSection`/`DocumentTable`/`DocumentEmpty`/
`SignatureLine` — guarda `assertPrintable`, emissão persistida com número). **Verificado no código
antes deste spec**: 2 dos 8 P0 já estão resolvidos — melhor do que a issue presumia, mesmo padrão
de divergência já encontrado em #93.

- **P0 "imprime compareceu pra consulta cancelada"** — já resolvido: `guardBlock` no atestado
  bloqueia a menos que `appointment.status === "completed"`.
- **P0 "assinatura sem responsável é config padrão"** — já resolvido no atestado/plano/relatório
  (guarda `isClinicInfoComplete`); **real só no consentimento**, que não tem essa guarda.

Restam 6 P0 reais + um conjunto de P1/P2. Este spec fixa cada achado real diretamente na página
correspondente (mesmo padrão de todo #86-93) — **sem** construir a camada de abstração completa
recomendada pela auditoria (gramática de documento genérica, `@page` com numeração via CSS Paged
Media). Justificativa em Out of Scope.

## Goals

- [ ] Todo documento tem número + data/hora de emissão persistidos (não `new Date()` no render)
- [ ] Consentimento tem a guarda de clínica completa que os outros 3 já têm
- [ ] Consentimento: data vem antes das duas assinaturas, não entre elas
- [ ] Consentimento: linha própria pra nome/CPF de responsável legal, quando aplicável
- [ ] Consentimento: autorização de imagem com aceite/assinatura própria, separada
- [ ] Consentimento: nota de "duas vias" e versão do termo exibida
- [ ] Plano de cuidados vazio (sem diagnóstico/resultado/intervenção) não é mais imprimível
- [ ] Plano de cuidados mostra o responsável técnico que prescreveu, não a assinatura genérica
- [ ] Escores NOC mostram a escala (1-5)
- [ ] Bordas de tabela do plano ficam visíveis em laser P&B
- [ ] Relatório não imprime "Paciente: —" numa falha/espera de busca
- [ ] Relatório vazio (sem avaliação) não é mais imprimível
- [ ] Gráfico do relatório distingue as 3 séries por traço/forma, não só cor
- [ ] `check:sv` permanece verde

## Out of Scope

| Item | Reason |
| --- | --- |
| Gramática de documento genérica (`DocumentMeta`/`DocumentSection`/`DocumentTable`/`DocumentEmpty`/`SignatureLine` em `src/components/document/`) | A auditoria já enquadra isso como investimento de design system, não achado pontual — "boa parte se resolve investindo primeiro na infraestrutura (documento irmão)". Risco de regressão nos 4 documentos de uma vez é desproporcional a esta issue |
| Numeração de página real via CSS Paged Media (`@page { @bottom-center }`) | Chrome/Firefox não implementam margin boxes de `@page` em impressão de navegador — só ferramentas dedicadas de PDF (Prince/WeasyPrint). Sem trocar a estratégia de impressão (Ctrl+P do navegador) por geração de PDF no servidor, não há como numerar página de verdade |
| CPF do paciente (atestado e consentimento) | Não existe campo de CPF em `PatientDto`/domínio — exigiria campo novo + migração; fora de "achado pontual" |
| Orientação prática ao cuidador no plano de cuidados | Exige decisão de conteúdo clínico (o quê fazer, quando ligar) que não é uma correção mecânica — recomendo consulta ao time clínico numa issue própria |
| Parecer/conduta narrativa no relatório de condição | Mesmo motivo — texto clínico que precisa de autoria de um profissional, não geração automática |
| Renomear a rota `/documentos/atestado/...` | O rótulo visível já diz "Declaração de comparecimento" corretamente (`appointment-detail.tsx`); só o segmento de URL diverge — impacto real baixo, renomear quebraria links/bookmarks existentes sem ganho perceptível |

---

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
| --- | --- | --- | --- |
| Emissão persistida | Reaproveita a trilha de auditoria já existente: `POST /api/documents/issue` cria (ou reaproveita, se já existir pra aquele `documentType`+`resourceId`) um `AuditEvent` com `resourceType: documentType`; `documentNumber` deriva de `id.slice(0,8)` prefixado (`ATST-`/`TCLE-`/`PLAN-`/`REL-`); reimprimir devolve o mesmo registro — resolve "data muda a cada reimpressão" sem tabela nova | Nenhuma migração nova, reaproveita infraestrutura já auditada e testada de #71/#92 | n (default do agente, documentado) |
| Autorização de imagem separada | Vira um segundo bloco com sua própria linha de aceite/assinatura ("☐ Autorizo" + linha de assinatura específica), não um checkbox interativo — o documento é só impressão/PDF, sem estado de formulário | Resolve "sem opt-in separado" dentro do que um documento estático permite | n (default do agente, documentado) |
| Responsável legal | Linha impressa em branco pra preencher à mão ("Nome e CPF do responsável legal, se aplicável: ______") — sem campo novo no domínio | O achado é sobre a linha de assinatura imprimir por cima do nome da paciente mesmo quando quem assina é outra pessoa; uma linha em branco supre isso sem modelar "responsável legal" como conceito de domínio | n (default do agente, documentado) |
| Versão do termo | Constante `CONSENT_TEMPLATE_VERSION` no código, exibida no rodapé do documento | Sem versionamento de conteúdo no banco (fora de escopo), mas resolve "não dá pra saber qual versão foi assinada" pra qualquer emissão a partir de agora | n (default do agente, documentado) |
| Gráfico monocromático | Cada série já tem cor (mantida) + um traço distinto (sólido/tracejado/pontilhado) — dor já era tracejada; adiciono pontilhado ao score e mantenho sólido pra área; marcador do score vira quadrado (viés já era círculo pra área) | Resolve legibilidade em P&B/daltonismo sem remover a cor | n (default do agente, documentado) |

**Open questions:** nenhuma — todas resolvidas ou registradas acima.

---

## User Stories

### P0: Emissão persistida com número, não `new Date()` no render ⭐ MVP

**User Story**: Como responsável técnico, quero que a data no documento seja a data real de emissão,
que não mude se eu reimprimir o mesmo documento depois.

**Why P0**: Achado real — `new Date()` no render de `DocumentFrame`, sem número nem hash.

**Acceptance Criteria**:

1. WHEN uma página de documento carrega THEN SHALL chamar `POST /api/documents/issue` com
   `documentType`+`resourceId` e usar a resposta (`documentNumber`+`issuedAt`) no rodapé, em vez de
   `new Date()`
2. WHEN o mesmo documento (mesmo `documentType`+`resourceId`) é emitido de novo THEN SHALL devolver
   o mesmo `documentNumber`/`issuedAt` da primeira emissão (idempotente)
3. WHEN o rodapé renderiza THEN SHALL incluir hora (não só data) e uma nota de documento gerado
   eletronicamente

**Independent Test**: chamar a rota duas vezes com o mesmo `resourceId` → mesmo `documentNumber`.

---

### P0: Consentimento com a guarda de clínica completa

**Why P0**: Achado real — único dos 4 documentos sem `isClinicInfoComplete`.

**Acceptance Criteria**:

1. WHEN a clínica não tem CNPJ/responsável técnico cadastrados THEN a página de consentimento
   SHALL bloquear com a mesma mensagem já usada nos outros 3 documentos

**Independent Test**: mockar clínica incompleta; confirmar bloqueio.

---

### P0: Ordem correta do bloco de fecho do consentimento

**Why P0**: Achado real — assinatura do paciente vem antes da data, quebra a semântica de um TCLE.

**Acceptance Criteria**:

1. WHEN o documento de consentimento renderiza THEN a ordem SHALL ser: data → assinatura do
   paciente (+ linha de responsável legal) → assinatura do profissional

**Independent Test**: inspecionar a ordem dos elementos no DOM renderizado.

---

### P0: Plano de cuidados vazio não é imprimível

**Why P0**: Achado real — nenhum diagnóstico/resultado/intervenção ainda é uma folha assinável.

**Acceptance Criteria**:

1. WHEN diagnósticos, resultados e intervenções estão todos vazios THEN a página SHALL bloquear
   com uma mensagem, não renderizar o `DocumentFrame` (sem bloco de assinatura)

**Independent Test**: mockar plano sem nenhum item; confirmar bloqueio, sem "Nenhum ... prescrito."
dentro de um documento assinável.

---

### P0: Relatório vazio não é imprimível

**Why P0**: Achado real — mesmo problema do plano de cuidados.

**Acceptance Criteria**:

1. WHEN não há nenhuma avaliação registrada THEN a página SHALL bloquear com uma mensagem, não
   renderizar o `DocumentFrame`

**Independent Test**: mockar condição sem avaliações; confirmar bloqueio.

---

### P0: Relatório não imprime paciente anônimo

**Why P0**: Achado real — `patient?.fullName ?? "—"` imprime "Paciente: —" numa falha/espera.

**Acceptance Criteria**:

1. WHEN a busca do paciente ainda não resolveu ou falhou THEN a página SHALL mostrar loading/erro,
   não renderizar o documento com "—" no lugar do nome

**Independent Test**: mockar busca de paciente pendente; confirmar que o documento não renderiza
ainda.

---

### P0: Gráfico do relatório distinguível sem cor

**Why P0**: Achado real — as 3 séries só se distinguem por cor.

**Acceptance Criteria**:

1. WHEN o gráfico renderiza THEN cada série SHALL ter um traço distinto (sólido/tracejado/pontilhado)
   além da cor
2. WHEN a série de score renderiza THEN o marcador de ponto SHALL ter forma distinta da série de
   área

**Independent Test**: inspecionar `stroke-dasharray` de cada `<polyline>` — os 3 valores SHALL ser
diferentes entre si.

---

### P1: Responsável legal com linha própria

**Why P1**: Achado real — assinatura sempre imprime o nome da paciente, mesmo quando quem assina é
outra pessoa.

**Acceptance Criteria**:

1. WHEN o bloco de assinatura do paciente renderiza THEN SHALL haver uma linha em branco abaixo
   pra nome/CPF de responsável legal, quando aplicável

**Independent Test**: renderizar o documento; confirmar a linha de responsável legal presente.

---

### P1: Autorização de imagem com aceite separado

**Why P1**: Achado real — fundida ao consentimento geral, sem opt-in independente.

**Acceptance Criteria**:

1. WHEN o documento renderiza THEN o parágrafo de autorização de imagem SHALL ter seu próprio bloco
   de aceite/assinatura, distinto do consentimento geral do procedimento

**Independent Test**: renderizar; confirmar 2 blocos de assinatura/aceite distintos (procedimento +
imagem).

---

### P1: Versão do termo e "duas vias"

**Why P1**: Achados reais.

**Acceptance Criteria**:

1. WHEN o rodapé do consentimento renderiza THEN SHALL exibir a versão do termo
2. WHEN o rodapé renderiza THEN SHALL incluir a nota de "duas vias"

**Independent Test**: renderizar; confirmar os dois textos presentes.

---

### P1: Plano de cuidados com responsável técnico correto

**Why P1**: Achado real — usa a assinatura genérica da clínica, não quem prescreveu.

**Acceptance Criteria**:

1. WHEN o plano tem `professionalId` THEN a assinatura SHALL usar o nome/registro desse
   profissional, não o `professionalName` genérico da clínica

**Independent Test**: mockar plano com `professionalId` diferente do responsável da clínica;
confirmar que o nome exibido é o do profissional do plano.

---

### P1: Escores NOC com escala legendada

**Why P1**: Achado real.

**Acceptance Criteria**:

1. WHEN a tabela de resultados esperados (NOC) renderiza THEN os cabeçalhos de score SHALL indicar
   a escala (1-5)

**Independent Test**: renderizar; confirmar "(escala 1-5)" no cabeçalho.

---

### P2: Bordas visíveis em laser P&B

**Why P2**: Achado real — `border-black/30` some no toner.

**Acceptance Criteria**:

1. WHEN as tabelas do plano de cuidados renderizam THEN as bordas internas SHALL usar opacidade
   mais alta que 30%

**Independent Test**: inspecionar a classe de borda das `TableRow`.

---

## Edge Cases

- WHEN `POST /api/documents/issue` é chamado sem sessão de staff THEN SHALL retornar 401 (mesma
  guarda de toda rota de documento)
- WHEN o plano de cuidados tem só diagnósticos vazios mas resultados/intervenções preenchidos THEN
  SHALL imprimir normalmente (guarda é "tudo vazio", não "qualquer seção vazia")

---

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
| --- | --- | --- | --- |
| DOC-01 | P0: Emissão persistida com número | Implement | Pending |
| DOC-02 | P0: Guarda de clínica no consentimento | Implement | Pending |
| DOC-03 | P0: Ordem do fecho do consentimento | Implement | Pending |
| DOC-04 | P0: Plano vazio não imprimível | Implement | Pending |
| DOC-05 | P0: Relatório vazio não imprimível | Implement | Pending |
| DOC-06 | P0: Relatório sem paciente anônimo | Implement | Pending |
| DOC-07 | P0: Gráfico distinguível sem cor | Implement | Pending |
| DOC-08 | P1: Linha de responsável legal | Implement | Pending |
| DOC-09 | P1: Autorização de imagem separada | Implement | Pending |
| DOC-10 | P1: Versão do termo + duas vias | Implement | Pending |
| DOC-11 | P1: Responsável técnico do plano | Implement | Pending |
| DOC-12 | P1: Escala NOC legendada | Implement | Pending |
| DOC-13 | P2: Bordas visíveis em P&B | Implement | Pending |

**Coverage:** 13 stories, 13 mapeados (execução direta, sem `tasks.md` formal), 0 sem mapeamento.

---

## Success Criteria

- [ ] `npm run typecheck`, `npm run lint`, `npm run check:sv`, `npm run test:coverage` (≥90%) verdes
- [ ] Nenhuma regressão nos testes existentes dos 4 documentos
- [ ] Issue #94 fechada via `Closes #94` no commit/PR
