#!/bin/bash
# Feedback hook (PostToolUse): roda biome no arquivo editado, não bloqueia —
# só devolve o output pro agente ver na hora.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(d.get("tool_input",{}).get("file_path","") or "")' 2>/dev/null)

if [[ -z "$FILE_PATH" ]]; then
  exit 0
fi

case "$FILE_PATH" in
  *.ts|*.tsx|*.js|*.jsx) ;;
  *) exit 0 ;;
esac

if [[ ! -f "$FILE_PATH" ]]; then
  exit 0
fi

cd "$CLAUDE_PROJECT_DIR" || exit 0
npx biome check "$FILE_PATH" 2>&1 | head -50

exit 0
