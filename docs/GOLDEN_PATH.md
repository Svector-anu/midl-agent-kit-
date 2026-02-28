# Golden Path — Scaffold → Deploy → Verify → Run

The complete developer flow from zero to a running MIDL dApp.

---

## Prerequisites

- Node.js ≥ 18
- Claude Code CLI (`npm install -g @anthropic-ai/claude-code`)
- A Bitcoin wallet mnemonic (Xverse or Leather on staging regtest)
- BTC balance on staging — request from the MIDL team if needed

---

## Step 1 — Scaffold

Open Claude Code in the repo root and say:

```
scaffold a social-guestbook dApp
```

Claude runs `skills/scaffold-midl-dapp/SKILL.md` and asks 4 questions in one prompt:

```
1. Template    → social-guestbook [stable]
2. Network     → staging (default)
3. Wallets     → Xverse only (default)
4. Contract    → SocialGuestbook (auto-filled)
```

**Expected output:**
```
scaffold-midl-dapp: COMPLETE
Template: social-guestbook (stable)
dApp: dapps/social-guestbook/
Contract: SocialGuestbook
Next step: npm install && npm run dev
```

---

## Step 2 — Install and run

```bash
cd dapps/social-guestbook
npm install
npm run dev
```

**Expected:** Browser opens at `http://localhost:5173`. Wallet connect button visible. If the contract is live on staging, the health banner is hidden.

---

## Step 3 — Deploy (if contract is missing or testnet reset)

```bash
cd dapps/social-guestbook-hardhat
export MNEMONIC="your twelve words here"
npx hardhat deploy --network regtest --tags SocialGuestbook
```

**Expected output:**
```
SocialGuestbook deployed at: 0x...
state/deployment-log.json updated
state/demo-contracts.json updated
deploy-contracts: COMPLETE
```

Takes 30 seconds to 2 minutes. If it appears to hang after "Executing transaction...", wait — this is normal on staging (Bitcoin block time).

---

## Step 4 — Verify

```bash
npx hardhat verify --network regtest <ADDRESS>
```

For ERC20Token (constructor args required):
```bash
npx hardhat verify --network regtest <ADDRESS> <deployer_address> <deployer_address>
```

**Expected output:**
```
Successfully verified contract SocialGuestbook on the block explorer.
https://blockscout.staging.midl.xyz/address/<ADDRESS>#code
```

---

## Step 5 — Reload the dApp

Go back to `http://localhost:5173` and hard-refresh. The health banner disappears. The dApp reads the new address from `state/deployment-log.json` at build time.

---

## ERC-20 Dashboard path

Same flow, different template and harness:

```bash
# Scaffold
# Say: "scaffold an erc20-dashboard dApp"

# Install
cd dapps/erc20-dashboard
npm install && npm run dev

# Deploy
cd dapps/erc20-dashboard-hardhat
export MNEMONIC="your twelve words"
npx hardhat deploy --network regtest --tags ERC20Token

# Verify (constructor takes deployer address twice)
npx hardhat verify --network regtest <ADDRESS> <DEPLOYER> <DEPLOYER>
```

---

## Common errors

| Error | Cause | Fix |
|---|---|---|
| `HH303: Unrecognized task 'deploy'` | `hardhat-deploy` package missing | `npm install --legacy-peer-deps` |
| `HH801: requires @midl/viem, @midl/node` | MIDL packages not installed | Add `@midl/node` and `@midl/viem` to `devDependencies` |
| `btcFeeRate returned no data` | Wrong RPC URL | Use `https://rpc.staging.midl.xyz` not a local URL |
| Hangs at "Executing transaction..." (>30s) | Normal — Bitcoin block time | Wait up to 2 min, check mempool explorer |
| Hangs immediately (0s) | Missing `@midl/viem` override | Confirm `"viem": "npm:@midl/viem@2.21.39"` in `dependencies` |
| `bytecode doesn't match` on verify | Pragma uses `^` instead of exact version | Set `pragma solidity 0.8.28;` (no caret) |
| Health banner shows after deploy | Browser cached old state | Hard-refresh or `npm run dev` restart |

---

## Checking contract balance (staging)

```bash
# Your deployer's BTC address
npx hardhat midl:address 0 --network regtest

# Balance
curl "https://mempool.staging.midl.xyz/api/address/<BTC_ADDRESS>"
```

---

## What the deploy script does automatically

1. Broadcasts a Bitcoin-anchored EVM deployment (BTC + EVM tx in one call)
2. Writes new address to `state/deployment-log.json`
3. Updates `state/demo-contracts.json` status to `active`

You never manually edit state files.
