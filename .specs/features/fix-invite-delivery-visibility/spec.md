# fix(auth): falha de entrega de e-mail engolida silenciosamente (issue #52)

Escopo: Medium. Reusa o padrão já existente `IssueAuthToken.issueAndTryDeliver`
(criado pelo bootstrap) nos outros dois pontos que ainda engolem a falha.

## Requisitos

- **R1** `sendInvite` (`src/application/auth/send-invite.ts`) para de engolir
  totalmente: usa `issueAndTryDeliver` e devolve `{ delivered: boolean }` pro
  chamador, em vez de `void` com só um `console.error`.
- **R2** `POST /api/accounts` propaga `delivered` na resposta (campo adicional
  ao lado do DTO da conta).
- **R3** `GET /api/accounts` (list) ganha `passwordSet: boolean` no
  `UserAccountDto`, derivado de `passwordHash !== UNSET_PASSWORD_HASH` — sinal
  de que a conta nunca chegou a logar (convite pendente).
- **R4** Nova rota `POST /api/accounts/[id]/resend-invite`: sessão staff
  obrigatória, conta precisa existir e estar ativa; reemite o link — propósito
  `invite` se `passwordSet === false`, senão `reset` (reaproveita
  `IssueAuthToken` como o issue sugere) — e devolve `{ delivered }`.
- **R5** UI (`configuracoes/page.tsx`): ao criar conta com `delivered: false`,
  mostra aviso "conta criada, mas o convite não foi enviado" com ação
  "Reenviar". Cada linha da tabela com `passwordSet === false` e conta ativa
  ganha ação "Reenviar convite" chamando R4.
- **R6** `forgot-password` — NÃO MEXE (swallow é decisão de segurança
  deliberada contra CWE-204, já documentada no código).
- **R7** `docs/setup-local.md` — nota no troubleshooting do bootstrap sobre
  checar `delivered`/`inviteUrl` na resposta antes de assumir que o convite
  chegou.

## Fora de escopo

- Reverter/desfazer criação de conta em falha de envio (bootstrap already
  fail-soft por design, ver issue).
- Persistir histórico de tentativas de entrega.
