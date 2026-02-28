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

  const deployerAddress: string = midl.evm.address;

  await midl.deploy("ERC20Token", [deployerAddress, deployerAddress]);
  await midl.execute();

  const deployed = await midl.get("ERC20Token");
  if (!deployed) throw new Error("ERC20Token deployment not found after execute()");
  const newAddress: string = deployed.address;
  const deployedAt = new Date().toISOString();

  console.log(`\nERC20Token deployed at: ${newAddress}`);
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
  const idx = deployLog.deployments.findIndex((d) => d.name === "ERC20Token");

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
      name: "ERC20Token",
      address: newAddress,
      network: "regtest",
      chainId: 15001,
      timestamp: deployedAt,
      constructorArgs: [deployerAddress, deployerAddress],
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
  const chainEpoch = deployedAt.slice(0, 7);
  const demoIdx = demoContracts.contracts.findIndex((c) => c.name === "ERC20Token");

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
      name: "ERC20Token",
      templateSlug: "erc20-dashboard",
      address: newAddress,
      network: "staging",
      chainId: 15001,
      testHarnessPath: "dapps/erc20-dashboard-hardhat",
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
  console.log(`Verify: npx hardhat verify --network regtest ${newAddress} ${deployerAddress} ${deployerAddress}`);
};

deploy.tags = ["ERC20Token"];
export default deploy;
