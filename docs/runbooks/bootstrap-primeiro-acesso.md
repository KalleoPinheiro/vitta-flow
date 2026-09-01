# Runbook: bootstrap do primeiro Super Admin

Instalação nova (zero contas) não tem allowlist nem senha mestre (ADR-004) — o único caminho de primeiro acesso é `POST /api/auth/bootstrap`. Implementação: [`src/app/api/auth/bootstrap/route.ts`](../../src/app/api/auth/bootstrap/route.ts).

## Guardas (as duas precisam passar)

1. Header `x-bootstrap-token` bate com `VITTA_BOOTSTRAP_TOKEN` do `.env` — comparação em tempo constante, fail-closed se ausente/incorreto.
2. **Zero contas** na instalação — depois da primeira conta criada, a rota responde 403 **para sempre**, mesmo com o token correto. Se a instalação já tem contas, o caminho é "esqueci minha senha", não bootstrap.

## Passo a passo

1. `.env`:
   ```
   VITTA_BOOTSTRAP_TOKEN=$(openssl rand -hex 24)
   ```
2. Sobe a app (ver [`rodar-localmente.md`](./rodar-localmente.md)).
3. Dispara o bootstrap:
   ```bash
   set -a; . ./.env; set +a
   curl -sX POST http://localhost:3000/api/auth/bootstrap \
     -H "Content-Type: application/json" \
     -H "x-bootstrap-token: $VITTA_BOOTSTRAP_TOKEN" \
     -d '{"email":"voce@suaclinica.com"}'
   ```
4. A conta nasce **sem senha usável**. Quem define a senha é a própria pessoa, pelo convite enviado por e-mail (ver [`configurar-resend.md`](./configurar-resend.md)) — mesmo fluxo de qualquer outra conta.
5. Se o e-mail não estiver configurado (dry-run fora de produção), a resposta do curl traz `inviteUrl` — abre direto no navegador e define a senha.

## Erros comuns

| Resposta | Causa |
|---|---|
| `403 Bootstrap indisponível` | Token errado/ausente **ou** já existe alguma conta na instalação — a rota não distingue os dois casos de propósito |
| `429 Muitas tentativas` | Rate limit (5 tentativas/min por IP) |

## Referências

- [`../../.env.example`](../../.env.example)
- [`../setup-local.md`](../setup-local.md)
- ADR-004 (autenticação): [`../adr/`](../adr/)
