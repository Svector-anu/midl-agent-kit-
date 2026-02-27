# Midl Agent Skills — Master Project Context
 Canonical reference for all CLI scaffolding, skill builds, and orchestration.


## 1. Vision

Build an open-source **AI Agent Skill Pack and Dev Tool** for Solidity + dApp development on MIDL — contract + wallet + frontend integration — through deploy/verify/test. The system enables structured, guarded, agent-driven workflows from contract writing through deployment and verification, using a layered skill architecture driven by a CLI with Claude Desktop as the advisory reasoning layer.

---

## 2. Goals

- Provide reusable, composable skills that encode best practices for MIDL contract development
- Enforce a safe PLAN → BUILD → DEPLOY lifecycle with explicit gates between phases
- Prevent hallucinated addresses, untested deployments, and unsupported tool usage
- Persist state across skill runs so agents have memory of what has been deployed and verified
- Keep Claude Desktop purely advisory — execution is owned by the CLI
- Ship full MIDL dApps (wallet + tx flows + UI) with reusable scaffolds
- Enforce UI quality gates (baseline-ui / vercel guidelines / accessibility) at milestones

---

## 3. Architecture Layers

```
┌─────────────────────────────────┐
│         Governance Layer        │  capabilities.json — global flags
├─────────────────────────────────┤
│           Skills Layer          │  SKILL.md templates — per-skill logic
├─────────────────────────────────┤
│         Execution Layer         │  CLI — runs skills, calls MCP tools
├─────────────────────────────────┤
│           State Layer           │  Flat JSON files — persist between runs
└─────────────────────────────────┘
```

> SharedContext MCP = reference memory (cross-client), never overrides file truth.
>
> **Truth order:** `capabilities.json` → `state/*.json` → `project_context.md` > SharedContext

### Governance Layer
- **File:** `~/midl_agent_skills/capabilities.json`
- **Scope:** Global. Every skill reads from this single file.
- **Purpose:** Feature flags that enable/disable capabilities across all skills
- **⚠️ Gap:** Exact schema of `capabilities.json` not yet defined. Needs: flag names, types, default values, and which skills depend on which flags.

### Skills Layer
Core skills planned for v1:

| Skill | Purpose |
|-------|---------|
| `write-midl-contract` | Scaffold Solidity contracts for MIDL |
| `generate-hardhat-tests` | Generate Hardhat test files (NOT Foundry) |
| `erc-compatibility-analysis` | Check ERC interface compliance and storage risks |
| `wallet-safety-check` | Validate wallet interactions, PSBT scope, key isolation |
| `deployment-gatekeeper` | Enforce PLAN → BUILD → DEPLOY gates before execution |

> ⚠️ **PAUSED/FLAGGED:** The original plan listed `generate-foundry-tests` as a core skill. **Foundry is not supported on MIDL.** This skill must be renamed to `generate-hardhat-tests` and scoped to Hardhat only. Do not proceed with any Foundry-based skill until MIDL team confirms support.

### Execution Layer
- CLI owns all execution
- Claude Desktop is advisory only — reviews, flags, recommends, never executes
- MCP tools (via `midl-bitcoin` MCP server) handle live Bitcoin and EVM operations

### State Layer
Three flat JSON files in `~/midl_agent_skills/state/`:

| File | Purpose |
|------|---------|
| `deployment-log.json` | Records of all deployed contracts (address, network, timestamp, constructor args) |
| `verified-addresses.json` | Addresses that have been confirmed on Blockscout |
| `erc-compatibility.json` | Results of ERC analysis runs per contract |

- State persists between skill runs
- Skills must read from and write to the correct file — no ad-hoc state files
- Hallucination guard is handled by shared middleware, not individual skills

---

## 4. MIDL Network & Protocol

### Staging Network
| Property | Value |
|----------|-------|
| RPC | `https://rpc.staging.midl.xyz` |
| Chain ID | `15001` (0x3a99) |
| Bitcoin Network | Regtest |
| Bitcoin Explorer | `https://mempool.staging.midl.xyz` |
| EVM Explorer (Blockscout) | `https://blockscout.staging.midl.xyz` |
| Blockscout API | `https://blockscout.staging.midl.xyz/api` |

> ⚠️ Always use **staging RPC**, not a local regtest RPC. System contracts (e.g. `0x0000000000000000000000000000000000001006`) only exist on staging.

### How MIDL Deployments Work
MIDL is a Bitcoin-anchored EVM. Every write operation (deploy or contract call) requires:

1. **EVM transaction** — standard Solidity deployment or function call data
2. **Bitcoin PSBT** — anchors the EVM transaction to the Bitcoin chain
3. **BIP322 signature** — cryptographically links the EVM tx to the BTC tx
4. **`eth_sendBTCTransactions` RPC** — special endpoint that submits both together

This is handled automatically by `@midl/hardhat-deploy` (Hardhat) or the `midl-bitcoin` MCP tools (Claude Desktop).

### Timing Expectations
| Operation | Time | Notes |
|-----------|------|-------|
| Contract deployment | 30s – 2min | Via MCP or Hardhat |
| Write operations | 8–15 minutes | **Normal — do not kill process** |
| Read operations | Instant | Standard EVM RPC |

---

## 5. Deployment Flow (PLAN → BUILD → DEPLOY)

```
PLAN
 └─ write-midl-contract skill generates Solidity source
 └─ erc-compatibility-analysis checks interface compliance
 └─ wallet-safety-check validates signing scope

BUILD
 └─ generate-hardhat-tests skill creates test files
 └─ Tests run via: npx hardhat test --network regtest
 └─ deployment-gatekeeper: tests must pass before proceeding

DEPLOY
 └─ deploy-contract-source MCP tool (or Hardhat CLI)
 └─ deployment-log.json updated with address + args
 └─ contract-verification skill runs (soft recommendation)
 └─ verified-addresses.json updated on success
```

### Deployment Gatekeeper Rules (v1)
- PLAN phase must complete before BUILD starts
- Tests must exist before DEPLOY gate opens
- No deployment to an address that already exists in `deployment-log.json` without explicit override
- Verification is soft (recommended, not blocking) for v1

---

## 6. Toolchain

### Supported: Hardhat
- Plugin: `@midl/hardhat-deploy`
- Runtime: `hre.midl` (Hardhat Runtime Environment extension)
- Key methods: `hre.midl.initialize()`, `hre.midl.deploy()`, `hre.midl.execute()`, `hre.midl.callContract()`
- Deploy CLI: `npx hardhat deploy --network regtest --tags <tag>`
- Verify CLI: `npx hardhat verify --network regtest <ADDRESS> [args...]`

### NOT Supported: Foundry
- `forge`, `cast`, `anvil` — none of these work with MIDL's Bitcoin-anchored deployment flow
- **Do not scaffold any Foundry-based skill or test flow**
- If a future skill requires Foundry, **pause and flag for human review**

### Critical: Viem Override (MANDATORY)
Standard `viem` is missing `estimateGasMulti`, which MIDL requires for gas estimation. Without this override, all contract interactions fail silently or hang.

```json
// package.json
{
  "dependencies": {
    "viem": "npm:@midl/viem@2.21.39"
  },
  "pnpm": {
    "overrides": {
      "viem": "npm:@midl/viem@2.21.39"
    }
  }
}
```

---

## 7. MCP Capabilities (midl-bitcoin MCP server)

Available to Claude Desktop as live callable tools:

### Bitcoin Operations
- `get-wallet-balance` — BTC balance for any address
- `get-address-transactions` — tx history
- `get-blockchain-info` — chain state
- `validate-bitcoin-address` — address validity check
- `estimate-btc-transfer-fee` — fee estimation before sending
- `prepare-btc-transfer` — build unsigned PSBT
- `decode-psbt` — human-readable PSBT decode

### Signing & Broadcasting
- `request-psbt-signature` — request wallet signature on PSBT
- `request-transaction-broadcast` — human confirmation before broadcast
- `broadcast-transaction` — broadcast signed raw tx

### MIDL L2 (Smart Contracts)
- `prepare-contract-deploy` — build BTC PSBT for deployment
- `deploy-contract-source` — full end-to-end: compile → sign → deploy → auto-verify
- `call-contract` — full end-to-end write operation on deployed contract
- `verify-contract` — submit source to Blockscout

> ⚠️ **Advisory constraint:** Claude Desktop's bash environment has NO network egress. `npm install`, `curl`, and similar commands will fail from bash. All live network operations must go through MCP tools.

---

## 8. MIDL JS SDK Reference

### Key Packages
| Package | Role |
|---------|------|
| `@midl/core` | Bitcoin primitives (connect, sign, UTXO, transfer) |
| `@midl/react` | React hooks wrapping core actions |
| `@midl/connectors` | Wallet connectors (Xverse, Leather, Unisat, Phantom, Bitget, MagicEden) |
| `@midl/node` | Node.js keypair connector (no browser wallet needed) |
| `@midl/executor` | Protocol executor (deploy, write contracts) |
| `@midl/executor-react` | React hooks for executor actions |
| `@midl/viem` | Patched viem with `estimateGasMulti` |
| `@midl/hardhat-deploy` | Hardhat plugin for MIDL deployments |
| `@midl/satoshi-kit` | Pre-built wallet connection UI |

### 4-Step Write Transaction Flow
Every contract write on MIDL follows this sequence:
1. `addTxIntention` — describe the EVM transaction
2. `finalizeBTCTransaction` — build Bitcoin PSBT, triggers wallet signing
3. `signIntention` — sign the intention linked to BTC tx ID
4. `sendBTCTransactions` — broadcast both BTC and EVM transactions

### Supported Wallets
- Xverse (note: UTXO indexer can lag on regtest — use Leather as fallback)
- Leather (more reliable on staging/regtest)
- Unisat, Phantom, Bitget, MagicEden

### Address Types
- `P2TR` (Taproot / Ordinals purpose) — used for EVM identity
- `P2WPKH` / `P2SH-P2WPKH` (Payment purpose) — used for BTC fees

---

## 9. ERC Compatibility Rules

### Known Working on MIDL
- ERC-20 (standard and collateral variants — verified on staging)
- Rune-backed ERC-20 via `addRuneERC20` (`@midl/executor`)

### Rune ERC-20 Constraints
- Rune name must be ≥ 12 characters
- Rune must have ≥ 6 Bitcoin confirmations before bridging
- Uses `edictRune` under the hood instead of `transferBTC`

### ⚠️ Gaps — Needs Human Clarification
- ERC-721 (NFT): unknown if storage layout is compatible with MIDL's EVM
- ERC-1155: unknown
- Upgradeable contracts (OpenZeppelin Proxy patterns): storage collision risk on MIDL not assessed
- EVM version: use `paris` — do not use `shanghai` or later on staging

---

## 10. Wallet Safety Rules

- **Never hardcode mnemonics or private keys** in skill output — always reference `process.env.MNEMONIC`
- **PSBT signing scope** must be explicit — specify which input indices are signed
- **`publish: false`** should be the default for test/dry-run PSBT flows; only set `publish: true` when ready to broadcast
- **Key isolation:** Ordinals address (P2TR) is for EVM identity; Payment address (P2WPKH) is for BTC fees — skills must not conflate these
- Xverse UTXO indexer can fail on regtest — always suggest Leather as fallback in skill guidance

---

## 11. Contract Verification Rules

- Use **exact pragma versions** (`pragma solidity 0.8.24;` not `^0.8.24`)
- Compiler settings must match exactly between deployment and verification:
  - Solidity version
  - Optimizer enabled/disabled
  - Optimizer runs (default: 200)
  - EVM version (`paris`)
- Verify immediately after deployment while settings are fresh
- Document all constructor arguments in deployment scripts
- For existing contracts: decode compiler version from bytecode suffix (`000818` = 0.8.24, `00081c` = 0.8.28)
- `sourcify.enabled` must be `false` in hardhat.config.ts
- Blockscout verification is **soft (recommended)** for v1 — not a hard deploy gate

### Hardhat Config for Verification
```typescript
etherscan: {
  apiKey: { regtest: "no-api-key-needed" },
  customChains: [{
    network: "regtest",
    chainId: 15001,
    urls: {
      apiURL: "https://blockscout.staging.midl.xyz/api",
      browserURL: "https://blockscout.staging.midl.xyz"
    }
  }]
},
sourcify: { enabled: false }
```

---

## 12. Claude Desktop Guidance Rules

1. **Advisory only** — never execute, never modify files, never call MCP tools autonomously
2. **Pause and flag** if any flow requires Foundry, unsupported EVM versions, or tools not in the MIDL toolchain
3. **Flag hallucination risks** — any assumed address, invented contract name, or unverified state reference
4. **Check state file targeting** — skills must write to the correct file in `~/midl_agent_skills/state/`
5. **Enforce PLAN → BUILD → DEPLOY awareness** — flag any skill or orchestration that skips a phase
6. **One component at a time** — never review or approve large multi-skill implementations without scoped stepwise confirmation
7. **Flag capability flag dependencies** — any skill that depends on a capability flag must explicitly read from `capabilities.json`

---

## 13. Verified Proof-of-Concept Contracts (Staging)

⚠️ NOTE:
Staging network was reset.
All previously deployed contract addresses are invalid.
New deployments required.
All viewable at: https://blockscout.staging.midl.xyz

---

## 14. Known Gaps & Open Questions

> These must be resolved before the affected skills are built. Flag each one when its skill is being scaffolded.

| # | Gap | Blocks Which Skill | Priority |
|---|-----|--------------------|----------|
| 1 | ~~`capabilities.json` schema not defined~~ **RESOLVED** — key flags: `deployment`, `verification`, `walletXverse`, `walletLeather`, `uiSkills`, `uiAutoPolish`, `erc20`, `erc721`, `erc1155`, `upgradeable`, plus `gates.requirePreflight`, `gates.verificationMode` | All skills | ✅ Done |
| 2 | ERC-721 / ERC-1155 compatibility on MIDL unconfirmed | `erc-compatibility-analysis` | 🟡 Medium |
| 3 | Upgradeable proxy pattern (UUPS/Transparent) safety on MIDL not assessed | `erc-compatibility-analysis`, `write-midl-contract` | 🟡 Medium |
| 4 | ~~`generate-foundry-tests` skill renamed~~ **RESOLVED** — directory renamed to `generate-hardhat-tests`, SKILL.md scoped to Hardhat only | Skills Layer | ✅ Done |
| 5 | ~~No defined schema for state files~~ **RESOLVED** — schemas defined at `schemaVersion: "1.0"` in all three state files | State Layer, all skills | ✅ Done |
| 6 | ~~Hallucination guard middleware — interface not documented~~ **RESOLVED** — `MIDDLEWARE.md` defines `validateInputs`, `stateAccess`, and `pauseIfUnsupported(feature)` interfaces | All skills | ✅ Done |
| 7 | Mainnet deployment flow — all current docs are staging only | Future `deployment-gatekeeper` | 🟢 Low (v1 is staging only) |
| 8 | Multi-sig wallet support — `multisigAddress` param exists in SDK but not documented in skills | `wallet-safety-check` | 🟢 Low |
| 9 | `weiToSatoshis` conversion factor unverified — dApp uses `1 sat = 10^10 wei`; confirm against `satoshisToWei` output during integration testing | `social-guestbook` dApp, any future dApp with payable functions | 🟡 Medium |

---

## 15. Resource Locations

| Resource | Location |
|----------|----------|
| MIDL SDK Reference | `/mnt/skills/user/midl-sdk-v2/SKILL.md` |
| Deployment Skill | `/mnt/skills/user/contract-deployment/SKILL.md` |
| Verification Skill | `/mnt/skills/user/contract-verification/SKILL.md` |
| MCP Server | `~/midl_agent_skills/mcp_bitcoin` (reference only — do not modify) |
| Capabilities Config | `~/midl_agent_skills/capabilities.json` |
| State Files | `~/midl_agent_skills/state/` |
| Social Guestbook dApp | `~/midl_agent_skills/dapps/social-guestbook/` |
| Project Context (this file) | `~/midl_agent_skills/project_context.md`

---

## 16. dApp Scaffold Patterns

> Reusable patterns established by the Social Guestbook dApp. Apply to all future dApp scaffolds.

### Stack
- **Bundler:** Vite 5 + `@vitejs/plugin-react`
- **Language:** TypeScript (strict mode, `resolveJsonModule: true`)
- **Wallet:** `@midl/connectors` (Xverse primary; Leather fallback for regtest UTXO issues)
- **Executor:** `@midl/executor` + `@midl/executor-react`
- **Wagmi:** `wagmi@^2` bridged via `WagmiMidlProvider` (enables `useReadContract`, `usePublicClient`)
- **viem override:** Always `"viem": "npm:@midl/viem@2.21.39"` in `dependencies` AND `overrides`

### Contract Config Pattern (no hardcoded addresses)
```ts
// src/lib/contract.ts — reads from shared state file via @state alias
import deploymentLog from "@state/deployment-log.json";
export const CONTRACT_ADDRESS = getContractEntry("ContractName").address as `0x${string}`;
export const CONTRACT_ABI = getContractEntry("ContractName").abi as Abi;
```

Vite alias in `vite.config.ts`:
```ts
"@state": path.resolve(__dirname, "../../state")
```

TypeScript path in `tsconfig.json`:
```json
"paths": { "@state/*": ["../../state/*"] }
```

### Provider Tree
```
MidlProvider (midlConfig with regtest + xverseConnector)
  QueryClientProvider
    WagmiMidlProvider      ← bridges wagmi to MIDL chain (chainId 15001)
      App
```

### P2TR / P2WPKH Separation
```ts
const { ordinalsAccount, paymentAccount } = useAccounts();
// ordinalsAccount.address = P2TR (bcrt1p...) → addTxIntention from: (EVM identity)
// paymentAccount.address  = P2WPKH (bcrt1q...) → finalizeBTCTransaction from: (BTC fees)
// useAccount() from wagmi → EVM address (0x...) → for contract reads (hasLiked, etc.)
```

### 4-Step Write Flow Hook (`useMidlContractWrite`)
All contract writes use this pattern. Location: `src/hooks/useMidlContractWrite.ts`.

**Critical**: `addTxIntention` is a context dispatch. `finalizeBTCTransaction` must be called
from a **user gesture (button onClick)** — not `useEffect` — because Xverse opens a popup
window that browsers block without a direct user interaction.

Correct state machine:
- `write()` → `addTxIntention` + `setPhase("adding-intention")`
- Hook exposes `finalize()` → component shows "Sign with Xverse" button in `adding-intention` phase
- User clicks → `finalize()` → `finalizeBTCTransaction()` → Xverse popup → `setPhase("signing")`
- `useEffect([btcData])` → fires when wallet approves → `signIntentionAsync` + `sendBTCTransactions`
- `txIntentionsRef` (always-current) used in sign+broadcast to avoid stale closure

### Payable Function Pattern
```ts
// satoshisToWei from @midl/executor is canonical; weiToSatoshis = wei / 10^10 (verify during testing)
const depositSatoshis = weiToSatoshis(feeWei);
const valueWei = satoshisToWei(depositSatoshis);
await write({ to, data, depositSatoshis, valueWei });
```

### State File Schema (v1.0)
All three state files use `"schemaVersion": "1.0"`. ABI stored inline in `deployment-log.json` for zero-dependency contract config loading.

### Buffer Polyfill
Required in `index.html` before the main module script:
```html
<script type="module">
  import { Buffer } from "buffer";
  window.Buffer = Buffer;
  window.global = window;
  BigInt.prototype.toJSON = function () { return this.toString(); };
</script>
```
Add `"buffer": "^6.0.3"` to dependencies.

---

## 17. Enforced Workflow Gate

**Before implementing any MIDL wallet/tx/deploy flow, the `midl-preflight` skill MUST run.**

Location: `skills/midl-preflight/SKILL.md`

Routing rule (from `AGENTS.md`): any request containing `wallet`, `tx flow`, `deploy`, `verify`, or `midl sdk` → trigger preflight first. No exceptions.

### Three Key Failure Lessons (Social Guestbook dApp)

These were real bugs that each required a full debugging cycle. They are now encoded as preflight checks.

#### Lesson 1 — No `from` in `addTxIntention`

Passing `from: ordinalsAccount.address` (the Bitcoin P2TR string) causes MIDL to derive a *different* EVM address than `useAccount()` returns from wagmi. The contract's `isRegistered` check passes because it reads from the wagmi address, but the transaction executes from the MIDL-derived address which is unregistered.

**Error:** `execution reverted: Must be registered` during `eth_estimateGasMulti`

```ts
// WRONG
addTxIntention({ intention: { evmTransaction: { to, data } }, from: ordinalsAccount.address });

// CORRECT — omit `from` entirely
addTxIntention({ reset: true, intention: { evmTransaction: { to, data } } });
```

#### Lesson 2 — `finalizeBTCTransaction` must be in `onClick`, not `useEffect`

Xverse opens its PSBT signing UI as a browser popup. Browsers block popups not triggered by a direct user gesture. Calling `finalizeBTCTransaction()` inside `useEffect` silently stalls the flow — no wallet popup ever appears.

```ts
// WRONG — browser blocks Xverse popup
useEffect(() => {
  if (txIntentions.length > 0) finalizeBTCTransaction();
}, [txIntentions.length]);

// CORRECT — expose finalize() and call it from button onClick
const { write, finalize, phase } = useMidlContractWrite();
// In component:
{phase === "adding-intention" && <button onClick={finalize}>Sign with Xverse</button>}
```

#### Lesson 3 — `WagmiMidlProvider` takes no props

`WagmiMidlProvider` auto-configures wagmi for chainId 15001. It does NOT accept a `config` prop. Passing the result of `createConfig()` to it causes type mismatches and breaks all wagmi hooks (`useAccount`, `useReadContract`, `usePublicClient`).

```tsx
// WRONG
<WagmiMidlProvider config={midlConfig}>...</WagmiMidlProvider>

// CORRECT
<MidlProvider config={midlConfig}>
  <QueryClientProvider client={queryClient}>
    <WagmiMidlProvider>          {/* ← no props */}
      {children}
    </WagmiMidlProvider>
  </QueryClientProvider>
</MidlProvider>
```

---

## 18. SharedContext MCP (Reference Memory Layer)

SharedContext is cross-client reference memory. Hard rules:

- Advisory only — never source of truth.
- Truth order: `capabilities.json` → `state/*.json` → `project_context.md` → SharedContext.
- Never store or recall contract addresses from SharedContext. Addresses come only from `state/deployment-log.json`.
- If SharedContext conflicts with files → ignore SharedContext and flag the conflict.

Recommended usage:

- **PLAN phase:** recall known pitfalls and last known good templates.
- **Milestone completion:** store confirmed decisions/pitfalls (not runtime state).

---

## 19. Frontend Quality Pipeline (ui-skills)

Triggered at milestones only — not on every change.

**Trigger points:**
1. After initial frontend scaffold
2. After a major UI feature
3. Before ship

**Audit sequence:**
1. `baseline-ui` review `src/`
2. `web-design-guidelines` review `src/`
3. `fixing-accessibility` review `src/` (optional for v1)

**Rules:**
- Brand lock: all colors from `tokens.ts` (orange/white + neutrals). No ad-hoc palettes.
- Max `capabilities.gates.maxAutoPolishIterations` (3) polish loops per milestone.
- If unresolved after 3 loops or ambiguous → pause and ask human.

---

## 21. Compiler Version Discipline (Hard Lesson — Feb 2026)

### The bug

Contract written with `pragma solidity ^0.8.24`. Deploy machine had solc 0.8.28 installed. Hardhat resolved the float pragma to 0.8.28 at deploy time. Verification then failed because local compilation used 0.8.24, producing different bytecode. Fix required probing optimizer settings before the bytecode finally matched.

### The rule

**Read `skills/deploy-contracts/SKILL.md` before writing any `.sol` file.** Lock in three values simultaneously:

| Location | Field | Example |
|----------|-------|---------|
| `.sol` pragma | `pragma solidity X.Y.Z;` | `pragma solidity 0.8.28;` |
| `hardhat.config.ts` | `solidity.version` | `"0.8.28"` |
| `state/deployment-log.json` | `solcVersion` | `"0.8.28"` |

Never use `^` in pragma. Never assume optimizer defaults (`enabled: true, runs: 200` was wrong for SocialGuestbook — deployed with optimizer disabled).

### Phase order (correct)

```
Phase 1: System design
Phase 2: Senior review
Phase 3a: Read deploy-contracts/SKILL.md — lock compiler + optimizer
Phase 3b: Write contract with exact pragma
Phase 3c: Deploy
Phase 3d: Verify (should be one-shot)
```

---

## 20. Network Reset Handling

Staging can reset without notice. When detected:

- Treat all prior addresses as invalid — do not use any cached address.
- Clear: `state/deployment-log.json`, `state/verified-addresses.json`, `state/erc-compatibility.json`.
- Redeploy + reverify from scratch.
- Never maintain a static address table in this context file.
