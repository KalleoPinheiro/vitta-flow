# Fase 2 — Consistência Transacional e Performance — Specification

## Problem Statement

A conclusão de consulta encadeia consulta→fatura→consumo de pacote sem transação (P1 documentado
no projeto, compensado pelo padrão idempotente-reparador); a baixa de kit tem corrida entre a
checagem de estoque e a gravação; a fila de triagem faz uma query por condição (N+1); e o
relatório mensal recalcula meses encerrados — que são imutáveis — a cada acesso.

## Goals

- [ ] Conclusão de consulta atômica (consulta, fatura e consumo de pacote na mesma transação).
- [ ] Decremento de estoque condicional no banco — sem corrida entre checagem e baixa.
- [ ] Fila de triagem com número constante de queries.
- [ ] Relatório de mês encerrado servido de cache (recalculado no máximo uma vez por boot).

## Out of Scope

| Feature | Reason |
|---------|--------|
| Transação no kit do procedimento | Semântica atual é best-effort por item e "nunca bloqueia a conclusão" (PRD O2.4) — preservada |
| Cache distribuído (Redis) | Single-tenant, 1 instância; anotado para a era SaaS (Fase 6) |
| Paginação cursor | Fase 6 (escala de plataforma) |
| Remover o padrão idempotente-reparador | Contrato externo mantido; a transação elimina janelas de falha parcial novas, o reparo continua cobrindo histórico |

## Assumptions & Open Questions

| Assumption / decision | Chosen default | Rationale | Confirmed? |
|-----------------------|----------------|-----------|------------|
| Escopo da transação da conclusão | CompleteAppointment inteiro (consulta+fatura+pacote); kit fora | Kit é best-effort por contrato; conclusão é o invariante de billing | y |
| Porta de transação | `TransactionManager.run(fn)` recebendo repositórios transacionais | mesmo padrão de ports do projeto (DIP); in-memory = no-op | y |
| Cache do relatório | Map em memória por `YYYY-MM`, só meses 100% no passado | mês corrente muda; mês fechado é imutável | y |
| Estoque atômico | `adjustStock(id, delta)` condicional (`stock_qty + delta >= 0`) no repo | invariante "nunca negativo" garantido no banco; domínio segue validando | y |

**Open questions:** none — all resolved or logged above.

## User Stories

### P1: Conclusão de consulta atômica ⭐ MVP

**User Story**: Como clínica, quero que concluir uma consulta grave consulta, fatura e consumo de
pacote como unidade, para que falha parcial não deixe billing inconsistente.

**Acceptance Criteria**:

1. WHEN a conclusão executa dentro da transação e a gravação da fatura falha THEN nenhuma mudança SHALL persistir (consulta volta a scheduled/confirmed) — `CONS2-01`
2. WHEN a conclusão executa com sucesso THEN o comportamento externo SHALL ser idêntico ao atual (fatura pendente criada, pacote consumido quando aplicável, retorno criado, contrato HTTP igual) — `CONS2-02`
3. WHEN o driver é in-memory (testes) THEN `TransactionManager.run` SHALL executar a função diretamente (no-op) preservando todos os testes atuais — `CONS2-03`
4. WHEN a conclusão é reexecutada sobre consulta concluída THEN o reparo idempotente SHALL continuar funcionando como hoje — `CONS2-04`

**Independent Test**: com repositório de faturas que falha no save, PATCH complete → erro e consulta não persiste como completed (Drizzle/PGlite).

### P1: Decremento de estoque sem corrida ⭐ MVP

**Acceptance Criteria**:

1. WHEN uma saída de N unidades é registrada com estoque ≥ N THEN o repo SHALL decrementar condicionalmente (`stock_qty + delta >= 0`) e retornar o insumo atualizado — `CONS2-05`
2. WHEN a saída deixaria o estoque negativo THEN o repo SHALL retornar null e o use case SHALL lançar `InsufficientStockError` com a mensagem atual do domínio — `CONS2-06`
3. WHEN é uma entrada THEN o incremento SHALL usar o mesmo caminho atômico — `CONS2-07`
4. WHEN duas saídas concorrentes disputam o mesmo estoque THEN no máximo uma SHALL exceder o saldo (garantido pela condição no UPDATE; testado via semântica do repo) — `CONS2-08`

### P2: Fila de triagem sem N+1

**Acceptance Criteria**:

1. WHEN a fila de triagem é montada com K condições distintas THEN as condições SHALL ser buscadas em UMA chamada (`findByIds`) — `CONS2-09`
2. WHEN a fila é servida THEN o payload SHALL permanecer idêntico ao atual — `CONS2-10`

### P2: Cache de relatório de mês encerrado

**Acceptance Criteria**:

1. WHEN o relatório de um mês 100% no passado é requisitado duas vezes THEN a segunda resposta SHALL vir do cache (use case executado uma vez) — `CONS2-11`
2. WHEN o mês requisitado é o corrente (ou futuro) THEN o relatório SHALL ser recalculado a cada acesso — `CONS2-12`
3. WHEN o cache responde THEN o payload SHALL ser idêntico ao cálculo direto — `CONS2-13`

## Edge Cases

- WHEN a transação falha após o consumo do pacote THEN o consumo também é revertido (mesma transação)
- WHEN `adjustStock` é chamado para insumo inexistente THEN NotFoundError atual preservado
- WHEN o mês requisitado termina exatamente hoje (mês corrente) THEN não cacheia

## Requirement Traceability

| Requirement ID | Story | Phase | Status |
|----------------|-------|-------|--------|
| CONS2-01..04 | P1 transação | Execute | Implemented |
| CONS2-05..08 | P1 estoque | Execute | Implemented |
| CONS2-09..10 | P2 triagem | Execute | Implemented |
| CONS2-11..13 | P2 cache | Execute | Implemented |

## Success Criteria

- [ ] `npm test`, `npm run lint`, `npm run build` verdes
- [ ] Teste de rollback real em PGlite (falha de fatura → consulta não concluída)
