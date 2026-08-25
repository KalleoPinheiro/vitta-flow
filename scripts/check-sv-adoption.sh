#!/usr/bin/env bash
#
# Gate de adoção do @still-void/ui v2.
#
# Transforma os critérios "zero ocorrências" de
# .specs/features/still-void-v2-migration/spec.md em verificação executável.
# Sai com 0 quando limpo, 1 quando há achado (imprimindo arquivo:linha).
#
# Baseline no commit 9e87092, antes da fase 2 (o script nasce vermelho de
# propósito — sair 0 aqui significaria que ele não está checando nada):
#   [1] import bare @still-void/ui .......   0
#   [2] <button> cru .....................  89
#   [3] <input> textual cru ..............  71
#   [4] utilitário de paleta crua ........ 339 linhas
#   [5] apelido slate/teal no @theme .....  20
#   [6] client-only fora de client .......   0
#   [7] sv-gap órfão ..................... pulado (docs/still-void-gaps.md ainda não existe)
#   total ................................ 519
#
# Um workaround que precisa sobreviver é marcado no código com
# `// sv-gap: <slug>` na linha imediatamente acima, e o mesmo <slug> ganha uma
# seção em docs/still-void-gaps.md. A checagem [7] mantém os dois em sincronia.
#
# Baseline pré-migração v3 (commit 2e57a4d, antes da Fase 3 ligar as checagens
# de campo — T13 ativa [8]/[9] depois de T6-T12 portarem os call sites para
# NativeSelect/Textarea):
#   [8] <select> cru ...................... 23
#   [9] <textarea> cru ....................  7

set -uo pipefail
cd "$(dirname "$0")/.."

# Parametrizável para o próprio teste do gate poder rodá-lo contra um fixture
# (tests/scripts/check-sv-adoption.test.ts). Sem argumento, opera no app.
SRC="${1:-src}"
GAPS_DOC="${2:-docs/still-void-gaps.md}"
findings=0

report() {
  local label="$1" count="$2" body="$3"
  if [ "$count" -gt 0 ]; then
    printf '\n✗ [%s] %d achado(s)\n' "$label" "$count"
    printf '%s\n' "$body" | sed 's/^/    /'
    findings=$((findings + count))
  else
    printf '✓ [%s]\n' "$label"
  fi
}

tsx_files() { find "$SRC" -name '*.tsx' -o -name '*.ts' | sort; }

# --- [1] entry point removido na v2 ------------------------------------------
# Aspas simples e duplas: o projeto usa duplas, mas um arquivo com aspas simples
# não pode escapar do gate só por causa do estilo de citação. `import` sozinho
# cobre o import por efeito colateral (`import "@still-void/ui";`), que carrega o
# entry point removido sem cláusula `from`; o espaço é variável porque nada
# obriga a formatação a ser a canônica.
hits=$(grep -rnE "\b(from|import)[[:space:]]*['\"]@still-void/ui['\"]" "$SRC" 2>/dev/null || true)
report "import bare @still-void/ui" "$(printf '%s' "$hits" | grep -c . || true)" "$hits"

# --- [2] <button> cru --------------------------------------------------------
# Um <button> só sobrevive com `// sv-gap:` na linha imediatamente anterior.
hits=$(tsx_files | while read -r f; do
  awk -v F="$f" '
    # Linha de comentário (JSDoc, // ou {/* */}) não é markup: `<button>` citado
    # em prosa não é call site.
    /^[[:space:]]*(\*|\/\/|\{\/\*|\/\*)/ { prev = $0; next }
    /<button/ && prev !~ /sv-gap:/ { printf "%s:%d: %s\n", F, NR, $0 }
    { prev = $0 }
  ' "$f"
done)
report "<button> cru" "$(printf '%s' "$hits" | grep -c . || true)" "$hits"

# --- [3] <input> de tipo textual cru ----------------------------------------
# checkbox/radio/file são lacunas conhecidas da lib e ficam fora desta checagem;
# o que a lib entrega é o <Input> textual.
hits=$(tsx_files | while read -r f; do
  awk -v F="$f" '
    /^[[:space:]]*(\*|\/\/|\{\/\*|\/\*)/ { prev = $0; next }
    /<input/ && $0 !~ /type="(checkbox|radio|file)"/ && prev !~ /sv-gap:/ { printf "%s:%d: %s\n", F, NR, $0 }
    { prev = $0 }
  ' "$f"
done)
report "<input> textual cru" "$(printf '%s' "$hits" | grep -c . || true)" "$hits"

# --- [4] utilitário de paleta crua ------------------------------------------
# Toda cor tem de resolver para um token --sv-* pela ponte do @theme.
hits=$(grep -rnE '\b(slate|teal|amber|emerald|sky|red|violet)-[0-9]{2,3}\b' "$SRC" --include='*.tsx' 2>/dev/null || true)
report "utilitário de paleta crua" "$(printf '%s' "$hits" | grep -c . || true)" "$hits"

# --- [5] vocabulário de apelido sobrevivente no tema ------------------------
hits=$(grep -rnE '^\s*--color-(slate|teal)-[0-9]{2,3}:' "$SRC" --include='*.css' 2>/dev/null || true)
report "apelido slate/teal no @theme" "$(printf '%s' "$hits" | grep -c . || true)" "$hits"

# --- [6] símbolo client-only em arquivo sem "use client" --------------------
# Erro de fronteira do App Router: quebra o build, e é barato pegar antes dele.
hits=$(grep -rln '@still-void/ui/react/client' "$SRC" 2>/dev/null | while read -r f; do
  # Espaço à esquerda é tolerado pelo parser do Next (só código executável antes
  # da diretiva é que invalida), então recusar aqui seria falso positivo.
  head -3 "$f" | grep -qE "^[[:space:]]*['\"]use client['\"]" \
    || echo "$f:1: importa de @still-void/ui/react/client sem a diretiva \"use client\""
done)
report "client-only fora de client component" "$(printf '%s' "$hits" | grep -c . || true)" "$hits"

# --- [7] sv-gap órfão nos dois sentidos -------------------------------------
if [ -f "$GAPS_DOC" ]; then
  # Aceita as tres formas validas conforme a posicao no JSX:
  #   // sv-gap: x      (elemento raiz de um return)
  #   /* sv-gap: x */   (antes de um elemento em posicao de expressao)
  #   {/* sv-gap: x */} (filho de JSX)
  code_slugs=$(grep -rhoE 'sv-gap: [a-z0-9-]+' "$SRC" 2>/dev/null | sed 's|sv-gap: ||' | sort -u)
  # Uma seção anotada com <!-- sv-gap-doc-only --> é relato sobre a lib, sem
  # workaround local: só a direção código -> doc vale para ela.
  doc_slugs=$(awk '
    /^### `[a-z0-9-]+`/ {
      if (pending) print pending
      slug = $0; gsub(/[^a-z0-9-]/, "", slug); pending = slug; next
    }
    /sv-gap-doc-only/ { pending = ""; next }
    END               { if (pending) print pending }
  ' "$GAPS_DOC" 2>/dev/null | sort -u)
  hits=$(
    comm -23 <(printf '%s\n' "$code_slugs" | grep . || true) <(printf '%s\n' "$doc_slugs" | grep . || true) \
      | sed "s|^|marcado no código, ausente de $GAPS_DOC: |"
    comm -13 <(printf '%s\n' "$code_slugs" | grep . || true) <(printf '%s\n' "$doc_slugs" | grep . || true) \
      | sed "s|^|documentado em $GAPS_DOC, sem marcação no código: |"
  )
  report "sv-gap órfão" "$(printf '%s' "$hits" | grep -c . || true)" "$hits"
else
  printf '· [sv-gap órfão] pulado — %s ainda não existe\n' "$GAPS_DOC"
fi

# --- [8] <select> cru ---------------------------------------------------------
# Mesma guarda de linha-comentário e isenção por `sv-gap:` das checagens [2]/[3].
hits=$(tsx_files | while read -r f; do
  awk -v F="$f" '
    /^[[:space:]]*(\*|\/\/|\{\/\*|\/\*)/ { prev = $0; next }
    /<select/ && prev !~ /sv-gap:/ { printf "%s:%d: %s\n", F, NR, $0 }
    { prev = $0 }
  ' "$f"
done)
report "<select> cru" "$(printf '%s' "$hits" | grep -c . || true)" "$hits"

# --- [9] <textarea> cru ---------------------------------------------------------
hits=$(tsx_files | while read -r f; do
  awk -v F="$f" '
    /^[[:space:]]*(\*|\/\/|\{\/\*|\/\*)/ { prev = $0; next }
    /<textarea/ && prev !~ /sv-gap:/ { printf "%s:%d: %s\n", F, NR, $0 }
    { prev = $0 }
  ' "$f"
done)
report "<textarea> cru" "$(printf '%s' "$hits" | grep -c . || true)" "$hits"

printf '\n'
if [ "$findings" -gt 0 ]; then
  printf 'FALHOU — %d achado(s). Ver .specs/features/still-void-v2-migration/spec.md\n' "$findings"
  exit 1
fi
printf 'OK — adoção do @still-void/ui v2 completa.\n'
