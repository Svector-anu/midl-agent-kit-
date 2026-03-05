import { useState } from "react";
import { formatEther, parseUnits } from "viem";
import { useAccount, useReadContract } from "wagmi";
import { useAccounts } from "@midl/react";
import { STAKE_TOKEN_ADDRESS, STAKE_TOKEN_ABI, STAKING_ADDRESS } from "../lib/contract";
import { useApprove } from "../hooks/useApprove";
import { useStake } from "../hooks/useStake";
import { TxStatus } from "./TxStatus";

export function StakeForm() {
  const [amount, setAmount] = useState("");
  const { address } = useAccount();
  const { isConnected } = useAccounts();

  const amountBn = amount ? parseUnits(amount, 18) : 0n;

  const { data: tokenBalance } = useReadContract({
    address: STAKE_TOKEN_ADDRESS,
    abi: STAKE_TOKEN_ABI,
    functionName: "balanceOf",
    args: address ? [address] : undefined,
    query: { enabled: !!address, refetchInterval: 15_000 },
  });

  const { data: allowance, refetch: refetchAllowance } = useReadContract({
    address: STAKE_TOKEN_ADDRESS,
    abi: STAKE_TOKEN_ABI,
    functionName: "allowance",
    args: address ? [address, STAKING_ADDRESS] : undefined,
    query: { enabled: !!address, refetchInterval: 10_000 },
  });

  const needsApproval =
    amountBn > 0n &&
    typeof allowance === "bigint" &&
    allowance < amountBn;

  const {
    approve,
    phase: approvePhase,
    error: approveError,
    btcTxId: approveTxId,
    evmTxHash: approveEvmTxHash,
    finalize: approveFinalize,
    reset: approveReset,
  } = useApprove(() => refetchAllowance());

  const {
    stake,
    phase: stakePhase,
    error: stakeError,
    btcTxId: stakeTxId,
    evmTxHash: stakeEvmTxHash,
    finalize: stakeFinalize,
    reset: stakeReset,
  } = useStake(() => setAmount(""));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amountBn === 0n) return;
    if (needsApproval) {
      approve(amountBn);
    } else {
      stake(amountBn);
    }
  };

  const approveBusy = approvePhase !== "idle" && approvePhase !== "error";
  const stakeBusy = stakePhase !== "idle" && stakePhase !== "error";
  const busy = approveBusy || stakeBusy;
  const balance = typeof tokenBalance === "bigint" ? tokenBalance : 0n;

  const buttonLabel = () => {
    if (!isConnected) return "Connect wallet to stake";
    if (approveBusy) return "Approving…";
    if (stakeBusy) return "Staking…";
    if (needsApproval) return "1 / 2 — Approve MTT";
    return "2 / 2 — Stake";
  };

  return (
    <div className="card">
      <h2 className="card__title">Stake</h2>
      {address && (
        <p className="card__description">
          Balance: {formatEther(balance)} MTT
        </p>
      )}
      <form className="form" onSubmit={handleSubmit}>
        <label className="form__label">
          Amount (MTT)
          <input
            className="form__input"
            type="number"
            min="0"
            step="any"
            placeholder="0.0"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={busy}
          />
        </label>
        <button
          className="btn-primary"
          type="submit"
          disabled={busy || !isConnected || !amount}
        >
          {buttonLabel()}
        </button>
      </form>
      {approvePhase !== "idle" && (
        <TxStatus
          phase={approvePhase}
          error={approveError}
          btcTxId={approveTxId}
          evmTxHash={approveEvmTxHash}
          onReset={approveReset}
          onFinalize={approvePhase === "adding-intention" ? approveFinalize : undefined}
        />
      )}
      {stakePhase !== "idle" && (
        <TxStatus
          phase={stakePhase}
          error={stakeError}
          btcTxId={stakeTxId}
          evmTxHash={stakeEvmTxHash}
          onReset={stakeReset}
          onFinalize={stakePhase === "adding-intention" ? stakeFinalize : undefined}
        />
      )}
    </div>
  );
}
