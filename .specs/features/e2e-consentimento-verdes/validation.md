# Validação — fechar os 4 E2E vermelhos

**Veredito: PASS ✅**

**Data**: 2026-08-22
**Spec**: `.specs/features/e2e-consentimento-verdes/spec.md`
**Intervalo verificado**: `577d3d5..98b102b` (4 commits)
**Verificador**: **sub-agente independente (autor ≠ verificador).** Este relatório **sobrescreve**
a versão anterior, que era um auto-check do próprio implementador. Cobertura re-derivada do zero
sob a regra **evidência-ou-zero**; o relatório do autor foi auditado, não herdado.

> **Nota de linha**: as citações `file:line` abaixo são do **estado atual da árvore** (HEAD
> `76ed3d8`). O commit de lint `76ed3d8` (posterior e fora desta feature) removeu 1 import de
> `e2e/faturamento.spec.ts`, então as linhas desse arquivo estão 1 acima das do commit `98b102b`.

---

## Gates executados por mim

| Gate | Comando | Resultado |
| --- | --- | --- |
| Unitários | `npm test` | **1773 passed / 1773** · 106 arquivos · exit 0 |
| E2E | `npx playwright test` | exit 0 · 0 falhas |
| E2E (stats JSON) | `npx playwright test --reporter=json` | `expected: 62, skipped: 0, unexpected: 0, flaky: 2` → **64 testes, 0 vermelhos** |
| Tipos | `npx tsc --noEmit` | No errors found |
| Lint | `npm run lint` | No issues found |
| Adoção Still Void | `npm run check:sv` | OK (7 checagens) |

**Integridade da suíte** — nenhum teste foi apagado nem enfraquecido:
`git show 577d3d5:tests/pages/portal.test.tsx` tem **38** blocos `it(`; a árvore atual tem **40**
(+2, exatamente os cenários de AC3 e AC4). E2E: 64 declarações `test(` em `e2e/*.spec.ts`,
0 `test.skip` / `test.fixme` / `test.fail` no diretório.

---

## Critérios de aceite — evidência ancorada na spec

| AC | Desfecho definido pela spec | Evidência (`file:line` + expressão da asserção) | Resultado |
| --- | --- | --- | --- |
| **AC1** | `triagem.spec.ts` verde nos 2 cenários; helper falha ruidosamente sem aceite | `e2e/triagem.spec.ts:31` — `expect(response.ok()).toBe(true)` (após o aceite em `:22`, `page.request.post("/api/portal/patient/consent")`) · ruído: `e2e/triagem.spec.ts:23` — ``expect(consent.ok(), `aceite do termo falhou: ${consent.status()}`).toBe(true)`` · ambos os testes verdes no run completo | ✅ PASS |
| **AC2** | Zero alteração em `photos/route.ts`; gate segue rejeitando sem consentimento | Estrutural: `git diff 577d3d5..98b102b -- src/app/api/portal/patient/photos/route.ts` → **vazio** (`--stat` vazio) · **Comportamental** (evidência que o relatório do autor não citava): `tests/api/auth-portal-gaps.test.ts:378` — `expect(response.status).toBe(403)` e `:379` — `expect(body.error).toContain("Consentimento pendente")`; idem `:434`/`:435` para o caso de texto defasado | ✅ PASS |
| **AC3a** | Termo pendente → aviso visível, **sem** `input[type=file]` | `tests/pages/portal.test.tsx:568` — `screen.getByText("Aceite o termo de consentimento acima para enviar fotos à equipe.")` · `:570` — `expect(document.querySelector('input[type="file"]')).toBeNull()` · unitário isolado: `tests/pages/portal.test.tsx:895`/`:897` (mesmas asserções com `consentPending` = true) | ✅ PASS |
| **AC3b** | Após o aceite, observação + seletor de arquivo aparecem **sem reload** | `tests/pages/portal.test.tsx:578` — `screen.getByPlaceholderText("Observação (opcional): dor, vazamento, vermelhidão…")` · `:580` — `expect(document.querySelector('input[type="file"]')).not.toBeNull()` · `:582` — aviso some (`queryByText(...).not.toBeInTheDocument()`) · `:575` — `findByText("✓ Termo de consentimento aceito em …")`. Tudo depois de um único `fireEvent.click` em `:572`, sem segundo `render()` — ou seja, mesma renderização | ✅ PASS |
| **AC4** | Estado indeterminado ≠ pendente: a tela não bloqueia o envio | `tests/pages/portal.test.tsx:606-608` — `expect(screen.queryByText("Aceite o termo de consentimento acima para enviar fotos à equipe.")).not.toBeInTheDocument()` · `:609` — `expect(screen.getByText("Enviar foto")).toBeInTheDocument()`, com o GET do consentimento **nunca resolvido** (`:595`, promessa pendente). "Enviar foto" só existe no ramo liberado (`src/app/portal/consent-card.tsx:140`), então a asserção discrimina de verdade | ✅ PASS |
| **AC5** | `toHaveCount(0)` para célula = nome puro do procedimento; `toHaveCount(1)` para a venda do pacote | `e2e/faturamento.spec.ts:135` — `await expect(packageSaleInvoice).toHaveCount(1)` · `:136` — `await expect(appointmentInvoice).toHaveCount(0)`, com os locators em `:124-132` usando `getByRole("cell", { name: …, exact: true })` (`Pacote: <proc> (5 sessões)` vs `<proc>` puro) | ✅ PASS |
| **AC6** | E2E 64/64; `npm test` verde | E2E: `expected 62 + flaky 2 = 64`, `unexpected: 0`, `skipped: 0` · `npm test`: 1773/1773 | ✅ PASS |

**Status**: ✅ 7/7 critérios com evidência `file:line`. **Nenhuma lacuna de precisão de spec**
(todo AC define desfecho preciso e a asserção mira exatamente esse desfecho).

### Litmus de não-superficialidade

- Nenhum AC é coberto só por "não lançou erro".
- Nenhum AC que exige estado/saída é coberto só por contagem de mock. A única asserção de
  contagem de mock no diff (`tests/pages/portal.test.tsx:826` — `expect(onAccepted).toHaveBeenCalledTimes(1)`)
  é contrato de unidade do `ConsentCard`; o **estado** correspondente (AC3) é afirmado no teste
  de integração em `:568-583`. Aceitável.
- `exact: true` nos locators de AC5 é carga útil real — a mutação MV4 provou (abaixo).

### Mapeamento reverso (scope creep)

Todo teste adicionado/alterado no diff mapeia para um AC:

| Teste no diff | AC |
| --- | --- |
| `portal.test.tsx:537-584` "aceite libera o envio na mesma tela" | AC3 (R2) |
| `portal.test.tsx:586-610` "status ainda não carregado" | AC4 (R2) |
| `portal.test.tsx:780/788/803/830` `ConsentCard` — reescritos para receber `status`/`onAccepted` por prop | adaptação obrigatória à mudança de assinatura de R2 (comportamento preservado) |
| `portal.test.tsx:872/892/907` `PatientPhotoUpload` — prop `consentPending` | idem (AC3) |
| `e2e/triagem.spec.ts:19-23` | AC1 |
| `e2e/faturamento.spec.ts:115-136` | AC5 |

**Zero testes não reivindicados.** Alterações em `docs/BACKLOG-DESIGN-SYSTEM.md`, `.specs/STATE.md`,
`.specs/LESSONS.md` e `.specs/lessons.json` são bookkeeping do próprio fluxo — não são scope creep.

---

## Sensor de discriminação — **mutações próprias do verificador**

Sete mutações de comportamento injetadas por mim, **independentes das 5 do relatório do autor**
(escolhidas para cobrir pontos que ele podia ter deixado descobertos: plumbing do callback,
âncora de presença do AC5, e a proteção comportamental do AC2). Cada uma revertida com
`git checkout <arquivo>` logo após a corrida.

| # | Arquivo:linha | Mutação | Teste que matou | Resultado |
| --- | --- | --- | --- | --- |
| MV1 | `src/app/portal/patient-view.tsx:78` | `onAccepted={refreshConsent}` → `onAccepted={refresh}` (atualiza o bundle do paciente, não o consentimento — o bug original noutra forma) | `portal.test.tsx` — 1 failed / 39 passed | ✅ Morta |
| MV2 | `src/app/portal/consent-card.tsx:116-122` | guarda `if (consentPending) { … }` **removida** (formulário aparece mesmo com termo pendente) | `portal.test.tsx` — 2 failed / 38 passed | ✅ Morta |
| MV3 | `src/app/portal/patient-view.tsx:116` | `consentPending={consent !== null && !consent.accepted}` → `consentPending={!consent?.accepted}` (indeterminado vira pendente) | `portal.test.tsx:608` — asserção de AC4 | ✅ Morta |
| MV4 | `src/app/api/packages/route.ts:80` | descrição da fatura de venda `Pacote: X (5 sessões)` → `Pacote de X` (quebra a âncora de presença) | `e2e/faturamento.spec.ts:135` — `toHaveCount(1)` | ✅ Morta |
| MV5 | `src/application/appointments/complete-appointment.ts:49` | `if (!existingInvoice && !coveredByPackage)` → `if (!existingInvoice)` (pacote deixa de suprimir a fatura da consulta) | `e2e/faturamento.spec.ts:136` — `toHaveCount(0)` | ✅ Morta |
| MV6 | `src/app/api/portal/patient/photos/route.ts:53` | gate COMP3-01 desligado (`if (false && !consents.some(…))`) | `tests/api/auth-portal-gaps.test.ts:378` e `:434` — `expected 200 to be 403` | ✅ Morta |
| MV7 | `src/app/api/portal/patient/consent/route.ts:52` | POST grava aceite de **texto defasado** (não cobre `CONSENT_TEXT`) | `e2e/triagem.spec.ts:31` — `expect(response.ok()).toBe(true)` recebeu `false` | ✅ Morta |

**Profundidade**: expandida (7 mutações — a feature toca base legal LGPD/COMP3-01).
**Resultado**: **7/7 mortas, 0 sobreviventes** ✅

MV6 e MV7 fecham o buraco de evidência do AC2: o relatório do autor sustentava o AC2 só por
*diff vazio* (estrutural). MV6 prova que o gate tem rede comportamental própria; MV7 prova que o
E2E de triagem exercita o gate de verdade — o `POST /consent` do helper não é decorativo.

**Estado da árvore após o sensor**: `git diff --stat -- src tests` **vazio** — todas as 7
mutações revertidas. (Ver ressalva sobre `e2e/*` na seção de observações.)

---

## Qualidade de código

| Princípio | Status |
| --- | --- |
| Código mínimo (nenhuma feature além do pedido) | ✅ |
| Mudança cirúrgica (5 arquivos, exatamente os do escopo) | ✅ |
| Sem abstração para uso único / sem "flexibilidade" especulativa | ✅ — `ConsentStatusDto` só foi exportado porque o pai passou a tipar a prop |
| Sem "melhorar" código não relacionado | ✅ |
| Segue os padrões existentes | ✅ — `useApiQuery` no container + props para baixo é o padrão de `patient-view.tsx` |
| Check de desfecho ancorado na spec | ✅ 7/7 |
| Cobertura por camada (unidade + integração + E2E) | ✅ |
| Todo teste mapeia para um requisito da spec | ✅ |
| Diretrizes documentadas seguidas | ✅ `AGENTS.md`; gate `scripts/check-sv-adoption.sh` OK |

---

## Auditoria do relatório anterior (autor)

| Alegação do autor | Verificação | |
| --- | --- | --- |
| Gates verdes (1773 unitários, tsc, check:sv) | Reproduzido, número por número | ✅ confere |
| E2E "64/64 passed" | Confere quanto a **0 vermelhos**, mas o run com reporter JSON mostra **2 flaky** (passam só na 2ª tentativa) — omitido no relatório | ⚠️ incompleto |
| AC2 coberto | Evidência era **só estrutural** (diff vazio). Faltava citar a rede comportamental (`auth-portal-gaps.test.ts:378/:434`) | ⚠️ evidência ampliada por mim |
| "Autor = verificador nesta rodada" | Verdadeiro — declarado com honestidade; corrigido por esta rodada independente | ✅ agora sanado |
| AC5 em `faturamento.spec.ts:136/:137` | Correto para `98b102b`; hoje é `:135/:136` por causa do commit de lint posterior | ℹ️ deriva cosmética |
| "5/5 mutações mortas" | Não repeti as dele; as minhas 7, escolhidas em pontos diferentes, também morreram | ✅ corroborado por caminho independente |

Nenhuma alegação do relatório anterior se mostrou **falsa**. Duas se mostraram **incompletas**.

---

## Observações (não bloqueantes — nenhuma vira defeito da feature)

1. **[MÉDIA — higiene de ambiente] A árvore de trabalho ficou suja por uma sessão concorrente,
   não por mim.** Durante a minha primeira corrida E2E (mtimes `21:36:41`–`21:37:34` locais)
   apareceram 7 arquivos modificados — `e2e/support/dates.ts` (nova `SlotOptions` com `attempt`
   e `ATTEMPT_DAY_STRIDE = 70`), `e2e/agenda.spec.ts`, `e2e/documentos.spec.ts`,
   `e2e/export-lgpd.spec.ts`, `e2e/inventario.spec.ts`, `e2e/portal-parceiro.spec.ts`,
   `e2e/relatorios.spec.ts`. É outro agente atacando o item 1 das "observações fora de escopo"
   do relatório anterior (retry não idempotente). **Não revertidos de propósito** — reverter
   destruiria trabalho alheio. `git status --porcelain` termina com esses 7 arquivos e **zero**
   resíduo meu (`git diff --stat -- src tests` vazio).
2. **[BAIXA] 2 testes flaky, fora do escopo desta feature**: `e2e/relatorios.spec.ts:59`
   ("produção por profissional…") e `:86` ("mês sem consultas concluídas…") falharam na 1ª
   tentativa e passaram no retry. Ambos estavam sendo **editados pela sessão concorrente** no
   momento do run, então o mais provável é artefato dessa edição, não fragilidade de baseline.
   Não pertencem ao diff `577d3d5..98b102b`.
3. **[BAIXA] R2 verificado por comportamento, não por estrutura.** Nenhuma asserção conta as
   requisições a `GET /api/portal/patient/consent`. Uma implementação com duas cópias que se
   mantivessem sincronizadas passaria — mas é justamente a que `useApiQuery` não permite, e MV1
   fecha o caminho realista de regressão. Não é lacuna de AC.
4. **[INFO] `npm run build` não foi executado** (estoura o heap por limitação conhecida do
   ambiente, conforme instrução). `npm run lint` hoje está limpo por causa de `76ed3d8`, que é
   posterior e fora deste intervalo.

---

## Rastreabilidade

| Requisito | Status |
| --- | --- |
| R1 (helper aceita o termo; gate intacto) | ✅ Verificado — AC1, AC2 |
| R2 (fonte única do consentimento; libera sem reload) | ✅ Verificado — AC3, AC4 |
| R3 (teste distingue fatura de venda × de consulta) | ✅ Verificado — AC5 |

---

## Resumo

**Geral**: ✅ Pronto

**Check ancorado na spec**: 7/7 ACs com evidência `file:line`; 0 lacunas de precisão
**Sensor**: 7/7 mutações próprias mortas, 0 sobreviventes
**Gates**: 1773 unitários · 64 E2E (0 unexpected, 0 skipped) · tsc · lint · check:sv

**O que funciona**: o gate LGPD de foto clínica permanece intacto e comprovadamente ativo; o
aceite do termo libera o envio na mesma renderização; o teste de pacote pré-pago passou a
distinguir as duas faturas e agora falha quando o bug de verdade aparece (provado por MV5).

**Defeitos da feature encontrados**: nenhum.

**Próximos passos**: nenhum bloqueio. Fora do escopo: coordenar com a sessão concorrente que
tem 7 arquivos `e2e/*` não commitados na árvore.
