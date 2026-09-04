---
description: Triage one or more GitHub issues using this repo's canonical labels
---

Follow `docs/agents/issue-tracker.md` and `docs/agents/triage-labels.md`.

Arguments (`$ARGUMENTS`): one or more issue numbers, or empty to triage all open issues currently labelled `needs-triage`.

Steps:

1. If no arguments, list open issues with `needs-triage`: `gh issue list --state open --label needs-triage --json number,title,body,labels,comments`.
2. For each target issue, read it fully: `gh issue view <n> --json number,title,body,labels,comments --jq '{number, title, body, labels: [.labels[].name], comments}'`.
3. Decide the correct label from the five canonical roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) per `docs/agents/triage-labels.md`. An issue is `ready-for-agent` only when it is fully specified (clear acceptance criteria, no open product decision).
4. Apply the label: `gh issue edit <n> --add-label "<label>" --remove-label "needs-triage"` (skip the remove if the issue stays in `needs-triage`, e.g. still waiting on info).
5. If moving to `needs-info`, leave a comment naming exactly what's missing.
6. Report a short table: issue #, title, label applied, one-line reason.
