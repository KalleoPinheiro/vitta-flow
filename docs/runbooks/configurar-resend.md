# Runbook: configurar Resend (e-mail transacional)

Convite de primeiro acesso e reset de senha dependem de e-mail (ADR-004 — cada conta autentica com e-mail + senha própria, sem allowlist nem senha mestre). Implementação: [`src/infrastructure/email/resend-email-gateway.ts`](../../src/infrastructure/email/resend-email-gateway.ts).

Sem `RESEND_API_KEY`/`EMAIL_FROM`:
- **Produção** (`NODE_ENV=production`): inicialização falha explicitamente — não sobe sem e-mail configurado (fail-closed, ninguém conseguiria o primeiro acesso).
- **Fora de produção**: gateway cai em dry-run (`NullEmailGateway`) — o link de convite/reset sai no log do servidor em vez de ser enviado. Suficiente pra dev sem tocar em Resend.

Duas vias pra configurar de verdade: domínio verificado (produção/teste real) ou sandbox (`onboarding@resend.com`, teste rápido).

## Via A — domínio verificado (produção ou teste com múltiplos destinatários)

1. Cria conta em [resend.com](https://resend.com).
2. Dashboard → **API Keys** → Create API Key → copia (`re_...`); só é exibida uma vez.
3. Dashboard → **Domains** → Add Domain → digita teu domínio (ex.: `suaclinica.com`).
4. Resend gera registros DNS (SPF, DKIM, opcionalmente DMARC) → adiciona no provedor DNS do domínio.
5. Aguarda propagação — status muda pra "Verified" (minutos a horas, depende do TTL).
6. `.env`:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   EMAIL_FROM=VittaFlow <nao-responda@suaclinica.com>
   ```
   Formato aceito: `"Nome <endereco@dominio-verificado>"` ou só o endereço puro.

## Via B — sandbox `onboarding@resend.com` (teste rápido, sem domínio)

Remetente de teste pronto do Resend. Limitação: só entrega pro e-mail cadastrado na própria conta Resend (o login usado pra criar a conta) — não serve pra testar com destinatários variados.

1. Conta Resend → **API Keys** → Create API Key → copia `re_...`.
2. `.env`:
   ```
   RESEND_API_KEY=re_xxxxxxxxxxxx
   EMAIL_FROM=onboarding@resend.com
   ```
3. Nos testes (bootstrap, convite, reset), usa como destinatário **o mesmo e-mail da conta Resend** — só esse recebe.

## Validar

```bash
docker compose up -d --build
```

Dispara um convite ou reset de senha pela aplicação, depois:
- Resend dashboard → **Logs** → confere status (`delivered`/`bounced`/`failed`).
- Erro 401 na chamada: API key errada.
- Erro relacionado a "from": domínio ainda não verificado (via A) ou remetente fora do formato aceito.

## Referências

- [`../../.env.example`](../../.env.example) — comentários inline de todas as variáveis
- [`../setup-local.md`](../setup-local.md) — troubleshooting geral, inclusive "convite/reset não chega"
- ADR-004 (autenticação): [`../adr/`](../adr/)
