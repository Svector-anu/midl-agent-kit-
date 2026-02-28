# Generate Hardhat Tests

## Boot Sequence (ALWAYS first)

1. Read `<REPO_ROOT>/capabilities.json`
2. Read `<REPO_ROOT>/MIDDLEWARE.md`
3. Run `skills/midl-preflight/SKILL.md` — no exceptions

---

## Purpose

Generate Hardhat test files for MIDL contracts. Tests are the BUILD phase gate — no DEPLOY phase opens until tests pass.

---

## Feature Gate

```
pauseIfUnsupported("deployment")  // if deployment is off, flag before generating tests
```

---

## Hard Constraints

| Rule | Detail |
|------|--------|
| Runner | `npx hardhat test` (local) or `npx hardhat test --network regtest` (staging gate) — never `forge test` |
| Framework | `@nomicfoundation/hardhat-toolbox` (ethers v6) |
| Foundry | Never use `forge`, `cast`, `anvil`, or any Foundry tooling |
| Mocks | No mocks that bypass the PSBT flow unless explicitly scoped for unit testing |
| Network | Never run tests against mainnet |

---

## Workspace Scaffold

Each contract gets a **dedicated Hardhat workspace** under `dapps/<contract-name>-hardhat/`.

```
dapps/<name>-hardhat/
  contracts/         ← Solidity source (real or reconstructed)
  test/              ← TypeScript test files
  hardhat.config.ts
  tsconfig.json
  package.json
  README.md
```

### package.json

```json
{
  "name": "<name>-hardhat",
  "private": true,
  "version": "0.0.1",
  "scripts": {
    "test": "npx hardhat test",
    "compile": "npx hardhat compile"
  },
  "devDependencies": {
    "@nomicfoundation/hardhat-toolbox": "^5.0.0",
    "hardhat": "^2.22.0",
    "typescript": "^5.4.5",
    "ts-node": "^10.9.2",
    "@types/node": "^20.0.0"
  }
}
```

### hardhat.config.ts

```typescript
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.24",
    settings: {
      evmVersion: "paris",
      optimizer: { enabled: true, runs: 200 },
    },
  },
  networks: { hardhat: {} },
};

export default config;
```

> `evmVersion: "paris"` is required — matches MIDL chain constraints (no PUSH0/MCOPY opcodes).

### Install

```bash
# If ~/.npm/_cacache has stale permission issues:
npm install --cache /tmp/npm-cache-<name>

# Otherwise:
npm install
```

After install, record `testHarnessPath` in `state/deployment-log.json`:

```json
"testHarnessPath": "dapps/<name>-hardhat"
```

---

## Contract Source: Real vs Reconstructed

### Preferred — real source available

If `contracts/<Name>.sol` exists in the project, **copy or symlink it** into `dapps/<name>-hardhat/contracts/`. Do not duplicate edits.

```bash
cp dapps/social-guestbook/contracts/SocialGuestbook.sol dapps/social-guestbook-hardhat/contracts/
```

### Fallback — source not available (ABI-only)

If only `state/deployment-log.json` exists (no `.sol` source on disk):

1. Read the `abi` array from `deployment-log.json`
2. Reconstruct a minimal `.sol` that:
   - Matches every function signature and mutability exactly
   - Reproduces every event, struct, and state variable
   - Uses `pragma solidity 0.8.24;` and `evmVersion: paris`
   - Uses `require()` strings consistent with known reverts (check IMPLEMENTATION.md or troubleshoot skill)
3. Note in the file header: `// Source reconstructed from ABI — not the original deployment bytecode`
4. Tests run against the reconstructed source locally — they verify logic, not byte-for-byte parity with staging

---

## Minimum Test Suites

Every SocialGuestbook-pattern contract must have these describe blocks:

| Suite | Minimum tests |
|-------|--------------|
| `Deployment` | owner set, counters zeroed, constants correct |
| `registerUser` | happy path + emits event, reverts: duplicate, empty name, taken name |
| `createPost` | happy path + emits event, reverts: unregistered, empty content, fee gate |
| `likePost` | happy path + emits event, reverts: own post, double-like, missing post, unregistered |
| `commentOnPost` | happy path + emits event, reverts: empty, too long, missing post, unregistered |
| `tipAuthor` | tip sent + balance delta + emits event, reverts: zero tip, self-tip, missing post |
| `Admin` | owner-only functions accept owner, reject non-owner; withdraw empty reverts |

For general contracts, the required suites are:

| Suite | Minimum tests |
|-------|--------------|
| `Deployment` | initial state |
| Each public/external function | ≥1 happy path + ≥1 revert |
| Access control | owner-only functions reject non-owner |
| Events | all state-changing calls emit correct args |

---

## Test File Template

```typescript
import { expect } from "chai";
import { ethers } from "hardhat";
import { ContractName } from "../typechain-types";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";

describe("ContractName", function () {
  let contract: ContractName;
  let owner: HardhatEthersSigner;
  let other: HardhatEthersSigner;

  beforeEach(async function () {
    [owner, other] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("ContractName");
    contract = (await Factory.deploy()) as ContractName;
    await contract.waitForDeployment();
  });

  describe("Deployment", function () {
    it("sets deployer as owner", async function () {
      expect(await contract.owner()).to.equal(owner.address);
    });
  });

  describe("functionName", function () {
    it("happy path — [expected behavior]", async function () {
      await expect(contract.connect(other).fn())
        .to.emit(contract, "EventName")
        .withArgs(/* expected args */);
    });

    it("reverts when [condition]", async function () {
      await expect(
        contract.connect(other).restrictedFn()
      ).to.be.revertedWith("Error message");
    });
  });
});
```

---

## Running Tests

```bash
# Unit tests (local hardhat network — fast, no chain needed)
npx hardhat test

# Against staging regtest (requires RPC from capabilities.json)
npx hardhat test --network regtest
```

### Recording results

After a successful run, note the pass count in your completion confirmation. Do **not** write test results to any `state/*.json` file — state files track deployments only.

---

## Run Command

```bash
npx hardhat test
```

Tests must pass before the `deploy-contracts` skill may proceed.

---

## Output

- Workspace: `dapps/<name>-hardhat/`
- Test file: `test/<ContractName>.test.ts`
- No state file writes at this stage (except `testHarnessPath` in `deployment-log.json` after scaffold)

---

## Completion Confirmation

```
generate-hardhat-tests: COMPLETE
Workspace:        dapps/<name>-hardhat/
Test file:        test/<Name>.test.ts
Source:           [real | reconstructed from ABI]
Suites covered:   Deployment / registerUser / createPost / likePost / commentOnPost / tipAuthor / Admin
Total tests:      N passing
Run:              npx hardhat test
Status:           [PASS | FAIL — fix before deploy]
Ready for:        deploy-contracts (tests must pass first)
```
