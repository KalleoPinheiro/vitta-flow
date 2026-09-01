# Runbooks

Guias operacionais de tarefa única: "quero fazer X agora". Rodar a aplicação do zero até o primeiro login está em [`../setup-local.md`](../setup-local.md) — os runbooks aqui cobrem integrações opcionais.

- [`configurar-resend.md`](./configurar-resend.md) — e-mail transacional (convite/reset de senha): conta, domínio verificado, ou sandbox de teste.
- [`configurar-google-agenda.md`](./configurar-google-agenda.md) — sincronização de agenda via OAuth ou service account.
- [`configurar-whatsapp-lembretes.md`](./configurar-whatsapp-lembretes.md) — lembretes de consulta via Meta Cloud API.

## Quando criar um novo runbook

Quando uma tarefa operacional (configurar integração, rodar procedimento pontual) ganhar passo a passo próprio que não cabe bem dentro do `setup-local.md` sem inchá-lo. Nome do arquivo: `verbo-substantivo.md`, em pt-BR, minúsculo, hífen. Atualiza este índice e o [`../README.md`](../README.md) ao criar um novo.
