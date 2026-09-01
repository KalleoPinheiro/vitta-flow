# Runbook: configurar Google Agenda

Integração de agenda, não login (nunca toca na sessão — ver `/api/integrations/google-calendar` em [`AGENTS.md`](../../AGENTS.md)). Opcional: sem nenhuma das duas vias, a agenda funciona normal, só sem sincronização.

Duas vias, mutuamente exclusivas em efeito: se alguma conta conectar via OAuth, a service account é ignorada.

## Via A — OAuth (recomendado)

Uma conta de equipe já autenticada conecta a própria agenda em **Configurações → Google Agenda**.

1. [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials → **Create Credentials → OAuth client ID** (tipo **Web application**).
2. Authorized redirect URI: `{APP_URL}/api/integrations/google-calendar/callback`
   (ex.: `http://localhost:3000/api/integrations/google-calendar/callback` em dev).
3. APIs & Services → Library → habilita **Google Calendar API** no mesmo projeto.
4. `.env`:
   ```
   GOOGLE_CLIENT_ID=...
   GOOGLE_CLIENT_SECRET=...
   APP_URL=http://localhost:3000
   ```
5. Sobe/reinicia a app. Login → **Configurações → Google Agenda** → "Conectar Google Agenda".

O fluxo pede só o escopo `calendar.events`. Refresh token fica cifrado AES-256-GCM no banco. Eventos sincronizam no calendário `primary` da conta conectada — pra usar outro calendário, define `GOOGLE_CALENDAR_ID`.

## Via B — service account (sem OAuth)

Usada só quando nenhuma conta está conectada via OAuth.

1. Google Cloud Console → IAM & Admin → Service Accounts → cria uma.
2. Habilita **Google Calendar API** no projeto.
3. Gera chave (JSON) da service account.
4. No Google Calendar, compartilha o calendário-alvo com o e-mail da service account, permissão **"Fazer alterações em eventos"**.
5. `.env`:
   ```
   GOOGLE_SERVICE_ACCOUNT_EMAIL=...@....iam.gserviceaccount.com
   GOOGLE_PRIVATE_KEY=...
   GOOGLE_CALENDAR_ID=...   # obrigatório nesse modo — id do calendário compartilhado
   ```

## Validar

Cria/edita uma consulta na aplicação e confere se o evento aparece no calendário Google configurado. Falha de sync não bloqueia a operação na app (loga erro, agenda local segue como fonte da verdade).

## Referências

- [`../../.env.example`](../../.env.example)
- [`../setup-local.md`](../setup-local.md)
