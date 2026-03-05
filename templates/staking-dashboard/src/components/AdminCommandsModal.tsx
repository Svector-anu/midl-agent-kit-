import { useState } from "react";
import { formatEther } from "viem";
import { useAccount, useReadContract } from "wagmi";
import {
  STAKING_ADDRESS,
  STAKING_ABI,
  REWARD_TOKEN_ADDRESS,
  REWARD_TOKEN_ABI,
} from "../lib/contract";
import { useSetRewardRate } from "../hooks/useSetRewardRate";
import { TxStatus } from "./TxStatus";

const HARNESS_PATH = "dapps/staking-hardhat";
const SECS_PER_DAY = 86_400n;
const SECS_PER_YEAR = 31_536_000n;

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function rateToRtkPerDay(rateWei: bigint): string {
  const perDay = rateWei * SECS_PER_DAY;
  return Number(formatEther(perDay)).toLocaleString(undefined, {
    maximumFractionDigits: 4,
  });
}

function poolExhaustionDate(poolBalance: bigint, rate: bigint): Date | null {
  if (rate === 0n) return null;
  return new Date(Date.now() + Number(poolBalance / rate) * 1000);
}

function estimateAPR(rate: bigint, totalStaked: bigint): string | null {
  if (totalStaked === 0n || rate === 0n) return null;
  const bps = (rate * SECS_PER_YEAR * 10_000n) / totalStaked;
  return (Number(bps) / 100).toLocaleString(undefined, {
    maximumFractionDigits: 2,
  });
}

export function AdminCommandsModal() {
  const { address } = useAccount();
  const [showModal, setShowModal] = useState(false);
  const [rateInput, setRateInput] = useState("");

  const { data: owner } = useReadContract({
    address: STAKING_ADDRESS,
    abi: STAKING_ABI,
    functionName: "owner",
  });

  const { data: rewardRateData, refetch: refetchRate } = useReadContract({
    address: STAKING_ADDRESS,
    abi: STAKING_ABI,
    functionName: "rewardRate",
    query: { refetchInterval: 30_000 },
  });

  const { data: totalStakedData } = useReadContract({
    address: STAKING_ADDRESS,
    abi: STAKING_ABI,
    functionName: "totalStaked",
    query: { refetchInterval: 30_000 },
  });

  const { data: poolBalanceData, refetch: refetchPool } = useReadContract({
    address: REWARD_TOKEN_ADDRESS,
    abi: REWARD_TOKEN_ABI,
    functionName: "balanceOf",
    args: [STAKING_ADDRESS],
    query: { refetchInterval: 30_000 },
  });

  const { setRate, phase, error, btcTxId, evmTxHash, finalize, reset } =
    useSetRewardRate(() => {
      refetchRate();
      refetchPool();
    });

  const isOwner =
    !!address &&
    typeof owner === "string" &&
    address.toLowerCase() === owner.toLowerCase();

  if (!isOwner) return null;

  if (!showModal) {
    return (
      <button
        className="btn-ghost"
        onClick={() => setShowModal(true)}
        aria-label="Open admin panel"
      >
        Admin
      </button>
    );
  }

  const rate = typeof rewardRateData === "bigint" ? rewardRateData : 0n;
  const totalStaked =
    typeof totalStakedData === "bigint" ? totalStakedData : 0n;
  const poolBalance =
    typeof poolBalanceData === "bigint" ? poolBalanceData : 0n;

  const exhaustion = poolExhaustionDate(poolBalance, rate);
  const soonThreshold = 3 * 24 * 60 * 60 * 1000; // 3 days
  const exhaustionSoon =
    exhaustion !== null && exhaustion.getTime() - Date.now() < soonThreshold;

  const apr = estimateAPR(rate, totalStaked);
  const busy = phase !== "idle" && phase !== "error";

  const handleSetRate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rateInput || Number(rateInput) < 0) return;
    setRate(rateInput);
  };

  return (
    <div
      className="demo-banner__overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Admin panel"
    >
      <div className="demo-banner__modal admin-modal">
        <p className="demo-banner__modal-title">Admin Panel</p>

        {/* ── Pool Status ────────────────────────────────────────────── */}
        <div className="admin-modal__section">
          <p className="admin-modal__section-title">Pool Status</p>

          <div className="token-info">
            <div className="token-info__row token-info__row--highlight">
              <span className="token-info__label">Pool balance</span>
              <span className="token-info__value">
                {Number(formatEther(poolBalance)).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}{" "}
                RTKN
              </span>
            </div>
            <div className="token-info__row">
              <span className="token-info__label">Reward rate</span>
              <span className="token-info__value">
                {rateToRtkPerDay(rate)} RTKN / day
              </span>
            </div>
            <div className="token-info__row">
              <span className="token-info__label">Rewards stop</span>
              <span
                className={`token-info__value${exhaustionSoon ? " admin-modal__exhaustion--soon" : ""}`}
              >
                {rate === 0n
                  ? "Rate is zero — rewards paused"
                  : exhaustion
                  ? formatDate(exhaustion)
                  : "—"}
              </span>
            </div>
            <div className="token-info__row">
              <span className="token-info__label">Total staked</span>
              <span className="token-info__value">
                {Number(formatEther(totalStaked)).toLocaleString(undefined, {
                  maximumFractionDigits: 2,
                })}{" "}
                MTT
              </span>
            </div>
            <div className="token-info__row">
              <span className="token-info__label">Est. APR</span>
              <span className="token-info__value">
                {apr !== null ? `${apr}%` : "—"}
              </span>
            </div>
            <div className="token-info__row">
              <span className="token-info__label">Unstaking</span>
              <span className="token-info__value">Instant — no lock period</span>
            </div>
          </div>
        </div>

        {/* ── Set Reward Rate ────────────────────────────────────────── */}
        <div className="admin-modal__section">
          <p className="admin-modal__section-title">Set Reward Rate</p>
          <p className="demo-banner__note">
            Current: <code>{rateToRtkPerDay(rate)} RTKN / day</code>. Takes
            effect immediately on-chain.
          </p>
          <form className="admin-modal__rate-row" onSubmit={handleSetRate}>
            <label className="form__label">
              RTKN per day
              <input
                className="form__input"
                type="number"
                min="0"
                step="any"
                placeholder={rateToRtkPerDay(rate)}
                value={rateInput}
                onChange={(e) => setRateInput(e.target.value)}
                disabled={busy}
              />
            </label>
            <button
              className="btn-primary"
              type="submit"
              disabled={busy || !rateInput}
              style={{ marginBottom: "1px" }}
            >
              {busy ? "Sending…" : "Set Rate"}
            </button>
          </form>
          {phase !== "idle" && (
            <TxStatus
              phase={phase}
              error={error}
              btcTxId={btcTxId}
              evmTxHash={evmTxHash}
              onReset={reset}
              onFinalize={phase === "adding-intention" ? finalize : undefined}
            />
          )}
        </div>

        {/* ── Fund Rewards ───────────────────────────────────────────── */}
        <div className="admin-modal__section">
          <p className="admin-modal__section-title">Fund Rewards + Set Rate</p>
          <p className="demo-banner__label">Run via terminal</p>
          <pre className="demo-banner__cmd">{`cd ${HARNESS_PATH}\nMNEMONIC="..." npx hardhat deploy --network regtest --tags AdminSetup`}</pre>
          <p className="demo-banner__note">
            Mints <strong>10 000 RTKN</strong> to the staking contract and sets
            the rate to <strong>1 RTKN / minute</strong>. Two BTC transactions —
            takes 1–4 min. Reload after completion.
          </p>
        </div>

        <div className="demo-banner__actions">
          <button
            className="btn-primary"
            onClick={() => window.location.reload()}
          >
            Done — reload app
          </button>
          <button className="btn-ghost" onClick={() => setShowModal(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
