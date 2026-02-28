import { expect } from "chai";
import { ethers } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { StakingRewards, RewardToken, ERC20 } from "../typechain-types";

// Helper: advance EVM time by `seconds`
async function advanceTime(seconds: number) {
  await ethers.provider.send("evm_increaseTime", [seconds]);
  await ethers.provider.send("evm_mine", []);
}

describe("StakingRewards", () => {
  let stakeToken: ERC20;
  let rewardToken: RewardToken;
  let staking: StakingRewards;
  let owner: HardhatEthersSigner;
  let alice: HardhatEthersSigner;
  let bob: HardhatEthersSigner;

  // 1 RTKN per second reward rate (18-decimal)
  const REWARD_RATE = ethers.parseEther("1");
  const STAKE_AMOUNT = ethers.parseEther("100");
  const REWARD_FUND = ethers.parseEther("10000");

  beforeEach(async () => {
    [owner, alice, bob] = await ethers.getSigners();

    // Deploy a minimal ERC20 as the stake token
    const ERC20Factory = await ethers.getContractFactory("RewardToken");
    stakeToken = (await ERC20Factory.deploy(owner.address)) as unknown as ERC20;

    // Deploy the reward token
    const RewardTokenFactory = await ethers.getContractFactory("RewardToken");
    rewardToken = (await RewardTokenFactory.deploy(owner.address)) as RewardToken;

    // Deploy staking contract
    const StakingFactory = await ethers.getContractFactory("StakingRewards");
    staking = (await StakingFactory.deploy(
      await stakeToken.getAddress(),
      await rewardToken.getAddress(),
    )) as StakingRewards;

    // Mint stake tokens to alice and bob
    await (stakeToken as unknown as RewardToken).mint(alice.address, STAKE_AMOUNT * 10n);
    await (stakeToken as unknown as RewardToken).mint(bob.address, STAKE_AMOUNT * 10n);

    // Fund the reward pool: mint reward tokens to owner, then fund
    await rewardToken.mint(owner.address, REWARD_FUND);
    await rewardToken.connect(owner).approve(await staking.getAddress(), REWARD_FUND);
    await staking.connect(owner).fundRewards(REWARD_FUND);

    // Set reward rate
    await staking.connect(owner).setRewardRate(REWARD_RATE);

    // Approve staking contract to pull stake tokens
    const stakingAddr = await staking.getAddress();
    await (stakeToken as unknown as RewardToken).connect(alice).approve(stakingAddr, STAKE_AMOUNT * 10n);
    await (stakeToken as unknown as RewardToken).connect(bob).approve(stakingAddr, STAKE_AMOUNT * 10n);
  });

  // ── Stake ────────────────────────────────────────────────────────────────

  describe("stake()", () => {
    it("updates stakedBalance and totalStaked", async () => {
      await staking.connect(alice).stake(STAKE_AMOUNT);
      expect(await staking.stakedBalance(alice.address)).to.equal(STAKE_AMOUNT);
      expect(await staking.totalStaked()).to.equal(STAKE_AMOUNT);
    });

    it("transfers stake tokens from user to contract", async () => {
      const stakingAddr = await staking.getAddress();
      await staking.connect(alice).stake(STAKE_AMOUNT);
      expect(await stakeToken.balanceOf(stakingAddr)).to.equal(STAKE_AMOUNT);
    });

    it("emits Staked event", async () => {
      await expect(staking.connect(alice).stake(STAKE_AMOUNT))
        .to.emit(staking, "Staked")
        .withArgs(alice.address, STAKE_AMOUNT);
    });

    it("reverts with amount = 0", async () => {
      await expect(staking.connect(alice).stake(0)).to.be.revertedWith("Cannot stake 0");
    });
  });

  // ── Unstake ──────────────────────────────────────────────────────────────

  describe("unstake()", () => {
    beforeEach(async () => {
      await staking.connect(alice).stake(STAKE_AMOUNT);
    });

    it("reduces stakedBalance and totalStaked", async () => {
      await staking.connect(alice).unstake(STAKE_AMOUNT / 2n);
      expect(await staking.stakedBalance(alice.address)).to.equal(STAKE_AMOUNT / 2n);
      expect(await staking.totalStaked()).to.equal(STAKE_AMOUNT / 2n);
    });

    it("returns tokens to user", async () => {
      const balBefore = await stakeToken.balanceOf(alice.address);
      await staking.connect(alice).unstake(STAKE_AMOUNT);
      expect(await stakeToken.balanceOf(alice.address)).to.equal(balBefore + STAKE_AMOUNT);
    });

    it("emits Unstaked event", async () => {
      await expect(staking.connect(alice).unstake(STAKE_AMOUNT))
        .to.emit(staking, "Unstaked")
        .withArgs(alice.address, STAKE_AMOUNT);
    });

    it("reverts with amount = 0", async () => {
      await expect(staking.connect(alice).unstake(0)).to.be.revertedWith("Cannot unstake 0");
    });

    it("reverts when unstaking more than staked balance", async () => {
      await expect(staking.connect(alice).unstake(STAKE_AMOUNT + 1n))
        .to.be.revertedWith("Insufficient staked balance");
    });
  });

  // ── Reward accounting ────────────────────────────────────────────────────

  describe("earned()", () => {
    it("returns 0 before staking", async () => {
      expect(await staking.earned(alice.address)).to.equal(0n);
    });

    it("increases over time proportional to staked amount and rate", async () => {
      await staking.connect(alice).stake(STAKE_AMOUNT);
      const SECONDS = 100;
      await advanceTime(SECONDS);

      // With rate = 1 RTKN/s and 100 STAKE staked:
      // rewardPerToken += 100 * 1e18 / 100 = 1e18 per second → 100e18 after 100s
      // earned = 100 * 100e18 / 1e18 = 100 RTKN (within 1 block margin)
      const earned = await staking.earned(alice.address);
      expect(earned).to.be.gte(ethers.parseEther("99"));
      expect(earned).to.be.lte(ethers.parseEther("101"));
    });

    it("splits proportionally between two stakers", async () => {
      await staking.connect(alice).stake(STAKE_AMOUNT);
      await staking.connect(bob).stake(STAKE_AMOUNT);

      await advanceTime(100);

      const aliceEarned = await staking.earned(alice.address);
      const bobEarned = await staking.earned(bob.address);

      // Both staked same amount → within 5% of each other
      const diff = aliceEarned > bobEarned
        ? aliceEarned - bobEarned
        : bobEarned - aliceEarned;
      const fivePercent = aliceEarned / 20n;
      expect(diff).to.be.lte(fivePercent);
    });

    it("accrues correctly after partial unstake", async () => {
      await staking.connect(alice).stake(STAKE_AMOUNT);
      await advanceTime(50);
      await staking.connect(alice).unstake(STAKE_AMOUNT / 2n);
      await advanceTime(50);

      // Still earning, just at half rate
      const earned = await staking.earned(alice.address);
      expect(earned).to.be.gt(0n);
    });
  });

  // ── Claim rewards ────────────────────────────────────────────────────────

  describe("claimRewards()", () => {
    it("transfers earned rewards to user and resets to 0", async () => {
      await staking.connect(alice).stake(STAKE_AMOUNT);
      await advanceTime(100);

      const earnedBefore = await staking.earned(alice.address);
      expect(earnedBefore).to.be.gt(0n);

      const balBefore = await rewardToken.balanceOf(alice.address);
      await staking.connect(alice).claimRewards();
      const balAfter = await rewardToken.balanceOf(alice.address);

      expect(balAfter - balBefore).to.be.gte(earnedBefore);
      expect(await staking.rewards(alice.address)).to.equal(0n);
    });

    it("emits RewardClaimed event", async () => {
      await staking.connect(alice).stake(STAKE_AMOUNT);
      await advanceTime(10);
      await expect(staking.connect(alice).claimRewards()).to.emit(staking, "RewardClaimed");
    });

    it("reverts when nothing is earned", async () => {
      await expect(staking.connect(alice).claimRewards())
        .to.be.revertedWith("No rewards to claim");
    });
  });

  // ── Owner actions ────────────────────────────────────────────────────────

  describe("setRewardRate()", () => {
    it("updates rewardRate", async () => {
      const newRate = ethers.parseEther("2");
      await staking.connect(owner).setRewardRate(newRate);
      expect(await staking.rewardRate()).to.equal(newRate);
    });

    it("emits RewardRateUpdated event", async () => {
      const newRate = ethers.parseEther("2");
      await expect(staking.connect(owner).setRewardRate(newRate))
        .to.emit(staking, "RewardRateUpdated")
        .withArgs(REWARD_RATE, newRate);
    });

    it("reverts when called by non-owner", async () => {
      await expect(staking.connect(alice).setRewardRate(0n))
        .to.be.revertedWithCustomError(staking, "OwnableUnauthorizedAccount");
    });
  });

  describe("fundRewards()", () => {
    it("reverts when called by non-owner", async () => {
      await expect(staking.connect(alice).fundRewards(100n))
        .to.be.revertedWithCustomError(staking, "OwnableUnauthorizedAccount");
    });
  });
});
