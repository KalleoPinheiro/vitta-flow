# Spec: builders/factories de domínio compartilhados (issue #114)

## Levantamento (feito antes do design)

Grep de `<Entity>.create(` em `tests/`, contando arquivos distintos e total de chamadas:

| Entidade | Arquivos | Chamadas |
|---|---|---|
| Professional | 9 | 39 |
| Appointment | 6 | 39 |
| Procedure | 8 | 39 |
| UserAccount | 10 | 28 |
| ConditionAssessment | 5 | 25 |
| Patient | 9 | 24 |
| ConsentRecord | 6 | 24 |

Top-5 por combinação arquivos×chamadas escolhido pro escopo desta issue: **Patient, Professional, Appointment, Procedure, UserAccount** — as 5 entidades mais transversais (aparecem em domain/application/infrastructure/api), cobrindo o setup mais repetido. `ConditionAssessment`/`ConsentRecord` ficam fora (concentradas em menos suítes, menor alavancagem) — candidato de continuação se o padrão se provar útil.

Confirmado em `tests/infrastructure/in-memory-repositories.test.ts`: helpers locais redefinidos por bloco (`makeProcedure`, `makePatient`) e 4 chamadas de `Appointment.create` quase idênticas (mesmo `slot`/`procedure`/`price`/`professionalId`) — exatamente a duplicação que a issue descreve.

## Requisitos (AC)

- R1: `tests/support/builders.ts` com uma função `build<Entity>(overrides?)` para cada uma das 5 entidades, retornando a entidade já `.create()`ada com defaults sensatos e válidos (aceitos por `static validate`), permitindo override parcial via `Partial<Props>`.
- R2: valores default não colidem em campos únicos entre chamadas na mesma suíte quando isso importa (ex.: email de `Patient`/`UserAccount`) — usar sufixo derivado de contador monotônico do módulo.
- R3: migrar **apenas** os testes de `tests/application/**`, `tests/infrastructure/**` e `tests/api/**` que usam essas 5 entidades só como fixture de setup (não como sujeito da asserção de validação). `tests/domain/{patient,professional,appointment,catalog,user-account}.test.ts` ficam de fora — são testes da própria validação/regra da entidade, builder esconderia a intenção do teste.
- R4: coverage global mantém piso 90% (`npm run test:coverage --no-file-parallelism`).
- R5: nenhum teste comportamental muda de expectativa — só o setup é trocado.

## Fora de escopo

- Builders para `ConditionAssessment`/`ConsentRecord`/`Invoice`/`Supply`/etc — não migrados nesta issue.
- Builder para `TimeSlot`/`Money` isolados — ficam como helpers internos do builder de `Appointment`, sem exportar API própria (YAGNI, nada mais consome).
