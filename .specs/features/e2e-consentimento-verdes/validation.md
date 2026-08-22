# Validação — fechar os 4 E2E vermelhos

**Veredito: PASS**
**Intervalo verificado**: `577d3d5..d444360` (3 commits)
**Modo**: passe independente inline (fallback standalone de `validate.md`) — sem sub-agente,
por regra do ambiente. Autor = verificador nesta rodada; declarado explicitamente porque a
separação autor≠verificador é o padrão da skill e não foi obtida aqui.

## Gates

| Gate | Comando | Resultado |
| --- | --- | --- |
| Unitários | `npm test` | 1773 passed / 106 arquivos |
| E2E | `npx playwright test` | **64/64 passed** (era 60/64) |
| Tipos | `npx tsc --noEmit` | sem erros |
| Adoção Still Void | `npm run check:sv` | OK (7 checagens) |

`npm run lint` e `npm run build` continuam com as pendências pré-existentes 1 e 2 do handoff —
fora do escopo desta spec, sem relação com as 4 falhas.

## Cobertura por critério de aceite

| AC | Evidência (`file:line` + asserção) | Resultado esperado pela spec | Coberto |
| --- | --- | --- | --- |
| AC1 | `e2e/triagem.spec.ts:31` — `expect(response.ok()).toBe(true)`; 2 cenários verdes | envio aceito após aceite | ✅ |
| AC1 (ruidoso) | `e2e/triagem.spec.ts:23` — `expect(consent.ok(), \`aceite do termo falhou: ${consent.status()}\`).toBe(true)` | falha nomeada se o aceite não registrar | ✅ |
| AC2 | `git diff 577d3d5..d444360 -- src/app/api/portal/patient/photos/route.ts` → vazio | gate intacto | ✅ |
| AC3 | `tests/pages/portal.test.tsx:580` — `expect(document.querySelector('input[type="file"]')).not.toBeNull()` após `fireEvent.click("Li e aceito o termo")`, sem novo render | formulário disponível na mesma renderização | ✅ |
| AC3 (pendente) | `tests/pages/portal.test.tsx:570` — `expect(document.querySelector('input[type="file"]')).toBeNull()` | sem `input[type=file]` com termo pendente | ✅ |
| AC4 | `tests/pages/portal.test.tsx:607` — `expect(screen.queryByText("Aceite o termo…")).not.toBeInTheDocument()` com a resposta do consentimento nunca resolvida | indeterminado ≠ pendente | ✅ |
| AC5 | `e2e/faturamento.spec.ts:136` — `expect(packageSaleInvoice).toHaveCount(1)`; `:137` — `expect(appointmentInvoice).toHaveCount(0)` | venda pendente presente, fatura de consulta ausente | ✅ |
| AC6 | suíte E2E 64/64; `npm test` 1773 | ambas verdes | ✅ |

Sem lacunas de precisão de spec.

## Sensor de discriminação

5 mutações de comportamento injetadas em estado descartável (revertidas com `git checkout`);
**5/5 mortas**.

| # | Mutação | Teste que matou |
| --- | --- | --- |
| M1 | `consentPending={false}` fixo em `patient-view.tsx` | "aceite do termo libera o envio… sem recarregar" |
| M2 | `consentPending={!consent?.accepted}` (indeterminado vira pendente) | "status do termo ainda não carregado… não bloqueia o envio" |
| M3 | `onAccepted={() => {}}` — reproduz o bug original de estado obsoleto | "aceite do termo libera o envio… sem recarregar" |
| M4 | `if (!existingInvoice)` em `complete-appointment.ts:49` — pacote deixa de suprimir a fatura | "pacote pré-pago consome sessão sem gerar nova fatura" |
| M5 | helper de triagem volta a enviar foto sem aceitar o termo | ambos os cenários de `triagem.spec.ts` |

Árvore de trabalho confirmada limpa após cada reversão.

## Observações fora de escopo (não corrigidas)

1. **Retry de `portal-paciente.spec.ts` não é idempotente.** Na re-tentativa, `slotFromSeed`
   devolve o mesmo horário e `createAppointment` responde 409 ("intervalo mínimo de 15 minutos
   entre consultas"), então a 2ª tentativa falha por conflito de dado, não pelo defeito original.
   Não afeta o resultado (o teste passa na 1ª tentativa), mas mascara o erro real quando há retry.
2. Aviso do Turbopack sobre lockfiles múltiplos (worktree + repo principal) em toda execução E2E.
