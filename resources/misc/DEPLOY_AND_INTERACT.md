# MIDL MCP Server - Deploy & Interact Guide

Deploy Solidity smart contracts to MIDL L2 (Bitcoin-anchored EVM) using Claude Desktop.

---

## Setup

### Claude Desktop Configuration

Add this to your `claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "midl-bitcoin": {
      "command": "npx",
      "args": ["-y", "tsx", "/path/to/midl-mcp/src/index.ts"],
      "env": {
        "MIDL_NETWORK": "staging",
        "MIDL_MNEMONIC": "your twelve word mnemonic phrase here"
      }
    }
  }
}
```

**Important:**
- Use your wallet's mnemonic (12 or 24 words) from Xverse or another Bitcoin wallet
- The mnemonic enables automatic transaction signing
- For staging/regtest, get test BTC from the [MIDL Faucet](https://faucet.midl.xyz)

### Restart Claude

After updating the config, **fully quit Claude (Cmd+Q)** and restart. Claude only discovers tools on startup.

---

## Deploying a Contract

### One-Step Deployment

Simply ask Claude to deploy your contract:

**Prompt:**
```
Deploy this contract with constructor argument "Hello MIDL!":

// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract SimpleStorage {
    string private message;

    constructor(string memory initialMessage) {
        message = initialMessage;
    }

    function getMessage() public view returns (string memory) {
        return message;
    }

    function setMessage(string memory newMessage) public {
        message = newMessage;
    }
}
```

### What Happens

The `deploy-contract-source` tool handles the complete MIDL deployment flow:

1. **Compiles** the Solidity code (resolves OpenZeppelin imports automatically)
2. **Creates the BTC transaction** that anchors the EVM deployment
3. **Signs the EVM transaction** with BIP322 using the BTC transaction ID
4. **Submits both transactions** to the MIDL network via `eth_sendBTCTransactions`
5. **Auto-verifies** the contract on Blockscout

### Example Output

```
Contract deployed successfully!

Contract Name: SimpleStorage
Contract Address: 0x479fa7d6eAE6bF7B4a0Cc6399F7518aA3Cd07580
BTC Transaction ID: c8885c2a8113dbc86514c2a81745ae1ac918a2dd0c20cafda6c49956781cbb63
EVM Transaction Hash: 0x1234...abcd
Contract deployed at block: 12345
Contract verified on Blockscout!

View on Blockscout: https://blockscout.regtest.midl.xyz/address/0x479fa7d6eAE6bF7B4a0Cc6399F7518aA3Cd07580
```

---

## Interacting with Contracts

### Reading (Free)

Read functions don't require Bitcoin transactions:

**Prompt:** `"Call getMessage() on contract 0x479fa7d6eAE6bF7B4a0Cc6399F7518aA3Cd07580"`

### Writing (Requires BTC)

Write functions need Bitcoin anchoring:

**Prompt:** `"Call setMessage('New message!') on contract 0x479fa7d6eAE6bF7B4a0Cc6399F7518aA3Cd07580"`

This uses `call-contract` which:
1. Creates the Bitcoin anchoring transaction
2. Signs the EVM transaction with BIP322
3. Submits both to the MIDL network

---

## Available Tools

| Tool | Description |
|------|-------------|
| `deploy-contract-source` | Compile & deploy Solidity code (auto-signs, auto-verifies) |
| `call-contract` | Call a function on a deployed contract |
| `verify-contract` | Manually verify a contract on Blockscout |
| `broadcast-transaction` | Broadcast BTC transaction (for transfers) |
| `prepare-btc-transfer` | Prepare unsigned PSBT for BTC transfer |
| `get-wallet-balance` | Check BTC balance |
| `get-address-transactions` | View transaction history |
| `decode-psbt` | Inspect PSBT details |
| `validate-bitcoin-address` | Validate BTC address format |
| `estimate-btc-transfer-fee` | Estimate transaction fees |
| `get-blockchain-info` | Network status |

---

## Contract Verification

Contracts are automatically verified during deployment. If you need to verify manually:

**Prompt:**
```
Verify contract 0x... with this source code:
[paste source code]
Contract name: MyContract
```

The `verify-contract` tool submits source code to Blockscout's verification API.

---

## Network Resources

### Staging (Pre-Production Testing)

| Resource | URL |
|----------|-----|
| Faucet | https://faucet.midl.xyz |
| Bitcoin Explorer | https://mempool.staging.midl.xyz |
| EVM Explorer | https://blockscout.staging.midl.xyz |
| EVM RPC | https://rpc.staging.midl.xyz |

### Regtest (Local Development)

| Resource | URL |
|----------|-----|
| Faucet | https://faucet.midl.xyz |
| Bitcoin Explorer | https://mempool.regtest.midl.xyz |
| EVM Explorer | https://blockscout.regtest.midl.xyz |
| EVM RPC | https://rpc.regtest.midl.xyz |

### Your Addresses

When connected, your wallet has two addresses:
- **Payment (P2WPKH)**: `bcrt1q...` - Where your BTC funds are
- **Ordinals (P2TR)**: `bcrt1p...` - Taproot address for ordinals

The MCP server uses your Payment address for transactions.

---

## How MIDL Deployment Works

MIDL is a Bitcoin-anchored EVM. Contract deployments require both a Bitcoin transaction and an EVM transaction:

1. **EVM Transaction**: Standard contract deployment data
2. **Bitcoin Transaction**: Anchors the EVM transaction to Bitcoin
3. **BIP322 Signature**: Links the EVM transaction to the BTC transaction
4. **eth_sendBTCTransactions**: Special RPC that submits both together

The MCP server handles all of this automatically - just provide your Solidity code!

---

## Troubleshooting

### "No selected UTXOs"
Your wallet doesn't have enough BTC. Get test coins from the faucet.

### "Method not found" on signature
You're using ADDRESS mode instead of MNEMONIC mode. Update your config to use `MIDL_MNEMONIC`.

### Contract not appearing on explorer
Wait for Bitcoin block confirmation (1-2 minutes on regtest).

### Verification failed
- Check compiler version matches (default: solc 0.8.28)
- Ensure constructor args are correct
- Contract must be deployed before verification

### Claude says it can't access OpenZeppelin
Remind Claude: *"Use the deploy-contract-source tool - it handles imports automatically."*

---

## Alternative: Hardhat Deployment

For developers preferring standard tools:

```bash
pnpm add -D hardhat @midl/hardhat-deploy hardhat-deploy @midl/executor
```

See the [MIDL JS SDK docs](https://js.midl.xyz/guides/deploy-contract) for full Hardhat integration.
