/**
 * 003_deploy_all.ts — Combined deploy: RewardToken then StakingRewards.
 *
 * Each contract gets its own execute() call so BTC confirmations happen
 * between them, preventing EVM nonce collisions.
 */
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

function upsert(
  deployments: Array<Record<string, unknown>>,
  entry: Record<string, unknown>,
): void {
  const idx = deployments.findIndex((d) => d["name"] === entry["name"]);
  if (idx !== -1) {
    deployments[idx] = { ...deployments[idx], ...entry };
  } else {
    deployments.push(entry);
  }
}

const deploy: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { midl } = hre;
  await midl.initialize();

  const deployer = midl.evm.address;
  console.log(`\nDeployer: ${deployer}`);

  // ── 1. Deploy RewardToken ──────────────────────────────────────────────
  console.log("\n[1/2] Deploying RewardToken...");
  await midl.deploy("RewardToken", []);
  await midl.execute();

  const rtDeployed = await midl.get("RewardToken");
  if (!rtDeployed) throw new Error("RewardToken deployment not found");
  const rtAddress = rtDeployed.address;
  const rtAt = new Date().toISOString();
  console.log(`RewardToken deployed at: ${rtAddress}`);

  // ── 2. Deploy StakingRewards ───────────────────────────────────────────
  const deployLog = readJson("deployment-log.json") as {
    schemaVersion: string;
    deployments: Array<Record<string, unknown>>;
  };

  const stakeTokenEntry = deployLog.deployments.find(
    (d) => d["name"] === "ERC20Token",
  );
  if (!stakeTokenEntry) throw new Error("ERC20Token not found in deployment-log.json");
  const stakeTokenAddress = stakeTokenEntry["address"] as string;

  console.log(`\n[2/2] Deploying StakingRewards...`);
  console.log(`  stakeToken  = ${stakeTokenAddress}`);
  console.log(`  rewardToken = ${rtAddress}`);

  await midl.deploy("StakingRewards", [stakeTokenAddress, rtAddress]);
  await midl.execute();

  const srDeployed = await midl.get("StakingRewards");
  if (!srDeployed) throw new Error("StakingRewards deployment not found");
  const srAddress = srDeployed.address;
  const srAt = new Date().toISOString();
  console.log(`StakingRewards deployed at: ${srAddress}`);

  if (rtAddress === srAddress) {
    throw new Error(
      `Address collision detected! Both contracts at ${rtAddress}. ` +
      `This is a MIDL nonce issue. Run this script again after waiting 1 minute.`,
    );
  }

  // ── 3. Update state ────────────────────────────────────────────────────
  upsert(deployLog.deployments, {
    name: "RewardToken",
    address: rtAddress,
    network: "regtest",
    chainId: 15001,
    timestamp: rtAt,
    constructorArgs: [],
    solcVersion: "0.8.28",
    optimizerEnabled: false,
    evmVersion: "paris",
    verified: false,
    abi: [],
  });

  upsert(deployLog.deployments, {
    name: "StakingRewards",
    address: srAddress,
    network: "regtest",
    chainId: 15001,
    timestamp: srAt,
    constructorArgs: [stakeTokenAddress, rtAddress],
    solcVersion: "0.8.28",
    optimizerEnabled: false,
    evmVersion: "paris",
    verified: false,
    abi: [],
  });

  writeJson("deployment-log.json", deployLog as unknown as Record<string, unknown>);

  const demoContracts = readJson("demo-contracts.json") as {
    schemaVersion: string;
    chainEpoch: string;
    contracts: Array<Record<string, unknown>>;
  };
  const epoch = srAt.slice(0, 7);
  const srDemoIdx = demoContracts.contracts.findIndex(
    (c) => c["name"] === "StakingRewards",
  );
  const srEntry = {
    name: "StakingRewards",
    templateSlug: "staking-dashboard",
    address: srAddress,
    network: "staging",
    chainId: 15001,
    testHarnessPath: "dapps/staking-hardhat",
    status: "active",
    lastHealthCheck: srAt,
    chainEpoch: epoch,
  };
  if (srDemoIdx !== -1) {
    demoContracts.contracts[srDemoIdx] = {
      ...demoContracts.contracts[srDemoIdx],
      ...srEntry,
    };
  } else {
    demoContracts.contracts.push(srEntry);
  }
  demoContracts.chainEpoch = epoch;
  writeJson("demo-contracts.json", demoContracts as unknown as Record<string, unknown>);

  console.log("\n✓ state/deployment-log.json updated");
  console.log("✓ state/demo-contracts.json updated");
  console.log("\n── Verify ─────────────────────────────────────────────────────");
  console.log(`npx hardhat verify --network regtest ${rtAddress}`);
  console.log(`npx hardhat verify --network regtest ${srAddress} ${stakeTokenAddress} ${rtAddress}`);
};

deploy.tags = ["DeployAll"];
export default deploy;
