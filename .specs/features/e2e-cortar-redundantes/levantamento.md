# Levantamento: 19 specs e2e × cobertura unit/integration

Metodologia: para cada teste, verifiquei se ele toca UI (`page.goto`/interação) ou é 100%
API (`request`/`page.request`, sem navegação real), depois busquei (grep + leitura) um teste
equivalente em `tests/domain`, `tests/application` ou `tests/api` que exercite a MESMA regra.
Corte só quando as três condições do `spec.md` se confirmam por leitura direta do teste
equivalente — nunca por suposição.

Legenda de classificação: **UI** (jornada real de interface, valor de integração não
duplicável por teste unit) · **API-pura** (só chamadas `request`, sem asserção de UI) ·
**híbrido** (mistura de checagem de UI real com uma chamada de API "defesa em profundidade").

## agenda.spec.ts (6 testes)

| Teste | Classificação | Equivalente unit/integration | Decisão |
| --- | --- | --- | --- |
| agenda uma consulta em dia útil | UI | — | mantém (única jornada happy-path de criação via UI) |
| bloqueia conflito de horário | UI (form → erro renderizado) | `tests/application/scheduling-rules.test.ts` (regra de conflito) | mantém — o e2e prova que a API real (via HTTP) propaga "Horário indisponível" pro formulário; o unit só prova a regra de domínio/aplicação, não o mapeamento pra UI |
| bloqueia fora do horário comercial | UI (form → erro renderizado) | `tests/application/scheduling-rules.test.ts` (regra de horário comercial) | mantém — mesmo motivo acima |
| remarca uma consulta existente | UI | — | mantém (única jornada de remarcação) |
| cria série recorrente semanal | UI | — | mantém (única jornada de série recorrente) |
| grade de horários configurável | UI, efeito cruzado (agenda respeita nova grade) | — | mantém (única verificação de que `/configuracoes` afeta `/agenda` de ponta a ponta) |

## auditoria.spec.ts (2 testes)

Ambos UI (navegação + filtro + visibilidade de linha na trilha). Nenhuma duplicata de lógica de
negócio pura — a trilha de auditoria em si (o que é uma "leitura"/"criação") é comportamento de
infraestrutura best-effort, testado em `tests/api/audit-lgpd-routes.test.ts` a nível de rota, mas
os dois e2e aqui verificam a RENDERIZAÇÃO da trilha (papel do usuário, filtro por paciente) —
integração real de UI. **Mantém os 2.**

## auth.spec.ts (10 testes)

Todos são fronteira de autenticação/RBAC/sessão (redirecionamento, login, logout, recuperação de
senha, modo aberto, acesso de paciente/parceiro à raiz). Regra do spec: fronteira de
auth/RBAC/tenant nunca é cortada mesmo que a lógica interna tenha teste unit — o valor aqui é o
fluxo HTTP+cookie+proxy real. **Mantém os 10.**

## clinico.spec.ts (5 testes)

Todos usam `openPatientRecord` (helper com `page.goto`) — jornadas reais de prontuário (criar
condição, registrar avaliação PUSH/DET, enviar foto, SOAP, resolver condição). O último teste
("condição resolvida bloqueia novas avaliações") tem uma chamada de API "defesa em profundidade"
ao final (linha 127-132) que duplica uma regra de domínio, mas é uma asserção final dentro de um
teste majoritariamente de UI, não um cenário e2e separado — cortar só essa linha quebraria o
comentário explicativo ("defesa em profundidade") sem reduzir o número de testes/specs
executados (o overhead é uma chamada HTTP extra, insignificante no tempo total). **Mantém os 5,
sem alteração.**

## documentos.spec.ts (5 testes)

Todos renderizam uma rota de documento (`/documentos/...`) e verificam heading + dados — UI real
de impressão, incluindo o caso de bloqueio (`consulta cancelada`) e o de erro (`consulta
inexistente`), que testam a ROTA de documento, não a regra de negócio em si. Nenhuma duplicata:
não há teste unit/integration da página `/documentos/*` (são Server Components/rotas
renderizadas, não lógica isolável). **Mantém os 5.**

## equipe.spec.ts (5 testes)

Todos CRUD via UI (criar/editar/desativar/reativar profissional e parceiro, bloqueio de email
duplicado com mensagem renderizada). Nenhum é API-pura. **Mantém os 5.**

## export-lgpd.spec.ts (3 testes)

| Teste | Classificação | Equivalente | Decisão |
| --- | --- | --- | --- |
| exporta todos os dados em um único JSON | API-pura (`page.request.get`, sem UI) | `tests/api/audit-lgpd-routes.test.ts:257` ("Dado paciente com anamnese, condição e foto... retorna JSON completo") testa o MESMO contrato chamando a rota diretamente | mantém — é o único teste que builda o payload via jornada real (agendamento → conclusão → fatura → export) batendo em endpoints reais em sequência; o teste de rota usa fixtures fabricadas direto no banco, não a cadeia de casos de uso real. Risco de falso-negativo maior que o custo de mantê-lo |
| **exportação de paciente inexistente retorna 404** | **API-pura**, zero UI | `tests/api/audit-lgpd-routes.test.ts:223` — "Dado paciente inexistente, Quando GET export, Então retorna 404", chamando `exportRoute.GET()` diretamente | **CORTA** — mesma regra (404 para paciente inexistente), sem toque de UI, sem valor de integração adicional além do texto da mensagem de erro (verificação de baixo valor); a rota já é exercitada em `tests/api` com o mesmo código de produção |
| exportação fica registrada na trilha de auditoria | híbrido (API + UI: navega pra `/auditoria` e confere a linha "Leitura") | — | mantém — é a única verificação de que o export realmente APARECE na tela de auditoria (efeito colateral cross-feature, não coberto por teste de rota isolado) |

## faturamento.spec.ts (4 testes)

| Teste | Classificação | Equivalente | Decisão |
| --- | --- | --- | --- |
| concluir consulta gera fatura pendente | UI | — | mantém |
| recebe pagamento de fatura pendente (pix) | UI | — | mantém |
| bloqueia cancelamento de fatura já paga | híbrido: chamada `request.patch` direta (linhas 65-71) + checagem de UI (botão "Cancelar" ausente) | `tests/domain/invoice.test.ts:77` cobre a regra de domínio (`InvalidStatusTransitionError`), mas **não existe** teste de rota (`tests/api`) verificando que a API mapeia esse erro pra HTTP não-2xx com mensagem contendo "paid" | mantém — a parte de API do teste verifica o MAPEAMENTO domínio→HTTP, que não tem cobertura em nenhum outro nível; cortar perderia essa garantia |
| pacote pré-pago consome sessão sem gerar fatura duplicada | UI + leituras de API para montar asserção (não é o cerne testado por UI) | — | mantém — é o único teste da interação pacote×fatura×estoque de sessões |

## followup.spec.ts (4 testes)

| Teste | Classificação | Equivalente | Decisão |
| --- | --- | --- | --- |
| retorno pendente aparece no dashboard e pode ser concluído | UI | — | mantém |
| retorno atrasado mostra alerta e pode ser cancelado | UI | — | mantém |
| link Agendar leva para a agenda com os parâmetros | UI (href) | — | mantém |
| não permite mudar o status de um retorno já concluído | API-pura (nenhum `page` usado) | `tests/application/followups.test.ts:229` cobre a regra de domínio (`InvalidStatusTransitionError`); **porém** nenhum teste de rota (`tests/api/followups-reports-routes.test.ts`) verifica que `PATCH /api/follow-ups/:id` retorna a mensagem "não pode mudar" em vez de 500 genérico | **mantém** — motivo: a MENSAGEM de erro específica só é testada aqui; sem este e2e, uma regressão no mapeamento de erro na rota (ex.: virar 500 sem repassar `error.message`) passaria despercebida. Reavaliado inicialmente como corte candidato, revertido após confirmar ausência de cobertura de rota (ver nota abaixo) |

Nota: este foi o caso mais próximo de um falso-corte no levantamento — parecia 100% duplicata
por não tocar UI, mas o valor real está no mapeamento erro-de-domínio → resposta HTTP, que só
este teste garante.

## inventario.spec.ts (4 testes)

Todos usam UI real (`/materiais`, formulário de movimentação) e verificam banners/estado
(estoque baixo, estoque insuficiente, validade próxima, baixa por kit ao concluir consulta).
Nenhum é API-pura; nenhum duplica só a regra de negócio sem also verificar a renderização real do
banner. **Mantém os 4.**

## modal-dismissao.spec.ts (2 testes)

Comentário no próprio arquivo já documenta por que vive em e2e (jsdom não implementa
`PointerEvent`, garantia só testável com browser real) e referencia
`tests/components/modal.test.tsx` como cobertura complementar das demais garantias do diálogo
(role, aria-modal, Escape, focus trap). Não há sobreposição a cortar. **Mantém os 2.**

## pacientes.spec.ts (5 testes)

Todos UI. O teste "inativa um paciente e bloqueia novo agendamento" tem uma chamada de API
"defesa em profundidade" ao final (linha 60-72, comentário explícito no próprio arquivo) — mesmo
padrão do clinico.spec.ts: mantida por ser uma asserção final dentro de teste majoritariamente
UI, não um cenário e2e isolável. **Mantém os 5.**

## plano-cuidados.spec.ts (6 testes)

Todos exercitam a UI do plano de cuidados (SAE) via `openCarePlanTab` — ciclo completo
diagnóstico→resultado→intervenção→execução→avaliação, regressão, validação de meta ≤ basal,
plano resolvido somente-leitura, e o limite staff×portal (paciente não vê SAE). Nenhum é
API-pura; cada um testa uma transição de UI distinta sem sobreposição total com outro teste do
arquivo. **Mantém os 6.**

## portal-paciente.spec.ts (2 testes)

| Teste | Classificação | Equivalente | Decisão |
| --- | --- | --- | --- |
| paciente confirma presença, aceita consentimento, envia foto | UI completa | — | mantém (única jornada completa do portal do paciente) |
| **paciente não consegue confirmar consulta de outro paciente** | híbrido fraco: navega ao portal só pra estabelecer sessão (já coberto pelo teste acima), a ÚNICA asserção nova é uma chamada `page.request.post` direta checando `response.ok()===false` e `body.error` contém "não encontrado" | `tests/api/portal-routes.test.ts:435` — "Dado consulta de outro paciente, Quando POST confirm, Então retorna 404 (sem vazar existência)" (chama a rota diretamente, mesmo código) **e** `tests/application/confirm-own-appointment.test.ts:61` — "Dado consulta de outro paciente, Quando confirmar, Então NotFound" (regra de aplicação) | **CORTA** — a fronteira de tenant/ownership já está coberta em DOIS níveis (aplicação + rota HTTP real, incluindo o código de status); a navegação ao portal no e2e não agrega nada que o primeiro teste do arquivo já não prove |

## portal-parceiro.spec.ts (2 testes)

Ambos UI real (parceiro vê só pacientes indicados; estado vazio sem indicados) — fronteira de
visibilidade entre parceiros, testada via renderização real. **Mantém os 2.**

## relatorios.spec.ts (3 testes)

| Teste | Classificação | Observação | Decisão |
| --- | --- | --- | --- |
| consulta concluída aparece na receita/margem do mês | UI (navegação por mês com `waitForResponse`, sem `<input type=month>` — REL-02) | Existe cálculo de margem testado em `tests/application/supply-cost-margin.test.ts`, mas o e2e testa a MECÂNICA DE NAVEGAÇÃO por mês (botões ‹›) e a formatação de moeda na tabela — não duplicado | mantém |
| produção por profissional soma consultas concluídas | UI | idem | mantém |
| mês sem consultas mostra estado vazio | UI | — | mantém (único teste do estado vazio) |

## responsive-tables.spec.ts (11 testes) e sidebar-responsive.spec.ts (4 testes)

Testam comportamento responsivo/visual (viewport mobile, scroll horizontal, alvo de toque,
drawer, scroll-lock) — não são regra de negócio, são comportamento de layout só verificável com
um browser real renderizando CSS/JS. Nenhuma sobreposição possível com teste unit/integration
(que não renderiza layout). **Mantém todos os 15.**

## triagem.spec.ts (2 testes)

Ambos exercitam a fila de triagem de fotos via UI real (manter plano / antecipar retorno),
incluindo o helper `uploadPatientPhoto` que já documenta explicitamente (comentário no arquivo)
por que passa pelo consentimento real em vez de pular o gate. Nenhuma duplicata de lógica pura
sem toque de UI. **Mantém os 2.**

---

## Resumo de cortes

| Arquivo | Teste cortado | Equivalente unit/integration |
| --- | --- | --- |
| `export-lgpd.spec.ts` | "exportação de paciente inexistente retorna 404" | `tests/api/audit-lgpd-routes.test.ts:223` |
| `portal-paciente.spec.ts` | "paciente não consegue confirmar consulta de outro paciente" | `tests/api/portal-routes.test.ts:435` + `tests/application/confirm-own-appointment.test.ts:61` |

**Total: 2 de 86 testes cortados (17 arquivos ficam sem alteração).**

## Antes / depois

| Métrica | Antes | Depois |
| --- | --- | --- |
| Nº de arquivos e2e | 19 | 19 |
| Nº de testes | 86 | 84 |
| `export-lgpd.spec.ts` + `portal-paciente.spec.ts` isolados | 5 testes, todos verdes (parte da faixa que passou antes da cascata, ver `spec.md`) | 3 testes, 2 passed + 1 flaky-passou-no-retry (33s) |
| Tempo suíte completa | 18.2min até cascata de `AUTH_SECRET` em `clinico.spec.ts` (falha de ambiente, não de conteúdo — ver `spec.md`) | não medido de ponta a ponta (mesma instabilidade de ambiente) |

Ver `spec.md` → "Antes / depois" e "Achado fora de escopo" para o detalhe completo da evidência
e da instabilidade de ambiente que limitou a medição de tempo total da suíte.
