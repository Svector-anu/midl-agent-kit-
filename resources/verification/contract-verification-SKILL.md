---
name: contract-verification
description: Verify smart contracts on Blockscout using the proven method with 100% success rate for MIDL staging network
---

# Contract Verification Skill

## Overview
This Skill helps verify smart contracts on Blockscout (MIDL staging network) using a proven method with 100% success rate. Use this when you need to verify deployed contracts, troubleshoot verification failures, or ensure contracts are publicly verifiable.

## When to Use This Skill

Apply this Skill whenever:
- User wants to verify a deployed contract on Blockscout
- User is getting "bytecode doesn't match" errors
- User needs to verify existing contracts
- User is deploying new contracts and wants verification to work

## The Proven Method (100% Success Rate)

### Key Principle
**Deploy and verify with EXACT matching compiler settings!**

The bytecode must match perfectly between deployment and verification. Even a tiny difference will cause verification to fail.

### Critical Settings That Must Match

1. **Solidity Version** - 0.8.24 vs 0.8.28 produces different bytecode
2. **Optimizer Setting** - enabled vs disabled changes bytecode significantly
3. **Optimizer Runs** - 200 vs 1000 affects optimization
4. **EVM Version** - paris, shanghai, etc.

## Network Information

**MIDL Staging Network:**
- RPC: `https://rpc.staging.midl.xyz`
- Chain ID: `15001` (0x3a99)
- Blockscout: `https://blockscout.staging.midl.xyz`
- Blockscout API: `https://blockscout.staging.midl.xyz/api`

## Step-by-Step Verification Process

### For New Deployments

**Step 1: Use Exact Pragma Versions**

❌ **Wrong (Ambiguous):**
```solidity
pragma solidity ^0.8.0;  // Hardhat picks first matching compiler
pragma solidity ^0.8.24; // Still ambiguous!
```

✅ **Correct (Exact):**
```solidity
pragma solidity 0.8.24;  // Forces specific compiler
```

**Why this matters:** With multiple compilers in hardhat.config.ts, Hardhat picks the first one that matches. Exact version = predictable compilation.

**Step 2: Deploy Contract**
```bash
cd midl-example
npx hardhat deploy --network regtest --tags <tag>
```
Save the contract address!

**Step 3: Verify Immediately**
```bash
# Without constructor args
npx hardhat verify --network regtest <ADDRESS>

# With constructor args
npx hardhat verify --network regtest <ADDRESS> "arg1" arg2 ...
```

### For Existing Contracts

**Step 1: Get Contract Address**
Ask user for the deployed contract address.

**Step 2: Decode Compiler Version from Bytecode**
```bash
# Get deployed bytecode
curl -s -X POST https://rpc.staging.midl.xyz \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getCode","params":["<ADDRESS>","latest"],"id":1}' \
  | jq -r '.result' | tail -c 20
```

**Decode version from suffix:**
- `000818` = Solidity 0.8.24
- `00081c` = Solidity 0.8.28

**Formula:** `00[major][minor in hex]`
- `0x18` = 24 decimal → 0.8.24
- `0x1c` = 28 decimal → 0.8.28

**Step 3: Update Contract Pragma**
Find the contract source file and change pragma to exact version:
```solidity
pragma solidity 0.8.24;  // Not ^0.8.24
```

**Step 4: Find Constructor Arguments (if needed)**
```bash
# Search deployment scripts
grep -r "deploy.*ContractName" midl-example/deploy/
```
Look for `midl.deploy("ContractName", [args...])` and note the arguments.

**Step 5: Recompile and Verify**
```bash
cd midl-example
npx hardhat compile --force
npx hardhat verify --network regtest <ADDRESS> [args...]
```

## Common Issues and Solutions

### Issue: "Bytecode doesn't match"
**Cause:** Compiler version or settings mismatch

**Fix:**
1. Get bytecode from chain
2. Decode compiler version
3. Update pragma to exact version
4. Recompile with `--force`
5. Verify again

### Issue: "Contract is being compiled with X but deployed with Y"
**Cause:** Pragma allows multiple versions (e.g., `^0.8.24`)

**Fix:**
```solidity
// Change from
pragma solidity ^0.8.24;

// To exact
pragma solidity 0.8.24;
```

### Issue: Constructor Arguments Missing
**Fix:**
1. Find deployment script
2. Extract constructor args from `midl.deploy()` call
3. Add to verify command: `npx hardhat verify ... arg1 arg2 ...`

## Examples of Successful Verifications

### SimpleTest (no constructor)
```bash
# Contract: 0xde6c29923d7BB9FDbcDfEC54E7e726894B982593
# Compiler: 0.8.24 with optimizer

# 1. Updated pragma
pragma solidity 0.8.24;

# 2. Compiled
npx hardhat compile --force

# 3. Verified
npx hardhat verify --network regtest 0xde6c29923d7BB9FDbcDfEC54E7e726894B982593
```

### CollateralERC20 (with constructor)
```bash
# Contract: 0xca0daeff9cB8DED3EEF075Df62aDBb1522479639
# Compiler: 0.8.24 with optimizer
# Constructor: "Test Token", "TT", 100000000000

# 1. Updated pragma
pragma solidity 0.8.24;

# 2. Compiled
npx hardhat compile --force

# 3. Verified with args
npx hardhat verify --network regtest \
  0xca0daeff9cB8DED3EEF075Df62aDBb1522479639 \
  "Test Token" "TT" 100000000000
```

## Verified Contracts (Proof of Success)

All verified on staging network: https://blockscout.staging.midl.xyz

1. **SimpleTest** - `0xde6c29923d7BB9FDbcDfEC54E7e726894B982593` ✅
2. **MessageBoard** - `0x479fa7d6eAE6bF7B4a0Cc6399F7518aA3Cd07580` ✅
3. **CollateralERC20** - `0xca0daeff9cB8DED3EEF075Df62aDBb1522479639` ✅
4. **RuneERC20** - `0x29cf3A9B709f94Eb46fBbA67753B90E721ddC9Ed` ✅

**Success Rate: 4/4 (100%)**

## Hardhat Configuration Requirements

Your `hardhat.config.ts` must have:

```typescript
import "@nomicfoundation/hardhat-verify";

etherscan: {
  apiKey: {
    regtest: "no-api-key-needed"
  },
  customChains: [
    {
      network: "regtest",
      chainId: 15001,
      urls: {
        apiURL: "https://blockscout.staging.midl.xyz/api",
        browserURL: "https://blockscout.staging.midl.xyz"
      }
    }
  ]
},
sourcify: {
  enabled: false
}
```

## Quick Commands Reference

```bash
# Get bytecode version
curl -s -X POST https://rpc.staging.midl.xyz \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getCode","params":["<ADDRESS>","latest"],"id":1}' \
  | jq -r '.result' | tail -c 20

# Find deployment script
grep -r "deploy.*ContractName" midl-example/deploy/

# Compile and verify
cd midl-example
npx hardhat compile --force
npx hardhat verify --network regtest <ADDRESS> [args...]
```

## Important Reminders

- **Always use EXACT pragma versions** (0.8.24, not ^0.8.24)
- **Verify immediately after deployment** when settings are fresh
- **Document constructor arguments** in deployment scripts
- **Check bytecode** to determine compiler version for existing contracts
- **Recompile with --force** before verifying to ensure fresh artifacts

## Resources

For detailed guide, see: `CONTRACT_VERIFICATION_GUIDE.md` in the MIDL MCP repository.
