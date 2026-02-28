# MIDL Agent Kit — v1

A production-ready monorepo for building Bitcoin-native dApps on [MIDL](https://midl.xyz): smart contracts that settle on Bitcoin, scaffolded as Vite + React apps, deployed and verified from a single CLI command.

---

## Who this is for

- **Developers** building on MIDL who want a running dApp up quickly
- **Teams** who want pre-wired wallet connection, contract reads/writes, and auto-heal UX out of the box
- **AI agents** (Claude Code) that use the bundled skills to scaffold, deploy, and verify without manual setup

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
# 1. Clone
git clone https://github.com/Svector-anu/midl-agent-kit- && cd midl-agent-kit-

# 2. Scaffold a dApp (Claude Code runs the skill)
# Open Claude Code and say: "scaffold a social-guestbook dApp"

# 3. Install and run
cd dapps/<your-slug>
npm install
npm run dev

# 4. Deploy a contract (if the demo instance is unavailable)
cd dapps/social-guestbook-hardhat
export MNEMONIC="your twelve words"
npx hardhat deploy --network regtest --tags SocialGuestbook
```

See [`docs/GOLDEN_PATH.md`](docs/GOLDEN_PATH.md) for the full step-by-step with expected outputs.

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

> ⚠ Demo instance unavailable — staging has refreshed.

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
