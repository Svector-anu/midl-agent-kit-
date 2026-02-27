# Deploy Contracts

## Boot Sequence (ALWAYS first)

1. Read `~/midl_agent_skills/capabilities.json`
2. Read `~/midl_agent_skills/MIDDLEWARE.md`
3. Run `skills/midl-preflight/SKILL.md` — no exceptions

---

## Purpose

Gate and execute contract deployment to the MIDL staging network. Writes the deployment record to `state/deployment-log.json`. Optionally triggers Blockscout verification.

---

## Feature Gate

```
pauseIfUnsupported("deployment")
```

---

## Pre-Deploy Gates (all must pass before proceeding)

1. `validateToolchain()` — confirms hardhat + `npm:@midl/viem@2.21.39` + `evmVersion=paris`
2. `validateNetwork()` — confirms `capabilities.network.rpc` = `https://rpc.staging.midl.xyz`
3. Tests exist and have been run — ask human to confirm pass before proceeding
4. `readState("deployment-log.json")` — if contract name already exists → STOP and ask for explicit override

---

## viem Override (mandatory)

Confirm `package.json` contains:

```json
{
  "dependencies": { "viem": "npm:@midl/viem@2.21.39" },
  "pnpm": { "overrides": { "viem": "npm:@midl/viem@2.21.39" } }
}
```

---

## Hardhat Config Requirements

```typescript
// hardhat.config.ts
import "@midl/hardhat-deploy";

networks: {
  regtest: {
    url: "https://rpc.staging.midl.xyz",
    chainId: 15001,
  },
},
solidity: {
  version: "0.8.24",
  settings: {
    optimizer: { enabled: true, runs: 200 },
    evmVersion: "paris",
  },
},
etherscan: {
  apiKey: { regtest: "no-api-key-needed" },
  customChains: [{
    network: "regtest",
    chainId: 15001,
    urls: {
      apiURL: "https://blockscout.staging.midl.xyz/api",
      browserURL: "https://blockscout.staging.midl.xyz",
    },
  }],
},
sourcify: { enabled: false },
```

---

## Deploy Script Template

```typescript
// deploy/001_deploy_ContractName.ts
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deploy = async (hre: HardhatRuntimeEnvironment) => {
  await hre.midl.initialize();

  const result = await hre.midl.deploy("ContractName", {
    args: [/* constructor args — never hardcoded addresses */],
    log: true,
  });

  console.log("Deployed at:", result.address);
};

deploy.tags = ["ContractName"];
export default deploy;
```

---

## Deploy Command

```bash
npx hardhat deploy --network regtest --tags ContractName
```

---

## State Output (mandatory)

After deployment, `writeState("deployment-log.json", entry)` must record:

```json
{
  "schemaVersion": "1.0",
  "contracts": [
    {
      "contractName": "ContractName",
      "address": "0x...",
      "network": "staging",
      "chainId": 15001,
      "deployedAt": "<ISO timestamp>",
      "constructorArgs": [],
      "abi": []
    }
  ]
}
```

Never hardcode the deployed address in any source file. All consumers read from `state/deployment-log.json`.

---

## Verification (soft gate)

```
pauseIfUnsupported("verification")  // warn only if false — does not block deploy
```

`capabilities.gates.verificationMode = "soft"` — verification is recommended, not blocking.

Run after deploy:

```bash
npx hardhat verify --network regtest <ADDRESS> [constructorArgs...]
```

After successful verification, `writeState("verified-addresses.json", entry)`:

```json
{
  "schemaVersion": "1.0",
  "verified": [
    {
      "address": "0x...",
      "contractName": "ContractName",
      "verifiedAt": "<ISO timestamp>"
    }
  ]
}
```

---

## Timing

| Operation | Expected Time | Action |
|-----------|--------------|--------|
| Contract deployment | 30s – 2 min | Normal — do not kill process |
| Write operation | 8 – 15 min | Normal — do not kill process |
| > 15 min | Unexpected | Check mempool + RPC health before retrying |

---

## Completion Confirmation

```
deploy-contracts: COMPLETE
Address: 0x...
Network: staging (chainId 15001)
deployment-log.json: updated
Verification: [passed | skipped — soft gate]
verified-addresses.json: [updated | not updated]
```
