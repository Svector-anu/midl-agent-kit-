# Architecture Overview — MIDL Agent Kit v1

---

## What this is

A monorepo where AI skills, Hardhat harnesses, and Vite templates compose into a repeatable pipeline for building Bitcoin-native dApps. The core idea: **shared state files** (`deployment-log.json`, `demo-contracts.json`) are the contract between the deploy layer and the UI layer. No hardcoded addresses anywhere.

---

## Folder structure

```
midl-agent-kit/
│
├── templates/                  Template source + registry
│   ├── catalog.json            Single source of truth for template ids, status, contracts
│   ├── midl-vite-dapp/         Base template (wallet + health check + write hook)
│   └── erc20-dashboard/        ERC-20 template (extends base)
│
├── dapps/                      Live scaffolded apps and hardhat harnesses
│   ├── social-guestbook-hardhat/     Deploy + verify SocialGuestbook
│   ├── erc20-dashboard-hardhat/      Deploy + verify ERC20Token
│   ├── social-guestbook-from-template/   Scaffolded live app
│   └── erc20-dashboard-from-template/    Scaffolded live app
│
├── state/                      Shared state (read by all dApps at build time)
│   ├── deployment-log.json     All deployments: address, ABI, verification status
│   └── demo-contracts.json     Demo instances: drives auto-heal health check
│
├── skills/                     AI agent skill definitions (Claude Code reads these)
│   ├── scaffold-midl-dapp/     Full scaffold flow (4 questions → copy → wire)
│   ├── deploy-contracts/       Deploy to staging or mainnet
│   ├── midl-preflight/         Mandatory gate before any MIDL work
│   └── ...
│
├── resources/                  Reference docs + skill copies for Claude sessions
│   ├── deployment/             Deploy skill + canonical DEPLOYMENT-PLAN.md
│   └── verification/           Verification skill + reference
│
└── docs/                       Developer-facing documentation
    ├── GOLDEN_PATH.md          Step-by-step: scaffold → deploy → verify → run
    └── ARCHITECTURE_OVERVIEW.md (this file)
```

---

## State persistence model

```
                 ┌─────────────────────────────┐
                 │   Hardhat Deploy Script      │
                 │   hre.midl.deploy()          │
                 │   hre.midl.execute()         │
                 └────────────┬────────────────┘
                              │ writes address
                    ┌─────────▼──────────────────────┐
                    │   state/deployment-log.json     │
                    │   address, ABI, verified, etc.  │
                    └─────────┬──────────────────────┘
                              │ also writes
                    ┌─────────▼──────────────────────┐
                    │   state/demo-contracts.json     │
                    │   status, chainEpoch, health    │
                    └─────────┬──────────────────────┘
                              │ read at build time via @state alias
                    ┌─────────▼──────────────────────┐
                    │   dapps/<slug>/src/lib/         │
                    │   contract.ts                   │
                    │   CONTRACT_ADDRESS / ABI        │
                    └─────────┬──────────────────────┘
                              │ used by
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
     useMidlContractRead  useMidlContractWrite  useDemoHealth
              │               │               │
              └───────────────┴───────────────┘
                              │
                    ┌─────────▼──────────────────────┐
                    │   React UI                      │
                    │   DemoHealthBanner              │
                    │   BalanceView, TransferForm...  │
                    └────────────────────────────────┘
```

**Key rule:** The `@state` alias (configured in `vite.config.ts`) resolves to `../../state/` from any dApp. Contract addresses are **never hardcoded** in UI source.

---

## How skills interact with scaffold

```
User: "scaffold a social-guestbook dApp"
        │
        ▼
skills/scaffold-midl-dapp/SKILL.md
  1. Reads capabilities.json + MIDDLEWARE.md
  2. Reads templates/catalog.json
  3. Runs midl-preflight (hard gate)
  4. Asks 4 questions (template, network, wallets, contract)
  5. Validates: status, directory collision, deployment-log entry
  6. Copies templates/<sourceDir> → dapps/<slug>/
  7. Substitutes: CONTRACT_NAME, slug, network, connectors
  8. Triggers UI quality gate (baseline-ui skill)
        │
        ▼
  dapps/<slug>/ — ready to npm install && npm run dev
```

The scaffold skill **never deploys**. Deployment is a separate step via `deploy-contracts` skill or the hardhat harness directly.

---

## How templates scale

To add a new template:
1. Build the source directory under `templates/<id>/`
2. Add an entry to `templates/catalog.json` with `status: "disabled"` until it's ready
3. Deploy its contract and add to `state/deployment-log.json`
4. Flip status to `experimental`, then `stable` after validation

The scaffold skill enforces `requiredCapabilities` — templates that need features not yet enabled in `capabilities.json` are gated automatically.

**v1 freeze:** No new templates until the two shipped ones are fully validated across a testnet reset cycle.

---

## Auto-heal health check

Every scaffolded dApp includes `useDemoHealth` + `DemoHealthBanner`:

```
on mount → call useDemoHealth()
  → reads CONTRACT_ADDRESS from state/deployment-log.json
  → calls eth_getCode on RPC
  → if code === "0x" (no bytecode at address):
      status = "unavailable"
      DemoHealthBanner renders:
        "⚠ Demo contract unavailable — testnet may have reset."
        [Redeploy demo] → modal with exact CLI commands
        [Not now] → dismiss for session
  → if code exists:
      status = "healthy"
      banner hidden
```

No polling. Single check on mount. Dismissable. No scary technical words in the UI.

---

## Key invariants (v1)

| Invariant | Where enforced |
|---|---|
| No hardcoded addresses in UI | `@state` alias + scaffold substitution |
| Exact pragma version (no `^`) | midl-preflight + contract-verification skill |
| MNEMONIC never written to disk | hardhat.config.ts reads `process.env.MNEMONIC` only |
| State schema v1.0 | Both state files have `"schemaVersion": "1.0"` |
| Templates frozen | catalog.json status + scaffold Gate 0 |
