---
name: contract-deployment
description: Deploy smart contracts to MIDL (Bitcoin-anchored EVM) using MCP or Hardhat on staging network
---

# MIDL Contract Deployment Skill

## Overview
This Skill helps deploy Solidity smart contracts to MIDL staging network using either MCP (Claude Desktop) or Hardhat. MIDL is a Bitcoin-anchored EVM where deployments require both Bitcoin and EVM transactions.

## When to Use This Skill

Apply this Skill whenever:
- User wants to deploy a contract to MIDL
- User is setting up MIDL deployment environment
- User is troubleshooting deployment issues
- User is choosing between MCP vs Hardhat deployment

## Network Information

**MIDL Staging Network:**
- RPC: `https://rpc.staging.midl.xyz`
- Chain ID: `15001` (0x3a99)
- Bitcoin Explorer: `https://mempool.staging.midl.xyz`
- EVM Explorer: `https://blockscout.staging.midl.xyz`
- Bitcoin Network: Regtest

**Important:** Use **staging RPC**, not regtest RPC (staging has system contracts deployed)

## Deployment Methods

### Method 1: MCP via Claude Desktop (Easiest)

**Best for:** Quick deployments, testing, non-developers

**How it works:**
1. User provides Solidity code
2. MCP compiles the contract
3. MCP deploys to MIDL
4. MCP auto-verifies on Blockscout
5. Returns contract address and explorer links

**Example prompt:**
```
Deploy this contract to MIDL staging:

pragma solidity 0.8.28;

contract SimpleStorage {
    uint256 public value = 42;

    function setValue(uint256 _value) public {
        value = _value;
    }
}
```

### Method 2: Hardhat (Recommended for Developers)

**Best for:** Complex projects, multiple contracts, CI/CD

**Setup required:**
1. Configure hardhat.config.ts
2. Create deployment scripts
3. Deploy via CLI

**Example:**
```bash
npx hardhat deploy --network regtest --tags YourContract
```

## Critical Configuration Requirements

### 0. OpenZeppelin Version (MUST BE v4)

**Use `^4.9.0`, NOT `^5.0.0`.**

OZ v5 added `Bytes.sol` which uses the `mcopy` opcode. MIDL staging runs `evmVersion: "paris"` — `mcopy` is Cancun-only. Compilation fails with:
```
TypeError: The "mcopy" instruction is only available for Cancun-compatible VMs
```

OZ v4 path differences to know:
- `ReentrancyGuard` → `security/ReentrancyGuard.sol` (not `utils/`)
- `ERC20Permit` → `extensions/draft-ERC20Permit.sol` (not `extensions/ERC20Permit.sol`)
- `Ownable` → no constructor arg (owner auto-set to `msg.sender`)

### 1. Viem Override (MOST IMPORTANT!)

**Required in package.json:**
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
- Standard viem lacks `estimateGasMulti` method
- Without this, gas estimation fails/hangs
- **This is the #1 cause of deployment failures**

### 2. Hardhat Configuration

```typescript
import "@midl/hardhat-deploy";
import { MempoolSpaceProvider, MaestroSymphonyProvider } from "@midl/core";

const config: HardhatUserConfig = {
  networks: {
    regtest: {
      url: "https://rpc.staging.midl.xyz",  // Staging RPC!
      accounts: {
        mnemonic: process.env.MNEMONIC,
        path: "m/86'/1'/0'/0/0",
      },
      chainId: 15001,
    },
  },
  midl: {
    networks: {
      regtest: {
        mnemonic: process.env.MNEMONIC,
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
    compilers: [{
      version: "0.8.24",
      settings: {
        optimizer: { enabled: true, runs: 200 },
        evmVersion: "paris",  // Use paris for staging
      },
    }],
  },
};
```

### 3. MCP Configuration (Claude Desktop)

**Location:** `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "midl-bitcoin": {
      "command": "npx",
      "args": ["-y", "tsx", "/path/to/midl-mcp/src/index.ts"],
      "env": {
        "MIDL_NETWORK": "staging",
        "MIDL_MNEMONIC": "your twelve word mnemonic here"
      }
    }
  }
}
```

**After updating:** Fully quit Claude (Cmd+Q) and restart

## Performance Expectations

**Staging Network Timing:**
- ⚡ **Contract Deployment:** 30 seconds - 2 minutes
- ⏳ **Write Operations:** 8-15 minutes per transaction
- ⚡ **Read Operations:** Instant

**Important:** Write operations appearing to "hang" for 10-15 minutes is **NORMAL** on staging!

**What to do:**
- ✅ Be patient - it's working
- ✅ Check Blockscout for transaction status
- ✅ Don't kill the process
- ⏳ Wait up to 15 minutes

## Deployment Patterns

### Simple Contract (No Constructor)

**Contract:**
```solidity
pragma solidity 0.8.24;

contract SimpleStorage {
    uint256 public value;

    function setValue(uint256 _value) public {
        value = _value;
    }
}
```

**Deploy Script:**
```typescript
export default async function deploy(hre: HardhatRuntimeEnvironment) {
  await hre.midl.initialize();
  await hre.midl.deploy('SimpleStorage', []);
  await hre.midl.execute();
}

deploy.tags = ['simple'];
```

**Deploy:**
```bash
npx hardhat deploy --network regtest --tags simple
```

### Contract with Constructor

**Contract:**
```solidity
pragma solidity 0.8.24;

contract Token {
    string public name;
    string public symbol;
    uint256 public totalSupply;

    constructor(string memory _name, string memory _symbol, uint256 _supply) {
        name = _name;
        symbol = _symbol;
        totalSupply = _supply;
    }
}
```

**Deploy Script:**
```typescript
export default async function deploy(hre: HardhatRuntimeEnvironment) {
  await hre.midl.initialize();
  await hre.midl.deploy('Token', ['Test Token', 'TT', 1000000]);
  await hre.midl.execute();

  const deployment = await hre.midl.getDeployment('Token');
  console.log('Token deployed at:', deployment.address);
}

deploy.tags = ['token'];
```

### Multiple Contracts

```typescript
export default async function deploy(hre: HardhatRuntimeEnvironment) {
  await hre.midl.initialize();

  // Deploy Token
  await hre.midl.deploy('Token', ['Test', 'TT', 1000000]);
  await hre.midl.execute();

  // Deploy Exchange with Token address
  const token = await hre.midl.getDeployment('Token');
  await hre.midl.deploy('Exchange', [token.address]);
  await hre.midl.execute();

  // Call function on Token
  await hre.midl.write('Token', 'mint', [1000, hre.midl.evm.address]);
  await hre.midl.execute();
}

deploy.tags = ['main'];
```

## Troubleshooting

### Deployment Hangs Immediately

**Symptom:** Hangs at "Executing transaction..." right away

**Cause:** Missing viem override

**Fix:**
1. Add viem override to package.json
2. Delete node_modules and lockfile
3. Reinstall: `pnpm install`
4. Verify: `npm list viem` (should show @midl/viem)

### Deployment Hangs for 10+ Minutes

**Symptom:** Long wait after "Executing transaction..."

**Cause:** This is **NORMAL** on staging!

**Fix:**
- Wait patiently (up to 15 minutes)
- Check Blockscout to see if transaction appeared
- Don't kill the process

### "btcFeeRate returned no data"

**Symptom:**
```
Error: The contract function "btcFeeRate" returned no data
Contract Call: address: 0x0000000000000000000000000000000000001006
```

**Cause:** Using regtest RPC instead of staging RPC

**Fix:** Change network URL to:
```typescript
url: "https://rpc.staging.midl.xyz"  // Not rpc.regtest.midl.xyz
```

### No Balance / Insufficient Funds

**Fix:**
1. Check your address:
   ```bash
   npx hardhat midl:address 0 --network regtest
   ```
2. Check balance:
   ```bash
   curl "https://mempool.staging.midl.xyz/api/address/YOUR_BTC_ADDRESS"
   ```
3. Request testnet BTC from team or faucet

### MCP Tool Not Appearing

**Fix:**
1. Verify `claude_desktop_config.json` is correct
2. Fully quit Claude (Cmd+Q)
3. Restart Claude
4. Check MCP is running (hammer icon should show)

## Verification After Deployment

Contracts deployed via MCP are **auto-verified**.

For Hardhat deployments, verify using:
```bash
npx hardhat verify --network regtest <CONTRACT_ADDRESS> [constructor args...]
```

**Important:** Use exact pragma versions for verification:
```solidity
pragma solidity 0.8.24;  // Not ^0.8.24
```

See the **Contract Verification** Skill for detailed verification help.

## Successful Deployments (Proof of Concept)

| Contract | Address | Method | Status |
|----------|---------|--------|--------|
| SimpleTest | `0xde6c29923d7BB9FDbcDfEC54E7e726894B982593` | Hardhat | ✅ Verified |
| MessageBoard | `0x479fa7d6eAE6bF7B4a0Cc6399F7518aA3Cd07580` | Hardhat | ✅ Verified |
| CollateralERC20 | `0xca0daeff9cB8DED3EEF075Df62aDBb1522479639` | Hardhat | ✅ Verified |
| RuneERC20 | `0x29cf3A9B709f94Eb46fBbA67753B90E721ddC9Ed` | Hardhat | ✅ Verified |

All viewable on: https://blockscout.staging.midl.xyz

## Best Practices

1. **Always use staging RPC** (`rpc.staging.midl.xyz`)
2. **Always include viem override** in package.json
3. **Be patient with write operations** (10-15 min is normal)
4. **Verify immediately after deployment** while settings are fresh
5. **Use exact pragma versions** for verification
6. **Check Blockscout** to monitor transaction status
7. **Document constructor args** for future verification

## Quick Commands

```bash
# Deploy
npx hardhat deploy --network regtest --tags your-tag

# Check address
npx hardhat midl:address 0 --network regtest

# Check balance
curl "https://mempool.staging.midl.xyz/api/address/YOUR_ADDRESS"

# Verify contract
npx hardhat verify --network regtest <ADDRESS> [args...]
```

## How MIDL Deployment Works

MIDL is a Bitcoin-anchored EVM. Contract deployments require both a Bitcoin transaction and an EVM transaction:

1. **EVM Transaction:** Standard contract deployment data
2. **Bitcoin Transaction:** Anchors the EVM transaction to Bitcoin
3. **BIP322 Signature:** Links the EVM transaction to the BTC transaction
4. **eth_sendBTCTransactions:** Special RPC that submits both together

The MCP and Hardhat handle all of this automatically!

## Resources

- **Deployment Guide:** `MIDL_DEPLOYMENT_GUIDE.md`
- **MCP Guide:** `DEPLOY_AND_INTERACT.md`
- **MCP Verification:** `MCP_DEPLOY_VERIFICATION.md`
- **Verification Guide:** `CONTRACT_VERIFICATION_GUIDE.md`
