# Social Guestbook — Project Instructions

## Auto-Activation

See canonical rules: `<REPO_ROOT>/skills/ui-auto-activation/SKILL.md`

All triggers from that skill are active in this dApp.

## MIDL Gates

Any wallet / tx flow / deploy / SDK work → run `<REPO_ROOT>/skills/midl-preflight/SKILL.md` first.

## Stack

- Vite + React + TypeScript
- Plain CSS with BEM — no Tailwind
- `@midl/viem@2.21.39` override active
- Contract address from `state/deployment-log.json` via `@state` alias — never hardcode
