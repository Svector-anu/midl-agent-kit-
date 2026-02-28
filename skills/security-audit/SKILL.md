# Security Audit

## Boot Sequence (ALWAYS first)

1. Read `<REPO_ROOT>/capabilities.json`
2. Read `<REPO_ROOT>/MIDDLEWARE.md`
3. Run `skills/midl-preflight/SKILL.md` — no exceptions

---

## Purpose

Analyze a MIDL contract for:
1. ERC interface compliance and storage layout compatibility with the MIDL EVM
2. Wallet interaction safety (PSBT scope, key isolation, publish flags)
3. MIDL-specific opcode and compiler risks (post-paris opcodes, pragma drift)

---

## Feature Gate

Call `pauseIfUnsupported` before auditing any ERC type:

| Feature | Flag | Action if false |
|---------|------|-----------------|
| ERC-20 | `erc20` | Proceed if true |
| ERC-721 | `erc721` | STOP — compatibility unconfirmed |
| ERC-1155 | `erc1155` | STOP — compatibility unconfirmed |
| Upgradeable proxy | `upgradeable` | STOP — storage collision risk unassessed |

---

## ERC Compatibility Checklist

### ERC-20 (confirmed working on MIDL staging)

- [ ] All 6 standard functions present: `transfer`, `transferFrom`, `approve`, `allowance`, `balanceOf`, `totalSupply`
- [ ] `decimals()` returns 18
- [ ] No storage layout conflicts (confirmed safe on MIDL EVM)
- [ ] Events: `Transfer` and `Approval` with correct indexed args
- [ ] Rune-backed variant: uses `addRuneERC20` from `@midl/executor` (rune name ≥ 12 chars, ≥ 6 BTC confirmations)

### ERC-721 / ERC-1155

⚠️ PAUSED — `pauseIfUnsupported("erc721")` / `pauseIfUnsupported("erc1155")` will STOP.
Compatibility with MIDL EVM storage layout is unconfirmed. Do not audit or generate until flag is enabled by MIDL team.

### Upgradeable (UUPS / Transparent Proxy)

⚠️ PAUSED — `pauseIfUnsupported("upgradeable")` will STOP.
Storage collision risk on MIDL not assessed. Do not proceed until confirmed.

---

## MIDL-Specific Opcode Checklist

- [ ] EVM version compiled with `paris` — not `shanghai`, `cancun`, or later
- [ ] No `PUSH0` opcode (EIP-3855, introduced in shanghai)
- [ ] No `MCOPY` (EIP-5656, cancun)
- [ ] No `TSTORE` / `TLOAD` (EIP-1153, cancun)
- [ ] Pragma is exact: `pragma solidity 0.8.24;` — not `^0.8.24`
- [ ] No `delegatecall` to external addresses unless explicitly audited for proxy risks

To check emitted opcodes:

```bash
npx hardhat compile
# then inspect artifacts/build-info for "opcodes" field
```

---

## Wallet Safety Checklist

- [ ] No hardcoded mnemonics or private keys — always `process.env.MNEMONIC`
- [ ] PSBT signing scope is explicit — specify which input indices are signed
- [ ] `publish: false` is default for test/dry-run PSBT flows — `publish: true` only for broadcast
- [ ] P2TR (Ordinals address, `bcrt1p...`) used only for EVM identity — not BTC fee payment
- [ ] P2WPKH (Payment address, `bcrt1q...`) used only for BTC fees — not EVM identity
- [ ] Xverse UTXO indexer lag on regtest acknowledged — Leather offered as fallback

---

## State Output

After audit completes, `writeState("erc-compatibility.json", entry)`:

```json
{
  "schemaVersion": "1.0",
  "audits": [
    {
      "contractName": "ContractName",
      "auditedAt": "<ISO timestamp>",
      "ercType": "erc20 | none",
      "compatible": true,
      "warnings": [],
      "blocked": []
    }
  ]
}
```

---

## Completion Confirmation

```
security-audit: COMPLETE
Contract: [name]
ERC type: [type]
Compatible: [yes | no | partial]
Wallet safety: [pass | ISSUES: list]
MIDL opcode risks: [none | list]
erc-compatibility.json: updated
```
