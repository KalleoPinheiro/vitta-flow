# Runbook: configurar lembretes de consulta via WhatsApp

Opcional. Sem credenciais, o job de lembretes roda em **dry-run** (loga o que enviaria, não envia). Implementação: [`src/infrastructure/messaging/meta-whatsapp-gateway.ts`](../../src/infrastructure/messaging/meta-whatsapp-gateway.ts).

## Passo a passo

1. [Meta Business Manager](https://business.facebook.com) → WhatsApp → **API Setup**.
2. Cria/usa um app com produto WhatsApp habilitado.
3. Copia **Phone Number ID** (não é o número de telefone em si).
4. Gera um token de acesso — token temporário (24h, só pra teste) ou token permanente de system user (produção).
5. `.env`:
   ```
   WHATSAPP_TOKEN=...
   WHATSAPP_PHONE_NUMBER_ID=...
   CRON_SECRET=$(openssl rand -hex 24)
   ```

## Atenção: janela de 24h

Meta exige **template aprovado** pra mensagens fora da janela de 24h de atendimento (sem conversa aberta com o paciente). Fora dessa janela, mensagem de texto livre falha. Configura os templates necessários no Business Manager e ajusta o gateway (`meta-whatsapp-gateway.ts`) se a clínica não mantiver conversa aberta com o paciente antes do lembrete.

## Disparar

O job roda via disparo externo (cron), não automaticamente:

```bash
curl -sX POST http://localhost:3000/api/reminders/run \
  -H "x-cron-secret: $CRON_SECRET"
```

Sem `CRON_SECRET` configurado, a rota responde 503.

## Validar

- Sem `WHATSAPP_TOKEN`/`WHATSAPP_PHONE_NUMBER_ID`: log mostra o que seria enviado (dry-run) — confirma que o job identifica os lembretes certos antes de configurar credenciais reais.
- Com credenciais: confere entrega no WhatsApp do número de teste e no Business Manager → Analytics.
- Erro comum: número de telefone do paciente fora do formato esperado — `normalizeBrazilianPhone` assume número brasileiro.

## Referências

- [`../../.env.example`](../../.env.example)
- [`../setup-local.md`](../setup-local.md)
