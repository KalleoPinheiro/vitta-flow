#!/bin/bash
# Bloqueia comandos git/shell destrutivos antes da execução (PreToolUse gate).
# Não bloqueia `git push` simples — o fluxo padrão do projeto é
# commit -> push -> PR -> CI -> merge.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("tool_input",{}).get("command","") or "")' 2>/dev/null)

DANGEROUS_PATTERNS=(
  "push[[:space:]]+.*--force"
  "push[[:space:]]+-f([[:space:]]|$)"
  "reset[[:space:]]+--hard"
  "clean[[:space:]]+-f"
  "branch[[:space:]]+-D"
  "checkout[[:space:]]+\."
  "restore[[:space:]]+\."
  "rm[[:space:]]+-rf[[:space:]]"
  "no-verify"
  "no-gpg-sign"
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qE -- "$pattern"; then
    echo "BLOCKED: '$COMMAND' matches dangerous pattern '$pattern'. Confirme com o usuário antes de rodar isso manualmente." >&2
    exit 2
  fi
done

exit 0
