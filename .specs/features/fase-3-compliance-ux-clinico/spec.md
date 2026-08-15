# Fase 3 — Compliance e UX Clínico — Specification

## Problem Statement

O consentimento digital existe mas nada o exige: paciente sem aceite envia foto remota — o fluxo
que mais precisa de base legal registrada. A fila de triagem é uma lista plana sem idade da
pendência nem contexto clínico. Pacotes de sessões não expiram — passivo contábil fora da
prática de mercado.

## Goals

- [ ] Envio remoto de foto exige consentimento vigente.
- [ ] Fila de triagem mostra idade da pendência e último score (PUSH/DET) da condição.
- [ ] Pacote pode ter validade; expirado não consome sessão.

## Out of Scope

| Feature | Reason |
|---------|--------|
| Política de cancelamento tardio/taxa | decisão de negócio pendente (AD-003) → backlog Fase 6 |
| Consentimento obrigatório em outros fluxos do portal | escopo mínimo: onde há tratamento de imagem; ampliar exige decisão do negócio |
| UI de compra de pacote com validade obrigatória | validade é opcional (retrocompatível) |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|-----------------------|----------------|-----------|------------|
| Resposta sem consentimento | 403 com mensagem clara direcionando ao aceite no portal | não é auth (401) nem validação de payload (400); é permissão condicionada | y |
| "Consentimento vigente" | registro cujo hash cobre o CONSENT_TEXT atual (`covers`) | regra já existente na rota de consentimento | y |
| Último score na triagem | pushScore para ferida, detTotal para estomia, da avaliação mais recente; null quando não há | getters derivados já existem no domínio | y |
| Validade do pacote | `expiresAt` nullable; null = sem validade (comportamento atual) | migração não destrutiva, padrão do projeto | y |
| Pacote expirado | `findUsable` não retorna; conclusão volta a faturar avulso | mesma semântica de "saldo zerado" do PRD O3.3 | y |

**Open questions:** none.

## User Stories

### P1: Gate de consentimento no envio remoto ⭐ MVP

1. WHEN paciente sem consentimento vigente envia foto pelo portal THEN o sistema SHALL responder 403 com mensagem orientando o aceite no portal e NÃO gravar a foto — `COMP3-01`
2. WHEN paciente com consentimento vigente envia foto THEN o fluxo SHALL seguir idêntico ao atual — `COMP3-02`
3. WHEN o texto do termo muda (novo hash) THEN aceites antigos SHALL deixar de valer para o gate (regra `covers` existente) — `COMP3-03`

### P2: Fila de triagem enriquecida

1. WHEN a fila é servida THEN cada item SHALL incluir `waitingHours` (horas desde o envio) e `latestScore` ({kind: "push"|"det", value} | null) da condição — `COMP3-04`
2. WHEN a condição não tem avaliação com score calculável THEN `latestScore` SHALL ser null — `COMP3-05`
3. WHEN a UI da fila renderiza THEN pendências com 24h ou mais de espera SHALL ter destaque visual — `COMP3-06`

### P1: Validade de pacotes ⭐ MVP

1. WHEN um pacote é criado com `expiresAt` THEN a data SHALL ser persistida e exposta no DTO — `COMP3-07`
2. WHEN a conclusão procura pacote utilizável e o pacote está expirado (expiresAt < agora) THEN ele SHALL ser ignorado (fatura avulsa) — `COMP3-08`
3. WHEN o pacote não tem validade (null) THEN comportamento atual preservado — `COMP3-09`
4. WHEN o portal/staff lista pacotes THEN a validade SHALL aparecer quando existir — `COMP3-10`

## Edge Cases

- WHEN pacote expira entre a compra e a primeira sessão THEN não consome (regra é `expiresAt < now` no momento da conclusão)
- WHEN duas condições do paciente, uma com consentimento pendente THEN o gate é por paciente, não por condição

## Requirement Traceability

| Requirement ID | Story | Status |
|----------------|-------|--------|
| COMP3-01..03 | consentimento | Implemented |
| COMP3-04..06 | triagem | Implemented |
| COMP3-07..10 | validade pacote | Implemented |
