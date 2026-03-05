/**
 * 004_admin_setup.ts — Post-deploy admin: fund reward pool + set emission rate.
 *
 * Run ONCE after 003_deploy_all.ts to make the staking demo live:
 *   1. Mint 10 000 RTKN directly into StakingRewards (funds the reward pool)
 *   2. Set reward rate to 1 RTKN / minute (≈ 16 666 666 666 666 667 wei/s)
 *
 * Each write() gets its own execute() so BTC confirms between them.
 *
 * Usage:
 *   MNEMONIC="..." npx hardhat deploy --network regtest --tags AdminSetup
 */
import * as fs from "fs";
import * as path from "path";
import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const STATE_DIR = path.resolve(__dirname, "../../../state");

// 1 RTKN/minute expressed in wei/second (18-decimal precision)
// = 1e18 / 60 = 16_666_666_666_666_666.6̄  →  rounded up
const REWARD_RATE_WEI_PER_SEC = 16_666_666_666_666_667n;

// Reward pool: 10 000 RTKN
const POOL_AMOUNT = 10_000n * 10n ** 18n;

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

  const rtDeployed = await midl.get("RewardToken");
  if (!rtDeployed) throw new Error("RewardToken not found — run 003_deploy_all first");

  const srDeployed = await midl.get("StakingRewards");
  if (!srDeployed) throw new Error("StakingRewards not found — run 003_deploy_all first");

  const srAddress = srDeployed.address;
  console.log(`\nRewardToken:    ${rtDeployed.address}`);
  console.log(`StakingRewards: ${srAddress}`);
  console.log(`Pool:           ${POOL_AMOUNT.toLocaleString()} wei (10 000 RTKN)`);
  console.log(`Rate:           ${REWARD_RATE_WEI_PER_SEC} wei/s  (≈ 1 RTKN/min)\n`);

  // ── 1. Mint reward tokens directly into StakingRewards ───────────────────
  console.log("[1/2] Minting 10 000 RTKN to StakingRewards...");
  await midl.write("RewardToken", "mint", [srAddress, POOL_AMOUNT]);
  console.log("      Submitting BTC+EVM transaction (30 s – 2 min)...");
  await midl.execute();
  console.log("      ✓ Mint confirmed\n");

  // ── 2. Set reward emission rate ───────────────────────────────────────────
  console.log("[2/2] Setting reward rate to 1 RTKN/minute...");
  await midl.write("StakingRewards", "setRewardRate", [REWARD_RATE_WEI_PER_SEC]);
  console.log("      Submitting BTC+EVM transaction (30 s – 2 min)...");
  await midl.execute();
  console.log("      ✓ Reward rate set\n");

  // ── 3. Record in demo-contracts.json ─────────────────────────────────────
  const demoContracts = readJson("demo-contracts.json") as {
    schemaVersion: string;
    chainEpoch: string;
    contracts: Array<Record<string, unknown>>;
  };

  const idx = demoContracts.contracts.findIndex((c) => c["name"] === "StakingRewards");
  const patch = { funded: true, rateSet: true, rewardRateWeiPerSec: REWARD_RATE_WEI_PER_SEC.toString() };
  if (idx !== -1) {
    demoContracts.contracts[idx] = { ...demoContracts.contracts[idx], ...patch };
  } else {
    console.warn("StakingRewards entry not found in demo-contracts.json — skipping patch");
  }

  writeJson("demo-contracts.json", demoContracts as unknown as Record<string, unknown>);
  console.log("✓ state/demo-contracts.json updated (funded + rateSet = true)\n");

  console.log("══════════════════════════════════════════════════════════════");
  console.log("  Admin setup complete. The staking demo is now live.");
  console.log("══════════════════════════════════════════════════════════════");
  console.log("\nWhat stakeholders see:");
  console.log("  • Overview tab: rewardRate displays as ~1 RTKN / min");
  console.log("  • Stake any MTT → rewards accumulate in real time");
  console.log("  • Wait 1 min → earned() ≈ (yourStake / totalStaked) RTKN");
  console.log("  • Claim tab: claim rewards to your wallet\n");
};

deploy.tags = ["AdminSetup"];
export default deploy;
