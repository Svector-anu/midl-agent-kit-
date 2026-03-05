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

function getDeployedAddress(deployLog: { deployments: Array<{ name: string; address: string }> }, name: string): string {
  const entry = deployLog.deployments.find((d) => d.name === name);
  if (!entry) throw new Error(`${name} not found in deployment-log.json — deploy it first`);
  return entry.address;
}

const deploy: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { midl } = hre;

  await midl.initialize();

  const deployerAddress: string = midl.evm.address;
  console.log(`\nDeployer EVM address: ${deployerAddress}`);

  // Read token addresses from state (must already be deployed)
  type DeployLog = { schemaVersion: string; deployments: Array<{ name: string; address: string; [key: string]: unknown }> };
  const deployLog = readJson("deployment-log.json") as DeployLog;

  const stakeTokenAddress = getDeployedAddress(deployLog, "ERC20Token");
  const rewardTokenAddress = getDeployedAddress(deployLog, "RewardToken");

  console.log(`Stake token (ERC20Token):   ${stakeTokenAddress}`);
  console.log(`Reward token (RewardToken): ${rewardTokenAddress}`);

  await midl.deploy("StakingRewards", [stakeTokenAddress, rewardTokenAddress]);
  await midl.execute();

  const deployed = await midl.get("StakingRewards");
  if (!deployed) throw new Error("StakingRewards deployment not found after execute()");
  const newAddress: string = deployed.address;
  const deployedAt = new Date().toISOString();

  console.log(`\nStakingRewards deployed at: ${newAddress}`);
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

  const idx = deployLog.deployments.findIndex((d) => d.name === "StakingRewards");

  const entry: DeployEntry = {
    name: "StakingRewards",
    address: newAddress,
    network: "regtest",
    chainId: 15001,
    timestamp: deployedAt,
    constructorArgs: [stakeTokenAddress, rewardTokenAddress],
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
  const chainEpoch = deployedAt.slice(0, 7);
  const demoIdx = demoContracts.contracts.findIndex((c) => c.name === "StakingRewards");

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
      name: "StakingRewards",
      templateSlug: "staking-dashboard",
      address: newAddress,
      network: "staging",
      chainId: 15001,
      testHarnessPath: "dapps/staking-hardhat",
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
  console.log(`\nVerify: npx hardhat verify --network regtest ${newAddress} ${stakeTokenAddress} ${rewardTokenAddress}`);
  console.log(`\nNext steps:`);
  console.log(`  1. Verify: npx hardhat verify --network regtest ${newAddress} ${stakeTokenAddress} ${rewardTokenAddress}`);
  console.log(`  2. Mint reward tokens: call RewardToken.mint(StakingRewards, amount)`);
  console.log(`  3. Set reward rate: call StakingRewards.setRewardRate(rate)`);
};

deploy.tags = ["StakingRewards"];
export default deploy;
