# MIDL Contract Deployment Guide - Staging Network

## ✅ Working Configuration

This guide documents the **proven, working setup** for deploying Solidity contracts to MIDL's staging network.

---

## Prerequisites

### Required Packages
```json
{
  "devDependencies": {
    "@midl/core": "3.0.0-next.29",
    "@midl/executor": "3.0.0-next.29",
    "@midl/hardhat-deploy": "3.0.0-next.29",
    "@nomicfoundation/hardhat-ethers": "^3.0.0",
    "@typechain/hardhat": "^9.1.0",
    "hardhat": "^2.25.0",
    "hardhat-deploy": "^1.0.4"
  },
  "dependencies": {
    "viem": "npm:@midl/viem@2.21.39"
  }
}
```

### ⚠️ CRITICAL: Viem Override Required
**This is the most important configuration!** Without this, gas estimation will fail.

```json
{
  "pnpm": {
    "overrides": {
      "viem": "npm:@midl/viem@2.21.39"
    }
  }
}
```

**Why?**
- Standard `viem` doesn't have `estimateGasMulti` method
- `@midl/viem` is a patched version with MIDL-specific features
- Without this override, deployments hang during gas estimation

---

## ⏱️ Staging Network Performance

**IMPORTANT: Staging network operations have significant delays!**

### Expected Timing
- ✅ **Contract Deployments:** ~30 seconds - 2 minutes
- ⏳ **Write Operations (contract calls):** ~8-15 minutes per transaction
- ⚡ **Read Operations:** Instant

### What This Means
When you call `await hre.midl.execute()` for write operations:
- The transaction WILL succeed ✅
- But it may appear to "hang" for 10-15 minutes ⏳
- This is normal staging behavior, not a bug 👍

**Example:**
```typescript
await hre.midl.write('Contract', 'setMessage', ['Hello']);
await hre.midl.execute(); // ← May take 10-15 minutes!
```

**Tip:** Don't kill the process! It's working, just slowly. Check Blockscout to see transaction status.

---

## Hardhat Configuration

### hardhat.config.ts

```typescript
import "@midl/hardhat-deploy";
import { MaestroSymphonyProvider, MempoolSpaceProvider } from "@midl/core";
import "@nomicfoundation/hardhat-chai-matchers";
import { midl, midlRegtest } from "@midl/executor";
import "@nomicfoundation/hardhat-ethers";
import "@typechain/hardhat";
import { config as dotenvConfig } from "dotenv";
import "hardhat-deploy";
import type { HardhatUserConfig } from "hardhat/config";
import { resolve } from "path";

dotenvConfig({ path: resolve(__dirname, "./.env") });

const walletsPaths = {
  default: "m/86'/1'/0'/0/0",
};

const accounts = [
  process.env.MNEMONIC || "...",
];

const config: HardhatUserConfig = {
  networks: {
    regtest: {
      url: "https://rpc.staging.midl.xyz",  // ✅ Staging RPC (has system contracts)
      accounts: {
        mnemonic: accounts[0],
        path: walletsPaths.default,
      },
      chainId: 0x3a99, // 15001 - Staging chain ID
    },
  },
  midl: {
    path: "deployments",
    networks: {
      regtest: {
        mnemonic: accounts[0],
        confirmationsRequired: 1,
        btcConfirmationsRequired: 1,
        hardhatNetwork: "regtest",
        network: {
          explorerUrl: "https://mempool.staging.midl.xyz",
          id: "regtest",
          network: "regtest",
        },
        providerFactory: () =>
          new MempoolSpaceProvider({
            regtest: "https://mempool.staging.midl.xyz",
          }),
        runesProviderFactory: () =>
          new MaestroSymphonyProvider({
            regtest: "https://runes.staging.midl.xyz",
          }),
      },
    },
  },
  solidity: {
    compilers: [
      {
        version: "0.8.24",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
};

export default config;
```

### .env File

```bash
MNEMONIC=...
```

---

## Network Details

### Staging Network
- **RPC URL:** `https://rpc.staging.midl.xyz`
- **Chain ID:** `0x3a99` (15001)
- **Mempool Explorer:** https://mempool.staging.midl.xyz
- **Blockscout Explorer:** https://blockscout.staging.midl.xyz
- **Status:** ✅ Has Executor system contracts deployed
- **Bitcoin Network:** Regtest

### ❌ Why Not Regtest RPC?
- **Regtest RPC:** `https://rpc.regtest.midl.xyz`
- **Issue:** Missing Executor contract at `0x0000000000000000000000000000000000001006`
- **Result:** Deployments fail with "btcFeeRate returned no data"

---

## Wallet Generation

### Derivation Path
```
m/86'/1'/0'/0/0
```
- `m` - Master key
- `86'` - BIP86 (Taproot/Native SegWit)
- `1'` - Testnet/Regtest Bitcoin
- `0'` - Account index
- `0` - Receiving addresses
- `0` - Address index (account #0)

### Generated Addresses
From mnemonic, you get:
- **Bitcoin Address:** `bcrt1q...` (P2WPKH format)
- **EVM Address:** `0x...` (Ethereum-style)

Both addresses are controlled by the same private key.

### Check Your Addresses
```bash
npx hardhat midl:address 0 --network regtest
```

### Switch Accounts
To use a different account, change the last digit in the path:
```typescript
const walletsPaths = {
  default: "m/86'/1'/0'/0/1", // Account 1
};
```

---

## Deployment Pattern

### 1. Create Contract

**contracts/YourContract.sol**
```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract YourContract {
    uint256 public value;

    constructor(uint256 _initialValue) {
        value = _initialValue;
    }

    function setValue(uint256 _value) public {
        value = _value;
    }
}
```

### 2. Create Deployment Script

**deploy/001_deploy_your_contract.ts**
```typescript
import type { HardhatRuntimeEnvironment } from "hardhat/types";

export default async function deploy(hre: HardhatRuntimeEnvironment) {
  console.log('\n🚀 Deploying YourContract...\n');

  // Initialize MIDL
  await hre.midl.initialize();
  console.log(`✅ Initialized (Address: ${hre.midl.account.address})\n`);

  // Deploy contract
  await hre.midl.deploy('YourContract', [42]); // Constructor args
  console.log('✅ YourContract deployed!\n');

  // Execute transaction (gas estimation works now!)
  console.log('📡 Executing transaction...');
  await hre.midl.execute();

  // Get deployment info
  const deployment = await hre.midl.getDeployment('YourContract');

  console.log('\n═══════════════════════════════════════════');
  console.log('🎉 DEPLOYMENT SUCCESSFUL!');
  console.log('═══════════════════════════════════════════');
  console.log(`Contract Address: ${deployment.address}`);
  console.log(`\n🔗 View on explorers:`);
  console.log(`   Blockscout: https://blockscout.staging.midl.xyz/address/${deployment.address}`);
  console.log(`   Mempool: https://mempool.staging.midl.xyz/tx/${deployment.btcTxId}`);
  console.log('');
}

deploy.tags = ['YourContract'];
```

### 3. Deploy

```bash
# Deploy specific contract
npx hardhat deploy --network regtest --tags YourContract

# Deploy all contracts
npx hardhat deploy --network regtest

# Deploy with reset (redeploy everything)
npx hardhat deploy --network regtest --reset
```

---

## Multiple Transactions Pattern

For contracts requiring multiple operations:

```typescript
export default async function deploy(hre: HardhatRuntimeEnvironment) {
  await hre.midl.initialize();

  // Deploy first contract
  await hre.midl.deploy('Token', ['Test Token', 'TT', 1000000]);
  await hre.midl.execute();

  // Deploy second contract with first contract's address
  const token = await hre.midl.getDeployment('Token');
  await hre.midl.deploy('Exchange', [token.address]);
  await hre.midl.execute();

  // Call contract function
  const evmAddress = hre.midl.evm.address;
  await hre.midl.write('Token', 'mint', [1000, evmAddress]);
  await hre.midl.execute();

  console.log('✅ All deployments complete!');
}

deploy.tags = ['main'];
```

---

## Getting Testnet BTC

### Check Balance
```bash
# Bitcoin balance
curl "https://mempool.staging.midl.xyz/api/address/bcrt1q..."

# EVM balance
curl -X POST https://rpc.staging.midl.xyz \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["0x...","latest"],"id":1}'
```

### Receive BTC
Send to your Bitcoin address (`bcrt1q...`) from:
- Another wallet on staging/regtest
- Faucet (if available)
- Request from team

---

## Troubleshooting

### Issue: Write operation appears to hang for 10+ minutes

**Symptom:**
```
📡 Executing transaction...
[no output for 10-15 minutes]
```

**Cause:** This is NORMAL on staging network!

**Solution:**
- ✅ **Be patient** - It's working, just slowly
- ✅ **Check Blockscout** - Transaction will appear there
- ✅ **Don't kill the process** - Let it complete
- ⏳ **Wait 10-15 minutes** - This is expected timing

**Verification:**
Check your contract on Blockscout to see if transaction completed:
```
https://blockscout.staging.midl.xyz/address/YOUR_CONTRACT_ADDRESS
```

### Issue: Deployment Hangs at "Executing transaction" (Immediately)

**Symptom:**
```
📡 Executing transaction...
[hangs immediately, never progresses]
```

**Cause:** Missing viem override

**Solution:**
1. Add to `package.json`:
   ```json
   "pnpm": {
     "overrides": {
       "viem": "npm:@midl/viem@2.21.39"
     }
   }
   ```
2. Reinstall:
   ```bash
   rm -rf node_modules pnpm-lock.yaml
   pnpm install
   ```
3. Verify all packages use `@midl/viem`:
   ```bash
   npm list viem
   ```

### Issue: "btcFeeRate returned no data"

**Symptom:**
```
Error: The contract function "btcFeeRate" returned no data ("0x")
Contract Call: address: 0x0000000000000000000000000000000000001006
```

**Cause:** Using regtest RPC which lacks system contracts

**Solution:** Use staging RPC:
```typescript
url: "https://rpc.staging.midl.xyz"
```

### Issue: Chain ID Mismatch

**Symptom:**
```
Error HH101: Hardhat was set to use chain id 15001, but connected to chain with id 1500
```

**Cause:** Staging RPC returns inconsistent chain IDs between `eth_chainId` (0x3a99) and `net_version` (1500)

**Solution:** Use `0x3a99` (15001) - it works most of the time

### Issue: Zero Balance

**Symptom:** Deployment fails or no funds

**Solution:**
1. Check your address:
   ```bash
   npx hardhat midl:address 0 --network regtest
   ```
2. Verify balance on explorer
3. Request testnet BTC if needed
4. Ensure you're using the correct account index

---

## Verified Deployments

### Example Contracts Successfully Deployed

| Contract | Address | Explorer | Notes |
|----------|---------|----------|-------|
| SimpleTest | `0xde6c29923d7BB9FDbcDfEC54E7e726894B982593` | [View](https://blockscout.staging.midl.xyz/address/0xde6c29923d7BB9FDbcDfEC54E7e726894B982593) | Simple storage |
| CollateralERC20 | `0xca0daeff9cB8DED3EEF075Df62aDBb1522479639` | [View](https://blockscout.staging.midl.xyz/address/0xca0daeff9cB8DED3EEF075Df62aDBb1522479639) | ERC20 token |
| RuneERC20 | `0x29cf3A9B709f94Eb46fBbA67753B90E721ddC9Ed` | [View](https://blockscout.staging.midl.xyz/address/0x29cf3A9B709f94Eb46fBbA67753B90E721ddC9Ed) | Rune token |
| MessageBoard | `0x479fa7d6eAE6bF7B4a0Cc6399F7518aA3Cd07580` | [View](https://blockscout.staging.midl.xyz/address/0x479fa7d6eAE6bF7B4a0Cc6399F7518aA3Cd07580) | On-chain messaging ✅ |

**MessageBoard Status:**
- ✅ Deployed successfully
- ✅ Write operations working (1 message posted)
- ✅ Read operations working
- ⏳ Writes take ~10 minutes on staging

---

## Key Learnings

### What Works ✅
1. **Staging RPC** - Has all required system contracts
2. **Viem override** - Critical for gas estimation
3. **Standard Solidity** - Any EVM-compatible contract works
4. **Multiple transactions** - Can deploy complex contracts with multiple `execute()` calls
5. **Gas estimation** - Works automatically (no `skipEstimateGas` needed)

### What Doesn't Work ❌
1. **Regtest RPC** - Missing Executor system contracts
2. **No viem override** - Gas estimation fails/hangs
3. **skipEstimateGas** - Dangerous workaround, not needed with proper config

### Critical Configuration
The **#1 most important thing** is the viem override in package.json:
```json
"pnpm": {
  "overrides": {
    "viem": "npm:@midl/viem@2.21.39"
  }
}
```

Without this, nothing works properly.

---

## Quick Reference

### Deploy Contract
```bash
npx hardhat deploy --network regtest --tags YourContract
```

### Check Address
```bash
npx hardhat midl:address 0 --network regtest
```

### Check Balance
```bash
# Bitcoin
curl "https://mempool.staging.midl.xyz/api/address/YOUR_BITCOIN_ADDRESS"

# EVM
curl -X POST https://rpc.staging.midl.xyz \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getBalance","params":["YOUR_EVM_ADDRESS","latest"],"id":1}'
```

### Verify Deployment
```bash
# Check contract bytecode
curl -X POST https://rpc.staging.midl.xyz \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"eth_getCode","params":["CONTRACT_ADDRESS","latest"],"id":1}'
```

---

## Resources

- **Staging Mempool:** https://mempool.staging.midl.xyz
- **Staging Blockscout:** https://blockscout.staging.midl.xyz
- **MIDL Docs:** https://docs.midl.xyz
- **GitHub:** https://github.com/midl-xyz

---

## Summary

This configuration is **battle-tested** and works for:
- ✅ Simple contracts
- ✅ Complex contracts with multiple transactions
- ✅ ERC20 tokens
- ✅ Runes integration
- ✅ Any standard Solidity contract

**The key**: Use staging RPC + viem override = everything works!
