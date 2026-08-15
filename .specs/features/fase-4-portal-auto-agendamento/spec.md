# Fase 4 — Portal: Auto-agendamento e Recall — Specification

## Problem Statement

O paciente só confirma presença; o lembrete de recall diz "entre em contato com a clínica" — o
fluxo de maior valor clínico (continuidade) tem a maior fricção. Toda a infraestrutura de
agendamento (grade configurável, conflito por profissional, gap mínimo) já existe e não é
exposta ao paciente.

## Goals

- [ ] Paciente vê horários disponíveis e agenda retorno pelo portal.
- [ ] Recall aponta para o portal (deep-link) em vez de pedir ligação.
- [ ] Follow-up é fechado automaticamente quando o agendamento nasce dele.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Escolha de profissional pelo paciente | decisão de negócio (agenda de quem abrir?) — default: sem profissional (regra global de conflito, mais restritiva e segura) |
| Cancelamento/remarcação pelo paciente | política de cancelamento pendente (Fase 6) |
| Waitlist | Fase 5 (backlog) |
| Primeiro agendamento de paciente novo | auto-agendamento é para paciente ativo com histórico (retorno) |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|-----------------------|----------------|-----------|------------|
| Duração do slot ofertado | duração padrão do procedimento do catálogo | fonte já existente (O1.1) | y |
| Procedimentos ofertáveis | ativos do catálogo | regra existente do agendamento staff | y |
| Janela de oferta | próximos 14 dias úteis da grade | equilíbrio utilidade × exposição da agenda | y |
| Horários ofertados | slots inteiros a partir da abertura, passo = duração, respeitando gap mínimo e conflitos | reusa assert-slot-available | y |
| Vínculo follow-up | `followUpId` opcional no POST; ao agendar, follow-up → `scheduled` | espelha recall de 1 clique do staff (O2.3) | y |
| Auditoria | evento de auditoria no agendamento pelo portal | padrão das ações do portal | y |

**Open questions:** none.

## User Stories

### P1: Slots disponíveis ⭐ MVP

1. WHEN o paciente autenticado consulta `GET /api/portal/patient/slots?procedureId=X&date=YYYY-MM-DD` THEN o sistema SHALL responder os horários livres do dia conforme grade, gap e conflitos — `PORT4-01`
2. WHEN a data está fora da grade (dia inativo) THEN a lista SHALL vir vazia — `PORT4-02`
3. WHEN o procedimento é inativo/inexistente THEN 404/400 conforme padrão — `PORT4-03`

### P1: Agendar pelo portal ⭐ MVP

1. WHEN o paciente agenda um slot válido THEN a consulta SHALL ser criada para o próprio paciente (escopo da sessão) com procedimento e preço do catálogo — `PORT4-04`
2. WHEN o slot conflita (corrida) THEN o sistema SHALL responder o erro de conflito atual sem criar consulta — `PORT4-05`
3. WHEN `followUpId` é enviado e pertence ao paciente THEN o follow-up SHALL ir a `scheduled` na mesma operação — `PORT4-06`
4. WHEN `followUpId` é de outro paciente THEN NotFound (sem vazar existência) — `PORT4-07`
5. WHEN o agendamento é criado THEN evento de auditoria SHALL registrar o ator paciente — `PORT4-08`

### P2: Recall com destino

1. WHEN o lembrete de recall é enviado THEN a mensagem SHALL orientar a agendar pelo portal (com APP_URL) em vez de "entre em contato" — `PORT4-09`

### P2: UI do portal

1. WHEN há follow-up pendente no portal THEN o paciente SHALL ver ação "Agendar retorno" que abre a escolha de procedimento/data/horário — `PORT4-10`
2. WHEN o agendamento conclui THEN a lista de consultas do portal SHALL refletir a nova consulta — `PORT4-11`

## Edge Cases

- WHEN o dia consultado é hoje THEN slots no passado não são ofertados
- WHEN dois pacientes disputam o mesmo slot THEN constraint de exclusão do banco decide (comportamento atual)
- WHEN paciente inativo THEN 404 (regra atual do portal)

## Requirement Traceability

| Requirement ID | Story | Status |
|----------------|-------|--------|
| PORT4-01..03 | slots | Implemented |
| PORT4-04..08 | agendar | Implemented |
| PORT4-09 | recall | Implemented |
| PORT4-10..11 | UI | Implemented |
