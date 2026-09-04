#!/bin/bash
# Bloqueia comandos git/shell destrutivos antes da execução (PreToolUse gate).
# Não bloqueia `git push` simples — o fluxo padrão do projeto é
# commit -> push -> PR -> CI -> merge.
#
# Limitação conhecida: isso é matching de texto sobre tool_input.command, não
# um parser de shell. Formas ofuscadas (aspas ANSI-C como $'--hard', `--` antes
# de um path como `checkout -- .`) podem escapar dos padrões abaixo. Não é uma
# fronteira de segurança contra um atacante deliberado — é um freio de mão
# contra o agente rodar algo destrutivo por acidente.

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("tool_input",{}).get("command","") or "")' 2>/dev/null)
PARSE_STATUS=$?

if [[ $PARSE_STATUS -ne 0 ]]; then
  echo "BLOCKED: falha ao interpretar tool_input do hook (JSON malformado). Bloqueando por segurança." >&2
  exit 2
fi

DANGEROUS_PATTERNS=(
  "push[[:space:]]+.*--force"
  "push[[:space:]]+-f([[:space:]]|$)"
  "reset[[:space:]]+.*--hard"
  "clean[[:space:]]+-f"
  "branch[[:space:]]+-D"
  "checkout[[:space:]]+(--[[:space:]]+)?\."
  "restore[[:space:]]+(--[[:space:]]+)?\."
  "rm[[:space:]]+-rf[[:space:]]"
  "no-verify"
  "no-gpg-sign"
)

for pattern in "${DANGEROUS_PATTERNS[@]}"; do
  if echo "$COMMAND" | grep -qE -- "$pattern"; then
    echo "BLOCKED: comando bate com padrão destrutivo '$pattern'. Confirme com o usuário antes de rodar isso manualmente." >&2
    exit 2
  fi
done

exit 0
