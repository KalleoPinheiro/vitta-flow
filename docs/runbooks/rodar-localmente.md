# Runbook: rodar a aplicação localmente

Do zero até login funcionando, via Docker Compose (recomendado). Detalhes de pré-requisitos, via alternativa (Node direto) e todas as variáveis: [`../setup-local.md`](../setup-local.md).

## Passo a passo

```bash
cp .env.example .env
```

Preenche no `.env`, no mínimo:

```
AUTH_SECRET=$(openssl rand -hex 32)
VITTA_BOOTSTRAP_TOKEN=$(openssl rand -hex 24)
RESEND_API_KEY=...
EMAIL_FROM="VittaFlow <nao-responda@suaclinica.com>"
```

Sem e-mail configurado ainda? Ver [`configurar-resend.md`](./configurar-resend.md) — inclusive a opção de sandbox de teste sem domínio próprio.

```bash
docker compose up -d --build
```

Sobe Postgres 16 + app. Migrações Drizzle rodam sozinhas no boot. Espera o Next aceitar conexões:

```bash
until curl -sf http://localhost:3000/api/auth/providers >/dev/null; do sleep 2; done
```

Cria o primeiro Super Admin — detalhes em [`bootstrap-primeiro-acesso.md`](./bootstrap-primeiro-acesso.md):

```bash
set -a; . ./.env; set +a
curl -sX POST http://localhost:3000/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -H "x-bootstrap-token: $VITTA_BOOTSTRAP_TOKEN" \
  -d '{"email":"voce@suaclinica.com"}'
```

O convite chega por e-mail. Se o envio falhar (ex.: chave de teste sem destinatário elegível), a resposta traz `inviteUrl` pra abrir direto e definir a senha.

## Resultado

- App: http://localhost:3000
- Postgres: `localhost:5432` (user/pass `vitta`/`vitta`, db `vitta`)

## Parar / limpar

```bash
docker compose down       # mantém dados (volume pgdata)
docker compose down -v    # apaga dados
```

## Erro comum: variável obrigatória faltando no compose

```
error while interpolating services.app.environment.EMAIL_FROM: required variable EMAIL_FROM is missing a value
```

`.env` sem `RESEND_API_KEY`/`EMAIL_FROM` (ou outra variável marcada obrigatória no `docker-compose.yml`). Preenche no `.env` antes de subir — ver [`configurar-resend.md`](./configurar-resend.md).

## Mais troubleshooting

Tabela completa de sintomas (porta ocupada, build mata processo, 503 em toda rota, etc.) em [`../setup-local.md#troubleshooting`](../setup-local.md#troubleshooting).
