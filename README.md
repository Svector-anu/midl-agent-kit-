# MIDL Agent Kit — v1

A Claude-powered development kit for building Bitcoin-anchored dApps on [MIDL](https://midl.xyz). Bring an idea, get a deployed contract and running frontend. The kit provides the templates, deploy harness, and agent skills — Claude provides the execution.

It's an agent-native kit — the skills, state files, and templates are designed to be operated by Claude, not just read by a human. The human says what they want to build. Claude does the rest.

---

## Who this is for

- **Developers** building on MIDL who want a running dApp up quickly
- **Teams** who want pre-wired wallet connection, contract reads/writes, and auto-heal UX out of the box
- **AI agents** (Claude Code) that use the bundled skills to scaffold, deploy, and verify without manual setup

---

## Status

- **4 templates**: Social Guestbook (stable), Blank Starter (stable), ERC-20 Dashboard (experimental), Staking Dashboard (experimental)
- All demo contracts are deployed and verified on MIDL staging — tracked in `state/deployment-log.json`
- Staking Dashboard ships with a live reward pool, owner-adjustable rate, and a full admin panel UI
- See [`docs/STATUS.md`](docs/STATUS.md) for the full ASCII status block (paste-ready for team chat)

---

## What's shipped (v1)

| Template | Status | What it does |
|---|---|---|
| `social-guestbook` | stable | Posts, comments, likes, tips — full write/payable/event flow |
| `erc20-dashboard` | experimental | Balance, transfer, approve, owner-only mint |
| `base-only` | stable | Wallet connection only — bring your own contract |

Both named templates have a live contract deployed and verified on MIDL staging.

---

## Quick start

```bash
git clone https://github.com/Svector-anu/midl-agent-kit- && cd midl-agent-kit-
```

Then open **Claude Code** in that folder and just talk:

> "I want to build a staking dApp on MIDL"

Claude will ask which template you want, scaffold it, install dependencies, deploy contracts if needed, and tell you exactly when to run `npm run dev`. You don't need to read the rest of this README to get started — just clone and chat.

Everything else (deploy, verify, wire contracts, configure the frontend) is handled through conversation.

---

## How deployment state works

Two files track every deployed contract:

**`state/deployment-log.json`** — source of truth. Contains address, ABI, constructor args, and verification status for every deployed contract. dApps read their contract address and ABI from here at build time — never hardcoded.

**`state/demo-contracts.json`** — tracks which contracts back the template demos. Drives the auto-heal health check that appears in the browser when a contract becomes unavailable.

When you run a deploy script, both files update automatically. You never edit them by hand.

---

## What happens after a network refresh

MIDL staging refreshes periodically. When this happens, demo instances may become unavailable.

The app detects this and shows a banner:

> ⚠ Demo instance needs redeployment.

Click **Redeploy demo** — the modal shows the exact commands. Run them, then click **Done — reload app**. The app re-reads `state/deployment-log.json` and the banner disappears.

No code changes. No manual state edits. The deploy script handles everything.

---

## Repo layout

```
templates/              Template source directories + registry
  catalog.json          Template registry (ids, status, required contracts)
  midl-vite-dapp/       Base template (wallet + write hook + health check)
  erc20-dashboard/      ERC-20 template

dapps/                  Scaffolded dApps and hardhat deploy harnesses
  social-guestbook-hardhat/     Deploy + verify SocialGuestbook
  erc20-dashboard-hardhat/      Deploy + verify ERC20Token

state/
  deployment-log.json   All deployments — address, ABI, verification status
  demo-contracts.json   Template demo instances — drives auto-heal

skills/                 AI agent skill definitions (used by Claude Code)
  scaffold-midl-dapp/
  deploy-contracts/
  midl-preflight/

resources/              Reference docs and skill copies for Claude Code
  deployment/
  verification/
```

---

## Network

| | Staging |
|---|---|
| RPC | `https://rpc.staging.midl.xyz` |
| Explorer | `https://blockscout.staging.midl.xyz` |
| Chain ID | 15001 |
| Bitcoin | Regtest (mempool: `https://mempool.staging.midl.xyz`) |

---

## Adding templates (future)

Templates are frozen at v1. The registry is `templates/catalog.json`. Each entry declares `status`, `requiredContracts`, and `requiredCapabilities` — the scaffold skill enforces these at gate time.

---

## Optional: long-term agent memory (SharedContext)

If your LLM client supports MCP, you can plug in SharedContext as a shared memory layer for this kit. It helps agents remember previous template choices, MIDL-specific gotchas, and deploy patterns across sessions — without re-explaining them every time. File-based state (`deployment-log.json`, `demo-contracts.json`, `erc-compatibility.json`) always wins over any stored facts.

See [`resources/memory/SHARED_CONTEXT.md`](resources/memory/SHARED_CONTEXT.md) for usage patterns and safety rules.
