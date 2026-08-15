# Plano de Evolução Faseado — VittaFlow

- **Versão:** 1.0
- **Data:** 2026-08-15
- **Origem:** análise de código (produto, segurança, performance, UX/DX) realizada nesta branch
- **Método:** spec-driven (tlc-spec-driven) — cada fase executável tem `spec.md`, `design.md` e
  `tasks.md` em `.specs/features/`, com testes derivados dos critérios de aceite, um commit
  atômico por task e validação independente (Verifier) ao final de cada fase.

---

## Princípios de priorização

1. **Segurança de dado de saúde antes de crescimento** — brechas identificadas viram incidente
   quando o sistema sair de 1 clínica confiável para N clínicas.
2. **Fundação antes de feature** — consistência transacional e guards unificados reduzem o custo
   de tudo que vem depois.
3. **Fechar loops de receita com o que já existe** — auto-agendamento reusa slots, grade e
   conflito por profissional já implementados.
4. **Decisão de negócio pendente = fase planejada, não executada** — itens que exigem escolha do
   usuário (matriz RBAC fina, taxa de cancelamento, PSP, multi-tenancy) ficam especificados como
   backlog para não inventar requisitos.

## Visão geral das fases

| Fase | Nome | Status | Spec |
|------|------|--------|------|
| 1 | Hardening de segurança | **Executar agora** | `.specs/features/fase-1-hardening-seguranca/` |
| 2 | Consistência transacional e performance | **Executar agora** | `.specs/features/fase-2-consistencia-performance/` |
| 3 | Compliance e UX clínico | **Executar agora** | `.specs/features/fase-3-compliance-ux-clinico/` |
| 4 | Portal: auto-agendamento e recall | **Executar agora** | `.specs/features/fase-4-portal-auto-agendamento/` |
| 5 | Monetização e canal | Planejada (backlog) | seção 5 abaixo |
| 6 | Plataforma (RBAC fino, multi-tenancy, TISS) | Planejada (backlog) | seção 6 abaixo |

---

## Fase 1 — Hardening de segurança (executar)

Fecha as brechas de maior risco com mudanças cirúrgicas, sem depender de decisão de negócio.

| Item | Origem na análise | Severidade |
|------|-------------------|------------|
| Guard de sessão unificado (`requireRole`) nas rotas do portal | UX/DX — boilerplate repetido, furo de escopo por esquecimento | Baixa (DX) / preventiva (seg.) |
| Revogação de sessão de conta staff desativada (deny-list com cache TTL no proxy) | Segurança — sessão stateless sobrevive à desativação da conta | Alta |
| Remoção de metadados EXIF/XMP de fotos no ingest (JPEG/PNG/WebP, sem dependência nova) | Segurança/LGPD — GPS da casa do paciente em foto de ferida | Alta |
| Cadeia `x-forwarded-for` confiável no rate limit (`TRUSTED_PROXY_HOPS`) | Segurança — chave de rate limit forjável | Média |
| Comparação em tempo constante no `x-cron-secret` + aviso de uso da senha master | Segurança — higiene de credenciais | Média |
| Auditoria write-ahead para exportação LGPD e exclusão de foto | Segurança — trilha não pode ser best-effort em ação crítica | Baixa |

**Fora desta fase (consciente):** RBAC granular de staff (recepção/clínico/financeiro) exige
matriz de permissões definida pelo negócio → Fase 6. A revogação de sessão usa semântica de
deny-list (só bloqueia conta que **existe e está inativa**) para não quebrar login Google
(allowlist sem linha em `user_accounts`) nem sessões E2E forjadas.

## Fase 2 — Consistência transacional e performance (executar)

| Item | Origem na análise | Severidade |
|------|-------------------|------------|
| Unit of Work transacional (P1 documentado no projeto): `CompleteAppointment` (consulta→fatura→pacote→kit) numa transação Drizzle | Performance/correção — padrão idempotente-reparador compensa a falta de transação | Média |
| Decremento de estoque atômico (`stock_qty = stock_qty - n WHERE stock_qty >= n`) | Correção — corrida entre checagem e baixa do kit | Média |
| Batch na fila de triagem (eliminar `findById` por condição) | Performance — N+1 destoando do padrão do projeto | Baixa |
| Cache de relatório mensal para meses encerrados (imutáveis) | Performance — recálculo integral a cada acesso | Baixa |

## Fase 3 — Compliance e UX clínico (executar)

| Item | Origem na análise | Severidade |
|------|-------------------|------------|
| Gate de consentimento no envio remoto de foto (sem aceite vigente → bloqueio com mensagem clara) | Compliance — fluxo de imagem sem base legal registrada | Média |
| Fila de triagem enriquecida: idade da pendência + último score (PUSH/DET) da condição | UX — decidir "ok" vs "antecipar" sem abrir o prontuário | Média |
| Validade de pacotes de sessões (`expiresAt` opcional; expirado não consome) | Lacuna de requisito — pacote hoje vale para sempre | Média |

**Fora desta fase (consciente):** política de cancelamento tardio/taxa exige decisão de negócio
(janela, cobrança) → Fase 6/backlog.

## Fase 4 — Portal: auto-agendamento e recall (executar)

Fecha o loop follow-up → agendamento sem intervenção da recepção.

| Item | Descrição |
|------|-----------|
| API de slots disponíveis | Grade configurada + conflito por profissional + gap mínimo, exposta ao paciente autenticado |
| Agendamento pelo portal | Paciente agenda retorno em procedimento ativo do catálogo, escopado à própria sessão |
| Recall com destino | Mensagem de recall aponta para o portal em vez de "ligue para a clínica" |
| Follow-up fecha sozinho | Agendamento originado de follow-up marca a pendência automaticamente |

## Fase 5 — Monetização e canal (planejada — backlog)

Exige escolhas do negócio antes de executar:

- **Pagamento online (Pix/cartão):** novo port `PaymentGateway` (mesmo padrão de
  `MessagingGateway`), fatura pendente gera link/QR no portal e no lembrete. **Decisão pendente:**
  qual PSP (Mercado Pago, Stripe, Asaas) e credenciais.
- **Relatório automático para o parceiro:** resumo periódico por marco clínico (ex.: queda de
  PUSH ≥ 3) enviado ao indicador. **Decisão pendente:** cadência e canal (email/WhatsApp).
- **Lista de espera (waitlist):** cancelamento oferece o slot via WhatsApp por ordem de chegada.
  **Decisão pendente:** regras de expiração da oferta.

## Fase 6 — Plataforma (planejada — backlog)

- **RBAC granular de staff:** papéis internos (clínico/recepção/financeiro) com matriz de
  permissões por rota/ação. **Decisão pendente:** a matriz em si (o que a recepção pode ver do
  prontuário?). Pré-requisito do multi-tenant.
- **Multi-tenancy fases 1–2 do ADR 001:** `clinic_id` + RLS. Executar antes que o schema cresça.
- **TISS/convênios:** operadora no paciente, guia por atendimento, relatório por operadora com
  série de scores como evidência.
- **Paginação por cursor** nas listagens (necessária só em escala de plataforma).
- **Sunset da senha master:** flag `AUTH_MASTER_DISABLED` + comunicação (a Fase 1 já adiciona o
  aviso de uso).

---

## Rastreabilidade análise → fase

Todos os pontos da análise estão cobertos: cada item de segurança/performance/UX-DX mapeia para
as fases 1–3; os itens de produto mapeiam para as fases 4–6. Nada foi descartado — itens não
executáveis sem decisão de negócio estão explicitamente registrados como backlog com a decisão
pendente nomeada.

## Critérios de conclusão por fase

Uma fase só é considerada entregue quando: (1) todos os tasks da `tasks.md` têm commit atômico;
(2) gates verdes (`npm test`, `npm run lint`, `npm run build`); (3) o Verifier independente
reporta PASS em `.specs/features/<fase>/validation.md`.
