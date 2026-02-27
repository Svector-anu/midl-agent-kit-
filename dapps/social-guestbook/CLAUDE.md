# Social Guestbook — Project Instructions

## Auto-Activation

See canonical rules: `~/midl_agent_skills/skills/ui-auto-activation/SKILL.md`

All triggers from that skill are active in this dApp.

## MIDL Gates

Any wallet / tx flow / deploy / SDK work → run `~/midl_agent_skills/skills/midl-preflight/SKILL.md` first.

## Stack

- Vite + React + TypeScript
- Plain CSS with BEM — no Tailwind
- `@midl/viem@2.21.39` override active
- Contract address from `state/deployment-log.json` via `@state` alias — never hardcode
