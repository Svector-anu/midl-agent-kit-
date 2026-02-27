# MIDL Agent Kit

A monorepo of production-ready templates, deploy harnesses, and AI agent skills for building Bitcoin-native dApps on [MIDL](https://midl.xyz).

---

## What is this?

MIDL lets smart contracts settle on Bitcoin. This kit gives you:

- **Templates** — pre-wired Vite dApps ready to scaffold
- **Hardhat harnesses** — deploy scripts that keep shared state in sync
- **Agent skills** — AI-driven workflows for scaffolding, deploying, and verifying

---

## Picking a template

| Template | Status | What it proves |
|---|---|---|
| `social-guestbook` | stable | writes, payable calls, events, social actions |
| `erc20-dashboard` | experimental | reads, transfer, approve, owner-only mint |
| `base-only` | stable | wallet connection only — bring your own contract |

Scaffold a new dApp:

```
# The scaffold skill asks you 4 questions:
# 1. Template
# 2. Network (staging / mainnet)
# 3. Wallets (Xverse / Xverse + Leather)
# 4. Contract name (auto-filled for named templates)
```

The skill lives at `skills/scaffold-midl-dapp/SKILL.md`.

---

## How deployment state works

All deployed contract addresses live in two files:

**`state/deployment-log.json`** — source of truth for every deployment.
Each entry has the address, ABI, constructor args, and verification status.
dApps import their contract address and ABI from here at build time.

**`state/demo-contracts.json`** — subset tracking template demo instances.
Used by the auto-heal health check to know which contracts to monitor.

When you deploy a contract with a hardhat harness script, both files are updated automatically:

```bash
cd dapps/<name>-hardhat
export MNEMONIC="your twelve words"
npx hardhat deploy --network regtest --tags <ContractName>
```

---

## What to do when testnet resets

MIDL staging resets periodically. When it does, every deployed contract disappears.

**You'll see this in the browser:**

> ⚠ Demo contract unavailable — testnet may have reset.

Click **Redeploy demo** — the modal shows the exact commands to run. After deploying, click **Done — reload app**. The app re-reads `state/deployment-log.json` and the banner disappears.

**Manually:**

```bash
# 1. Deploy
cd dapps/social-guestbook-hardhat
export MNEMONIC="your twelve words"
npx hardhat deploy --network regtest --tags SocialGuestbook

# 2. Verify (optional but recommended)
npx hardhat verify --network regtest <NEW_ADDRESS>
```

Repeat for each harness. The deploy script updates both state files — no manual edits needed.

---

## Repo layout

```
templates/          Pre-wired dApp templates (source of truth for scaffolding)
  catalog.json      Template registry — ids, status, required contracts
  midl-vite-dapp/   Base template (wallet connection + write hook + health check)
  erc20-dashboard/  ERC-20 template (balance, transfer, approve, mint)

dapps/              Scaffolded dApps and hardhat harnesses
  social-guestbook-hardhat/     Deploy + verify SocialGuestbook
  erc20-dashboard-hardhat/      Deploy + verify ERC20Token
  social-guestbook-from-template/   Live scaffold (staging)
  erc20-dashboard-from-template/    Live scaffold (staging)

state/
  deployment-log.json     All deployments — address, ABI, verification status
  demo-contracts.json     Template demo instances — drives auto-heal health check

skills/             AI agent skill definitions
  scaffold-midl-dapp/   Scaffold a new dApp from a template
  deploy-contracts/     Deploy a contract to staging or mainnet
  midl-preflight/       Pre-flight checks before any operation
```

---

## Network

| | Staging | Mainnet |
|---|---|---|
| RPC | `https://rpc.staging.midl.xyz` | `https://rpc.midl.xyz` |
| Explorer | `https://blockscout.staging.midl.xyz` | `https://blockscout.midl.xyz` |
| Chain ID | 15001 | — |
