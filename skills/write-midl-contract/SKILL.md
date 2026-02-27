# Write MIDL Contract

## Boot Sequence (ALWAYS first)

1. Read `~/midl_agent_skills/capabilities.json`
2. Read `~/midl_agent_skills/MIDDLEWARE.md`
3. Run `skills/midl-preflight/SKILL.md` — no exceptions

---

## Purpose

Scaffold Solidity source code for MIDL-compatible smart contracts. Output to `contracts/` in the target Hardhat project.

---

## Feature Gate

Before generating any contract, call `pauseIfUnsupported` for the requested ERC type:

| Feature | Flag | Status |
|---------|------|--------|
| ERC-20 | `erc20` | ✅ enabled |
| ERC-721 | `erc721` | ❌ paused — do not generate |
| ERC-1155 | `erc1155` | ❌ paused — do not generate |
| Upgradeable (proxy) | `upgradeable` | ❌ paused — do not generate |

If the flag is `false` → STOP. Do not scaffold the contract. Ask human to enable in `capabilities.json`.

---

## Hard Constraints

| Rule | Detail |
|------|--------|
| Toolchain | Hardhat only. Never output `forge`, `cast`, or Foundry tooling. |
| Pragma | Exact version derived from `deploy-contracts` skill — never `^` prefix |
| EVM version | `paris` — never `shanghai`, `cancun`, or later |
| Addresses | No hardcoded addresses — use constructor args or read from `state/deployment-log.json` |
| Opcodes | No `PUSH0`, `MCOPY`, `TSTORE`, `TLOAD` — all post-paris opcodes |

### Pragma + Compiler Version Rule (CRITICAL)

**Before writing any `.sol` file, read `skills/deploy-contracts/SKILL.md`** to get the exact compiler version and optimizer settings.

The pragma must match the Hardhat config version **exactly**:

```solidity
// CORRECT — exact version, matches hardhat.config.ts
pragma solidity 0.8.28;

// WRONG — float pragma causes version drift across machines
pragma solidity ^0.8.24;
```

The Hardhat `version` field in `hardhat.config.ts` determines which solc binary is used. The pragma is only a compatibility check. If they diverge across machines, verification will fail — the on-chain bytecode will differ from anything you can locally compile.

---

## Required Hardhat Config

Derive compiler version and optimizer settings from `deploy-contracts/SKILL.md`. Do not assume defaults. The example below reflects the SocialGuestbook deployment (solc 0.8.28, optimizer disabled):

```typescript
// hardhat.config.ts
solidity: {
  version: "0.8.28",          // ← must match pragma in .sol exactly
  settings: {
    optimizer: { enabled: false },  // ← confirm from deploy-contracts skill
    evmVersion: "paris",
  },
},
```

Confirm `package.json` contains the viem override from `capabilities.toolchain.viemOverride`:

```json
{
  "dependencies": { "viem": "npm:@midl/viem@2.21.39" },
  "pnpm": { "overrides": { "viem": "npm:@midl/viem@2.21.39" } }
}
```

---

## Contract Template

```solidity
// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;   // exact — derived from deploy-contracts skill

// [imports — OpenZeppelin preferred for standard interfaces]

/// @title ContractName
/// @notice [one-line description of purpose]
contract ContractName {
    // ── State ────────────────────────────────────────────────
    // declare storage variables

    // ── Events ───────────────────────────────────────────────
    event ExampleEvent(address indexed actor, uint256 value);

    // ── Errors ───────────────────────────────────────────────
    error Unauthorized();
    error InvalidInput();

    // ── Constructor ──────────────────────────────────────────
    constructor(/* args — never hardcode addresses */) {
        // initialize state
    }

    // ── External ─────────────────────────────────────────────
    // public-facing functions

    // ── Internal ─────────────────────────────────────────────
    // helpers
}
```

---

## Output

- File: `contracts/ContractName.sol`
- No deployment scripts at this stage — handled by `deploy-contracts` skill
- No state file writes — this skill is pure code generation

---

## Completion Confirmation

```
write-midl-contract: COMPLETE
Contract: contracts/[name].sol
EVM version: paris
Pragma: [exact version from deploy-contracts skill]
Optimizer: [enabled/disabled — from deploy-contracts skill]
Feature flags checked: [list]
Ready for: generate-hardhat-tests
```
