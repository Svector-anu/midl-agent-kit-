/**
 * Deploy SocialGuestbook to MIDL staging (regtest, chainId 15001).
 *
 * Prerequisites:
 *   - MNEMONIC env var set (Bitcoin wallet mnemonic for @midl/hardhat-deploy)
 *   - npm install run after adding @midl/hardhat-deploy to package.json
 *
 * Run:
 *   npx hardhat deploy --network regtest --tags SocialGuestbook
 *
 * After deploy: state/deployment-log.json and state/demo-contracts.json
 * are updated automatically by this script.
 */
import * as fs from "fs";
import * as path from "path";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const STATE_DIR = path.resolve(__dirname, "../../../state");

function readJson(file: string): Record<string, unknown> {
  return JSON.parse(fs.readFileSync(path.join(STATE_DIR, file), "utf8"));
}

function writeJson(file: string, data: Record<string, unknown>): void {
  fs.writeFileSync(
    path.join(STATE_DIR, file),
    JSON.stringify(data, null, 2) + "\n",
  );
}

const deploy = async (hre: HardhatRuntimeEnvironment) => {
  await hre.midl.initialize();

  const result = await hre.midl.deploy("SocialGuestbook", [], {}, {});

  const newAddress: string = result.address;
  const deployedAt = new Date().toISOString();

  console.log(`\nSocialGuestbook deployed at: ${newAddress}`);

  // ── Update state/deployment-log.json ───────────────────────────────────
  type DeployEntry = {
    name: string;
    address: string;
    timestamp: string | null;
    verified: boolean;
    verificationUrl?: string;
    [key: string]: unknown;
  };
  type DeployLog = { schemaVersion: string; deployments: DeployEntry[] };

  const deployLog = readJson("deployment-log.json") as DeployLog;
  const idx = deployLog.deployments.findIndex((d) => d.name === "SocialGuestbook");

  if (idx !== -1) {
    deployLog.deployments[idx] = {
      ...deployLog.deployments[idx],
      address: newAddress,
      timestamp: deployedAt,
      verified: false,
      verificationUrl: undefined,
    };
  } else {
    deployLog.deployments.push({
      name: "SocialGuestbook",
      address: newAddress,
      network: "regtest",
      chainId: 15001,
      timestamp: deployedAt,
      constructorArgs: [],
      solcVersion: "0.8.28",
      optimizerEnabled: false,
      evmVersion: "paris",
      verified: false,
      abi: [],
    } as DeployEntry);
  }

  writeJson("deployment-log.json", deployLog as unknown as Record<string, unknown>);
  console.log("state/deployment-log.json updated");

  // ── Update state/demo-contracts.json ───────────────────────────────────
  type DemoEntry = {
    name: string;
    address: string;
    status: string;
    lastHealthCheck: string;
    chainEpoch: string;
    [key: string]: unknown;
  };
  type DemoContracts = { schemaVersion: string; chainEpoch: string; contracts: DemoEntry[] };

  const demoContracts = readJson("demo-contracts.json") as DemoContracts;
  const chainEpoch = deployedAt.slice(0, 7); // "YYYY-MM"
  const demoIdx = demoContracts.contracts.findIndex((c) => c.name === "SocialGuestbook");

  if (demoIdx !== -1) {
    demoContracts.contracts[demoIdx] = {
      ...demoContracts.contracts[demoIdx],
      address: newAddress,
      status: "active",
      lastHealthCheck: deployedAt,
      chainEpoch,
    };
  } else {
    demoContracts.contracts.push({
      name: "SocialGuestbook",
      templateSlug: "social-guestbook",
      address: newAddress,
      network: "staging",
      chainId: 15001,
      testHarnessPath: "dapps/social-guestbook-hardhat",
      status: "active",
      lastHealthCheck: deployedAt,
      chainEpoch,
    });
  }

  demoContracts.chainEpoch = chainEpoch;
  writeJson("demo-contracts.json", demoContracts as unknown as Record<string, unknown>);
  console.log("state/demo-contracts.json updated");
  console.log("\ndeploy-contracts: COMPLETE");
  console.log(`Address: ${newAddress}`);
  console.log("Network: staging (chainId 15001)");
  console.log("Verification: run `npx hardhat verify --network regtest " + newAddress + "` to verify");
};

deploy.tags = ["SocialGuestbook"];
export default deploy;
