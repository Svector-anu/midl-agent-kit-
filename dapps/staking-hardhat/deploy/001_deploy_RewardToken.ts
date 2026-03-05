import * as fs from "fs";
import * as path from "path";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

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

const deploy: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { midl } = hre;

  await midl.initialize();

  console.log(`\nDeployer EVM address: ${midl.evm.address}`);

  await midl.deploy("RewardToken", []);
  await midl.execute();

  const deployed = await midl.get("RewardToken");
  if (!deployed) throw new Error("RewardToken deployment not found after execute()");
  const newAddress: string = deployed.address;
  const deployedAt = new Date().toISOString();

  console.log(`\nRewardToken deployed at: ${newAddress}`);
  console.log(`Blockscout: https://blockscout.staging.midl.xyz/address/${newAddress}`);

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
  const idx = deployLog.deployments.findIndex((d) => d.name === "RewardToken");

  const entry: DeployEntry = {
    name: "RewardToken",
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
  };

  if (idx !== -1) {
    deployLog.deployments[idx] = { ...deployLog.deployments[idx], ...entry };
  } else {
    deployLog.deployments.push(entry);
  }

  writeJson("deployment-log.json", deployLog as unknown as Record<string, unknown>);
  console.log("state/deployment-log.json updated");
  console.log("\ndeploy-contracts: COMPLETE");
  console.log(`Verify: npx hardhat verify --network regtest ${newAddress}`);
};

deploy.tags = ["RewardToken"];
export default deploy;
