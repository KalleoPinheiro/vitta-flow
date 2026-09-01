# Rodar localmente — do zero ao primeiro login

Guia único: da máquina limpa até você logado como Super Admin. Referência completa (todas as variáveis, arquitetura, troubleshooting geral) fica em [`../setup-local.md`](../setup-local.md); este arquivo é só o "faz assim".

Pré-requisito: Docker + Docker Compose instalados. Nada mais.

## 1. Configurar variáveis

```bash
cp .env.example .env
```

Abra o `.env` e preencha estas quatro (as únicas obrigatórias pra subir):

```bash
AUTH_SECRET=$(openssl rand -hex 32)
VITTA_BOOTSTRAP_TOKEN=$(openssl rand -hex 24)
RESEND_API_KEY=...
EMAIL_FROM="VittaFlow <nao-responda@suaclinica.com>"
```

Sem conta no Resend ainda? Sem problema — sem essas duas o app roda em **dry-run de e-mail** (o link de convite sai no log em vez de ser enviado). Configurar de vez: [`configurar-resend.md`](./configurar-resend.md).

## 2. Subir a stack

```bash
docker compose up -d --build
```

Sobe Postgres 16 + app. As migrações do Drizzle rodam sozinhas no boot — nada a fazer manualmente.

Espere o Next aceitar conexões antes do próximo passo:

```bash
until curl -sf http://localhost:3000/api/auth/providers >/dev/null; do sleep 2; done
```

## 3. Criar o primeiro acesso (Super Admin)

Instalação vazia não tem senha mestre nem allowlist (ADR-004) — o único caminho é este endpoint, e ele se fecha sozinho depois da primeira conta:

```bash
set -a; . ./.env; set +a
curl -sX POST http://localhost:3000/api/auth/bootstrap \
  -H "Content-Type: application/json" \
  -H "x-bootstrap-token: $VITTA_BOOTSTRAP_TOKEN" \
  -d '{"email":"voce@suaclinica.com"}'
```

A conta nasce **sem senha**. Duas formas de recebê-la:

- **E-mail configurado**: o convite chega na caixa de entrada — abra o link e defina a senha.
- **Dry-run** (sem Resend): a resposta do curl traz `inviteUrl` — abra direto no navegador.

## 4. Login

Abra http://localhost:3000, entre com o e-mail do passo 3 e a senha que você acabou de definir. Pronto — app rodando, primeira conta criada.

- Postgres, se precisar inspecionar: `localhost:5432` (user/pass `vitta`/`vitta`, db `vitta`)

## Parar / limpar

```bash
docker compose down       # mantém dados (volume pgdata)
docker compose down -v    # apaga tudo
```

## Erros comuns

| Sintoma | Causa | Ação |
|---|---|---|
| `required variable EMAIL_FROM is missing a value` (no `up`) | `.env` sem `RESEND_API_KEY`/`EMAIL_FROM` | Preenche no `.env` antes de subir — ver [`configurar-resend.md`](./configurar-resend.md) |
| Bootstrap responde `403` | Token errado/ausente, **ou** já existe conta na instalação (a rota não distingue os dois casos, de propósito) | Se já tem conta, use "esqueci minha senha" em vez de bootstrap |
| Bootstrap responde `429` | Rate limit: 5 tentativas/min por IP | Espera um minuto |
| Porta 5432/3000 ocupada | Outro serviço na porta | `POSTGRES_PORT=5477 APP_PORT=3001 docker compose up -d --build` |
| Convite não chega | E-mail em dry-run | Usa o `inviteUrl` da resposta do bootstrap, ou configura o Resend |

Mais troubleshooting (build, 503 geral, E2E): [`../setup-local.md#troubleshooting`](../setup-local.md#troubleshooting).

## Alternativa: Node local + Postgres do compose

Só quando você precisa de hot reload (`next dev`). Detalhes: [`../setup-local.md`](../setup-local.md#via-b--node-local--postgres-do-compose).

## Depois de logado

- Configurar e-mail de verdade: [`configurar-resend.md`](./configurar-resend.md)
- Sincronizar Google Agenda: [`configurar-google-agenda.md`](./configurar-google-agenda.md)
- Lembretes por WhatsApp: [`configurar-whatsapp-lembretes.md`](./configurar-whatsapp-lembretes.md)
