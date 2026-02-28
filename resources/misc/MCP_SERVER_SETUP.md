# MIDL MCP Server Setup Guide

Complete guide for setting up and using the MIDL Model Context Protocol (MCP) server.

---

## Prerequisites

### Required Software


- Node.js 18+ or 22+ (recommended)
- pnpm (or npm/yarn)

### Required Accounts
- Bitcoin wallet with testnet/regtest funds
- Mnemonic seed phrase OR Bitcoin address

---

## Installation

```bash
cd <YOUR_PATH>/midl-mcp
pnpm install
pnpm build
```

---


## Configuration

### Environment Variables

Create a `.env` file in the project root:

```bash
# Network Selection (choose one)
MIDL_NETWORK=staging          # Recommended for testing
# MIDL_NETWORK=testnet        # Bitcoin testnet4
# MIDL_NETWORK=mainnet        # Bitcoin mainnet (use with caution)
# MIDL_NETWORK=regtest        # Local regtest

# Authentication Mode 1: Mnemonic (Full Capability)
MIDL_MNEMONIC=...   # Your 12/24 word seed phrase

# Authentication Mode 2: Address Only (Read-only + Unsigned PSBTs)
# MIDL_ACCOUNT_ADDRESS=bcrt1q...
# MIDL_ACCOUNT_PUBKEY=02...  # Optional, can be auto-recovered

# Optional: Custom RPC URL
# MIDL_RPC_URL=https://rpc.staging.midl.xyz
```

### Network Options

#### Staging (Recommended for Testing) ✅
```bash
MIDL_NETWORK=staging
MIDL_MNEMONIC=...
```
- **RPC:** Uses staging infrastructure
- **Bitcoin Network:** Regtest
- **Explorer:** https://mempool.staging.midl.xyz
- **Blockscout:** https://blockscout.staging.midl.xyz
- **Status:** ✅ Fully working
- **Note:** Write operations take ~10 minutes

#### Testnet (Public Bitcoin Testnet)
```bash
MIDL_NETWORK=testnet
MIDL_MNEMONIC=...
```
- **Bitcoin Network:** Testnet4
- **Explorer:** https://mempool.space/testnet4
- **Faucet:** Various testnet faucets available

#### Mainnet (Production)
```bash
MIDL_NETWORK=mainnet
MIDL_MNEMONIC=...
```
- ⚠️ **Use with caution** - Real Bitcoin!
- **Bitcoin Network:** Bitcoin mainnet
- **Explorer:** https://mempool.space

---

## Authentication Modes

### Mode 1: Mnemonic (Full Signing Capability) ✅ Recommended

**Provides:**
- ✅ Full transaction signing
- ✅ Contract deployments
- ✅ Contract interactions
- ✅ Asset transfers

**Setup:**
```bash
MIDL_NETWORK=staging
MIDL_MNEMONIC=...   # Your 12-word seed phrase
```

**Wallet Derivation:**
- Uses BIP86 derivation: `m/86'/1'/0'/0/0` (for testnet/regtest)
- Generates both Bitcoin and EVM addresses
- Payment address is used by default

### Mode 2: Address-Only (Unsigned PSBTs)

**Provides:**
- ✅ View balances
- ✅ View transactions
- ✅ Generate unsigned PSBTs
- ❌ Cannot sign/broadcast transactions

**Setup:**
```bash
MIDL_NETWORK=staging
MIDL_ACCOUNT_ADDRESS=bcrt1q...
MIDL_ACCOUNT_PUBKEY=02...  # Auto-recovered if omitted
```

---

## Running the Server

### Build and Run
```bash
# Build
pnpm build

# Run
pnpm start
```

### Development Mode
```bash
# Build and watch for changes
pnpm build --watch

# In another terminal
pnpm start
```

---

## MCP Server Capabilities

### Available Tools

1. **get_wallet_address** - Get Bitcoin & EVM addresses
2. **get_balance** - Check BTC balance
3. **deploy_contract** - Deploy Solidity contracts
4. **call_contract** - Interact with deployed contracts
5. **get_transaction** - Get transaction details
6. **estimate_fees** - Estimate transaction fees

### Resources

- **wallets://** - Access wallet information
- **contracts://** - View deployed contracts
- **transactions://** - Transaction history

---

## Testing the Setup

### 1. Check Server Status
```bash
pnpm start
# Should see: "Starting MIDL MCP Server..."
# And: "Real Wallet context established for: bcrt1q..."
```

### 2. Check Your Addresses
Use the MCP tool `get_wallet_address` or via hardhat:
```bash
cd midl-example
npx hardhat midl:address 0 --network regtest
```

### 3. Check Balances
Via MCP tool `get_balance` or curl:
```bash
curl "https://mempool.staging.midl.xyz/api/address/YOUR_BITCOIN_ADDRESS"
```

### 4. Deploy a Test Contract
Use the MCP tool `deploy_contract` with a simple contract:
```solidity
contract HelloWorld {
    string public message = "Hello MIDL!";
}
```

---

## Working Configuration (Proven)

This configuration is **tested and working** on staging:

### Environment
```bash
MIDL_NETWORK=staging
MIDL_MNEMONIC=...
```

### Network Details
- **Bitcoin RPC:** Handled by MempoolSpaceProvider
- **EVM RPC:** https://rpc.staging.midl.xyz (if custom RPC needed)
- **Chain ID:** 0x3a99 (15001)
- **Bitcoin Network:** Regtest
- **Mempool API:** https://mempool.staging.midl.xyz
- **Runes API:** https://runes.staging.midl.xyz

### Providers
```typescript
provider: new MempoolSpaceProvider({
  regtest: "https://mempool.staging.midl.xyz"
})

runesProvider: new MaestroSymphonyProvider({
  regtest: "https://runes.staging.midl.xyz"
})
```

---

## Performance Characteristics

### Staging Network Timing
- ✅ **Read operations:** Instant
- ✅ **Contract deployments:** ~30 seconds - 2 minutes
- ⏳ **Write operations:** ~8-15 minutes per transaction

**Important:** Write operations take time on staging. This is normal behavior!

---

## Troubleshooting

### Issue: "Neither MIDL_MNEMONIC nor MIDL_ACCOUNT_ADDRESS set"

**Cause:** Missing authentication credentials

**Solution:** Add `MIDL_MNEMONIC=...` to `.env` file

### Issue: "Using MOCK/DEMO mode"

**Cause:** Server couldn't load real config

**Solution:**
1. Check `.env` file exists
2. Verify `MIDL_MNEMONIC` is set correctly
3. Ensure 12 or 24 words separated by spaces

### Issue: "Connection failed" or timeout

**Cause:** Network issues or invalid network ID

**Solution:**
1. Check internet connection
2. Verify `MIDL_NETWORK=staging` (or other valid network)
3. Try with custom RPC: `MIDL_RPC_URL=https://rpc.staging.midl.xyz`

### Issue: Zero balance

**Cause:** No funds in wallet

**Solution:**
1. Check your Bitcoin address: `npx hardhat midl:address 0 --network regtest`
2. Send testnet BTC to that address
3. Verify on explorer: https://mempool.staging.midl.xyz/address/YOUR_ADDRESS

---

## Integration with Claude Desktop

### Claude Desktop Config

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "midl": {
      "command": "node",
      "args": ["<YOUR_PATH>/midl-mcp/dist/index.js"],
      "env": {
        "MIDL_NETWORK": "staging",
        "MIDL_MNEMONIC": "..."
      }
    }
  }
}
```

### Restart Claude Desktop

After updating the config, restart Claude Desktop for changes to take effect.

---

## Security Best Practices

1. **Never commit `.env` files** - Add to `.gitignore`
2. **Use testnet for development** - Don't use mainnet for testing
3. **Secure your mnemonic** - Store safely, never share
4. **Use address-only mode** when possible - For read-only operations
5. **Test with small amounts** - Even on testnet

---

## Example Usage

### Deploy a Contract via MCP

```typescript
// Using the deploy_contract tool
{
  "name": "MyToken",
  "code": "pragma solidity ^0.8.0; contract MyToken { ... }",
  "constructorArgs": ["Initial Supply", "1000000"]
}
```

### Call a Contract Function

```typescript
// Using the call_contract tool
{
  "contractAddress": "0x...",
  "functionName": "transfer",
  "args": ["0xRecipientAddress", "100"]
}
```

---

## Resources

- **Staging Mempool:** https://mempool.staging.midl.xyz
- **Staging Blockscout:** https://blockscout.staging.midl.xyz
- **MIDL Docs:** https://docs.midl.xyz
- **Deployment Guide:** `<YOUR_PATH>/midl-mcp/MIDL_DEPLOYMENT_GUIDE.md`

---

## Verified Working Setup

This MCP server has been tested with:
- ✅ Staging network connectivity
- ✅ Wallet address generation
- ✅ Balance queries
- ✅ Contract deployments (SimpleTest, MessageBoard, etc.)
- ✅ Contract interactions (read/write)
- ✅ Transaction tracking

**Last verified:** February 4, 2026
