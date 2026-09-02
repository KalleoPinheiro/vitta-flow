---
feature: paginacao-cursor-csp-nonce
issues: [75, 76]
scope: Large (dois componentes independentes, mesmo PR por decisão do usuário)
status: implementado
---

# Fase D — Paginação por cursor (#75) e CSP estrita com nonce (#76)

Fonte: `docs/audits/analise-seguranca-escalabilidade.md` §2.4 e §1.5/1.7;
`docs/plano-evolucao-faseado.md` Fase 6.

## #75 — Paginação por cursor

**Problema:** listagens usavam `offset`, que degrada com volume (Postgres
teria que varrer e descartar N linhas a cada página).

**Escopo decidido** (baseado no próprio `analise-seguranca-escalabilidade.md`
§2.4, que já restringe o item a "pacientes/faturas/retornos"):

- **Pacientes** (`/api/patients`) e **Faturas** (`/api/invoices`): migrados
  ponta a ponta — repositório (Drizzle + in-memory), use case, rota HTTP e UI
  (`usePagedQuery` → `useCursorPagedQuery`, mesma interface pública).
- **Retornos** (`follow-ups`): **não migrado nesta issue.** Hoje não existe
  uma listagem paginada de retornos na UI — o único consumidor é o widget do
  dashboard (`(staff)/page.tsx`), que busca só `status=pending` com teto de
  `MAX_ROWS=500` (já corrigido na Fase anterior, §2.2). Não há uma superfície
  de escala real para migrar; criar paginação sem consumidor violaria YAGNI.
  Quando existir uma tela de listagem de retornos, aplicar o mesmo padrão
  descrito abaixo.
- **Auditoria** (`/api/audit`): fora de escopo — issue não cita auditoria, e
  o hook `usePagedQuery` (offset) permanece intacto e é usado só por ela, sem
  qualquer mudança neste PR.

### Desenho

- Cursor opaco (`src/lib/pagination.ts`): base64url de um JSON com as colunas
  de ordenação da página (ex.: `{fullName, id}` para pacientes). Decodificado
  no repositório, que monta um predicado de keyset:
  `(coluna, id) > (cursor.coluna, cursor.id)` (ou `<` para ordem desc).
- Contrato HTTP: em vez de trocar `data: T[]` por um envelope novo (que
  quebraria dezenas de testes/consumidores existentes que leem `body.data`
  como array), o `nextCursor` viaja num campo `meta` novo e opcional do
  envelope já existente (`{success, data, error, meta?}`) — `data` continua
  sendo o array de DTOs, sem mudança de forma.
- Cliente: `apiFetchPage<T>()` (novo, em `src/lib/client.ts`) devolve
  `{items, nextCursor}`; `useCursorPagedQuery` (novo hook) espelha a
  interface pública de `usePagedQuery` — troca de import nas duas páginas
  (`pacientes/page.tsx`, `faturamento/page.tsx`) foi a única mudança de UI.

### Aceite

- [x] Percorrer todas as páginas com `limit` pequeno reproduz exatamente a
      mesma lista (mesma ordem, sem duplicar nem pular) que uma consulta sem
      paginação — testado contra Postgres real (pglite) para pacientes e
      faturas.
- [x] `nextCursor` é `null` na última página.
- [x] UI carrega mais itens sem regressão visual/funcional (mesmos
      componentes `PagedList`/`LoadMoreButton`).

## #76 — CSP estrita com nonce

**Problema:** CSP usava `'unsafe-inline'` em `script-src`, permitindo
execução de qualquer script inline injetado (XSS).

### Desenho

- `src/proxy.ts` (Next 16 renomeou `middleware.ts` → `proxy.ts`) já existia
  como camada 1 de autorização — o nonce foi acrescentado ali, não em um
  arquivo novo, porque só o proxy roda por request e tem acesso a
  `NextResponse.next()` no caminho de sucesso.
- Nonce novo por request (`crypto.randomUUID()` em base64), propagado via
  header `x-nonce` (lido automaticamente pelo Next para os scripts do próprio
  framework) e via `Content-Security-Policy: script-src 'self'
  'nonce-<valor>' 'strict-dynamic'` (sem `'unsafe-inline'`).
- `next.config.ts` não define mais `Content-Security-Policy` — headers
  estáticos não têm acesso à requisição, logo não podem gerar nonce.
- Nonce exige renderização dinâmica (Next só injeta o valor em HTML gerado
  por request). `src/app/layout.tsx` ganhou `export const dynamic =
  "force-dynamic"`: cobre tanto páginas autenticadas quanto as poucas
  páginas públicas (`/login`, `/definir-senha`, `/esqueci-senha`) — nenhuma
  delas tem hoje um caso de uso que justifique o ganho de estático/ISR sobre
  o custo de desativar essa otimização.
- Nenhum script/estilo inline customizado existe no código (`grep
  dangerouslySetInnerHTML`, `next/script`: zero ocorrências) — não havia
  nada para "migrar para nonce" no app em si.

### Aceite

- [x] `Content-Security-Policy` da resposta contém `nonce-` e não contém
      `unsafe-inline`.
- [x] Nonce muda a cada request.
- [x] Aplica-se tanto a rotas públicas quanto autenticadas.

## Decisão de escopo (registrada aqui, não em `.specs/STATE.md` — feature-local)

Auditoria/retornos ficaram fora por não estarem no critério de aceite restrito
ao próprio audit doc e/ou por não terem consumidor de UI hoje. Ver seção #75
acima para o raciocínio completo.
