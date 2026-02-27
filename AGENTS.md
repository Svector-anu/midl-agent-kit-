# Agent Roles

## Preflight Gate (REQUIRED FIRST — auto-trigger)

**Route to `skills/midl-preflight/SKILL.md` before any implementation when the request contains:**

| Keyword / Signal | Examples |
|-----------------|---------|
| `wallet` | connect wallet, Xverse, Leather, useAccounts |
| `tx flow` | addTxIntention, finalizeBTCTransaction, signIntention, contract write |
| `deploy` | Hardhat deploy, hre.midl, contract deployment |
| `verify` | Blockscout, verify contract, hardhat verify |
| `midl sdk` | @midl/*, executor, connectors, executor-react |

**No MIDL implementation proceeds without preflight completion.**

---

## UI Skills Auto-Activation (dApp work)

When working inside any `dapps/*/src/` directory, these trigger automatically:

| Trigger | Skill |
|---------|-------|
| Edit `*.css` / `*.scss` | `baseline-ui` — after edit |
| Edit React component with visual/className changes | `baseline-ui` — after edit |
| Add/change animation, transition, keyframes | `fixing-motion-performance` — before finalising |
| Edit `index.html` head / meta tags | `fixing-metadata` — after edit |
| Add/modify `aria-*`, `role`, focus or keyboard handling | `fixing-accessibility` — after edit |

Max 3 auto-polish iterations per milestone (`capabilities.gates.maxAutoPolishIterations`).
Surface ambiguous violations to user instead of auto-fixing.

---

## Builder Agent
- Reads project_context.md
- Scaffolds skills, templates, and structure
- Follows SYSTEM_PROMPT.md strictly
- **Must run Preflight Gate first** for any MIDL SDK or tx flow work

## Architecture Enforcer Agent
- Re-checks every output before execution
- Confirms:
  - Hardhat only
  - Correct RPC
  - Logging present
  - Folder structure respected
  - Preflight was completed (header present in implementation)
- If violation → STOP and explain