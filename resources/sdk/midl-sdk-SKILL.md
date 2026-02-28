---
name: midl-sdk-v2
description: Complete MIDL JavaScript SDK reference. Use for any questions about @midl/core, @midl/react, @midl/executor, @midl/executor-react, @midl/connectors, wallet connection (Xverse, Leather), PSBT signing, Bitcoin transfers, contract deployment/interaction, the 4-step write transaction flow, viem override, finalizeBTCTransaction, useAddTxIntention, useSignIntention, useSendBTCTransactions, hardhat-deploy, or MIDL troubleshooting.
---

# MIDL JS SDK Reference

You are an expert on the MIDL JavaScript SDK. Answer all questions about MIDL JS using the documentation embedded in this skill. Do not search the web or GitHub — all required information is here.


## Overview

MIDL.js is a framework for building decentralized applications on Bitcoin, powered by the MIDL Protocol. It extends Bitcoin's capabilities by enabling smart contracts and advanced application logic on the Bitcoin network.

**Key packages:**
- `@midl/core` — Bitcoin interaction primitives (connect, sign, UTXO, transfer)
- `@midl/react` — React hooks wrapping core actions
- `@midl/connectors` — Wallet connectors (Xverse, Leather, Unisat, Phantom, Bitget, MagicEden)
- `@midl/node` — Node.js connector (keyPair-based, no browser wallet needed)
- `@midl/executor` — MIDL protocol executor actions (deploy, write contracts)
- `@midl/executor-react` — React hooks for executor actions
- `@midl/viem` — Patched viem with `estimateGasMulti` and MIDL-specific features
- `@midl/hardhat-deploy` — Hardhat plugin for deploying contracts to MIDL
- `@midl/satoshi-kit` — Pre-built UI component library for wallet connection

**Networks:**
- `regtest` (staging/testnet) — Chain ID 15001 (0x3a99) — RPC: `https://rpc.staging.midl.xyz`
- `mainnet` — production network


## Installation

### Core + React (Bitcoin interactions only)

```bash
pnpm add @midl/core @midl/react @midl/connectors
```

### Executor (contract deployment/interaction)

```bash
pnpm add @midl/executor @midl/executor-react @midl/connectors @midl/core @midl/react
```

### CRITICAL: Override viem

**This step is required.** The standard `viem` package is missing `estimateGasMulti` and other MIDL-specific features. Without this override, contract interactions will fail.

```json
// package.json (pnpm)
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

```json
// package.json (npm)
{
  "overrides": {
    "viem": "npm:@midl/viem"
  }
}
```

```json
// package.json (yarn)
{
  "resolutions": {
    "viem": "npm:@midl/viem"
  }
}
```

> **Why**: `@midl/viem` adds `estimateGasMulti` to the public client, which is called by `finalizeBTCTransaction` to estimate gas for all intentions at once. Without it you get a runtime error: `publicClient.estimateGasMulti is not a function`.


## Configuration

### createConfig

```ts
import { createConfig, regtest } from "@midl/core";
import { xverseConnector } from "@midl/connectors";

export const midlConfig = createConfig({
  networks: [regtest],           // Available: mainnet, testnet, testnet4, signet, regtest
  connectors: [xverseConnector()],
  persist: true,                 // Store connection state across reloads
});
```

**Available connectors:**

```ts
import {
  xverseConnector,
  leatherConnector,
  unisatConnector,
  phantomConnector,
  bitgetConnector,
  magicEdenConnector,
} from "@midl/connectors";

import { keyPairConnector } from "@midl/node"; // Node.js only
```

### Provider Setup

```tsx
// app.tsx — Core only
import { MidlProvider } from "@midl/react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient();

function App({ children }) {
  return (
    <MidlProvider config={midlConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </MidlProvider>
  );
}
```

```tsx
// app.tsx — With executor (contracts)
import { MidlProvider } from "@midl/react";
import { WagmiMidlProvider } from "@midl/executor-react";
import { QueryClientProvider, QueryClient } from "@tanstack/react-query";

const queryClient = new QueryClient();

function App({ children }) {
  return (
    <MidlProvider config={midlConfig}>
      <QueryClientProvider client={queryClient}>
        <WagmiMidlProvider>
          {children}
        </WagmiMidlProvider>
      </QueryClientProvider>
    </MidlProvider>
  );
}
```


## Core Hooks (`@midl/react`)

### useAccounts

```ts
import { useAccounts } from "@midl/react";

const {
  accounts,          // Account[]
  ordinalsAccount,   // Account | undefined — P2TR address
  paymentAccount,    // Account | undefined — P2WPKH/P2SH address
  connector,         // Current connector
  isConnecting,      // boolean
  isConnected,       // boolean
  status,            // "connected" | "connecting" | "disconnected"
  network,           // Current network
} = useAccounts();
```

### useConnect

```ts
import { useConnect } from "@midl/react";
import { AddressPurpose } from "@midl/core";

const { connect, connectors } = useConnect({
  purposes: [AddressPurpose.Ordinals],  // or AddressPurpose.Payment
});

// Usage:
connectors.map(c => (
  <button onClick={() => connect({ id: c.id })}>
    Connect {c.name}
  </button>
));
```

**ConnectWallet example:**

```tsx
import { AddressPurpose } from "@midl/core";
import { useConnect } from "@midl/react";

export function ConnectWallet() {
  const { connectors, connect } = useConnect({
    purposes: [AddressPurpose.Ordinals],
  });

  return (
    <div>
      {connectors.map(connector => (
        <button
          key={connector.name}
          onClick={() => connect({ id: connector.id })}
        >
          Connect with {connector.name}
        </button>
      ))}
    </div>
  );
}
```

### useSignPSBT

```ts
import { useSignPSBT } from "@midl/react";

const { signPSBT, signPSBTAsync, data, isPending, isError } = useSignPSBT();

await signPSBTAsync({
  psbt: base64PSBTString,
  signInputs: { "address": [0, 1] },  // address → input indices
  publish: false,
  disableTweakSigner: false,
});
// Returns: { psbt: string, txId?: string }
```

### useUTXOs

```ts
import { useUTXOs } from "@midl/react";

const { utxos, isLoading, isError } = useUTXOs({
  address: "bcrt1q...",
  includeRunes: false,
});
// utxos: Array<{ txid, vout, value, status, block_height }>
```

### useTransferBTC

```ts
import { useTransferBTC } from "@midl/react";

const { transferBTC } = useTransferBTC();

await transferBTC({
  transfers: [{ to: "bcrt1q...", value: 10000 }],  // value in satoshis
  feeRate: 5,      // sats/vB
  publish: true,
});
```

### useBroadcastTransaction

```ts
import { useBroadcastTransaction } from "@midl/react";

const { broadcastTransaction } = useBroadcastTransaction();

await broadcastTransaction({ tx: "020000001..." });
// Returns: { txId: string }
```

### useWaitForTransaction

```ts
import { useWaitForTransaction } from "@midl/react";

const { waitForTransaction } = useWaitForTransaction({
  mutation: {
    onSuccess: () => { /* handle confirmation */ }
  }
});

waitForTransaction({
  txId: "abc123...",
  confirmations: 1,    // default 1
  maxAttempts: 100,
  intervalMs: 5000,
});
```

### useSignMessage

```ts
import { useSignMessage } from "@midl/react";

const { signMessage } = useSignMessage();

await signMessage({
  message: "Hello from MIDL",
  address: "bcrt1q...",  // optional
  protocol: "ECDSA",    // or "BIP322"
});
```

### useConfig

```ts
import { useConfig } from "@midl/react";

const config = useConfig();
```


## Executor — How It Works

Writing to MIDL contracts requires a Bitcoin transaction to cover fees and transfer assets. Every write operation follows this 4-step flow:

1. **Add transaction intention** — describe the EVM transaction (to, data, optional deposit/withdraw)
2. **Finalize BTC transaction** — calculate gas limits and fees, build the Bitcoin PSBT (calls `transferBTC` or `edictRune` under the hood, which triggers Xverse/Leather wallet for UTXO signing)
3. **Sign intention** — sign the intention with reference to the BTC transaction ID
4. **Broadcast** — send the signed EVM transactions + BTC transaction to the network

```
addTxIntention → finalizeBTCTransaction → signIntention → publicClient.sendBTCTransactions
```


## Executor Hooks (`@midl/executor-react`)

### useAddTxIntention

```ts
import { useAddTxIntention } from "@midl/executor-react";

const { addTxIntention, txIntentions } = useAddTxIntention();

addTxIntention({
  reset: true,  // clear previous intentions first
  intention: {
    evmTransaction: {
      to: "0x...",
      data: encodeFunctionData({ abi, functionName: "setMessage", args: ["Hello"] }),
    },
    deposit: {
      satoshis: 10000,   // optional: deposit BTC
      runes: [],         // optional: deposit runes
    },
    withdraw: {
      satoshis: 5000,    // optional: withdraw BTC
      runes: [],
    },
  },
  from: "bcrt1q...",  // optional: override signing address
});
```

### useFinalizeBTCTransaction

```ts
import { useFinalizeBTCTransaction } from "@midl/executor-react";

const { finalizeBTCTransaction, finalizeBTCTransactionAsync, data } =
  useFinalizeBTCTransaction();

// Triggers wallet popup for UTXO signing (Xverse/Leather)
await finalizeBTCTransactionAsync({
  feeRate: 10,              // optional: sats/vB
  skipEstimateGasMulti: false,  // optional: skip gas estimation (dangerous)
  assetsToWithdrawSize: 0,  // optional: assets being withdrawn
  from: "bcrt1q...",        // optional: override BTC address
});

// Returns EdictRuneResponse | TransferBTCResponse
// data.tx.id  — BTC transaction ID
// data.tx.hex — BTC transaction hex
```

### useSignIntention

```ts
import { useSignIntention } from "@midl/executor-react";

const { signIntentionAsync } = useSignIntention();

for (const intention of txIntentions) {
  await signIntentionAsync({
    intention,
    txId: data.tx.id,  // BTC transaction ID from finalizeBTCTransaction
  });
}
```

### useSendBTCTransactions

```ts
import { usePublicClient } from "wagmi";

// Note: sendBTCTransactions is accessed via the public client, not a hook
const publicClient = usePublicClient();

await publicClient?.sendBTCTransactions({
  serializedTransactions: txIntentions.map(it => it.signedEvmTransaction as `0x${string}`),
  btcTransaction: data.tx.hex,
});
```

### useEstimateBTCTransaction

```ts
import { useEstimateBTCTransaction } from "@midl/executor-react";

const { data, isLoading, isError } = useEstimateBTCTransaction({
  intentions: txIntentions,
  // Returns: { fee: bigint, intentions: TransactionIntention[] with updated gas }
});
```

### useAddCompleteTxIntention

```ts
import { useAddCompleteTxIntention } from "@midl/executor-react";

const { addCompleteTxIntention } = useAddCompleteTxIntention();

// Withdraw assets back to Bitcoin
addCompleteTxIntention({
  satoshis: 10000,
  runes: [{ id: "840000:1", amount: 1000n, address: "0x..." }],
});
```

### useClearTxIntentions

```ts
import { useClearTxIntentions } from "@midl/executor-react";

const clearIntentions = useClearTxIntentions();
clearIntentions();
```

### usePublicKey

```ts
import { usePublicKey } from "@midl/executor-react";

const { publicKey } = usePublicKey();
// P2TR: x-only public key
// P2WPKH/P2SH: x-coordinate
```


## Full Contract Write Example

```tsx
// WriteContract.tsx
import {
  useAddTxIntention,
  useFinalizeBTCTransaction,
  useSignIntention,
} from "@midl/executor-react";
import { useWaitForTransaction } from "@midl/react";
import { encodeFunctionData } from "viem";  // resolves to @midl/viem via override
import { usePublicClient, useReadContract } from "wagmi";

const CONTRACT_ADDRESS = "0x015bceEFA137a662aFC0347Cb6fc204192960094";
const ABI = [/* your ABI here */];

export function WriteContract() {
  const { addTxIntention, txIntentions } = useAddTxIntention();
  const { finalizeBTCTransaction, data } = useFinalizeBTCTransaction();
  const { signIntentionAsync } = useSignIntention();
  const publicClient = usePublicClient();
  const { waitForTransaction } = useWaitForTransaction({
    mutation: { onSuccess: () => refetch() },
  });

  const { data: value, refetch } = useReadContract({
    abi: ABI,
    functionName: "getMessage",
    address: CONTRACT_ADDRESS,
  });

  // Step 1: Add intention
  const onAddIntention = () => {
    addTxIntention({
      reset: true,
      intention: {
        evmTransaction: {
          to: CONTRACT_ADDRESS,
          data: encodeFunctionData({
            abi: ABI,
            functionName: "setMessage",
            args: ["Hello from MIDL!"],
          }),
        },
      },
    });
  };

  // Step 2: Finalize BTC transaction (triggers wallet popup)
  const onFinalize = () => finalizeBTCTransaction();

  // Step 3: Sign intentions
  const onSign = async () => {
    for (const intention of txIntentions) {
      await signIntentionAsync({ intention, txId: data.tx.id });
    }
  };

  // Step 4: Broadcast
  const onBroadcast = async () => {
    await publicClient?.sendBTCTransactions({
      serializedTransactions: txIntentions.map(it => it.signedEvmTransaction as `0x${string}`),
      btcTransaction: data.tx.hex,
    });
    waitForTransaction({ txId: data.tx.id });
  };

  return (
    <div>
      <button onClick={onAddIntention} disabled={txIntentions.length > 0}>
        1. Add Intention
      </button>
      <button onClick={onFinalize}>2. Finalize BTC Tx</button>
      <button onClick={onSign}>3. Sign Intentions</button>
      <button onClick={onBroadcast}>4. Broadcast</button>
    </div>
  );
}
```


## Contract Deployment (Hardhat)

### Setup

```bash
mkdir my-contracts && cd my-contracts
pnpm init
pnpm add -D hardhat @midl/hardhat-deploy hardhat-deploy @midl/executor
pnpx hardhat init  # Choose "TypeScript project"
rm -rf ignition test contracts/**  # Remove Hardhat Ignition (incompatible)
```

### hardhat.config.ts

```ts
import "@typechain/hardhat";
import "@midl/hardhat-deploy";
import "hardhat-deploy";
import "@nomicfoundation/hardhat-verify";
import { vars, type HardhatUserConfig } from "hardhat/config";
import { midlRegtest } from "@midl/executor";

const config: HardhatUserConfig = {
  solidity: "0.8.28",
  midl: {
    networks: {
      default: {
        mnemonic: vars.get("MNEMONIC"),
        confirmationsRequired: 1,
        btcConfirmationsRequired: 1,
      },
    },
  },
  networks: {
    default: {
      url: midlRegtest.rpcUrls.default.http[0],  // https://rpc.staging.midl.xyz
      chainId: midlRegtest.id,                   // 15001
    },
  },
  etherscan: {
    apiKey: { "midl-regtest": "empty" },
    customChains: [{
      network: "midl-regtest",
      chainId: 15001,  // Use actual chain ID, NOT 777 from old docs
      urls: {
        apiURL: "https://blockscout.staging.midl.xyz/api",
        browserURL: "https://blockscout.staging.midl.xyz",
      },
    }],
  },
};

export default config;
```

**Set mnemonic:**
```bash
npx hardhat vars set MNEMONIC
# Paste BIP39 mnemonic when prompted
```

**Get your BTC address:**
```bash
pnpm hardhat midl:address
# Output: Bitcoin Address: bcrt1q... (p2wpkh)
#         EVM Address: 0x...
```

### Deploy Script

```ts
// deploy/00_deploy_SimpleStorage.ts
import type { DeployFunction } from "hardhat-deploy/types";

const deploy: DeployFunction = async (hre) => {
  await hre.midl.initialize();

  await hre.midl.deploy("SimpleStorage", {
    args: ["Hello from MIDL!"],
  });

  await hre.midl.execute();
};

deploy.tags = ["main"];
export default deploy;
```

### Deploy

```bash
pnpm hardhat deploy
```

After deployment, `deployments/` folder contains JSON with contract address and ABI.

### Verify

```bash
pnpm hardhat verify REPLACE_WITH_ADDRESS "Hello from MIDL" --network default
```

### Advanced: hre.midl API

| Method | Description |
|--------|-------------|
| `hre.midl.initialize()` | Initialize MIDL SDK (required first) |
| `hre.midl.deploy(name, opts)` | Add deploy intention |
| `hre.midl.callContract(name, fn, args)` | Call contract function |
| `hre.midl.execute()` | Send all intentions (BTC + EVM) |
| `hre.midl.getDeployment(name)` | Get deployed contract info |
| `hre.midl.getEVMAddress()` | Get EVM address for current account |
| `hre.midl.getAccount()` | Get full account info |
| `hre.midl.wallet` | Viem wallet client |
| `hre.midl.chain` | Chain config |

**Passing BTC as value:**
```ts
import { satoshisToWei } from "@midl/executor";

await hre.midl.callContract("MyContract", "deposit", [], {
  value: satoshisToWei(10000),  // 10000 satoshis
});
```

**Multiple accounts:**
```ts
const account1 = await hre.midl.getWalletClient(0);
const account2 = await hre.midl.getWalletClient(1);
```


## Executor Actions (`@midl/executor`)

### addTxIntention

```ts
import { addTxIntention } from "@midl/executor";

const intention = await addTxIntention(config, {
  evmTransaction: { to: "0x...", data: "0x..." },
  deposit: { satoshis: 10000 },
  withdraw: { satoshis: 5000 },
}, "bcrt1q...");  // optional: from address
```

### finalizeBTCTransaction

```ts
import { finalizeBTCTransaction } from "@midl/executor";

const btcTx = await finalizeBTCTransaction(config, intentions, client, {
  feeRate: 10,
  stateOverride: undefined,
  skipEstimateGasMulti: false,
  assetsToWithdrawSize: 0,
  multisigAddress: undefined,
  gasMultiplier: 1.2,
});
// Returns: EdictRuneResponse | TransferBTCResponse
// btcTx.tx.id  — transaction ID
// btcTx.tx.hex — transaction hex
```

**Internals:** `finalizeBTCTransaction` calls `transferBTC` (BTC-only) or `edictRune` (with runes), which calls the wallet connector (Xverse/Leather via sats-connect) to sign the PSBT using the user's UTXOs.

### signIntention

```ts
import { signIntention } from "@midl/executor";

const signed = await signIntention(config, client, intention, intentions, {
  from: "bcrt1q...",
  nonce: 0n,
  txId: "abc123...",
  protocol: "ECDSA",
});
// Returns: SignedTransaction
```

### estimateBTCTransaction

```ts
import { estimateBTCTransaction } from "@midl/executor";

const estimate = await estimateBTCTransaction(config, intentions, client);
// Returns: { fee: bigint, intentions: TransactionIntention[] }
```

### getBTCFeeRate

```ts
import { getBTCFeeRate } from "@midl/executor";

const feeRate = await getBTCFeeRate(config, client);
// Returns: bigint — current fee rate in sats/vB
```

### addRuneERC20

```ts
import { addRuneERC20 } from "@midl/executor";

const result = await addRuneERC20(config, client, "MYRUNE·NAME·HERE", { publish: true });
// Rune name must be ≥12 characters and rune must have ≥6 confirmations
// Returns: EdictRuneResponse
```


## Core Types Reference

```ts
// Account
type Account = {
  address: string;
  publicKey: string;
  addressType: AddressType;
  purpose: AddressPurpose;
}

// AddressType
enum AddressType {
  P2SH_P2WPKH = "P2SH-P2WPKH",
  P2WPKH = "P2WPKH",
  P2TR = "P2TR",
}

// AddressPurpose
enum AddressPurpose {
  Ordinals = "ordinals",  // P2TR — used for EVM identity
  Payment = "payment",    // P2WPKH/P2SH — used for BTC fees
}

// UTXO
type UTXO = {
  txid: string;
  vout: number;
  value: number;  // satoshis
  status: { confirmed: boolean; block_height?: number };
}
```


## Connector Interface (Custom Connectors)

```ts
import { createConnector, type Connector } from "@midl/core";

export const myConnector = ({ metadata } = {}) =>
  createConnector(
    {
      metadata: { name: "MyWallet" },
      create: () => new MyConnectorImpl(),
    },
    metadata,
  );

class MyConnectorImpl extends Connector {
  readonly id = "my-wallet";

  async connect(params: ConnectorConnectParams): Promise<Account[]> { /* ... */ }

  async signMessage(params: SignMessageParams, network: BitcoinNetwork): Promise<SignMessageResponse> { /* ... */ }

  async signPSBT(params: Omit<SignPSBTParams, "publish">, network: BitcoinNetwork): Promise<Omit<SignPSBTResponse, "txId">> { /* ... */ }

  async beforeDisconnect(): Promise<void> { /* optional */ }
  async switchNetwork(network: BitcoinNetwork): Promise<Account[]> { /* optional */ }
  async addNetwork(networkConfig: NetworkConfig): Promise<void> { /* optional */ }
}
```


## SatoshiKit (Pre-built UI)

```bash
pnpm add @midl/satoshi-kit
```

```tsx
import { createMidlConfig, SatoshiKitProvider } from "@midl/satoshi-kit";
import { ConnectButton } from "@midl/satoshi-kit";

const config = createMidlConfig({
  networks: [regtest],
  // Connectors auto-configured
});

function App() {
  return (
    <SatoshiKitProvider config={config}>
      <ConnectButton />
    </SatoshiKitProvider>
  );
}
```


## Troubleshooting

### "Cannot find module 'viem'" or "estimateGasMulti is not a function"

**Root cause:** `viem` is not in explicit `dependencies` — it's only pulled transitively.

**Fix:**
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

Then run `pnpm install`.

### "Xverse did not provide spendable UTXOs"

**Root cause:** Xverse uses its own internal UTXO indexer which can fail to find UTXOs on regtest/staging networks.

**Workarounds:**
1. Wait a few minutes and retry (indexer may be catching up)
2. Use Leather wallet instead (more reliable UTXO handling on regtest)
3. Try the transaction with a different payment UTXO

### "Buffer is not defined" (browser/Vite)

Add to `index.html`:
```html
<script type="module">
  import { Buffer } from "buffer";
  window.Buffer = Buffer;
  window.global = window;
  BigInt.prototype.toJSON = function () {
    return this.toString();
  };
</script>
```

### SatoshiKit + Next.js Turbopack conflict

```js
// next.config.js — Option 1: disable turbopack
module.exports = { experimental: { turbo: false } };

// next.config.js — Option 2: transpile
module.exports = { transpilePackages: ["@midl/satoshi-kit"] };
```

### Vite alias (if not using pnpm overrides)

```ts
// vite.config.ts
export default defineConfig({
  resolve: {
    alias: { 'viem': '@midl/viem' }
  }
});
```

### "System contract not found" / finalizeBTCTransaction hangs

The Executor contract at `0x0000000000000000000000000000000000001006` is only available on staging RPC (`https://rpc.staging.midl.xyz`). If you're using a local regtest RPC, this system contract won't exist and gas estimation will hang or fail.

**Fix:** Use staging RPC for all transactions, even when testing locally.

### Chain ID mismatch during verification

The actual staging network chain ID is **15001**, not 777. Use `chainId: 15001` in `hardhat.config.ts` etherscan customChains.


## Network Constants

```ts
import { midlRegtest } from "@midl/executor";
// midlRegtest.id = 15001
// midlRegtest.rpcUrls.default.http[0] = "https://rpc.staging.midl.xyz"

import { regtest } from "@midl/core";
// regtest — Bitcoin regtest network config for @midl/core
```


## Package Version Compatibility (Tested)

| Package | Version |
|---------|---------|
| `@midl/core` | `^3.0.1` (3.0.2) |
| `@midl/executor` | `^3.0.1` (3.0.2) |
| `@midl/node` | `3.0.1` |
| `@midl/viem` | `2.21.39` |
| `viem` | `npm:@midl/viem@2.21.39` |

> Using `3.0.0-next.*` pre-release versions can cause dependency resolution issues. Stick to stable `3.0.x` releases.
