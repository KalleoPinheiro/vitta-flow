# Fase B — Clínico/legal crítico — Context

**Gathered:** 2026-09-02
**Spec:** `.specs/features/fase-b-clinico-legal-critico/spec.md`
**Status:** Ready for design

---

## Feature Boundary

Corrige 8 achados P0/P1 de `docs/audits/auditoria-ux-2026-08.md` classificados como clínico/legal crítico (issues #61–#68): dados cadastrais da clínica ausentes do banco, documentos emitidos sem responsável técnico/CNPJ, atestado sem checar status do agendamento, autoria de evolução forjável, erro de API confundido com "sem histórico", perda silenciosa de SOAP/anamnese ao trocar de aba, complicações de estomia gravadas mas nunca exibidas, e copy de login que barrava paciente/parceiro (achado já resolvido por commit anterior, fora do escopo de código novo).

---

## Implementation Decisions

### #68 — Login

- Já resolvido pelo commit `c521841` (2026-09-01), que trocou o subtítulo para "Entre com seu e-mail e sua senha" como efeito colateral de remover o botão Google. Sem novo código — só validação (E2E com os 3 perfis) e fechamento da issue.

### #64 — Autoria de evolução (SOAP)

- Trava total: autoria de nota de evolução é **sempre** derivada da sessão autenticada, para **todos** os papéis (hoje só `profissional` era travado no backend — `atendente`/`company_admin` podiam atribuir livremente via dropdown).
- Sem fluxo de "registro em nome de outro profissional" (supervisão) — explicitamente fora de escopo.
- Papel sem `professionalId` vinculado (atendente, admin) registra evolução sem autor atribuído (`professionalId: null`), como já ocorre hoje quando ninguém é selecionado.
- Dropdown de seleção de profissional é removido da UI.

### #62 — Documentos sem responsável técnico (fail-closed)

- Escopo do bloqueio: **Atestado + Relatório (parceiro) + Plano de Cuidados**. Consentimento LGPD fica de fora — é aceite do paciente, não laudo clínico sob responsabilidade técnica.
- Campos obrigatórios para desbloquear emissão: CNPJ, nome do responsável técnico, registro profissional. Endereço/cidade continuam opcionais (não essenciais à validade jurídica do documento).

### #66 — Perda de SOAP/anamnese ao trocar de aba

- Confirmação via diálogo do design system (`ConfirmAction`/`AlertDialog` do Still Void, já usado no app para ações destrutivas) — não `window.confirm` nativo. Ao trocar de aba com formulário sujo (SOAP em edição ou anamnese alterada), abre diálogo "Descartar alterações?"; confirmar troca de aba e descarta, cancelar mantém a aba e o formulário intacto.

---

### Agent's Discretion

- Estrutura de tabela (`clinics` estendida vs. tabela nova) para os dados cadastrais do #61 — decidido pelo agente: estender `clinics` (já é 1 linha por empresa, evita join extra).
- Quem edita os dados da clínica (#61): `company_admin` e `super_admin` (mesmo padrão de outras telas de Configurações).
- Onde o bloqueio do #63 (atestado com status inválido) acontece: na própria página de renderização do documento (não existe endpoint de emissão dedicado hoje — é renderização client-side a partir do agendamento já buscado).
- Exibição das complicações de estomia (#67): mostrar `complicationCodes` (labels canônicas em pt-BR, já existentes em `COMPLICATION_OPTIONS`) na tabela de avaliações, além do texto livre já exibido.
- Correção do #65 (erro de anamnese mascarado como "sem histórico"): passar `error`/`isLoading` da query de anamnese (hoje descartados) para `AnamnesisSection`, replicando o padrão de 3 estados já usado em Condições/Evoluções/Plano de Cuidados.

### Declined / Undiscussed Gray Areas → Assumptions

- Nenhuma — todas as áreas cinzentas identificadas foram discutidas acima.

---

## Specific References

Nenhuma referência visual externa — segue os padrões já estabelecidos no próprio app (`ScheduleSection` em Configurações como modelo para a nova seção de dados da clínica; `ConfirmAction`/`AlertDialog` como modelo para confirmação de descarte; `ErrorAlert`/`LoadingIndicator` como modelo de 3 estados).

---

## Deferred Ideas

- Fluxo auditado de "registro em nome de outro profissional" (supervisão clínica) — mencionado no critério de aceite do #64 como possibilidade, explicitamente descartado para esta fase.
- Bloqueio de fail-closed no Consentimento LGPD — fora de escopo desta fase.
