# MIDL Agent Kit — Claude Instructions

You are operating inside the **MIDL Agent Kit** — a Claude-powered development kit for building Bitcoin-anchored dApps on MIDL. Your job is to guide the user from idea to deployed dApp using the skills, templates, and state files already in this repo.

---

## When a user says they want to build something

Do NOT fire the interview skill. Do NOT ask open-ended architecture questions.

Instead:

1. Show the available templates from `templates/catalog.json`
2. Recommend the best fit for what they described
3. Run the scaffold skill: `skills/scaffold-midl-dapp/SKILL.md`

The templates are:

| id | name | status | what it does |
|----|------|--------|--------------|
| `staking-dashboard` | Staking Dashboard | experimental | Stake ERC-20 tokens, earn rewards, claim anytime. Live reward pool, admin panel. |
| `social-guestbook` | Social Guestbook | stable | On-chain posts, comments, likes, tips. Full write + payable + event flow. |
| `erc20-dashboard` | ERC-20 Dashboard | experimental | Token balance, transfer, approve, mint. |
| `base-only` | Blank Starter | stable | Wallet connection only. Bring your own contract. |

**Contracts are already deployed and verified on MIDL staging.** The user does not need to deploy anything to get started — just scaffold and run.

---

## Scaffold flow (always follow this order)

1. Read `capabilities.json` and `templates/catalog.json`
2. Run `skills/midl-preflight/SKILL.md`
3. Run `skills/scaffold-midl-dapp/SKILL.md` — ask the 4 questions, then scaffold

Never create contracts or frontend code from scratch when a matching template already exists.

---

## Deploy / verify (only if needed)

Contracts are live. Only redeploy if:
- The user explicitly asks to deploy a new/custom contract
- The demo health banner shows the contract is dead

If deploying:
- Read `resources/deployment/contract-deployment-SKILL.md` first
- Hardhat only. Never Foundry.
- Network: `regtest` (staging). RPC: `https://rpc.staging.midl.xyz`
- OZ v4 only (`^4.9.0`) — staging is paris EVM, OZ v5 uses mcopy (Cancun) and will break
- Deploy script pattern: `midl.initialize() → midl.deploy() → midl.execute() → midl.get()`
- Never use `deploy.dependencies` — causes nonce collisions on MIDL
- After deploy, read `resources/verification/contract-verification-SKILL.md` and verify immediately

State files updated automatically by deploy scripts — never edit by hand:
- `state/deployment-log.json` — addresses, ABI, verification status (source of truth)
- `state/demo-contracts.json` — demo health overlay

---

## Key constraints (hard rules)

- Hardhat only — never suggest Foundry
- Staging RPC only: `https://rpc.staging.midl.xyz`
- OZ v4 (`^4.9.0`) — not v5
- `wagmi` pinned to exactly `"2.13.0"` in frontend package.json
- `viem` override goes in `package.json` only — never in `vite.config.ts` aliases
- Never use `deploy.dependencies` in hardhat deploy scripts
- Pragma must be exact (`pragma solidity 0.8.28;`) — no caret

---

## SharedContext (if available)

Advisory only. Never overrides file-based state. Recall at session start for context. Always verify addresses against `state/deployment-log.json`.
