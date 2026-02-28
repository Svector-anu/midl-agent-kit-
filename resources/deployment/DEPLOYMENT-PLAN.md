# MIDL Hardhat Deployment — Canonical Plan

Reference this document before touching any hardhat project in this repo.
Skills that expand on each section:
- `contract-deployment` skill → full hardhat config + deploy API
- `contract-verification` skill → Blockscout verification steps

---

## 1. Package Requirements

Every MIDL hardhat project needs exactly these packages. Use this as the canonical `package.json`:

```json
{
  "dependencies": {
    "@openzeppelin/contracts": "^5.0.0",
    "viem": "npm:@midl/viem@2.21.39"
  },
  "devDependencies": {
    "@midl/core": "3.0.2",
    "@midl/executor": "3.0.2",
    "@midl/hardhat-deploy": "3.0.2",
    "@midl/node": "^3.0.2",
    "@midl/viem": "*",
    "@nomicfoundation/hardhat-ethers": "^3.0.0",
    "@nomicfoundation/hardhat-verify": "^2.0.0",
    "@types/mocha": "^10.0.0",
    "@types/node": "^20.0.0",
    "dotenv": "^16.0.0",
    "ethers": "^6.4.0",
    "hardhat": "^2.22.0",
    "hardhat-deploy": "^1.0.4",
    "hardhat-deploy-ethers": "^0.4.2",
    "ts-node": "^10.9.2",
    "typescript": "^5.4.5"
  }
}
```

**Why each package:**
- `viem: npm:@midl/viem` — MIDL fork of viem with `estimateGasMulti`. Without this, gas estimation hangs.
- `@midl/viem` + `@midl/node` — `@midl/hardhat-deploy` checks for these by package name at startup.
- `hardhat-deploy` — registers the `deploy` task (`npx hardhat deploy`). Without it → HH303 error.
- `@nomicfoundation/hardhat-ethers` + `hardhat-deploy-ethers` — ethers integration.
- `@nomicfoundation/hardhat-verify` — adds `etherscan` to `HardhatUserConfig` type + `verify` task.
- `dotenv` — loads `.env` file for MNEMONIC.
- DO NOT use `@nomicfoundation/hardhat-toolbox` — it only declares peer deps, doesn't install them.

Install:
```bash
npm install --legacy-peer-deps
```

---

## 2. hardhat.config.ts

```typescript
import "@midl/hardhat-deploy";
import "@nomicfoundation/hardhat-ethers";
import "@nomicfoundation/hardhat-verify";
import "hardhat-deploy";
import { MaestroSymphonyProvider, MempoolSpaceProvider } from "@midl/core";
import { midlRegtest } from "@midl/executor";
import { config as dotenvConfig } from "dotenv";
import { resolve } from "path";
import { HardhatUserConfig } from "hardhat/config";

dotenvConfig({ path: resolve(__dirname, ".env") });

const mnemonic =
  process.env.MNEMONIC ||
  "test test test test test test test test test test test junk";

const config: HardhatUserConfig = {
  networks: {
    hardhat: {},
    regtest: {
      url: "https://rpc.staging.midl.xyz",
      chainId: midlRegtest.id,
      accounts: {
        mnemonic,
        path: "m/86'/1'/0'/0/0",   // BIP-86 Taproot — required by MIDL wallet
      },
    },
  },
  midl: {
    networks: {
      regtest: {
        mnemonic,
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
    version: "0.8.28",
    settings: {
      evmVersion: "paris",
      optimizer: { enabled: false },
    },
  },
  etherscan: {
    apiKey: { regtest: "no-api-key-needed" },
    customChains: [
      {
        network: "regtest",
        chainId: 15001,
        urls: {
          apiURL: "https://blockscout.staging.midl.xyz/api",
          browserURL: "https://blockscout.staging.midl.xyz",
        },
      },
    ],
  },
  sourcify: { enabled: false },
};

export default config;
```

**Import order matters:** `@midl/hardhat-deploy` first, then ethers/verify, then `hardhat-deploy`.

---

## 3. tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "esModuleInterop": true,
    "strict": true,
    "outDir": "dist",
    "resolveJsonModule": true,
    "types": ["node", "mocha"]
  },
  "include": [
    "hardhat.config.ts",
    "contracts/**/*.ts",
    "deploy/**/*.ts",
    "test/**/*.ts",
    "scripts/**/*.ts"
  ]
}
```

---

## 4. Solidity Contract Pragma

**Always exact version, no caret:**
```solidity
pragma solidity 0.8.28;   // ✅ matches hardhat.config.ts compiler → verification works
pragma solidity ^0.8.27;  // ❌ ambiguous → bytecode mismatch → verification fails
```

---

## 5. Deploy Script Pattern

```typescript
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deploy: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { midl } = hre;

  await midl.initialize();                                    // Step 1: init wallet

  await midl.deploy("ContractName", [constructorArg1, constructorArg2]);  // Step 2: stage
  await midl.execute();                                       // Step 3: submit BTC+EVM

  const deployed = await midl.get("ContractName");            // Step 4: get result
  if (!deployed) throw new Error("ContractName not found after execute()");

  console.log(`Deployed at: ${deployed.address}`);
  console.log(`Blockscout: https://blockscout.staging.midl.xyz/address/${deployed.address}`);

  // Update state/deployment-log.json and state/demo-contracts.json here
};

deploy.tags = ["ContractName"];
export default deploy;
```

**API notes:**
- `midl.deploy(name, args)` — 2 args only (not 4)
- `midl.execute()` — separate call, submits the transaction
- `midl.get(name)` — returns `{ address, ... } | null` (not `getDeployment`)
- `midl.evm.address` — deployer's EVM address (after `initialize()`)

---

## 6. Commands

```bash
# MNEMONIC always as shell env, never in a file
export MNEMONIC="twelve word mnemonic here"

# Compile (requires --network for MIDL plugin)
npx hardhat compile --network regtest

# Deploy
npx hardhat deploy --network regtest --tags ContractName

# Verify immediately after deploy
npx hardhat verify --network regtest <ADDRESS> <arg1> <arg2>
```

**Timing:** Deployment takes 30s–2min. Write operations (post-deploy) take 8–15 min on staging — this is normal.

---

## 7. After Deploy Checklist

- [ ] Address printed to console
- [ ] `state/deployment-log.json` updated (deploy script does this)
- [ ] `state/demo-contracts.json` updated (deploy script does this)
- [ ] Contract verified on Blockscout
- [ ] `deployment-log.json` `verified` field set to `true` and `verificationUrl` filled in

---

## 8. Common Errors

| Error | Cause | Fix |
|---|---|---|
| `HH303: Unrecognized task 'deploy'` | `hardhat-deploy` npm package missing | Add `hardhat-deploy` to devDeps |
| `HH801: requires @midl/viem, @midl/node` | Those packages not installed by name | Add `@midl/viem` and `@midl/node` to devDeps |
| `hardhatNetwork is undefined` | `npx hardhat compile` without `--network` | Always pass `--network regtest` |
| `btcFeeRate returned no data` | Wrong RPC URL (regtest not staging) | Use `https://rpc.staging.midl.xyz` |
| `'etherscan' does not exist in HardhatUserConfig` | `@nomicfoundation/hardhat-verify` not installed | Add to devDeps, import in config |
| Bytecode mismatch on verify | Pragma uses caret (`^0.8.x`) | Change to exact `0.8.28` |
| `getDeployment is not a function` | Wrong API method name | Use `midl.get()` not `getDeployment()` |

---

## 9. Security

- MNEMONIC stays in shell env only: `export MNEMONIC="..."` or `.env` file
- `.env` is in `.gitignore` — never commit it
- Only the contract address is written to state files — never the key
