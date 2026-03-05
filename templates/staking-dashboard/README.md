# Staking Dashboard — MIDL Template

A live staking dApp on MIDL staging. Stake MTT (ERC20) to earn RTKN rewards at 1 RTKN / minute across all stakers.

## Deployed Contracts

| Contract | Address | Explorer |
|---|---|---|
| StakeToken (MTT) | `0xD3B3bF2e85c34DC70b3D98a02A49Bd97430292A3` | [Blockscout](https://blockscout.staging.midl.xyz/address/0xD3B3bF2e85c34DC70b3D98a02A49Bd97430292A3) |
| RewardToken (RTKN) | `0xc9c5ae3179FD2486D6Ce45B1c8cd88591117513a` | [Blockscout](https://blockscout.staging.midl.xyz/address/0xc9c5ae3179FD2486D6Ce45B1c8cd88591117513a) |
| StakingRewards | `0xb0F7979AfDC413FDd5Df17b1D205b3B92287F1c3` | [Blockscout](https://blockscout.staging.midl.xyz/address/0xb0F7979AfDC413FDd5Df17b1D205b3B92287F1c3) |

Network: MIDL staging (chainId 15001) · Bitcoin: regtest

---

## End-to-End Walkthrough

### Step 0 — Prerequisites

```bash
cd dapps/staking-hardhat
npm install --legacy-peer-deps
```

You need a funded testnet wallet. Check and fund:

```bash
# Print your BTC + EVM addresses
MNEMONIC="..." npx hardhat midl:address 0 --network regtest

# Check BTC balance
curl "https://mempool.staging.midl.xyz/api/address/<YOUR_BTC_ADDRESS>"
```

---

### Step 1 — Deploy contracts

```bash
# Deploys RewardToken then StakingRewards in a single script.
# Two BTC transactions — takes 1–4 min.
MNEMONIC="..." npx hardhat deploy --network regtest --tags DeployAll
```

Output includes both addresses. The script updates `state/deployment-log.json` automatically.

Verify on Blockscout (run immediately after deploy):

```bash
RT=<REWARD_TOKEN_ADDRESS>
SR=<STAKING_REWARDS_ADDRESS>
STAKE=0xD3B3bF2e85c34DC70b3D98a02A49Bd97430292A3

npx hardhat verify --network regtest $RT
npx hardhat verify --network regtest $SR $STAKE $RT
```

If you see a TLS error, add `NODE_TLS_REJECT_UNAUTHORIZED=0` before the command — the source was likely submitted anyway. Check Blockscout to confirm.

---

### Step 2 — Admin setup (fund + set rate)

Run once as the deployer wallet (owner of both contracts):

```bash
MNEMONIC="..." npx hardhat deploy --network regtest --tags AdminSetup
```

This does two things:
1. **Mints 10 000 RTKN** directly into `StakingRewards` (funds the reward pool)
2. **Sets `rewardRate`** to `16_666_666_666_666_667` wei/s ≈ **1 RTKN / minute** across all stakers

Both are separate BTC transactions. Total time: 1–4 min.

#### What the rate means

```
rewardPerMinute = rewardRate × 60
               = 16_666_666_666_666_667 × 60
               ≈ 1_000_000_000_000_000_020  (≈ 1 RTKN/min, 18-decimal)
```

If you are the only staker, you earn ~1 RTKN every minute. If multiple users stake, rewards split proportionally by staked amount.

---

### Step 3 — Get stake tokens

The ERC20Token (MTT) is the stake token. The deployer minted an initial supply to themselves. Send MTT to any test wallet you want to demo with.

You can also mint more (deployer only):

```bash
# Cast example — or use the ERC20 dashboard dApp
cast send 0xD3B3bF2e85c34DC70b3D98a02A49Bd97430292A3 \
  "mint(address,uint256)" <RECIPIENT> 1000000000000000000000 \
  --rpc-url https://rpc.staging.midl.xyz \
  --private-key <YOUR_PRIVATE_KEY>
```

---

### Step 4 — Run the dApp

```bash
cd templates/staking-dashboard
npm install
npm run dev
```

Open `http://localhost:5173`. Connect your Xverse or Leather wallet.

---

### Step 5 — Stake → Wait → Earn → Claim

#### Stake

1. Go to **Stake / Unstake** tab
2. Enter an amount (e.g. `100`)
3. Click **Approve**, wait for BTC confirmation (~2 min on staging)
4. Click **Stake**, wait for confirmation

#### Watch rewards accrue

Go to **Overview** tab. The `rewardRate` displays as `≈ 1.00 RTKN / min`.

After staking 100 MTT (assuming you're the only staker):

| Wait | Earned (approx) |
|------|----------------|
| 1 min | ~1.00 RTKN |
| 5 min | ~5.00 RTKN |
| 1 hr | ~60 RTKN |

The `earned()` value refreshes every 15 seconds in the UI.

#### Claim

1. Go to **Claim** tab
2. Click **Claim Rewards**
3. Wait for BTC confirmation (~2 min)
4. RTKN appears in your wallet

---

### Step 6 — Verify on-chain

Check the staking contract state directly:

```bash
SR=0xb0F7979AfDC413FDd5Df17b1D205b3B92287F1c3

# Reward rate
cast call $SR "rewardRate()" --rpc-url https://rpc.staging.midl.xyz

# Total staked
cast call $SR "totalStaked()" --rpc-url https://rpc.staging.midl.xyz

# Your earned rewards
cast call $SR "earned(address)" <YOUR_ADDRESS> --rpc-url https://rpc.staging.midl.xyz

# RTKN balance in the reward pool
cast call 0xc9c5ae3179FD2486D6Ce45B1c8cd88591117513a \
  "balanceOf(address)" $SR --rpc-url https://rpc.staging.midl.xyz
```

Expected values after admin setup:
- `rewardRate()` → `16666666666666667`
- `balanceOf(StakingRewards)` → `10000000000000000000000` (10 000 RTKN)

---

## Architecture

```
StakeToken (ERC20)          RewardToken (ERC20, mintable)
      │                              │
      │  safeTransferFrom            │  mint → StakingRewards
      ▼                              ▼
┌─────────────────────────────────────────┐
│            StakingRewards               │
│                                         │
│  stake(amount)     → totalStaked ↑      │
│  unstake(amount)   → totalStaked ↓      │
│  claimRewards()    → RTKN transfer out  │
│  earned(account)   → Synthetix formula  │
│  setRewardRate()   → owner only         │
└─────────────────────────────────────────┘
```

### Reward formula (Synthetix accumulator pattern)

```
rewardPerToken += timeDelta × rewardRate × 1e18 / totalStaked
earned(account) = stakedBalance × Δ(rewardPerToken) / 1e18 + pendingRewards
```

This is gas-efficient and handles mid-period stake/unstake correctly.

---

## Common Issues

### Write operations hang for 10+ minutes

Normal on MIDL staging. Bitcoin confirmations take time. Don't kill the process — check Blockscout to see if the transaction appeared.

### "No rewards to claim"

Either `rewardRate` is 0 (admin setup not run) or not enough time has passed since staking. Check `earned()` via the Overview or `cast call` above.

### AdminSetup script fails with "not owner"

The MNEMONIC used must match the deployer wallet. The deployer address is `0xF8483dddbCB103519F8BfE1713aBDa4f3A9C20b0`. Use the same mnemonic that was used for `DeployAll`.

### Reward pool runs dry

10 000 RTKN at 1/min lasts ~10 000 minutes (~7 days). Re-run AdminSetup to mint more:

```bash
MNEMONIC="..." npx hardhat deploy --network regtest --tags AdminSetup --reset
```

---

## Hardhat Test Harness

Located at `dapps/staking-hardhat/`. Key scripts:

| Tag | Script | Purpose |
|---|---|---|
| `DeployAll` | `003_deploy_all.ts` | Deploy RewardToken + StakingRewards |
| `AdminSetup` | `004_admin_setup.ts` | Fund pool + set rate |

Never use `deploy.dependencies` between scripts on MIDL — causes EVM nonce collisions. See `resources/deployment/DEPLOYMENT-PLAN.md` § 5a.
