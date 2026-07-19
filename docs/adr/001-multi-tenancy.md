# ADR 001 — Estratégia de Multi-Tenancy

- **Status:** Aceito (decisão registrada; implementação incremental futura)
- **Data:** 2026-07-18
- **Contexto:** PRD Fase 3, Onda 4 (O4.4)

## Contexto

O VittaFlow é single-tenant: um deploy = uma clínica. A visão de plataforma ("maior
ferramenta de gestão de estomaterapia") exige atender N clínicas com isolamento de
dados, onboarding self-service e billing por assinatura. São ~25 tabelas hoje; cada
migração nova sem consciência de tenant aumenta o custo da transição.

## Opções consideradas

| Opção | Prós | Contras |
|---|---|---|
| **A. Coluna `clinic_id` + RLS** | Um banco, operação simples, benchmark agregado trivial, custo marginal por tenant ~zero | Bug de filtro = vazamento entre clínicas (mitigado por RLS no Postgres); migrações tocam todos |
| B. Schema por tenant | Isolamento forte, backup por clínica | Migração × N schemas, conexões/cache por schema, benchmark difícil |
| C. Deploy por tenant (atual replicado) | Isolamento máximo, zero refactor | Custo fixo por clínica, frota de deploys, sem dado agregado — inviabiliza o item 23 (benchmark do setor) |

## Decisão

**Opção A — coluna `clinic_id` em todas as tabelas + Row-Level Security do Postgres.**

Razões: é a única que viabiliza o fosso competitivo de longo prazo (benchmark
anonimizado do setor) com custo operacional de um banco só; RLS dá defesa em
profundidade contra o principal risco (filtro esquecido na aplicação); o padrão da
indústria SaaS B2B nesse porte.

## Plano de migração incremental

1. **Fase 0 (agora):** convenções abaixo passam a valer para todo código novo.
2. **Fase 1:** tabela `clinics`; `clinic_id NOT NULL DEFAULT '<tenant-legado>'` em
   todas as tabelas via migração única; backfill trivial (um tenant).
3. **Fase 2:** `clinic_id` na sessão (claim no token); repositórios recebem o tenant
   pelo construtor (o container monta por request); RLS: `USING (clinic_id =
   current_setting('app.clinic_id'))` com `SET LOCAL` por transação.
4. **Fase 3:** onboarding (cadastro de clínica, primeira conta admin), billing por
   assinatura, domínio custom.
5. **Fase 4:** dado agregado anonimizado (benchmark) sobre o mesmo banco.

## Convenções obrigatórias desde já (custo ~zero, evitam retrabalho)

- **Nada de estado global por clínica** em `globalThis` além de conexões (o cache do
  calendar gateway precisará de chave por tenant na Fase 2 — já documentado aqui).
- **Configuração por linha, não por env**: novas configurações de negócio vão em
  tabela (como `schedule_settings`), nunca em variável de ambiente — env é global do
  deploy, tabela vira por-tenant de graça.
- **Unicidades futuras compostas**: unique novo que hoje é global (ex.: email de
  paciente, nome de procedimento) deverá virar `(clinic_id, campo)` na Fase 1 — não
  criar unique novo sem anotar isso na migração.
- **`SET LOCAL` sempre em transação** quando a Fase 2 chegar — pool compartilhado não
  pode vazar o setting entre requests.
- **Storage de fotos**: caminho passa a ser `uploads/<clinic_id>/condition-photos/…`
  na Fase 1 (mover é barato com um tenant).

## Consequências

- Enquanto a Fase 1 não chega, o produto segue single-tenant — deploy por clínica
  (opção C) é o modelo comercial interino aceitável.
- O refactor da Fase 1–2 é um épico próprio (~todas as queries), a ser feito numa
  janela dedicada com a suíte de testes atual como rede de proteção.
