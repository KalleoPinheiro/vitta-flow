# Spec: fechar os 4 E2E vermelhos (consentimento + locators)

**Escopo**: Medium — 3 correções independentes, 5 arquivos. Sem Design (nenhuma decisão
arquitetural nova); sem `tasks.md` (3 passos atômicos, listados no plano de execução).

## Contexto

A suíte E2E fecha em 60 verdes / 4 vermelhos. As 4 falhas são anteriores à migração para
`@still-void/ui` v2 (baseline confirmado em `d917d72`). A pergunta em aberto do handoff era
se o defeito estava no teste ou na rota. Diagnóstico executado nesta sessão:

| Teste | Falha observada | Culpado |
| --- | --- | --- |
| `triagem.spec.ts` × 2 | `POST /api/portal/patient/photos` → não-2xx no helper `uploadPatientPhoto` | **teste** |
| `portal-paciente.spec.ts` × 1 | timeout esperando o campo "Observação (opcional)…" após aceitar o termo | **aplicação** |
| `faturamento.spec.ts` × 1 | linha pendente encontrada onde se esperava zero | **teste** |

### Veredito sobre o gate de consentimento (pergunta do handoff)

A rota está **certa**. `src/app/api/portal/patient/photos/route.ts:52` exige aceite vigente do
termo antes de gravar qualquer imagem — base legal registrada para tratamento de dado de saúde
(COMP3-01, LGPD 13.709/2018). O texto do termo autoriza explicitamente "fotos enviadas por mim
pelo portal" (`src/lib/consent-text.ts`). Remover o gate para o teste passar seria gravar foto
clínica sem base legal. **O helper de teste é que ficou para trás da fase 3**: envia foto sem
nunca aceitar o termo.

### Bug real encontrado no portal

`ConsentCard` e `PatientPhotoUpload` chamavam cada um o seu próprio `useApiQuery` para
`/api/portal/patient/consent`. `useApiQuery` guarda estado por componente, sem cache
compartilhado (`src/lib/use-api-query.ts:13`) — então o `refresh()` do card após o aceite não
alcançava a cópia do upload, que continuava com `accepted: false` para sempre. O paciente
aceitava o termo e o formulário de foto seguia dizendo "Aceite o termo… acima", sem caminho de
saída a não ser recarregar a página. Reproduzível fora do teste.

### Falso positivo em faturamento

A venda do pacote emite fatura própria — `Pacote: <procedimento> (5 sessões)`
(`src/app/api/packages/route.ts:80`). O locator do teste era
`row(/{paciente}.*{procedimento}/)`, que casa **também** com essa fatura de venda. A conclusão
da consulta coberta por pacote não gerou fatura nenhuma (comportamento correto, confirmado no
snapshot da falha: só a linha `Pacote: …` existe). O teste acusava um bug que não existe — e,
pior, passaria mesmo se o bug real aparecesse, porque não distingue as duas faturas.

## Requisitos

- **R1** — O helper `uploadPatientPhoto` (`e2e/triagem.spec.ts`) aceita o termo de consentimento
  do paciente antes de enviar a foto, pela mesma API do portal (`POST /api/portal/patient/consent`).
  O gate da rota permanece intacto.
- **R2** — Depois que o paciente aceita o termo no portal, o formulário de envio de foto fica
  disponível na mesma renderização, sem recarregar a página. Uma única fonte de verdade para o
  status do consentimento na tela do paciente.
- **R3** — O teste do pacote pré-pago distingue a fatura de venda do pacote da fatura de
  consulta: afirma que a fatura de venda **está** pendente e que a fatura da consulta **não**
  existe.

## Critérios de aceite

- **AC1** (R1) — `e2e/triagem.spec.ts` passa nos 2 cenários; o helper falha ruidosamente se o
  aceite não for registrado.
- **AC2** (R1) — Nenhuma alteração em `src/app/api/portal/patient/photos/route.ts`: o gate
  continua rejeitando envio sem consentimento vigente.
- **AC3** (R2) — Com o termo pendente, `PatientPhotoUpload` mostra o aviso e não oferece
  `input[type=file]`; após o aceite, o campo de observação e o seletor de arquivo aparecem sem
  reload.
- **AC4** (R2) — Enquanto o status do consentimento ainda não chegou do servidor, a tela não
  bloqueia o envio por engano (estado indeterminado ≠ pendente).
- **AC5** (R3) — `e2e/faturamento.spec.ts` afirma `toHaveCount(0)` para a linha cuja célula de
  descrição é exatamente o nome do procedimento, e `toHaveCount(1)` para a linha da venda do
  pacote.
- **AC6** — Suíte E2E fecha 64/64; `npm test` (unitários) permanece verde.

## Fora de escopo

Lint (11 achados pré-existentes) e OOM de build — pendências 1 e 2 do handoff, sem relação com
estas 4 falhas.
