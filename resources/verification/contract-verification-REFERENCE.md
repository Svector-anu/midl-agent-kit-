# Contract Verification Guide - The Working Method

This guide documents the **proven method** for verifying smart contracts on Blockscout that has **100% success rate**.

## 🎯 The Golden Rule

**Deploy and verify with EXACT matching compiler settings!**

The bytecode must match perfectly between deployment and verification. Even a tiny difference will cause verification to fail.

---

## ✅ What Affects Bytecode (Must Match Exactly)

1. **Solidity Version** - 0.8.24 vs 0.8.28 produces different bytecode
2. **Optimizer Setting** - enabled vs disabled changes bytecode
3. **Optimizer Runs** - 200 vs 1000 affects optimization
4. **EVM Version** - paris, shanghai, etc.

---

## 📋 The Working Method

### Step 1: Use Exact Pragma Versions

**❌ WRONG - Ambiguous:**
```solidity
pragma solidity ^0.8.0;  // Hardhat picks first matching compiler
pragma solidity ^0.8.24; // Still ambiguous!
```

**✅ CORRECT - Exact:**
```solidity
pragma solidity 0.8.24;  // Forces specific compiler
```

**Why this matters:**
- With multiple compilers in `hardhat.config.ts`, Hardhat picks the first one that matches
- `^0.8.0` could match 0.8.28 or 0.8.24 depending on order
- Exact version = predictable compilation

### Step 2: Deploy Your Contract

```bash
cd midl-example
npx hardhat deploy --network regtest --tags simple
```

**Important:** Save the contract address!

### Step 3: Verify Immediately

```bash
# For contracts WITHOUT constructor arguments
npx hardhat verify --network regtest <CONTRACT_ADDRESS>

# For contracts WITH constructor arguments
npx hardhat verify --network regtest <CONTRACT_ADDRESS> "arg1" "arg2" ...
```

**Examples:**
```bash
# SimpleTest (no constructor args)
npx hardhat verify --network regtest 0xde6c29923d7BB9FDbcDfEC54E7e726894B982593

# CollateralERC20 (with constructor args)
npx hardhat verify --network regtest 0xca0daeff9cB8DED3EEF075Df62aDBb1522479639 "Test Token" "TT" 100000000000

# RuneERC20 (address as constructor arg)
npx hardhat verify --network regtest 0x29cf3A9B709f94Eb46fBbA67753B90E721ddC9Ed 0xca0daeff9cB8DED3EEF075Df62aDBb1522479639
```

---

## 🔍 Verifying Existing Contracts

If you have an already-deployed contract:

### Step 1: Get Deployed Bytecode

```bash
curl -X POST https://rpc.staging.midl.xyz \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc":"2.0",
    "method":"eth_getCode",
    "params":["<CONTRACT_ADDRESS>","latest"],
    "id":1
  }' | jq -r '.result'
```

### Step 2: Decode Compiler Version from Bytecode

Look at the last 20 characters of the bytecode:
- Example: `64736f6c63430008180033`

Breakdown:
- `64736f6c63` = "solc" in ASCII
- `43` = version indicator
- `000818` = version number
  - `08` = major version (8)
  - `18` = minor version in hex (0x18 = 24 decimal)
  - Result: **Solidity 0.8.24**

**Common Versions:**
- `000818` = Solidity 0.8.24
- `00081c` = Solidity 0.8.28 (0x1c = 28)

### Step 3: Update Contract Pragma

Change the pragma to match the deployed version:

```solidity
// If bytecode shows 000818
pragma solidity 0.8.24;
```

### Step 4: Recompile and Verify

```bash
# Force recompile with correct settings
npx hardhat compile --force

# Verify (with constructor args if needed)
npx hardhat verify --network regtest <CONTRACT_ADDRESS> [args...]
```

---

## 🛠️ Hardhat Configuration

Your `hardhat.config.ts` must include:

```typescript
import "@nomicfoundation/hardhat-verify";

const config: HardhatUserConfig = {
  networks: {
    regtest: {
      url: "https://rpc.staging.midl.xyz",
      accounts: {
        mnemonic: process.env.MNEMONIC,
        path: "m/86'/1'/0'/0/0",
      },
      chainId: 15001,
    },
  },

  solidity: {
    compilers: [
      {
        version: "0.8.28",
        settings: {
          optimizer: { enabled: false, runs: 200 },
        },
      },
      {
        version: "0.8.24",
        settings: {
          optimizer: { enabled: true, runs: 200 },
        },
      },
    ],
  },

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
};
```

**Key Points:**
- Multiple compilers = different settings per version
- First matching compiler is used unless pragma is exact
- Use exact pragma to force specific compiler

---

## 🐛 Troubleshooting

### Error: "Bytecode doesn't match"

**Cause:** Compiler version or settings mismatch

**Solution:**
1. Get deployed bytecode: `curl ...`
2. Decode compiler version from bytecode suffix
3. Update pragma to exact version: `pragma solidity 0.8.24;`
4. Recompile: `npx hardhat compile --force`
5. Verify with constructor args if needed

### Error: "Contract is being compiled with X but deployed with Y"

**Cause:** Pragma allows multiple versions

**Solution:**
```solidity
// Change from
pragma solidity ^0.8.24;

// To exact version
pragma solidity 0.8.24;
```

### Constructor Arguments Required

If verification fails and contract has a constructor, you need to provide arguments:

1. Find deployment script (e.g., `deploy/000_deploy_Base.ts`)
2. Look for `midl.deploy("ContractName", [args...])`
3. Add args to verify command: `npx hardhat verify ... arg1 arg2 ...`

**Finding Constructor Args:**
```bash
# Search deployment scripts
grep -r "deploy.*ContractName" deploy/
```

---

## ✅ Verified Contracts (Proof of Success)

### Staging Network (regtest)

1. **SimpleTest** - [0xde6c29923d7BB9FDbcDfEC54E7e726894B982593](https://blockscout.staging.midl.xyz/address/0xde6c29923d7BB9FDbcDfEC54E7e726894B982593#code)
   - Compiler: 0.8.24 + optimizer
   - Constructor: None

2. **MessageBoard** - [0x479fa7d6eAE6bF7B4a0Cc6399F7518aA3Cd07580](https://blockscout.staging.midl.xyz/address/0x479fa7d6eAE6bF7B4a0Cc6399F7518aA3Cd07580#code)
   - Compiler: 0.8.24 + optimizer
   - Constructor: None

3. **CollateralERC20** - [0xca0daeff9cB8DED3EEF075Df62aDBb1522479639](https://blockscout.staging.midl.xyz/address/0xca0daeff9cB8DED3EEF075Df62aDBb1522479639#code)
   - Compiler: 0.8.24 + optimizer
   - Constructor: `"Test Token", "TT", 100000000000`

4. **RuneERC20** - [0x29cf3A9B709f94Eb46fBbA67753B90E721ddC9Ed](https://blockscout.staging.midl.xyz/address/0x29cf3A9B709f94Eb46fBbA67753B90E721ddC9Ed#code)
   - Compiler: 0.8.24 + optimizer
   - Constructor: `0xca0daeff9cB8DED3EEF075Df62aDBb1522479639`

**Success Rate: 4/4 (100%)** ✅

---

## 📝 Quick Reference

### Decode Bytecode Version
```bash
# Get bytecode
BYTECODE=$(curl -s -X POST https://rpc.staging.midl.xyz \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getCode","params":["<ADDRESS>","latest"],"id":1}' \
  | jq -r '.result')

# Show last 20 chars (contains version)
echo $BYTECODE | tail -c 20
```

### Version Lookup Table
```
000818 = 0.8.24
00081c = 0.8.28
000820 = 0.8.32
```

### Verify Command Templates
```bash
# No constructor
npx hardhat verify --network regtest <ADDRESS>

# With constructor args
npx hardhat verify --network regtest <ADDRESS> "arg1" arg2 arg3

# Force recompile first
npx hardhat compile --force && npx hardhat verify --network regtest <ADDRESS>
```

---

## 🎓 Lessons Learned

### 1. Always Use Exact Pragma Versions
- `pragma solidity 0.8.24;` NOT `^0.8.24`
- Prevents unexpected compiler selection

### 2. Verify Immediately After Deployment
- Settings are fresh
- No confusion about what was used

### 3. Document Constructor Arguments
- Save deployment args in comments or docs
- Makes re-verification easier

### 4. Match Optimizer Settings
- Optimizer on/off changes bytecode completely
- Check hardhat.config.ts for each compiler version

### 5. One Contract = One Compiler Version
- Don't mix versions in same contract
- Use exact pragma to enforce this

---

## 🚀 Best Practices Checklist

Before deploying:
- [ ] Contract uses exact pragma version (e.g., `pragma solidity 0.8.24;`)
- [ ] Hardhat config has correct network settings
- [ ] Verification plugin installed: `@nomicfoundation/hardhat-verify`
- [ ] Blockscout API configured in `etherscan.customChains`

After deploying:
- [ ] Contract address saved
- [ ] Constructor arguments documented (if any)
- [ ] Verification run immediately: `npx hardhat verify ...`
- [ ] Confirmed on Blockscout (green checkmark visible)

For existing contracts:
- [ ] Bytecode retrieved from chain
- [ ] Compiler version decoded from bytecode
- [ ] Pragma updated to match
- [ ] Recompiled with --force
- [ ] Constructor args identified from deployment script
- [ ] Verification successful

---

## 📚 Additional Resources

- [Hardhat Verify Plugin Docs](https://hardhat.org/hardhat-runner/plugins/nomicfoundation-hardhat-verify)
- [Blockscout Verification](https://docs.blockscout.com/for-users/verifying-a-smart-contract)
- [Solidity Metadata](https://docs.soliditylang.org/en/latest/metadata.html)

---

**Last Updated:** 2026-02-05
**Verified By:** Claude Code
**Success Rate:** 100% (4/4 contracts)
