# Scaffold MIDL dApp

## Boot Sequence (ALWAYS first)

1. Read `~/midl_agent_skills/capabilities.json`
2. Read `~/midl_agent_skills/MIDDLEWARE.md`
3. Read `~/midl_agent_skills/templates/catalog.json` — extract `templates[]`
4. Run `skills/midl-preflight/SKILL.md` — no exceptions

---

## Purpose

Scaffold a runnable MIDL dApp from a registered template (or blank starter) into `dapps/<slug>/`, wire up contract bindings from `deployment-log.json`, and produce a skeleton ready for feature development.

---

## Questions (ask before any file is created)

Ask the user these **4 questions** in a single prompt — not one at a time:

---

```
SCAFFOLD QUESTIONS — answer all 4:

1. Template:
   Pick a template from the registry, or use the blank starter / scratch.
   - social-guestbook  [stable]   Multi-user guestbook with posts, comments, likes, tips
   - erc20-dashboard   [experimental] ERC-20 balance, transfer, approve, mint
   - base-only         [stable]   Blank starter — wallet connection only, bring your own contract
   - scratch           Alias for base-only

2. Network:
   a) staging (default) — https://rpc.staging.midl.xyz
   b) mainnet — https://rpc.midl.xyz

3. Wallet connector(s):
   a) Xverse only (default)
   b) Xverse + Leather

4. Contract name (PascalCase):
   Auto-filled from registry if a named template is selected (shown below).
   Required only for base-only / scratch.
   Must match an entry in state/deployment-log.json.
   Example: SocialGuestbook, MyToken, StakingVault
   → Used as: CONTRACT_NAME in src/lib/contract.ts
```

**Auto-fill rule**: when a named template is selected, pre-populate Q4 from
`catalog.json → templates[id].requiredContracts[0]` and show it to the user:
```
Contract name: SocialGuestbook (from template — override if needed)
```

**dApp slug**: derived automatically from the template id (e.g., `social-guestbook`).
For base-only / scratch the slug equals the contract name lowercased and hyphenated,
unless the user provides one alongside Q4.

Do NOT proceed until all 4 answers are received.

---

## Validation (hard gate — runs before any file is created)

### Gate 0 — template status check

```
Read catalog.json → find entry where id == selected template
If status == "disabled" → STOP
  Print: "Template '<id>' is disabled. Choose a different template."
If status == "experimental" → WARN (do not stop)
  Print: "⚠ Template '<id>' is experimental and may change. Proceeding..."
If requiredCapabilities is non-empty:
  For each cap in requiredCapabilities:
    If capabilities.json → features[cap] !== true → STOP
    Print: "Template '<id>' requires capability '<cap>' which is not enabled."
```

### Gate 1 — directory collision

```
if dapps/<slug>/ already exists → STOP
Print: "dapps/<slug>/ already exists. Choose a different slug or delete the existing directory."
```

### Gate 2 — contract name in deployment-log.json

```
Skip this gate if template is base-only / scratch AND user provided no contract name.
Otherwise:
  Read state/deployment-log.json
  Extract all names from deployments[].name array
  If CONTRACT_NAME not in that list → STOP
  Print:
    "Contract '<name>' not found in state/deployment-log.json."
    "Available contracts: <list all names>"
    "Deploy the contract first (skills/deploy-contracts/SKILL.md) or choose one of the above."
```

This gate exists because `src/lib/contract.ts` throws at runtime if the entry is missing.

### Gate 3 — network config

```
validateNetwork()  ← from MIDDLEWARE.md
```

---

## Steps

### 1 — Resolve source directory

```
sourceDir = catalog.json → templates[id].sourceDir
           (base-only and scratch both use "templates/midl-vite-dapp")
```

### 2 — Copy template

```bash
cp -r <sourceDir> dapps/<slug>
```

### 3 — Apply scaffold substitutions

| File | Change |
|------|--------|
| `package.json` | `"name": "midl-vite-dapp"` → `"name": "<slug>"` |
| `src/lib/contract.ts` | `CONTRACT_NAME = "MyContract"` → `CONTRACT_NAME = "<ContractName>"` |
| `src/App.tsx` | `"My MIDL dApp"` → `"<Display Name>"` |
| `index.html` | `<title>My MIDL dApp</title>` → `<title><Display Name></title>` |

If `CONTRACT_NAME` was found in `deployment-log.json`, also rename the export symbols:

| File | Old | New |
|------|-----|-----|
| `src/lib/contract.ts` | `CONTRACT_ADDRESS` | `<CONTRACT_NAME>_ADDRESS` |
| `src/lib/contract.ts` | `CONTRACT_ABI` | `<CONTRACT_NAME>_ABI` |
| `src/hooks/useDemoHealth.ts` | `CONTRACT_ADDRESS` | `<CONTRACT_NAME>_ADDRESS` |
| `src/components/DemoHealthBanner.tsx` | `CONTRACT_ADDRESS` | `<CONTRACT_NAME>_ADDRESS` |

### 4 — Apply network substitution (if mainnet selected)

Replace in `src/wallet/WalletProvider.tsx` and `src/lib/midl-config.ts`:

```ts
// staging (default — no change needed)
import { regtest } from "@midl/core";

// mainnet
import { mainnet } from "@midl/core";
// and update vite.config.ts proxy target: "https://rpc.midl.xyz"
```

### 5 — Apply connector substitution (if Xverse + Leather selected)

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

### 6 — Trigger UI milestone #1 pipeline

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
      useDemoHealth.ts
    types/
      app.ts
    components/
      TxStatus.tsx
      WalletConnect.tsx
      DemoHealthBanner.tsx
    wallet/
      WalletProvider.tsx
```

---

## Completion Confirmation

```
scaffold-midl-dapp: COMPLETE
Template: <template-id> (<status>)
dApp: dapps/<slug>/
Contract: <ContractName> (from deployment-log.json)
Network: staging | mainnet
Connectors: xverse | xverse + leather
UI milestone #1: triggered
Next step: npm install && npm run dev
```
