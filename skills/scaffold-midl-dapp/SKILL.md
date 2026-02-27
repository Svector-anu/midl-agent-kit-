# Scaffold MIDL dApp

## Boot Sequence (ALWAYS first)

1. Read `~/midl_agent_skills/capabilities.json`
2. Read `~/midl_agent_skills/MIDDLEWARE.md`
3. Run `skills/midl-preflight/SKILL.md` — no exceptions

---

## Purpose

Copy `templates/midl-vite-dapp/` into `dapps/<name>/`, wire up contract bindings from `deployment-log.json`, and produce a runnable skeleton dApp ready for feature development.

---

## Questions (ask before any file is created)

Ask the user these **4 questions** in a single prompt — not one at a time:

---

```
SCAFFOLD QUESTIONS — answer all 4:

1. dApp slug (directory name):
   Lowercase, hyphenated. Example: token-dashboard, staking-ui, nft-gallery
   → Used as: dapps/<slug>/ and package.json "name"

2. Contract name (PascalCase):
   Must match an entry in state/deployment-log.json.
   Example: SocialGuestbook, MyToken, StakingVault
   → Used as: CONTRACT_NAME in src/lib/contract.ts

3. Network:
   a) staging (default) — https://rpc.staging.midl.xyz
   b) mainnet — https://rpc.midl.xyz

4. Wallet connector(s):
   a) Xverse only (default)
   b) Xverse + Leather
```

---

Do NOT proceed until all 4 answers are received.

---

## Validation (hard gate — runs before any file is created)

### Gate 1 — directory collision

```
if dapps/<slug>/ already exists → STOP
Print: "dapps/<slug>/ already exists. Choose a different slug or delete the existing directory."
```

### Gate 2 — contract name in deployment-log.json

```
Read state/deployment-log.json
Extract all names from deployments[].name array
If CONTRACT_NAME not in that list → STOP
Print:
  "Contract '<name>' not found in state/deployment-log.json."
  "Available contracts: <list all names>"
  "Deploy the contract first (skills/deploy-contracts/SKILL.md) or choose one of the above."
```

This gate exists because `src/lib/contract.ts` throws at runtime if the entry is missing. Scaffolding without a valid deployment produces a dApp that crashes on load.

### Gate 3 — network config

```
validateNetwork()  ← from MIDDLEWARE.md
```

---

## Steps

### 1 — Copy template

```bash
cp -r templates/midl-vite-dapp dapps/<slug>
```

### 2 — Apply scaffold substitutions

| File | Change |
|------|--------|
| `package.json` | `"name": "midl-vite-dapp"` → `"name": "<slug>"` |
| `src/lib/contract.ts` | `CONTRACT_NAME = "MyContract"` → `CONTRACT_NAME = "<ContractName>"` |
| `src/App.tsx` | `"My MIDL dApp"` → `"<Display Name>"` |
| `index.html` | `<title>My MIDL dApp</title>` → `<title><Display Name></title>` |

If `CONTRACT_NAME` was found in `deployment-log.json`, also update the export names in these files:

| File | Old | New |
|------|-----|-----|
| `src/lib/contract.ts` | `CONTRACT_ADDRESS` | `<CONTRACT_NAME>_ADDRESS` |
| `src/lib/contract.ts` | `CONTRACT_ABI` | `<CONTRACT_NAME>_ABI` |
| `src/hooks/useDemoHealth.ts` | `CONTRACT_ADDRESS` | `<CONTRACT_NAME>_ADDRESS` |
| `src/components/DemoHealthBanner.tsx` | `CONTRACT_ADDRESS` | `<CONTRACT_NAME>_ADDRESS` |

### 3 — Apply network substitution (if mainnet selected)

Replace in `src/wallet/WalletProvider.tsx` and `src/lib/midl-config.ts`:

```ts
// staging (default — no change needed)
import { regtest } from "@midl/core";

// mainnet
import { mainnet } from "@midl/core";
// and update vite.config.ts proxy target: "https://rpc.midl.xyz"
```

### 4 — Apply connector substitution (if Xverse + Leather selected)

```ts
// src/lib/midl-config.ts
import { xverseConnector } from "@midl/connectors";
import { leatherConnector } from "@midl/connectors";

export const midlConfig = createConfig({
  networks: [regtest],
  connectors: [xverseConnector(), leatherConnector()],
  persist: true,
});
```

### 5 — Trigger UI milestone #1 pipeline

After scaffold is complete, run the UI quality gate:

```
AUTO: baseline-ui → dapps/<slug>/src/styles.css
AUTO: baseline-ui → dapps/<slug>/src/App.tsx
```

Cap: `capabilities.gates.maxAutoPolishIterations` (3) iterations.

---

## Output

```
dapps/<slug>/
  index.html
  package.json
  tsconfig.json
  tsconfig.node.json
  vite.config.ts
  src/
    App.tsx
    main.tsx
    styles.css
    lib/
      contract.ts       ← CONTRACT_NAME wired
      midl-config.ts
    hooks/
      useMidlContractWrite.ts
    types/
      app.ts
    components/
      TxStatus.tsx
      WalletConnect.tsx
    wallet/
      WalletProvider.tsx
```

---

## Completion Confirmation

```
scaffold-midl-dapp: COMPLETE
dApp: dapps/<slug>/
Contract: <ContractName> (from deployment-log.json)
Network: staging | mainnet
Connectors: xverse | xverse + leather
UI milestone #1: triggered
Next step: npm install && npm run dev
```
